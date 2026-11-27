-- Soneca — "Lembrar de começar a rotina da noite?" vira regra da família (item 102; decidido pelo Patrick em
-- 27/11/2026). Rodar uma vez no SQL Editor ANTES de publicar o app novo; ainda NÃO foi rodado.
-- (028 e 029 são de outros ramos.) O app antigo continua funcionando: não conhece a coluna. O app novo, sem
-- este arquivo, também abre: o cartão aparece para todos, mas o interruptor não grava.
--
-- O que muda (só acrescenta; nenhum registro existente muda):
--   - family_settings.night_card: o cartão da rotina da noite no Diário, para a família toda. Sem linha da
--     família ou ligado: aparece. Antes era uma chave de cada celular; quem tinha desligado volta a ver o
--     cartão até alguém da família desligar.
-- Regras de acesso: as mesmas. Qualquer membro liga e desliga.
-- LGPD: nada de dado pessoal novo.
--
-- A noite padrão de bebê novo (19h às 6h) não precisa de SQL: o app grava o horário ao criar o bebê. O padrão
-- da coluna babies.night (025) continua 18h de propósito, para o app antigo, que só grava quando a família
-- escolhe um horário diferente de 18h.

begin;

alter table public.family_settings add column night_card boolean not null default true;

-- O 008 dá permissão coluna por coluna: a nova entra aqui.
grant insert (night_card) on public.family_settings to authenticated;
grant update (night_card) on public.family_settings to authenticated;

commit;

-- Conferir depois de rodar (deve dar 1 linha; não mostra dados de ninguém):
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'family_settings' and column_name = 'night_card';
