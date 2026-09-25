-- Caderninho — qual peito na mamada e o registro de ordenha (25/09/2026).
-- Rodar uma vez no SQL Editor, depois do 003 e ANTES de publicar o app novo: o app novo grava
-- as colunas daqui e, sem elas, não salva nenhum registro. O app antigo continua funcionando.
--
-- Só acrescenta: nenhum registro existente muda, e todos já cumprem as regras novas.
--   - kind aceita 'pump' (ordenha), que sempre tem ml;
--   - side: qual peito ('left', 'right' ou 'both'), na mamada no peito e na ordenha;
--   - left_min e right_min: minutos em cada peito (1 a 180), só na mamada no peito e só se
--     aquele peito estiver marcado.

begin;

alter table public.entries drop constraint entries_kind_check;
alter table public.entries add constraint entries_kind_check
  check (kind in ('feed','sleep','wake','diaper','vomit','other','pump'));

alter table public.entries
  add column side      text    check (side in ('left','right','both')),
  add column left_min  integer check (left_min between 1 and 180),
  add column right_min integer check (right_min between 1 and 180);

-- "is true" porque, no Postgres, uma regra que dá nulo (src ou side vazio) deixaria passar.
alter table public.entries
  add constraint entries_pump_ml        check (kind <> 'pump' or ml is not null),
  add constraint entries_side_kind      check (side is null or kind = 'pump' or (kind = 'feed' and src = 'breast') is true),
  add constraint entries_min_kind       check ((left_min is null and right_min is null) or (kind = 'feed' and src = 'breast') is true),
  add constraint entries_left_min_side  check (left_min is null or (side in ('left','both')) is true),
  add constraint entries_right_min_side check (right_min is null or (side in ('right','both')) is true);

-- As colunas novas entram na lista do 003 (o que o app pode gravar num registro).
grant insert (side, left_min, right_min) on public.entries to authenticated;
grant update (side, left_min, right_min) on public.entries to authenticated;

commit;
