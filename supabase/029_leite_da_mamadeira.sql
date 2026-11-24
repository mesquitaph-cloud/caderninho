-- 029: leite materno ou fórmula na mamadeira (item 96). Rodar à mão no SQL Editor ANTES de publicar o app; ainda NÃO foi rodado.
--
-- O que o onboarding já grava (024): public.babies.bottle_milk, por bebê, no banco: 'breast_milk' (Leite materno), 'formula' (Fórmula)
-- ou 'both' (Os dois). Esse campo vira o PADRÃO do bebê: a mamadeira nova já começa nele ('both' começa em Leite materno; vazio: nenhum marcado) e o
-- perfil do bebê passa a editá-lo.
--
-- Muda:
--   1. babies_bottle_milk_feeding (024) exigia feeding 'bottle' ou 'both' para ter bottle_milk. Como o perfil agora edita o padrão
--      de qualquer bebê, a regra sai. Os valores aceitos continuam os mesmos.
--   2. entries.milk: o tipo de leite de cada mamadeira, 'breast_milk' ou 'formula'. Pode ficar vazio (null): mamadeiras já registradas
--      ficam sem tipo e os registros que não são mamadeira também.

alter table public.babies drop constraint if exists babies_bottle_milk_feeding;

alter table public.entries add column if not exists milk text check (milk in ('breast_milk','formula'));

-- O 003 dá permissão coluna por coluna: a nova entra aqui.
grant insert (milk) on public.entries to authenticated;
grant update (milk) on public.entries to authenticated;

-- Conferir depois de rodar (devem dar 1 linha e 0 linhas):
--   select column_name from information_schema.columns where table_schema = 'public' and table_name = 'entries' and column_name = 'milk';
--   select conname from pg_constraint where conname = 'babies_bottle_milk_feeding';
