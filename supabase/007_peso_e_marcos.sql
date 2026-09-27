-- Caderninho — peso e marcos do bebê (27/09/2026).
-- Rodar uma vez no SQL Editor, ANTES de publicar o app novo. O app antigo continua funcionando; o
-- novo, sem este arquivo, só não mostra peso nem marcos (o resto funciona).
--
-- Só acrescenta duas tabelas; nada do que existe muda.
--   - weights: o peso do bebê num dia, em gramas (500 g a 30 kg), com uma observação opcional
--     ("consulta do pediatra"). Mais de um peso no mesmo dia pode: é a família que anota.
--   - milestones: um marco do desenvolvimento num dia ("Sorriu", "Primeiro dente"), com uma
--     observação opcional. O nome é texto livre; o app só sugere alguns, sem idade esperada.
-- Os dois: só membros da família veem, anotam, editam e apagam. Quem anotou e as datas de criação
-- vêm do banco; ao editar, bebê e família não mudam.

begin;

create table public.weights (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null,
  baby_id     uuid not null,
  measured_on date not null,
  grams       integer not null check (grams between 500 and 30000),
  note        text check (char_length(note) <= 100),
  -- Quem anotou; vira nulo só se apagar a conta.
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Garante que o bebê pertence à mesma família.
  foreign key (baby_id, family_id) references public.babies(id, family_id) on delete cascade
);
create index weights_baby_idx on public.weights(baby_id, measured_on);
create index weights_family_idx on public.weights(family_id);

create table public.milestones (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null,
  baby_id     uuid not null,
  happened_on date not null,
  title       text not null check (char_length(btrim(title)) between 1 and 60),
  note        text check (char_length(note) <= 300),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (baby_id, family_id) references public.babies(id, family_id) on delete cascade
);
create index milestones_baby_idx on public.milestones(baby_id, happened_on);
create index milestones_family_idx on public.milestones(family_id);

-- Peso e marco: quem anotou e as datas vêm do banco; ao editar, bebê e família não mudam.
create function public.baby_log_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
  else
    new.family_id  := old.family_id;
    new.baby_id    := old.baby_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger weights_guard before insert or update on public.weights
  for each row execute function public.baby_log_guard();
create trigger milestones_guard before insert or update on public.milestones
  for each row execute function public.baby_log_guard();

alter table public.weights    enable row level security;
alter table public.milestones enable row level security;

create policy "membros veem pesos" on public.weights
  for select to authenticated using (public.is_member(family_id));
create policy "membros anotam pesos" on public.weights
  for insert to authenticated with check (public.is_member(family_id));
create policy "membros editam pesos" on public.weights
  for update to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id));
create policy "membros apagam pesos" on public.weights
  for delete to authenticated using (public.is_member(family_id));

create policy "membros veem marcos" on public.milestones
  for select to authenticated using (public.is_member(family_id));
create policy "membros anotam marcos" on public.milestones
  for insert to authenticated with check (public.is_member(family_id));
create policy "membros editam marcos" on public.milestones
  for update to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id));
create policy "membros apagam marcos" on public.milestones
  for delete to authenticated using (public.is_member(family_id));

-- O Supabase dá todas as permissões numa tabela nova a anon e authenticated; aqui fica só o que o
-- app usa.
revoke all on public.weights, public.milestones from anon, authenticated;
grant select, delete on public.weights, public.milestones to authenticated;
grant insert (family_id, baby_id, measured_on, grams, note)  on public.weights    to authenticated;
grant update (measured_on, grams, note)                      on public.weights    to authenticated;
grant insert (family_id, baby_id, happened_on, title, note)  on public.milestones to authenticated;
grant update (happened_on, title, note)                      on public.milestones to authenticated;
revoke execute on function public.baby_log_guard() from public, anon, authenticated;

commit;
