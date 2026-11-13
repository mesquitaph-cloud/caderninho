-- Soneca — onboarding novo e janela de sono (itens 40, 46, 47, 57, 60 e 61; 13/11/2026).
-- Rodar uma vez no SQL Editor, ANTES de publicar o app novo. O app antigo continua funcionando (não
-- conhece as colunas novas). O app novo, sem este arquivo, também funciona: só não guarda as respostas
-- abaixo, e a tela inicial fica como hoje (todos os botões, sem Comida).
--
-- O que muda (só acrescenta; nenhum dado existente muda):
--   - profiles: "Você é" de cada pessoa (caregiver: 'mae', 'pai' ou 'outro'; vazio = pulou). É da
--     pessoa, não da família: quem entra por convite responde por si. Os outros membros da família veem,
--     como já veem o nome (serve às frases e à divisão de tarefas).
--   - profiles: sleep_alert, se a pessoa quer o aviso da janela de sono no celular (resposta da tela de
--     sono do onboarding; falso até ela dizer Sim).
--   - babies: o jeito de alimentar, por bebê (gêmeos podem ser diferentes):
--       feeding     'breast' (No peito), 'bottle' (Na mamadeira) ou 'both' (Nos dois); vazio = não respondeu
--       bottle_milk 'breast_milk' (Leite materno), 'formula' (Fórmula) ou 'both' (Os dois); só com mamadeira
--       eats_food   verdadeiro (Já come), falso (Ainda não) ou vazio (não perguntado: menos de 6 meses ou
--                   sem nascimento)
--   - invite_baby: função nova que mostra, na tela do convite, o nome e o nascimento do bebê.
-- Regras de acesso: as mesmas. Cada pessoa muda só o próprio perfil; qualquer membro muda o bebê.
-- LGPD: "Você é" é dado pessoal novo (a relação com o bebê). Falta citar na Política de Privacidade.

begin;

alter table public.profiles add column caregiver text check (caregiver in ('mae','pai','outro'));
alter table public.profiles add column sleep_alert boolean not null default false;

alter table public.babies add column feeding text check (feeding in ('breast','bottle','both'));
alter table public.babies add column bottle_milk text check (bottle_milk in ('breast_milk','formula','both'));
alter table public.babies add column eats_food boolean;
-- Conteúdo da mamadeira só faz sentido com mamadeira.
alter table public.babies add constraint babies_bottle_milk_feeding
  check (bottle_milk is null or feeding in ('bottle','both'));

-- O 003 dá permissão coluna por coluna: as novas entram aqui.
grant insert (caregiver, sleep_alert) on public.profiles to authenticated;
grant update (caregiver, sleep_alert) on public.profiles to authenticated;
grant insert (feeding, bottle_milk, eats_food) on public.babies to authenticated;
grant update (feeding, bottle_milk, eats_food) on public.babies to authenticated;

-- Tela do convite (prévia 3): o nome e o nascimento do primeiro bebê da família, para quem tem o link
-- de um convite que ainda vale (como o invite_info, que já mostra a família e quem convidou). Convite
-- usado, vencido ou inexistente não mostra nada.
create function public.invite_baby(tok text)
returns table (baby_name text, birth_date date)
language sql stable security definer set search_path = '' as $$
  select b.name, b.birth_date
  from public.invites i
  join public.babies b on b.family_id = i.family_id
  where i.token = tok and i.used_at is null and i.expires_at > now()
  order by b.created_at
  limit 1;
$$;
revoke execute on function public.invite_baby(text) from public, anon;
grant execute on function public.invite_baby(text) to authenticated;

commit;

-- Conferir depois de rodar (não mostra dados de ninguém):
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'profiles' and column_name in ('caregiver', 'sleep_alert');   -- as duas
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'babies' and column_name in ('feeding', 'bottle_milk', 'eats_food'); -- as três
--   select count(*) from public.babies where feeding is not null;                                                  -- 0
