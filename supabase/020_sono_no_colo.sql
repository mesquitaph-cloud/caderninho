-- Soneca — quanto tempo o bebê dormiu no colo (02/11/2026).
-- Rodar uma vez no SQL Editor, ANTES de publicar o app novo. O app antigo continua funcionando; o
-- novo, sem este arquivo, não salva o tempo no colo (o resto do sono salva normalmente).
--
-- O que muda:
--   - entries: coluna nova lap_min, os minutos no colo (1 a 600), opcional, só no "Dormiu" e no
--     "Acordou". Os registros já salvos ficam sem valor.
-- Regras de acesso: as mesmas; só ganham a coluna nova.

begin;

alter table public.entries add column lap_min integer check (lap_min between 1 and 600);
alter table public.entries add constraint entries_lap_sleep
  check (lap_min is null or kind in ('sleep','wake'));

grant insert (lap_min) on public.entries to authenticated;
grant update (lap_min) on public.entries to authenticated;

commit;
