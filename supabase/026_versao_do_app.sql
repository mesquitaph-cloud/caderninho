-- Soneca — última versão do app em cada loja (item 72, aviso de versão nova). Escrito em 17/11/2026.
-- Rodar uma vez no SQL Editor, ANTES de publicar o app que traz o aviso (1.0.5). Sem a tabela, o app
-- simplesmente não avisa: nada quebra.
--
-- O app lê a linha da própria loja ("ios" ou "android") e, se a versão instalada for menor que "latest",
-- mostra o cartão "Versão nova do Soneca" na tela Hoje, no máximo uma vez por dia.
--   - latest:  a última versão que a loja já liberou para TODOS. Só mudar depois de a loja liberar
--              (a Play libera aos poucos; na Apple, olhar a liberação em fases).
--   - minimum: reservado para o futuro (versão com defeito grave). O app ainda não usa; deixar vazio.
-- Quem usa o app só lê; ninguém escreve pelo app. A atualização é à mão, a cada lançamento (roteiro no fim).

begin;

create table public.app_versions (
  platform   text primary key check (platform in ('ios','android')),
  latest     text not null check (latest ~ '^[0-9]+(\.[0-9]+){1,2}$'),
  minimum    text check (minimum is null or minimum ~ '^[0-9]+(\.[0-9]+){1,2}$'),
  updated_at timestamptz not null default now()
);

alter table public.app_versions enable row level security;

-- Leitura para todos, inclusive antes de entrar: não há dado de ninguém aqui, só o número da versão.
create policy "todos leem as versoes" on public.app_versions
  for select to anon, authenticated using (true);

-- O Supabase dá todas as permissões numa tabela nova; aqui fica só a leitura.
revoke all on public.app_versions from anon, authenticated;
grant select on public.app_versions to anon, authenticated;

-- Versões de hoje (as duas lojas estão na 1.0.3 para todos; a 1.0.4 ainda está no TestFlight).
insert into public.app_versions (platform, latest) values ('ios', '1.0.3'), ('android', '1.0.3');

commit;

-- A cada lançamento, DEPOIS de a loja liberar a versão para todos (troque a versão e a loja):
--   update public.app_versions set latest = '1.0.5', updated_at = now() where platform = 'ios';
--   update public.app_versions set latest = '1.0.5', updated_at = now() where platform = 'android';
-- Conferir (só números de versão, sem dado de ninguém):
--   select platform, latest, minimum, updated_at from public.app_versions;
