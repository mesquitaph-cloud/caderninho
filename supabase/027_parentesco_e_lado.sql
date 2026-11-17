-- Soneca — parentesco e lado da família (item 47, ampliado pelo item 75; escrito em 17/11/2026).
-- Rodar uma vez no SQL Editor, ANTES de publicar o app que traz a lista nova (1.0.4 nova compilação).
-- O app que já está nas lojas continua funcionando: ele só grava 'mae', 'pai' ou 'outro', que seguem valendo.
--
-- Situação de hoje (conferida no banco em 17/11, só leitura): profiles.caregiver existe desde o 024, aceita
-- só 'mae', 'pai' e 'outro', e está vazia nas 98 pessoas. Por isso a coluna é APROVEITADA, não recriada:
-- o nome fica "caregiver" (o app e o 024 já usam), mas passa a guardar o PARENTESCO. Nenhum dado muda.
--
-- O que muda (só acrescenta):
--   - profiles.caregiver: a lista cresce. Valores (código = o que a pessoa vê):
--       mae = Mãe · pai = Pai · avoa = Avó · avo = Avô · tia = Tia · tio = Tio · prima = Prima ·
--       primo = Primo · baba = Babá · outro = Outro cuidador   (vazio = pulou)
--   - profiles.family_side: o lado da família, em campo SEPARADO, para a árvore da família no futuro.
--       'mae' = Lado da mãe · 'pai' = Lado do pai · vazio = não disse (não há "prefiro não dizer": quem
--       não quer responder pula). Só vale para avó, avô, tia, tio, prima e primo; para Mãe, Pai, Babá e
--       Outro cuidador tem de ficar vazio. O banco recusa a combinação errada.
--   - Quem pode ler e escrever: as mesmas regras do nome (001/003). Cada pessoa grava só o PRÓPRIO perfil
--     (policy "mudar o próprio nome": id = auth.uid()); quem divide família lê (can_see_profile), o que dá
--     "Avó, lado da mãe" na lista de membros. Ninguém edita o parentesco de outro.
--   - Os dois campos são independentes e opcionais. Ao trocar o parentesco para um que não tem lado
--     (ex.: de Avó para Mãe), o app precisa mandar family_side = null junto (o banco recusa se não for).
-- LGPD: parentesco e lado são dado pessoal novo (a relação da pessoa com o bebê e com a família). A Política
-- de Privacidade precisa citar (Patrick, 17/11: não alterar agora). Ver a descrição do PR.
--
-- Item 63 (avisos por pessoa e por celular): NÃO pede SQL. Os avisos já são guardados neste celular (ver o
-- README, item 75). Nada neste arquivo trata disso.

begin;

alter table public.profiles drop constraint profiles_caregiver_check;
alter table public.profiles add constraint profiles_caregiver_check
  check (caregiver in ('mae','pai','avoa','avo','tia','tio','prima','primo','baba','outro'));

alter table public.profiles add column family_side text check (family_side in ('mae','pai'));
-- Lado só para avó, avô, tia, tio, prima e primo.
alter table public.profiles add constraint profiles_family_side_so_parentes
  check (family_side is null or caregiver in ('avoa','avo','tia','tio','prima','primo'));

-- O 003 dá permissão coluna por coluna: a nova entra aqui (a caregiver já tem, do 024).
grant insert (family_side) on public.profiles to authenticated;
grant update (family_side) on public.profiles to authenticated;

commit;

-- Conferir depois de rodar (só números, sem dado de ninguém):
--   select pg_get_constraintdef(oid) from pg_constraint where conname = 'profiles_caregiver_check';   -- lista de 10
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'profiles' and column_name = 'family_side';        -- 1 linha
--   select count(*) from public.profiles where caregiver is not null or family_side is not null;      -- 0 (ninguém respondeu ainda)
