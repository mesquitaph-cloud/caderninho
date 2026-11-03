-- Soneca — quem fez cada registro e "pegou no sono sozinha" (02/11/2026).
-- Rodar uma vez no SQL Editor, ANTES de publicar o app novo. O app antigo continua funcionando; o
-- novo, sem este arquivo, não salva quem fez nem o "pegou no sono sozinha" (o resto do registro salva
-- normalmente).
--
-- O que muda:
--   - entries: coluna nova done_by, quem fez, opcional (vazia: conta quem anotou). Só alguém da família
--     do registro, e só na mamadeira, no Dormiu, na fralda, nos cuidados e no remédio. Nunca no peito,
--     na ordenha, no Acordou, no sono marcado como sozinha, nos sintomas, no vômito ou em Outro.
--   - entries: coluna nova self_settled, "pegou no sono sozinha": só verdadeiro ou vazio, só no Dormiu,
--     e nunca junto com tempo no colo.
--   - Quem sai da família (ou é removido) deixa de aparecer como quem fez, como já acontece com quem
--     anotou. Quem apaga a conta também.
-- Regras de acesso: as mesmas; só ganham as colunas novas.

begin;

alter table public.entries add column done_by uuid references public.profiles(id) on delete set null;
alter table public.entries add column self_settled boolean check (self_settled);

alter table public.entries add constraint entries_done_by_kind check (done_by is null or (
  (kind in ('sleep','diaper','med','massage','bath','nasal','tummy','sunbath','care','burp')
   or (kind = 'feed' and src = 'bottle'))
  and self_settled is null));
alter table public.entries add constraint entries_self_settled_sleep
  check (self_settled is null or (kind = 'sleep' and lap_min is null));

-- Quem fez precisa ser da família do registro. Só confere quando muda, para que sair da família
-- (que esvazia o campo) não esbarre nesta trava. Ao editar, vale a família de antes (a trava do 015
-- não deixa o registro mudar de família).
create function public.entries_done_by_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare fam uuid := case when tg_op = 'INSERT' then new.family_id else old.family_id end;
begin
  if new.done_by is not null and (tg_op = 'INSERT' or new.done_by is distinct from old.done_by)
     and not exists (select 1 from public.family_members where family_id = fam and user_id = new.done_by) then
    raise exception 'quem fez precisa ser da família';
  end if;
  return new;
end $$;
revoke execute on function public.entries_done_by_guard() from public, anon, authenticated;
create trigger entries_done_by_guard before insert or update on public.entries
  for each row execute function public.entries_done_by_guard();

-- O member_left do 015, igual, com quem fez esvaziado primeiro.
create or replace function public.member_left() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.families where id = old.family_id) then return old; end if;
  perform set_config('soneca.leaving', '1', true);
  update public.entries         set done_by    = null where family_id = old.family_id and done_by    = old.user_id;
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

grant insert (done_by, self_settled) on public.entries to authenticated;
grant update (done_by, self_settled) on public.entries to authenticated;

commit;

-- Conferir depois de rodar (não mostra dados de ninguém):
--   select column_name from information_schema.columns
--    where table_name = 'entries' and column_name in ('done_by', 'self_settled');          -- as duas
--   select conname from pg_constraint
--    where conname in ('entries_done_by_kind', 'entries_self_settled_sleep');              -- as duas
--   select tgname from pg_trigger where tgname = 'entries_done_by_guard';                  -- uma
