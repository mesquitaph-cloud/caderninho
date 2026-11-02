-- Soneca — Arroto no botão Cuidados (02/11/2026).
-- Rodar uma vez no SQL Editor, ANTES de publicar o app novo. O app antigo continua funcionando; o
-- novo, sem este arquivo, não salva o arroto (os outros cuidados salvam normalmente).
--
-- O que muda:
--   - entries: tipo novo 'burp' (Arroto) e coluna nova burp, com o que a família marcou: 'put' (Pôs
--     para arrotar), 'done' (Arrotou) ou 'both' (os dois no mesmo registro). Obrigatória no arroto e
--     vazia em todo o resto. Sem minutos: cada registro é só o momento.
-- Regras de acesso: as mesmas; só ganham a coluna nova.

begin;

alter table public.entries drop constraint entries_kind_check;
alter table public.entries add constraint entries_kind_check
  check (kind in ('feed','sleep','wake','diaper','vomit','other','pump','med','symptom',
                  'massage','bath','nasal','tummy','sunbath','care','burp'));

alter table public.entries add column burp text check (burp in ('put','done','both'));
alter table public.entries add constraint entries_burp_kind
  check ((kind = 'burp') = (burp is not null));

grant insert (burp) on public.entries to authenticated;
grant update (burp) on public.entries to authenticated;

commit;
