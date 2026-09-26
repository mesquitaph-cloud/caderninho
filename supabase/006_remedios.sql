-- Caderninho — remédios programados e o registro de remédio (26/09/2026).
-- Rodar uma vez no SQL Editor, ANTES de publicar o app novo: o app novo grava as colunas daqui em
-- todo registro e, sem elas, não salva nenhum. O app antigo continua funcionando.
-- O cocô no painel da semana não depende deste arquivo.
--
-- Só acrescenta: nenhum registro existente muda, e todos já cumprem as regras novas.
--   - medicines: o remédio que a família programa para um bebê. Nome, quanto dar (texto livre,
--     opcional) e como repete: 'fixed' (horários fixos), 'every' (de tantas em tantas horas: o app
--     grava os horários do dia que saem da conta) ou 'prn' (só quando precisar, sem horário; pode ter
--     um intervalo entre as doses em every_hours, e o app mostra a partir de que horas pode dar de novo).
--     Por alguns dias (days, a partir de start_date) ou sem data para acabar (days vazio).
--     Não se apaga pelo app: "Parar este remédio" preenche stopped_at, e os registros ficam.
--   - entries: kind aceita 'med' (registro de remédio), sempre ligado a um remédio do mesmo bebê.
--     med_name e med_amount guardam o nome e a quantidade do momento em que foi dado; dose_at é o
--     horário programado da dose (vazio no "só quando precisar"); skipped marca a dose pulada.
--   - Uma dose só pode ser marcada uma vez: se duas pessoas marcarem juntas, a segunda recebe erro
--     e o app avisa que alguém já marcou.

begin;

create table public.medicines (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null,
  baby_id     uuid not null,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  amount      text check (char_length(amount) <= 30),
  schedule    text not null check (schedule in ('fixed','every','prn')),
  times       time[],
  every_hours integer check (every_hours in (4, 6, 8, 12)),
  start_date  date not null default current_date,
  days        integer check (days between 1 and 60),
  stopped_at  timestamptz,
  -- Quem programou; vira nulo só se apagar a conta.
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Garante que o bebê pertence à mesma família do remédio.
  foreign key (baby_id, family_id) references public.babies(id, family_id) on delete cascade,
  unique (id, baby_id),
  -- "is true" porque, no Postgres, uma regra que dá nulo (times vazio) deixaria passar.
  check (times is null or array_position(times, null) is null),
  check (schedule <> 'fixed' or (cardinality(times) between 1 and 8 and every_hours is null) is true),
  check (schedule <> 'every' or (cardinality(times) = 24 / every_hours) is true),
  check (schedule <> 'prn'   or (times is null and days is null))
);
create index medicines_baby_idx on public.medicines(baby_id);
create index medicines_family_idx on public.medicines(family_id);

-- Remédio: quem programou e as datas vêm do banco; ao editar, bebê, família e início não mudam.
create function public.medicines_guard() returns trigger
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
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger medicines_guard before insert or update on public.medicines
  for each row execute function public.medicines_guard();

alter table public.medicines enable row level security;

create policy "membros veem remédios" on public.medicines
  for select to authenticated using (public.is_member(family_id));
create policy "membros programam remédios" on public.medicines
  for insert to authenticated with check (public.is_member(family_id));
create policy "membros editam remédios" on public.medicines
  for update to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id));

-- Registro de remédio.
alter table public.entries drop constraint entries_kind_check;
alter table public.entries add constraint entries_kind_check
  check (kind in ('feed','sleep','wake','diaper','vomit','other','pump','med'));

alter table public.entries
  add column medicine_id uuid,
  add column med_name    text check (char_length(med_name) <= 40),
  add column med_amount  text check (char_length(med_amount) <= 30),
  add column dose_at     timestamptz,
  add column skipped     boolean;

-- O remédio é do mesmo bebê do registro (e, pelo bebê, da mesma família).
alter table public.entries
  add constraint entries_medicine_fk foreign key (medicine_id, baby_id) references public.medicines(id, baby_id),
  add constraint entries_med_kind    check ((kind = 'med') = (medicine_id is not null)),
  add constraint entries_med_name    check (kind <> 'med' or char_length(btrim(coalesce(med_name, ''))) > 0),
  add constraint entries_med_only    check (kind = 'med' or (med_name is null and med_amount is null and dose_at is null and skipped is null)),
  add constraint entries_skip_dose   check (skipped is not true or dose_at is not null);
create unique index entries_one_per_dose on public.entries(medicine_id, dose_at) where dose_at is not null;

-- O Supabase dá todas as permissões numa tabela nova a anon e authenticated; aqui fica só o que o
-- app usa. Remédio não se apaga pelo app.
revoke all on public.medicines from anon, authenticated;
grant select on public.medicines to authenticated;
grant insert (family_id, baby_id, name, amount, schedule, times, every_hours, start_date, days)
                                                               on public.medicines to authenticated;
grant update (name, amount, schedule, times, every_hours, days, stopped_at)
                                                               on public.medicines to authenticated;
grant insert (medicine_id, med_name, med_amount, dose_at, skipped) on public.entries to authenticated;
grant update (medicine_id, med_name, med_amount, dose_at, skipped) on public.entries to authenticated;
revoke execute on function public.medicines_guard() from public, anon, authenticated;

-- Remédio programado ou parado aparece na hora no celular dos outros membros.
alter publication supabase_realtime add table public.medicines;

commit;
