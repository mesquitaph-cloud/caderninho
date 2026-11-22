-- Soneca — dias em que cada pessoa abriu o app (item 84, medir retenção de verdade). Escrito em 22/11/2026.
-- Rodar uma vez no SQL Editor, ANTES de publicar o app que grava a abertura. Sem a tabela, o app só
-- não grava: nada quebra.
--
-- Hoje só se sabe que alguém usou o Soneca quando anota. Aqui fica uma linha por PESSOA e por DIA em
-- que abriu o app (ou voltou a ele), sem hora, sem aparelho e sem conteúdo: dado técnico de uso, para
-- contar "ativos por dia" e o retorno no dia 7. No painel só entram contagens, nunca quem é.
--   - O dia vem do banco, no fuso de São Paulo; o celular só pede "registre que abri hoje".
--   - O app pede no máximo uma vez por dia por celular; se pedir de novo, nada muda (on conflict).
--   - Ninguém lê nem escreve a tabela direto: só a função abaixo grava. A leitura é só pelo SQL Editor
--     (ou pelo conector, em consulta agregada).
--   - Apagar a conta apaga as linhas (on delete cascade): não há motivo para guardar depois disso.

begin;

create table public.app_opens (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null,
  primary key (user_id, day)
);
create index app_opens_day_idx on public.app_opens(day);

alter table public.app_opens enable row level security;
-- Sem nenhuma política e sem permissão na tabela: pelo app, só a função grava.
revoke all on public.app_opens from anon, authenticated;

create function public.log_open() returns void
language sql security definer set search_path = '' as $$
  insert into public.app_opens (user_id, day)
  select auth.uid(), (now() at time zone 'America/Sao_Paulo')::date
  where auth.uid() is not null
  on conflict do nothing;
$$;
revoke all on function public.log_open() from public, anon;
grant execute on function public.log_open() to authenticated;

commit;

-- Consultas agregadas para o painel (só números; rodar à mão ou pelo conector, que só lê):
--
-- 1. Usuários ativos por dia (a métrica do painel), últimos 30 dias:
--   select day, count(*) as ativos from public.app_opens
--   where day >= (now() at time zone 'America/Sao_Paulo')::date - 30 group by day order by day;
--
-- 2. Retorno no dia 7 (o KPI): de quem criou a conta há pelo menos 7 dias, quantos abriram o app
--    entre o dia 7 e o dia 13 depois do cadastro (uma semana inteira, não só um dia):
--   with novos as (
--     select id, (created_at at time zone 'America/Sao_Paulo')::date as d0 from auth.users
--     where created_at < now() - interval '14 days')
--   select count(*) as cadastros,
--          count(*) filter (where exists (select 1 from public.app_opens o
--            where o.user_id = novos.id and o.day between novos.d0 + 7 and novos.d0 + 13)) as voltaram
--   from novos;
--
-- 3. Quem abre mas não anota (a lacuna que isto fecha): pessoas que abriram o app nos últimos 7 dias e
--    não fizeram nenhum registro no mesmo período — só a contagem:
--   select count(distinct o.user_id) as abriram_sem_anotar
--   from public.app_opens o
--   where o.day >= (now() at time zone 'America/Sao_Paulo')::date - 7
--     and not exists (select 1 from public.entries e
--                     where e.author_id = o.user_id and e.at >= now() - interval '7 days');
