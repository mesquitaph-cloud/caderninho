-- Soneca — Tarefas programadas e Pomada para assadura (08/11/2026).
-- Rodar uma vez no SQL Editor, ANTES de publicar o app novo. O app antigo continua funcionando; o
-- novo, sem este arquivo, não programa tarefas nem salva pomada (o resto funciona, inclusive a Fralda).
-- Prévias aprovadas: https://claude.ai/artifact/GDAaPiB7wR9iuqMVHfFT8r (rotina) e
-- https://claude.ai/artifact/RzemaHaWMDHAXvoQdw79Zv (pomada na Fralda e no histórico).
--
-- O que muda:
--   - routines: a tarefa que a família programa para um bebê, irmã de medicines. Qual tarefa (kind:
--     banho de sol, tummy time, pomada, banho, massagem, lavagem nasal ou outra, com nome) e quando:
--     'fixed' (horários fixos, de 1 a 8), 'count' (tantas vezes por dia, sem hora, de 1 a 12) ou
--     'diaper' (na troca de fralda, só na pomada). A pomada guarda em items as pomadas da família
--     (de 1 a 12 nomes). Uma tarefa ativa de cada tipo por bebê ("outra" pode ter várias).
--     Não se apaga pelo app: "Tirar da rotina" preenche stopped_at, e os registros ficam.
--   - entries: tipo novo 'ointment' (pomada), com as pomadas passadas em ointments (os nomes do
--     momento, de 1 a 12). Quando foi marcada na Fralda, diaper_id liga a pomada àquela troca, do
--     mesmo bebê; apagar a troca apaga a pomada junto.
--   - entries: quem fez (done_by, do 022) vale também na pomada.
--   - Quem sai da família deixa de aparecer como quem programou a tarefa, como no remédio.
-- Regras de acesso: as mesmas do remédio; entries só ganha as colunas novas.

begin;

-- Cada nome de pomada com 1 a 40 letras (regra CHECK não aceita subconsulta; a função aceita).
create function public.names_ok(a text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(char_length(btrim(x)) between 1 and 40), true) from unnest(a) as x
$$;

create table public.routines (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null,
  baby_id     uuid not null,
  kind        text not null check (kind in ('sunbath','tummy','ointment','bath','massage','nasal','care')),
  name        text check (char_length(btrim(name)) between 1 and 40),
  schedule    text not null check (schedule in ('fixed','count','diaper')),
  times       time[],
  per_day     integer check (per_day between 1 and 12),
  items       text[],
  stopped_at  timestamptz,
  -- Quem programou; vira nulo se sair da família ou apagar a conta.
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Garante que o bebê pertence à mesma família da tarefa.
  foreign key (baby_id, family_id) references public.babies(id, family_id) on delete cascade,
  -- "is true" porque, no Postgres, uma regra que dá nulo deixaria passar.
  check (times is null or array_position(times, null) is null),
  check (schedule <> 'fixed' or (cardinality(times) between 1 and 8 and per_day is null) is true),
  check (schedule <> 'count' or (times is null and per_day is not null)),
  check (schedule <> 'diaper' or (kind = 'ointment' and times is null and per_day is null)),
  check ((kind = 'care') = (name is not null)),
  check (items is null or (kind = 'ointment' and cardinality(items) between 1 and 12
                           and array_position(items, null) is null and public.names_ok(items)))
);
create index routines_baby_idx on public.routines(baby_id);
create index routines_family_idx on public.routines(family_id);
create unique index routines_one_active on public.routines(baby_id, kind) where stopped_at is null and kind <> 'care';

-- Tarefa: quem programou e as datas vêm do banco; ao editar, bebê, família e tipo não mudam. Igual ao
-- medicines_guard do 015 (quem apagou a conta ou saiu da família pode virar nulo).
create function public.routines_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
    new.stopped_at := null;
  else
    new.family_id  := old.family_id;
    new.baby_id    := old.baby_id;
    new.kind       := old.kind;
    new.created_by := case when new.created_by is null and (public.leaving_family() or not exists (select 1 from public.profiles where id = old.created_by))
                           then null else old.created_by end;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger routines_guard before insert or update on public.routines
  for each row execute function public.routines_guard();

alter table public.routines enable row level security;

create policy "membros veem tarefas" on public.routines
  for select to authenticated using (public.is_member(family_id));
create policy "membros programam tarefas" on public.routines
  for insert to authenticated with check (public.is_member(family_id));
create policy "membros editam tarefas" on public.routines
  for update to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id));

-- O Supabase dá todas as permissões numa tabela nova a anon e authenticated; aqui fica só o que o
-- app usa. Tarefa não se apaga pelo app.
revoke all on public.routines from anon, authenticated;
grant select on public.routines to authenticated;
grant insert (family_id, baby_id, kind, name, schedule, times, per_day, items) on public.routines to authenticated;
grant update (name, schedule, times, per_day, items, stopped_at)              on public.routines to authenticated;
revoke execute on function public.routines_guard() from public, anon, authenticated;

-- Registro de pomada.
alter table public.entries drop constraint entries_kind_check;
alter table public.entries add constraint entries_kind_check
  check (kind in ('feed','sleep','wake','diaper','vomit','other','pump','med','symptom',
                  'massage','bath','nasal','tummy','sunbath','care','burp','ointment'));

-- A troca de fralda da pomada é do mesmo bebê: precisa da dupla (id, baby_id) única em entries.
alter table public.entries add constraint entries_id_baby unique (id, baby_id);
alter table public.entries
  add column ointments text[],
  add column diaper_id uuid;
alter table public.entries
  add constraint entries_diaper_fk foreign key (diaper_id, baby_id) references public.entries(id, baby_id) on delete cascade,
  add constraint entries_ointment_kind check ((kind = 'ointment') = (ointments is not null)),
  add constraint entries_ointment_list check (ointments is null or (cardinality(ointments) between 1 and 12
                                                                    and array_position(ointments, null) is null
                                                                    and public.names_ok(ointments))),
  add constraint entries_diaper_only check (diaper_id is null or kind = 'ointment');

-- A pomada ligada a uma troca precisa que a troca seja uma fralda.
create function public.entries_diaper_link() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.diaper_id is not null and (tg_op = 'INSERT' or new.diaper_id is distinct from old.diaper_id)
     and not exists (select 1 from public.entries where id = new.diaper_id and kind = 'diaper') then
    raise exception 'a pomada só se liga a uma troca de fralda';
  end if;
  return new;
end $$;
revoke execute on function public.entries_diaper_link() from public, anon, authenticated;
create trigger entries_diaper_link before insert or update on public.entries
  for each row execute function public.entries_diaper_link();

-- Quem fez (022) vale também na pomada.
alter table public.entries drop constraint entries_done_by_kind;
alter table public.entries add constraint entries_done_by_kind check (done_by is null or (
  (kind in ('sleep','diaper','med','massage','bath','nasal','tummy','sunbath','care','burp','ointment')
   or (kind = 'feed' and src = 'bottle'))
  and self_settled is null));

grant insert (ointments, diaper_id) on public.entries to authenticated;
grant update (ointments, diaper_id) on public.entries to authenticated;

-- O member_left do 022, igual, com as tarefas.
create or replace function public.member_left() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.families where id = old.family_id) then return old; end if;
  perform set_config('soneca.leaving', '1', true);
  update public.entries         set done_by    = null where family_id = old.family_id and done_by    = old.user_id;
  update public.entries         set author_id  = null where family_id = old.family_id and author_id  = old.user_id;
  update public.medicines       set created_by = null where family_id = old.family_id and created_by = old.user_id;
  update public.routines        set created_by = null where family_id = old.family_id and created_by = old.user_id;
  update public.weights         set created_by = null where family_id = old.family_id and created_by = old.user_id;
  update public.milestones      set created_by = null where family_id = old.family_id and created_by = old.user_id;
  update public.questions       set created_by = null where family_id = old.family_id and created_by = old.user_id;
  update public.questions       set asked_by   = null where family_id = old.family_id and asked_by   = old.user_id;
  update public.family_settings set updated_by = null where family_id = old.family_id and updated_by = old.user_id;
  perform set_config('soneca.leaving', '', true);
  return old;
end $$;

-- Tarefa programada ou tirada da rotina aparece na hora no celular dos outros membros.
alter publication supabase_realtime add table public.routines;

commit;

-- Conferir depois de rodar (não mostra dados de ninguém):
--   select count(*) from public.routines;                                                  -- 0
--   select column_name from information_schema.columns
--    where table_name = 'entries' and column_name in ('ointments', 'diaper_id');            -- as duas
--   select conname from pg_constraint
--    where conname in ('entries_ointment_kind', 'entries_diaper_fk', 'entries_id_baby');  -- as três
--   select tgname from pg_trigger where tgname in ('routines_guard', 'entries_diaper_link'); -- as duas
