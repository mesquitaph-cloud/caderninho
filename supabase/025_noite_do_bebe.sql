-- Soneca — noite de cada bebê e "Acompanhar o sono" (item 65; decidido com o Patrick em 13/11/2026).
-- Rodar uma vez no SQL Editor, depois do 024 e ANTES de publicar o app novo. O app antigo continua
-- funcionando (não conhece as colunas novas). O app novo, sem este arquivo, também funciona: conta a
-- noite pela regra antiga (18h às 6h, com a hora de dormir no primeiro sono de mais de 3 h), mostra
-- "18h às 6h · padrão" e não consegue salvar outro horário nem desligar o "Acompanhar o sono".
--
-- O que muda (só acrescenta; nenhum registro existente muda):
--   - babies.night: a noite do bebê, com o histórico de cada mudança, para a regra nova valer só daqui
--     para frente. É uma lista em ordem de data, cada item com
--       from   o primeiro dia (AAAA-MM-DD) em que aquele horário vale, contado pela noite que começa nele
--       start  a hora em que a noite começa, de 16 a 23 (horas cheias)
--       end    a hora em que termina, no dia seguinte, de 4 a 9
--     Ex.: [{"from":"2026-11-14","start":18,"end":6},{"from":"2026-11-20","start":20,"end":6}].
--     Os dias antes do primeiro "from" ficam com a regra antiga. Mudar duas vezes no mesmo dia troca o
--     item daquele dia. Recalcular o histórico com o horário do bebê fica para uma segunda etapa.
--     Os bebês que já existem ganham um item com a data de hoje (em Brasília) e 18h às 6h: a regra nova
--     passa a valer para eles a partir de hoje, e os dias antes ficam como estavam. Os bebês novos ganham
--     o mesmo, com a data do cadastro (o app manda a data do celular quando a família escolhe outra hora).
--   - family_settings.sleep_track: "Acompanhar o sono", da família toda. Liga e desliga só a janela de
--     sono (a faixa no cartão do bebê e o aviso no celular). Sem linha da família ou ligado: aparece,
--     como hoje. A noite de cada bebê vale sempre, ligado ou não. O aviso no celular continua também por
--     pessoa (profiles.sleep_alert, do 024): só toca com os dois ligados.
-- Regras de acesso: as mesmas. Qualquer membro muda a noite de um bebê da família e o "Acompanhar o sono".
-- LGPD: nada de dado pessoal novo (é um horário da rotina da casa).

begin;

alter table public.babies add column night jsonb not null default jsonb_build_array(jsonb_build_object(
  'from', to_char((now() at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD'), 'start', 18, 'end', 6));
-- Uma lista, com até 400 mudanças (sobra para anos de uso).
alter table public.babies add constraint babies_night_list
  check (jsonb_typeof(night) = 'array' and jsonb_array_length(night) between 1 and 400);

-- Cada item: data, começo de 16 a 23 e fim de 4 a 9, em horas cheias.
create function public.night_ok(n jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(
    jsonb_typeof(x) = 'object'
    and (x->>'from') ~ '^\d{4}-\d{2}-\d{2}$'
    and jsonb_typeof(x->'start') = 'number' and (x->>'start') ~ '^\d+$' and (x->>'start')::int between 16 and 23
    and jsonb_typeof(x->'end') = 'number' and (x->>'end') ~ '^\d+$' and (x->>'end')::int between 4 and 9
  ), false)
  from jsonb_array_elements(n) x;
$$;
alter table public.babies add constraint babies_night_items check (public.night_ok(night));

alter table public.family_settings add column sleep_track boolean not null default true;

-- O 003 e o 008 dão permissão coluna por coluna: as novas entram aqui.
grant insert (night) on public.babies to authenticated;
grant update (night) on public.babies to authenticated;
grant insert (sleep_track) on public.family_settings to authenticated;
grant update (sleep_track) on public.family_settings to authenticated;

commit;

-- Conferir depois de rodar (não mostra dados de ninguém):
--   select count(*) from public.babies where jsonb_array_length(night) = 1;       -- todos os bebês
--   select count(*) from public.babies where (night->0->>'start')::int <> 18;      -- 0
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'family_settings' and column_name = 'sleep_track';  -- 1 linha
