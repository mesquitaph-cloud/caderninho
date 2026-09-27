# Caderninho

App para famílias registrarem a rotina dos bebês (mamadas, sono, fraldas, vômitos, remédios) numa
linha do tempo compartilhada. Site instalável na tela do celular, sem loja. Vocabulário em `CONTEXT.md`.

- **Front:** HTML/CSS/JS puro, sem build. Publicado no Vercel.
- **Back:** Supabase (região São Paulo) — banco, login por código no e-mail, sincronização.
- **Login:** e-mail + código de 6 dígitos (modelos "Confirm sign up" e "Magic link" usam `{{ .Token }}`).
  Entrar com Google está pronto no código, desligado em `config.js` até a configuração abaixo.

## Pendências antes de convidar amigos

- Trocar o remetente dos e-mails (hoje o Gmail profissional do Patrick) por uma conta dedicada. Com a
  indicação a outras famílias, mais gente nova recebe esses e-mails, e o Gmail limita quantos saem por dia.
- Revisão de segurança das regras de acesso do banco (RLS).

## Melhorias de 27/09: feito, falta publicar

Pedidos da conversa de 27/09: remédios, sono x mamada e cocô, peso e marcos, resumo para os pais e
entrar com Google. Tudo no código; detalhes de cada um abaixo.

**Para publicar, nesta ordem:**

1. Rodar `supabase/007_peso_e_marcos.sql` no SQL Editor e conferir pelo conector (seção "Peso e marcos").
2. Publicar o app. Remédios, painel da semana, peso e marcos e o resumo do mês vão juntos; o botão do
   Google continua escondido.
3. Conferir no celular o roteiro de cada seção abaixo.
4. Quando quiser ligar o Google: os passos da seção "Entrar com Google", `GOOGLE_LOGIN = true` em
   `config.js` e publicar de novo.

Testado em 27/09 no navegador com um Supabase de mentira (93 checagens: remédios, Google, painel,
peso e marcos, resumo), claro e escuro, em 360 e 390 px, e o 007 num Postgres local (32 casos).

### Remédios: só perto da hora, Pular e Dei agora

Não muda o banco; basta publicar o app.

- **Cartão da tela inicial:** de cada remédio, só a dose que está a uma hora ou menos do horário, ou
  que passou da hora sem ninguém marcar. Dose marcada ou pulada sai do cartão (antes, mostrava a
  última dose dada e a próxima, mesmo faltando horas). Sem nada perto da hora, o cartão some; o botão
  Remédio continua dizendo "próxima às 16:00". A caixinha aparece uma hora antes (era meia hora).
- **Pular:** botão embaixo da dose perto da hora ou atrasada, para quando não deu. Grava a dose como
  pulada, com "Desfazer". Continua também dentro da dose ("Pular esta dose").
- **Dei agora nos remédios de horário:** na lista de remédios. Se a dose mais recente ficou sem
  marcar, marca ela; senão, adianta a próxima (dose das 20:00 dada às 19:00). Se a próxima está a mais
  de uma hora, o primeiro toque avisa qual dose vai marcar e o segundo marca.
- **Conferir no celular:** programar um remédio de teste com horário daqui a 50 minutos, ver aparecer no
  alto, pular, desfazer, marcar e ver sumir; na lista, "Dei agora" num remédio de horário.
- De passagem: em telas de 360 px, a coluna da direita dos botões de registro passava da margem;
  agora as duas colunas têm a mesma largura. Em 320 px (iPhone SE antigo) ainda aperta.

### Gráfico do dia

Não muda o banco. Pedido na mesma conversa: ver no Dia, de forma gráfica, quantos xixis e cocôs. No
alto da linha do tempo, o dia de 0h a 24h com uma faixa por tipo (sono em barras; mamadas, xixi, cocô
em pontos; ordenha, remédio, vômito e outros só se tiver no dia) e o total à direita. A fralda com xixi
e cocô aparece nas duas faixas. Tocar num ponto abre o registro. Entra no lugar das etiquetas de resumo
do dia; o que não cabe no gráfico (ml na mamadeira, minutos no peito e o último peito) fica numa linha
embaixo dele. Dia sem registro fica sem gráfico.

### Sono, mamada e cocô no painel da semana

Não muda o banco. No fim do painel, o cartão "Os maiores sonos e o que veio antes": os 3 sonos mais
longos dos 7 dias, e para cada um a última mamada (horário, quanto tempo antes e como foi: mamadeira
com ml, peito com minutos) e o último cocô antes de dormir. Tocar num sono abre o dia. Decidido na
implementação: mostrar lado a lado, sem calcular relação nem dizer o que fez dormir mais, porque o
Caderninho não interpreta os registros (`CONTEXT.md`); a família tira as conclusões.

### Peso e marcos

**Para publicar, nesta ordem:**

1. Rodar `supabase/007_peso_e_marcos.sql` no SQL Editor, antes de publicar o app. Sem ele, o app novo
   funciona, mas a tela do bebê avisa que não conseguiu carregar peso e marcos.
2. Conferir pelo conector: tabelas `weights` e `milestones`, regras de acesso, permissões e nenhum erro
   nos logs.
3. Publicar o app e conferir no celular: tocar no nome do bebê, anotar dois pesos (aparece o gráfico),
   anotar um marco pela sugestão, editar e apagar; ver o peso no celular de outro membro.

**Como ficou:**

- **Tela do bebê:** tocar no nome do bebê, no alto, abre peso, marcos e "Nome e nascimento" (antes,
  abria direto a edição do nome). No alto da tela inicial, ao lado da idade, vai o último peso.
- **Peso:** o dia (de hoje para trás, não antes do nascimento), o peso em kg ("5,2" ou "5,235"; em
  gramas também serve) e onde pesou, opcional. A lista mostra a idade naquele dia. Com dois ou mais
  pesos, um gráfico com o valor do último; sem curva de percentil, que compararia com outros bebês.
- **Marcos:** o que aconteceu (livre, com sugestões como "Sorriu" e "Primeiro dente", sem idade
  esperada; as já anotadas somem da sugestão), o dia e uma observação. A lista mostra a idade naquele dia.
- **Banco:** tabelas `weights` (gramas, de 500 g a 30 kg) e `milestones`. Só membros veem, anotam,
  editam e apagam; quem anotou e as datas vêm do banco; bebê e família não mudam ao editar. Não vão
  para a sincronização ao vivo: o app recarrega ao voltar para ele, como os registros.

Testado em 27/09 com um Postgres local imitando o Supabase (rodando 001, 004, 003, 005, 006 e 007):
32 casos de regra de acesso, permissões e limites, incluindo outra família, quem saiu da família e
apagar a família. O app foi testado no navegador com um Supabase de mentira, claro e escuro, em 390 px,
e também sem as tabelas (como antes do 007).

### Resumo da semana e do mês, para mandar à família

Não muda o banco; basta publicar o app.

- **Aba Mês**, ao lado de Dia e Semana: o mês atual (até hoje) ou o anterior, inteiro. Números grandes
  de leite na mamadeira, mamadas (e tempo no peito), sono (e o maior seguido), fraldas (e com cocô) e
  ordenha; embaixo, doses de remédio dadas, peso (de quanto para quanto) e marcos do mês. As setas e o
  calendário escolhem entre os dois meses.
- **Mandar para a família:** embaixo, a prévia do texto e os botões Compartilhar (abre o WhatsApp e
  outros apps do celular) e Copiar texto. No fim do painel da semana, o mesmo para os 7 dias. Exemplo:

  > Setembro de Marina, até 27 set, pelo Caderninho:
  > • 186 mamadas: 11,6 L na mamadeira e 24 h no peito
  > • 393 h de sono; o maior sono seguido foi de 5h29
  > • 186 fraldas, 79 com cocô
  > • Peso: de 4,15 kg (20 ago) para 5,02 kg (20 set)
  > • Marco: Rolou (25 set)
  > Parabéns a quem cuida de Marina por mais um mês de cuidado!

- Decidido na implementação: "de Marina", e não "da"/"do", porque o nome não diz qual (como no resto do
  app); o parabéns vai para quem cuida, sem avaliar o bebê; o leite em litros é só o da mamadeira (o
  peito não tem volume anotado); vômitos ficam de fora do resumo.
- Para o mês anterior sair inteiro, o app passa a carregar os registros desde o dia 1º do mês passado
  (até 62 dias, em vez de 60). O calendário continua mostrando os últimos 60 dias.
- **E-mail automático:** ficou para depois. Plano em "Ideias para depois".

### Entrar com Google

O botão "Continuar com o Google" fica acima do e-mail; o código por e-mail continua igual. A mesma
pessoa, com o mesmo e-mail, cai na mesma conta (o Supabase junta as duas formas de entrar), com as
mesmas famílias. Quem entra pela primeira vez já vem com o nome do Google preenchido, e pode trocar.

**Para ligar, nesta ordem (é tudo com você; o código já está pronto):**

1. **Google Cloud** (console.cloud.google.com): criar um projeto "Caderninho". Em Google Auth Platform:
   - Identidade visual: nome "Caderninho", e-mail de suporte e, em domínios autorizados,
     `vrhgirpklyklhvzwdfiq.supabase.co` e o domínio do app.
   - Público: externo, e "Publicar app" (em teste, só entra quem estiver na lista de testadores). Só
     com e-mail e perfil, o Google não pede verificação.
   - Clientes → Criar cliente → Aplicativo da Web. Origens JavaScript: o endereço do app (ex.:
     `https://caderninho.vercel.app`). URI de redirecionamento:
     `https://vrhgirpklyklhvzwdfiq.supabase.co/auth/v1/callback`. Copiar o ID e a chave secreta.
2. **Supabase:** Authentication → Sign In / Providers → Google: ligar, colar o ID e a chave, salvar.
   Em Authentication → URL Configuration, conferir o Site URL e pôr o endereço do app com `/` no fim
   em Redirect URLs.
3. **App:** em `config.js`, `GOOGLE_LOGIN = true`, e publicar.
4. **Conferir:** entrar com Google no navegador do celular; entrar com uma conta Google de mesmo
   e-mail que já usava o código e ver as mesmas famílias; cancelar no Google e ver o aviso.

**Cuidados:**

- **iPhone com o app instalado:** testar antes de avisar as famílias. O login sai do app para o
  Google e pode terminar no Safari, e não no app instalado (o mesmo risco de um link de login por
  e-mail). Se acontecer, o caminho no app instalado continua sendo o código.
- A tela do Google mostra "vrhgirpklyklhvzwdfiq.supabase.co" como destino. Para mostrar o nome do app
  é preciso um domínio próprio no Supabase (Custom Domain, pago).
- Apple exige conta de desenvolvedor paga; ficou para depois.
- Menos códigos por e-mail aliviam o limite do Gmail, mas não resolvem a primeira pendência: quem entra
  por e-mail e os convites continuam dependendo do remetente.

## Cocô no painel e remédios programados: no ar

Conferido pelo conector em 27/09: a tabela `medicines` existe e registros de remédio estão sendo
gravados, então o 006 foi rodado e o app com remédios está publicado.

Prévia interativa usada para decidir (privada): https://claude.ai/artifact/3oP2guNYqCeZhnMJzAK727

**Para publicar, nesta ordem:**

1. Rodar `supabase/006_remedios.sql` no SQL Editor, **antes** de publicar o app. O app novo grava as
   colunas do registro de remédio em todo registro: sem o 006, não salva nenhum (nem mamada).
2. Conferir pelo conector: tabela `medicines`, regras de acesso, permissões, a marcação única por
   dose e nenhum erro nos logs.
3. Publicar o app e conferir no celular: programar um remédio de teste, ver a dose no alto da tela,
   marcar pela caixinha, ver "dada por…" no celular de outro membro e, no fim, "Parar este remédio".
   No painel da semana, conferir as fraldas com cocô.

**Como ficou:**

- **Cocô no painel da semana:** toda fralda tem o mesmo ponto verde; a com cocô ganha um miolo
  marrom-escuro, com legenda embaixo do gráfico. Em "Dia a dia", a barra de fraldas mostra embaixo, em
  marrom, quantas tiveram cocô. Em "Nestes 7 dias", o maior intervalo entre cocôs. Não muda o banco.
- **Botão Remédio** (lilás, com um lápis no ícone) entre os registros; "Outros" virou uma faixa mais
  baixa embaixo. Abre a tela "Remédios e horários": as doses de hoje, cada uma com caixinha, e os
  remédios programados, com os horários à vista, "Editar" e "+ Programar outro remédio".
- **Programar:** nome, quanto (texto livre, opcional) e quando: horários fixos (até 8), de X em X
  horas (4, 6, 8 ou 12, a partir da primeira dose do dia) ou só quando precisar (com intervalo
  opcional). Por alguns dias (1 a 60, a partir do dia em que foi programado) ou sem data para acabar.
  "Parar este remédio" tira da lista e das doses; os registros ficam.
- **Tela inicial:** o cartão de remédios aparece quando há dose nas últimas ou próximas 24 horas e mostra
  só a última dose e a próxima. Meia hora antes, a próxima ganha a caixinha e fica em destaque ("Hora
  do remédio"); se passar da hora, continua em destaque até alguém marcar ou pular. Uma dose de hoje
  mais antiga que ficou sem marcar vira o aviso "Mais 1 dose de hoje sem marcar".
- **Marcar:** um toque na caixinha marca como dada agora, com "Desfazer". Tocar na dose deixa escolher
  outro horário, escrever uma observação, pular ou desmarcar. Horário de antes de o remédio ser
  programado não vira dose.
- **Duas pessoas marcando juntas:** o banco aceita uma marcação por dose; quem marca depois vê "Alguém
  já marcou esta dose" e o app recarrega mostrando quem deu.
- **Só quando precisar:** botão "Dei agora" e a última vez que foi dado. Com intervalo, mostra a
  partir de que horas pode dar de novo; antes disso, pede um segundo toque ("Marcar mesmo assim").
- **Linha do tempo:** o registro de remédio aparece com o nome, a quantidade e a dose ("dose das 09:00",
  "dose das 09:00 pulada" ou "quando precisou"). Dá para mudar o horário, a observação ou apagar.
- **Banco:** tabela `medicines` (só membros veem e editam; não se apaga pelo app) e, em `entries`, o
  tipo `med` com `medicine_id`, `med_name`, `med_amount`, `dose_at` e `skipped`. Os dois vão para a
  sincronização ao vivo.
- **Decidido não fazer agora:** aviso no celular com o app fechado (exige servidor de envio e, no
  iPhone, o app instalado) e remédios no painel da semana.

Testado em 26/09 com um Postgres local imitando o Supabase (rodando 001, 004, 003, 005 e 006): 39
casos de regra de acesso, permissões e regras dos dados, incluindo outra família, dose marcada duas
vezes e apagar a família. O app foi testado no navegador com um Supabase de mentira em memória,
claro e escuro, em 390 px: marcar pelo cartão e pela lista, dose já marcada por outra pessoa,
intervalo do só quando precisar, programar e editar remédio, linha do tempo e painel da semana.

## Feito recentemente

- **25/09, peito na mamada e ordenha:** no ar. Prévia usada para decidir:
  https://claude.ai/artifact/RM2MDniYfSfwCAZciyz9py. Banco: `supabase/004_peito_e_ordenha.sql`.
- **25/09, `supabase/003_endurece_colunas.sql` rodado:** quem está logado só grava nas colunas que o
  app usa (antes, gravava em qualquer uma). Conferido pelo conector, sem erro de permissão nos logs.

## Painel da semana, calendário e sugestões: feito, falta publicar

Prévia interativa usada para decidir (privada): https://claude.ai/artifact/AsJs7ewJnFY3Jfhn3yoTUP

**Para publicar, nesta ordem:**

1. ~~Rodar `supabase/005_feedback.sql` no SQL Editor.~~ Rodado em 25/09. Conferido pelo conector:
   tabela, regra de acesso, permissões e trava como no arquivo, sem erro nos logs.
2. Publicar o app e conferir no celular: aba Semana, calendário na data e uma mensagem de teste.
3. Ver a mensagem de teste chegar (consulta abaixo).

**Como ficou:**

- **Painel da semana:** aba "Dia | Semana" logo abaixo dos botões de registro (`week.js`). Sempre 7
  dias, terminando no dia escolhido; as setas andam 7 dias, sem passar dos 60 que o app carrega.
  - "Como foram os dias": uma linha por dia, de 0h a 24h, hoje no alto. Sono em barras; mamadas,
    fraldas e ordenhas em marcas, com filtro por tipo. Tocar num dia abre a linha do tempo dele.
  - "Média por dia": sono (e o maior sono seguido), mamadas (tempo no peito e ml na mamadeira),
    fraldas (quantas com cocô) e ordenhas (ml por dia). Não conta hoje nem dia sem nenhum registro
    (decidido na implementação: numa família que começou há 3 dias, a média de 7 sairia pela metade).
  - "Dia a dia": uma barra por dia de sono, mamadas, fraldas ou ml de ordenha; hoje mais claro.
  - "Nestes 7 dias": maior sono seguido, maior intervalo entre mamadas, vezes em cada peito nas
    mamadas e total ordenhado.
  - Trocar de aba mantém a semana se o dia aberto estiver nela: dá para abrir um dia e voltar.
- **Calendário:** tocar na data abre o mês, com ponto nos dias com registros, hoje com contorno e,
  no modo Semana, os 7 dias destacados. Só os últimos 60 dias, nada no futuro, e "Ir para hoje".
- **Sugestões e problemas:** seção no menu, depois de "Indicar o Caderninho". Tipo opcional,
  texto de até 1000 caracteres, aviso do que vai junto e "Recebido, obrigado!". O rascunho fica
  guardado se o menu fechar sem querer.
  - Banco: tabela `feedback` com quem mandou, família, tipo (`idea`, `bug` ou vazio), texto
    (`message`), aparelho e data. Quem mandou e a data são preenchidos pelo banco. Pelo app, só dá
    para enviar. Até 10 mensagens por pessoa a cada 24 horas.
  - Aparelho: montado pelo app, por exemplo "iPhone · iOS 18.5 · Safari · app instalado".
  - Para ler: Table Editor → `feedback`, ou a consulta no fim de `005_feedback.sql`, que já traz o
    nome de quem mandou e da família. O e-mail está em Authentication → Users.
  - Aviso por e-mail de mensagem nova: depende do remetente dedicado (primeira pendência).
  - A trava do Claude pede confirmação para ler a coluna `message`.

Testado em 25/09 com um Postgres local imitando o Supabase (rodando 001, 004, 003 e 005): envio,
bloqueio de leitura e edição, família de outra pessoa, limite por dia e conta apagada. O app foi
testado no navegador com 45 dias de registros de exemplo, claro e escuro, em telas de 360 e 390 px.

## Ideias para depois

- **Resumo por e-mail, todo mês ou toda semana.** O texto já existe no app (aba Mês); falta mandar
  sozinho. Precisa, nesta ordem: (1) o remetente dedicado da primeira pendência, com domínio próprio e
  um serviço de envio (Resend, Postmark ou parecido), com os registros de DNS; (2) uma função no
  Supabase que monte o resumo de cada família no servidor, com a chave `service_role` (ignora as
  regras de acesso: é a parte mais sensível); (3) o agendamento com `pg_cron`; (4) cada membro
  escolher se quer receber, e um link de "não quero mais" em todo e-mail; (5) o fuso da família
  (o servidor roda em UTC). Dado de saúde de criança sai do app e fica na caixa de e-mail: decidir
  o que vai no e-mail (talvez só os números, sem remédios).

- Aviso no celular na hora do remédio, mesmo com o app fechado.
- Remédios no painel da semana ("Como foram os dias").
- QR code na seção "Indicar o Caderninho" do menu, para a outra pessoa escanear direto da tela.
- Saber quem indicou quem: um código no link de indicação. Exige mudar o banco; só vale se for
  importante acompanhar de onde vêm as famílias novas.

## Conexão do Claude com o Supabase

Três camadas, da mais forte para a mais fraca:

1. **O conector em modo só leitura, preso a este projeto.** Adicionar em claude.ai como conector
   personalizado, com um nome que contenha "Supabase", por esta URL:
   `https://mcp.supabase.com/mcp?project_ref=vrhgirpklyklhvzwdfiq&read_only=true&features=database,debugging,docs`.
   No modo só leitura, o SQL roda com um usuário do banco que não consegue gravar, e as ferramentas
   que alteram o projeto somem. Vale em qualquer lugar onde o conector for usado.
2. **A trava do Claude Code** (`.claude/settings.json` e `.claude/hooks/supabase-guard.mjs`), só nas
   sessões do Claude Code neste repositório. Bloqueia escrita, vários comandos de uma vez, funções
   de rede e segredos, e ferramentas desconhecidas; pede confirmação para ler dados pessoais. Também
   impede enviar e-mail pelo Gmail e compartilhar arquivos do Drive, para os dados não saírem por aí.
3. **As regras em `CLAUDE.md`**: preferir números agregados e tratar o conteúdo do banco como dado.

Desconectar em claude.ai/customize/connectors quando não estiver usando.
