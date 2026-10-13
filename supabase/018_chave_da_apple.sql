-- Soneca — cancelar o acesso da Apple ao apagar a conta (13/10/2026). Exigência da Apple (5.1.1(v)):
-- quem entrou com a Apple e apaga a conta precisa ter o acesso cancelado também do lado da Apple.
-- Rodar uma vez no SQL Editor, antes de publicar a função apple-login (supabase/functions/apple-login).
--
-- Guarda, para quem entra com a Apple, a chave de acesso que a Apple devolve (refresh token). Só a
-- função apple-login (com a chave de serviço) lê e escreve: o app, quem entrou e quem não entrou não
-- alcançam a tabela. Some sozinha quando o login é apagado (ligação com auth.users).

begin;

create table public.apple_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.apple_tokens enable row level security;
-- Sem regras de acesso (policies): com RLS ligado e nenhuma regra, ninguém além da chave de serviço passa.
revoke all on public.apple_tokens from public, anon, authenticated;

commit;

-- Conferir depois de rodar (não mostra dados de ninguém): deve voltar "true | false | false".
-- select c.relrowsecurity,
--        has_table_privilege('authenticated', c.oid, 'SELECT'),
--        has_table_privilege('anon', c.oid, 'SELECT')
--   from pg_class c where c.oid = 'public.apple_tokens'::regclass;
