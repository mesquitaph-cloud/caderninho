-- Soneca — três sintomas novos no botão Sintomas (12/10/2026).
-- Rodar uma vez no SQL Editor, ANTES de publicar o app novo. O app antigo continua funcionando; o
-- novo, sem este arquivo, não salva diarreia, muco nas fezes nem urticária (o resto funciona).
--
-- O que muda:
--   - entries.symptom aceita também 'diarreia', 'muco' (muco nas fezes) e 'urticaria'. Nenhum dos
--     três tem temperatura nem duração; a observação continua opcional.
-- Regras de acesso: as mesmas.

begin;

alter table public.entries drop constraint entries_symptom_check;
alter table public.entries add constraint entries_symptom_check
  check (symptom in ('febre','colica','choro','diarreia','muco','tosse','assadura','urticaria',
                     'vacina','dentes','outro'));

commit;
