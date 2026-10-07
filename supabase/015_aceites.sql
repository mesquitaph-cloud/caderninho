-- Soneca — aceites da Política e dos Termos, e sair da família sem deixar o nome (07/10/2026).
-- Rodar uma vez no SQL Editor, depois do 014 e ANTES de publicar o app novo. Sem ele, o app não
-- consegue registrar os aceites e para na tela de aceite.
--
-- 1. Tabela consents: a prova de cada aceite (conta, tipo, versão da política, data e hora). Só se
--    acrescenta: ninguém edita nem apaga pelo app. Sem ligação com perfis, famílias e bebês, para a
--    prova ficar mesmo depois de apagar a conta (política, seção 10: até 5 anos).
--    Tipos: terms (Política e Termos), baby (pai, mãe ou responsável pelo bebê, por família),
--    invite (compromisso de quem entra por convite).
-- 2. Sair da família (ou ser removido por quem criou): os registros, remédios, medidas, marcos,
--    dúvidas e o "mudou os botões" da pessoa ficam na família sem o nome dela, como ao apagar a conta.

begin;

create table public.consents (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid(),
  kind       text not null check (kind in ('terms', 'baby', 'invite')),
  version    text not null check (version ~ '^[0-9]+\.[0-9]+$'),
  family_id  uuid,
  baby_id    uuid,
  created_at timestamptz not null default now()
);
create index consents_user_idx on public.consents(user_id, kind);

alter table public.consents enable row level security;
create policy "ver os próprios aceites" on public.consents
  for select to authenticated using (user_id = auth.uid());
create policy "registrar o próprio aceite" on public.consents
  for insert to authenticated with check (user_id = auth.uid());
revoke all on public.consents from anon, authenticated;
grant select on public.consents to authenticated;
grant insert (kind, version, family_id, baby_id) on public.consents to authenticated;

-- Conta e hora vêm do banco, nunca do celular.
create function public.consents_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.user_id    := auth.uid();
  new.created_at := now();
  return new;
end $$;
create trigger consents_guard before insert on public.consents
  for each row execute function public.consents_guard();
revoke execute on function public.consents_guard() from public, anon, authenticated;

-- "Saindo da família": só a função abaixo liga, e só durante a própria transação.
create function public.leaving_family() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(current_setting('soneca.leaving', true), '') = '1'
$$;

-- As travas do 014, iguais, com mais uma exceção: o autor fica vazio também quando a pessoa sai da família.
-- 001 · registros
create or replace function public.entries_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.author_id  := auth.uid();
    new.created_at := now();
  else
    new.author_id  := case when new.author_id is null and (public.leaving_family() or not exists (select 1 from public.profiles where id = old.author_id))
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
    new.created_by := case when new.created_by is null and (public.leaving_family() or not exists (select 1 from public.profiles where id = old.created_by))
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
    new.created_by := case when new.created_by is null and (public.leaving_family() or not exists (select 1 from public.profiles where id = old.created_by))
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
     and (public.leaving_family() or not exists (select 1 from public.profiles where id = old.updated_by)) then
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
    new.created_by := case when new.created_by is null and (public.leaving_family() or not exists (select 1 from public.profiles where id = old.created_by))
                           then null else old.created_by end;
    new.created_at := old.created_at;
    if new.asked_on is null then
      new.asked_by := null;
    elsif old.asked_on is null then
      new.asked_by := auth.uid();
    elsif new.asked_by is null and (public.leaving_family() or not exists (select 1 from public.profiles where id = old.asked_by)) then
      new.asked_by := null;
    else
      new.asked_by := old.asked_by;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Quem sai (ou é removido) deixa o que anotou sem o nome. Se a família inteira está sendo apagada,
-- não faz nada: os registros vão junto.
create function public.member_left() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.families where id = old.family_id) then return old; end if;
  perform set_config('soneca.leaving', '1', true);
  update public.entries         set author_id  = null where family_id = old.family_id and author_id  = old.user_id;
  update public.medicines       set created_by = null where family_id = old.family_id and created_by = old.user_id;
  update public.weights         set created_by = null where family_id = old.family_id and created_by = old.user_id;
  update public.milestones      set created_by = null where family_id = old.family_id and created_by = old.user_id;
  update public.questions       set created_by = null where family_id = old.family_id and created_by = old.user_id;
  update public.questions       set asked_by   = null where family_id = old.family_id and asked_by   = old.user_id;
  update public.family_settings set updated_by = null where family_id = old.family_id and updated_by = old.user_id;
  perform set_config('soneca.leaving', '', true);
  return old;
end $$;
revoke execute on function public.member_left() from public, anon, authenticated;
create trigger member_left after delete on public.family_members
  for each row execute function public.member_left();

commit;

-- Conferir depois de rodar (não mostra dados de ninguém):
--   select count(*) from public.consents;                                   -- 0 antes do primeiro aceite
--   select tgname from pg_trigger where tgname in ('consents_guard', 'member_left');
--   select proname from pg_proc where proname in ('leaving_family', 'member_left');
