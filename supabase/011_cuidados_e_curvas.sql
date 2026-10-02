-- Soneca — botão Cuidados e curvas de crescimento da OMS (02/10/2026).
-- Rodar uma vez no SQL Editor, ANTES de publicar o app novo. O app antigo continua funcionando; o
-- novo, sem este arquivo, não salva tummy time, banho de sol, outro cuidado, comprimento nem
-- menina/menino, e não deixa desligar o botão Cuidados (o resto funciona).
--
-- O que muda:
--   - entries: três tipos novos no botão Cuidados: 'tummy' (Tummy time) e 'sunbath' (Banho de sol),
--     com os minutos opcionais em duration_min (que já existia para cólica e choro), e 'care' (Outro
--     cuidado), com o que foi feito na observação, obrigatória.
--   - family_settings: o interruptor único 'care' (botão Cuidados). Os antigos 'massage', 'bath' e
--     'nasal' continuam aceitos, para não invalidar o que já está salvo.
--   - weights: vira "medida". O peso passa a ser opcional e entra o comprimento em cm (30 a 130),
--     com um dos dois obrigatório. Os pesos já anotados não mudam.
--   - babies: menina ('F') ou menino ('M'), opcional, só para escolher a curva da OMS.
-- Regras de acesso: as mesmas; só ganham as colunas novas.

begin;

alter table public.entries drop constraint entries_kind_check;
alter table public.entries add constraint entries_kind_check
  check (kind in ('feed','sleep','wake','diaper','vomit','other','pump','med','symptom',
                  'massage','bath','nasal','tummy','sunbath','care'));

alter table public.entries drop constraint entries_symptom_dur;
alter table public.entries add constraint entries_symptom_dur
  -- "is true": sem sintoma, a comparação dá nulo e a regra deixava passar (acontecia antes do 011).
  check (duration_min is null or (symptom in ('colica','choro')) is true or kind in ('tummy','sunbath'));

alter table public.entries add constraint entries_care_note
  check (kind <> 'care' or char_length(btrim(coalesce(note, ''))) > 0);

alter table public.family_settings drop constraint family_settings_hidden_kinds_check;
alter table public.family_settings add constraint family_settings_hidden_kinds_check
  check (hidden_kinds <@ array['med','symptom','pump','care','massage','bath','nasal']::text[]);

alter table public.weights alter column grams drop not null;
alter table public.weights add column cm numeric(4,1) check (cm between 30 and 130);
alter table public.weights add constraint weights_some_measure check (grams is not null or cm is not null);
grant insert (cm) on public.weights to authenticated;
grant update (cm) on public.weights to authenticated;

alter table public.babies add column sex text check (sex in ('F','M'));
grant insert (sex) on public.babies to authenticated;
grant update (sex) on public.babies to authenticated;

commit;
