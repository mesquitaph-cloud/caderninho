# Caderninho

App para famílias registrarem a rotina dos bebês (mamadas, sono, fraldas, vômitos, remédios) numa
linha do tempo compartilhada. Site instalável na tela do celular, sem loja. Vocabulário em `CONTEXT.md`.

- **Front:** HTML/CSS/JS puro, sem build. Publicado no Vercel.
- **Back:** Supabase (região São Paulo) — banco, login por código no e-mail, sincronização.
- **Login:** e-mail + código de 6 dígitos (modelos "Confirm sign up" e "Magic link" usam `{{ .Token }}`).

## Pendências antes de convidar amigos

- Trocar o remetente dos e-mails (hoje o Gmail profissional do Patrick) por uma conta dedicada. Com a
  indicação a outras famílias, mais gente nova recebe esses e-mails, e o Gmail limita quantos saem por dia.
- Revisão de segurança das regras de acesso do banco (RLS).

## Cocô no painel e remédios programados: feito, falta publicar

Prévia interativa usada para decidir (privada): https://claude.ai/artifact/3oP2guNYqCeZhnMJzAK727

**Para publicar, nesta ordem:**

1. ~~Rodar `supabase/006_remedios.sql` no SQL Editor, **antes** de publicar o app.~~ Rodado em 26/09.
   O app novo grava as colunas do registro de remédio em todo registro: sem o 006, não salva nenhum.
2. ~~Conferir pelo conector.~~ Conferido em 26/09: tabela `medicines` com regras de acesso, trava e
   permissões como no arquivo (membro lê, programa e edita; ninguém apaga; deslogado não vê), tipo
   `med` e marcação única por dose em `entries`, as duas tabelas na sincronização ao vivo. Sem erro
   nos logs.
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
