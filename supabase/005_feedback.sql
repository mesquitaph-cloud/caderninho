-- Caderninho — sugestões e problemas: mensagens que os membros mandam pelo menu (25/09/2026).
-- Rodar uma vez no SQL Editor, ANTES de publicar o app novo (rodado em 25/09/2026): sem a tabela, o
-- envio pelo menu dá erro.
-- O painel da semana e o calendário não dependem deste arquivo.
--
-- Pelo app, quem está logado só consegue enviar. Não há regra de leitura: ninguém lê as mensagens
-- pelo app, nem as próprias. Quem cuida do Caderninho lê pelo painel do Supabase (consulta no fim).
--   - quem mandou, a data e o limite por dia são preenchidos pelo banco, não pelo app;
--   - família: a que estava aberta no app; só vale família de que a pessoa é membro;
--   - tipo: 'idea' (Sugestão), 'bug' (Algo deu errado) ou vazio;
--   - aparelho: o tipo de celular e navegador, montado pelo app (ex.: "iPhone · iOS 18.5 · Safari · app instalado").

begin;

create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  -- Viram nulo se a pessoa apagar a conta ou a família for apagada; a mensagem fica.
  user_id    uuid references public.profiles(id) on delete set null,
  family_id  uuid references public.families(id) on delete set null,
  kind       text check (kind in ('idea','bug')),
  message    text not null check (char_length(btrim(message)) between 1 and 1000),
  device     text check (char_length(device) <= 200),
  created_at timestamptz not null default now()
);
create index feedback_user_created_idx on public.feedback(user_id, created_at desc);

-- Quem mandou é sempre quem está logado, a data é a do banco e cada pessoa manda até 10 por dia.
-- "security definer" deixa a função contar as mensagens da pessoa, que ela mesma não consegue ler.
create function public.feedback_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  new.user_id    := auth.uid();
  new.created_at := now();
  -- Uma mensagem por vez da mesma pessoa, para duas enviadas juntas não furarem o limite.
  perform pg_advisory_xact_lock(hashtext('feedback:' || auth.uid()::text));
  if (select count(*) from public.feedback
      where user_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'feedback_limit';
  end if;
  return new;
end $$;
create trigger feedback_guard before insert on public.feedback
  for each row execute function public.feedback_guard();

alter table public.feedback enable row level security;

create policy "membros mandam mensagem" on public.feedback
  for insert to authenticated
  with check (user_id = auth.uid() and (family_id is null or public.is_member(family_id)));

-- O Supabase dá todas as permissões numa tabela nova a anon e authenticated; aqui fica só o envio.
revoke all on public.feedback from anon, authenticated;
grant insert (family_id, kind, message, device) on public.feedback to authenticated;
revoke execute on function public.feedback_guard() from public, anon, authenticated;

commit;

-- Para ler as mensagens com o nome de quem mandou e da família (SQL Editor → New query):
--
--   select f.created_at, p.display_name as quem, fa.name as familia, f.kind as tipo, f.message, f.device
--   from public.feedback f
--   left join public.profiles p  on p.id  = f.user_id
--   left join public.families fa on fa.id = f.family_id
--   order by f.created_at desc;
--
-- O e-mail de quem mandou está em Authentication → Users, procurando pelo user_id.
