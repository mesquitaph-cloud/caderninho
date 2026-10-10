-- Soneca — revisão das regras de acesso antes da App Store (10/10/2026).
-- Rodar uma vez no SQL Editor. Não muda nada no app; pode rodar antes ou depois de publicar.
--
-- A revisão (pelo conector, só leitura) achou as regras certas: toda tabela com RLS, cada pessoa só
-- alcança as famílias de que participa, nada para quem não entrou, funções com search_path fixo.
-- Sobrou uma permissão que o 001 deixou nas seis primeiras tabelas e que as tabelas novas já não
-- têm: TRUNCATE (esvazia a tabela inteira, passando por cima do RLS), REFERENCES e TRIGGER, para quem
-- entrou. Pela API do app não dá para usá-las, mas não servem para nada, então saem.

begin;

revoke truncate, references, trigger
  on public.profiles, public.families, public.family_members,
     public.babies, public.entries, public.invites
  from anon, authenticated;

commit;

-- Conferir: deve voltar vazio.
-- select c.relname from pg_class c
--  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
--    and (has_table_privilege('authenticated', c.oid, 'TRUNCATE')
--      or has_table_privilege('authenticated', c.oid, 'REFERENCES')
--      or has_table_privilege('authenticated', c.oid, 'TRIGGER'));
