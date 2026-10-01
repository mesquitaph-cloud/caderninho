-- Caderninho — dúvidas para a consulta (01/10/2026).
-- Rodar uma vez no SQL Editor, ANTES de publicar o app novo. O app antigo continua funcionando; o
-- novo, sem este arquivo, só não mostra as dúvidas (o resto, inclusive o relatório, funciona).
--
-- Só acrescenta uma tabela; nada do que existe muda.
--   - questions: uma dúvida da família para a próxima consulta de um bebê (até 300 letras). Quando
--     alguém marca "perguntei", guarda o dia (asked_on) e quem marcou (asked_by); desmarcar limpa
--     os dois. A família pode anotar, se quiser, o que o pediatra disse (answer, até 500 letras).
--     O Caderninho só guarda; não confere nem sugere resposta.
-- Só membros da família veem, anotam, editam e apagam. Quem anotou, quem marcou e as datas de
-- criação vêm do banco; ao editar, bebê e família não mudam.

begin;

create table public.questions (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null,
  baby_id     uuid not null,
  body        text not null check (char_length(btrim(body)) between 1 and 300),
  asked_on    date,
  -- Quem marcou "perguntei"; vira nulo ao desmarcar ou se apagar a conta.
  asked_by    uuid references public.profiles(id) on delete set null,
  answer      text check (char_length(answer) <= 500),
  -- Quem anotou; vira nulo só se apagar a conta.
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Garante que o bebê pertence à mesma família.
  foreign key (baby_id, family_id) references public.babies(id, family_id) on delete cascade
);
create index questions_baby_idx on public.questions(baby_id, created_at);
create index questions_family_idx on public.questions(family_id);

-- Quem anotou, quem marcou "perguntei" e as datas vêm do banco; ao editar, bebê e família não mudam.
create function public.questions_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
    new.asked_by   := case when new.asked_on is null then null else auth.uid() end;
  else
    new.family_id  := old.family_id;
    new.baby_id    := old.baby_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if new.asked_on is null then
      new.asked_by := null;
    elsif old.asked_on is null then
      new.asked_by := auth.uid();
    else
      new.asked_by := old.asked_by;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger questions_guard before insert or update on public.questions
  for each row execute function public.questions_guard();

alter table public.questions enable row level security;

create policy "membros veem dúvidas" on public.questions
  for select to authenticated using (public.is_member(family_id));
create policy "membros anotam dúvidas" on public.questions
  for insert to authenticated with check (public.is_member(family_id));
create policy "membros editam dúvidas" on public.questions
  for update to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id));
create policy "membros apagam dúvidas" on public.questions
  for delete to authenticated using (public.is_member(family_id));

-- O Supabase dá todas as permissões numa tabela nova a anon e authenticated; aqui fica só o que o
-- app usa.
revoke all on public.questions from anon, authenticated;
grant select, delete on public.questions to authenticated;
grant insert (family_id, baby_id, body)       on public.questions to authenticated;
grant update (body, asked_on, answer)         on public.questions to authenticated;
revoke execute on function public.questions_guard() from public, anon, authenticated;

commit;
