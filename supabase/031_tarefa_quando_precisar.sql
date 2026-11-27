-- Soneca — Tarefa "Quando precisar" (item 113, 27/11/2026).
-- Rodar uma vez no SQL Editor, DEPOIS do 023 e ANTES de publicar o app novo. O app antigo continua
-- funcionando; o novo, sem este arquivo, só não salva tarefa "Quando precisar" (o resto funciona).
-- Prévia aprovada: https://claude.ai/artifact/453mJZ8RsnMHVT5Gsb4A42
--
-- O que muda:
--   - routines.schedule aceita 'need' (quando precisar): sem horário e sem número de vezes. Não gera
--     aviso nem entra no contador de pendentes; a família marca com "Marcar agora".
-- Nenhum dado é alterado e as regras de acesso ficam como estão.
-- No app antigo, uma tarefa dessas aparece com o rótulo "na troca de fralda" até o celular atualizar.

begin;

alter table public.routines drop constraint routines_schedule_check;
alter table public.routines
  add constraint routines_schedule_check check (schedule in ('fixed','count','diaper','need')),
  add constraint routines_need_check check (schedule <> 'need' or (times is null and per_day is null));

commit;

-- Conferir depois de rodar (não mostra dados de ninguém):
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conname in ('routines_schedule_check', 'routines_need_check');   -- as duas, com 'need'
