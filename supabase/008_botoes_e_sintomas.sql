-- Caderninho — botões da família, sintomas e cuidados (27/09/2026).
-- Rodar uma vez no SQL Editor, depois do 007 e ANTES de publicar o app novo: sem ele, o app novo
-- mostra todos os botões, mas não salva sintoma, massagem, banho nem lavagem nasal.
--
-- Só acrescenta; nenhum registro existente muda, e todos já cumprem as regras novas.
--   - family_settings: uma linha por família, criada quando alguém toca em Editar e muda um botão.
--     hidden_kinds: os botões que a família desligou ('med' Remédio, 'symptom' Sintomas, 'pump'
--     Ordenha, 'massage' Massagem, 'bath' Banho, 'nasal' Lavagem nasal). Sem linha, todos aparecem.
--     Mamada, sono, fralda e Outros aparecem sempre. Qualquer membro muda; vale para a família toda.
--   - entries: quatro tipos novos de registro.
--     'symptom' (Sintomas): symptom diz qual — 'febre', 'colica', 'choro' (choro inconsolável),
--     'tosse', 'assadura', 'vacina' (reação à vacina), 'dentes' (incômodo dos dentes) ou 'outro'
--     (o que aconteceu vai na observação, obrigatória). Febre pode ter a temperatura (temp_c, de 34
--     a 43 °C); cólica e choro podem ter a duração (duration_min, de 1 a 600 minutos). Vômito,
--     escolhido dentro de Sintomas, continua gravado como o registro 'vomit' de sempre.
--     'massage' (Massagem), 'bath' (Banho) e 'nasal' (Lavagem nasal): só o horário e a observação.

begin;

-- ============ Botões da família ============

create table public.family_settings (
  family_id    uuid primary key references public.families(id) on delete cascade,
  hidden_kinds text[] not null default '{}',
  -- Quem mudou por último; vira nulo só se apagar a conta.
  updated_by   uuid references public.profiles(id) on delete set null,
  updated_at   timestamptz not null default now(),
  check (hidden_kinds <@ array['med','symptom','pump','massage','bath','nasal']::text[])
);

-- Quem mudou e quando vêm do banco; a família não muda. O app salva com upsert, que também
-- escreve family_id ao atualizar: por isso a trava devolve a família de antes.
create function public.family_settings_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then new.family_id := old.family_id; end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end $$;
create trigger family_settings_guard before insert or update on public.family_settings
  for each row execute function public.family_settings_guard();

alter table public.family_settings enable row level security;

create policy "membros veem os botões" on public.family_settings
  for select to authenticated using (public.is_member(family_id));
create policy "membros criam os botões" on public.family_settings
  for insert to authenticated with check (public.is_member(family_id));
create policy "membros mudam os botões" on public.family_settings
  for update to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id));

-- O Supabase dá todas as permissões numa tabela nova a anon e authenticated; aqui fica só o que o
-- app usa. family_id no update só por causa do upsert (a trava não deixa mudar). Não se apaga pelo
-- app: vai junto quando a família é apagada.
revoke all on public.family_settings from anon, authenticated;
grant select on public.family_settings to authenticated;
grant insert (family_id, hidden_kinds) on public.family_settings to authenticated;
grant update (family_id, hidden_kinds) on public.family_settings to authenticated;
revoke execute on function public.family_settings_guard() from public, anon, authenticated;

-- Botões mudados num celular mudam na hora nos celulares dos outros membros.
alter publication supabase_realtime add table public.family_settings;

-- ============ Sintomas e cuidados ============

alter table public.entries drop constraint entries_kind_check;
alter table public.entries add constraint entries_kind_check
  check (kind in ('feed','sleep','wake','diaper','vomit','other','pump','med','symptom','massage','bath','nasal'));

alter table public.entries
  add column symptom      text check (symptom in ('febre','colica','choro','tosse','assadura','vacina','dentes','outro')),
  add column temp_c       numeric(3,1) check (temp_c between 34 and 43),
  add column duration_min integer check (duration_min between 1 and 600);

alter table public.entries
  add constraint entries_symptom_kind check ((kind = 'symptom') = (symptom is not null)),
  add constraint entries_symptom_temp check (temp_c is null or symptom = 'febre'),
  add constraint entries_symptom_dur  check (duration_min is null or symptom in ('colica','choro')),
  add constraint entries_symptom_outro check (symptom is distinct from 'outro' or char_length(btrim(coalesce(note, ''))) > 0);

grant insert (symptom, temp_c, duration_min) on public.entries to authenticated;
grant update (symptom, temp_c, duration_min) on public.entries to authenticated;

commit;
