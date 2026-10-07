-- Soneca — correção do "Apagar minha conta" (07/10/2026). Rodar uma vez no SQL Editor, depois do 012.
--
-- O problema: quem apaga a conta tem o nome tirado dos registros que ficam nas outras famílias (as
-- ligações "on delete set null"). Só que isso é uma edição, e as travas de edição devolvem o autor de
-- antes ("ao editar, o autor não muda"), então o banco recusa e a conta não é apagada. Acontece com
-- qualquer pessoa que anotou algo numa família que continua (ou que passou para outra pessoa).
--
-- A correção: cada trava aceita o autor vazio quando a conta dele não existe mais. Pelo app ninguém
-- consegue esvaziar essas colunas (não há permissão para escrever nelas), então nada muda no resto.
-- O corpo de cada função é o mesmo de hoje (conferido no banco em 07/10), só com essa exceção.

begin;

-- "A conta já foi apagada": o autor de antes não existe mais e a ligação pediu para esvaziar.
-- 001 · registros
create or replace function public.entries_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.author_id  := auth.uid();
    new.created_at := now();
  else
    new.author_id  := case when new.author_id is null and not exists (select 1 from public.profiles where id = old.author_id)
                           then null else old.author_id end;
    new.family_id  := old.family_id;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- 006 · remédios
create or replace function public.medicines_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
    new.stopped_at := null;
  else
    new.family_id  := old.family_id;
    new.baby_id    := old.baby_id;
    new.start_date := old.start_date;
    new.created_by := case when new.created_by is null and not exists (select 1 from public.profiles where id = old.created_by)
                           then null else old.created_by end;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- 007 · peso e marcos
create or replace function public.baby_log_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
  else
    new.family_id  := old.family_id;
    new.baby_id    := old.baby_id;
    new.created_by := case when new.created_by is null and not exists (select 1 from public.profiles where id = old.created_by)
                           then null else old.created_by end;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- 008 · botões da família: quem mudou por último pode ser quem apagou a conta.
create or replace function public.family_settings_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.updated_by is null and old.updated_by is not null
     and not exists (select 1 from public.profiles where id = old.updated_by) then
    return new;
  end if;
  if tg_op = 'UPDATE' then new.family_id := old.family_id; end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end $$;

-- 010 · dúvidas para a consulta
create or replace function public.questions_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
    new.asked_by   := case when new.asked_on is null then null else auth.uid() end;
  else
    new.family_id  := old.family_id;
    new.baby_id    := old.baby_id;
    new.created_by := case when new.created_by is null and not exists (select 1 from public.profiles where id = old.created_by)
                           then null else old.created_by end;
    new.created_at := old.created_at;
    if new.asked_on is null then
      new.asked_by := null;
    elsif old.asked_on is null then
      new.asked_by := auth.uid();
    elsif new.asked_by is null and not exists (select 1 from public.profiles where id = old.asked_by) then
      new.asked_by := null;
    else
      new.asked_by := old.asked_by;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

commit;
