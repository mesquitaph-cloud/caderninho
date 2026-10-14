# Soneca

Antes Caderninho. App para famílias registrarem a rotina dos bebês (mamadas, sono, fraldas, vômitos, remédios) numa
linha do tempo compartilhada. Site instalável na tela do celular, sem loja. Vocabulário em `CONTEXT.md`.

- **Front:** HTML/CSS/JS puro, sem build. Publicado no Vercel.
- **Back:** Supabase (região São Paulo) — banco, login por código no e-mail, sincronização.
- **Login:** e-mail + código de 6 dígitos (modelos "Confirm sign up" e "Magic link" usam `{{ .Token }}`).
  Entrar com Google (site e app) e com a Apple (só no app do iPhone), ligados em `config.js`.

## Pendências antes de convidar amigos

- Trocar o remetente dos e-mails (hoje o Gmail profissional do Patrick) por uma conta dedicada. Com a
  indicação a outras famílias, mais gente nova recebe esses e-mails, e o Gmail limita quantos saem por dia.
- Regras de acesso do banco (RLS): revisadas em 10/10 e 016 rodado em 11/10 (abaixo).
- Sintomas novos (diarreia, muco nas fezes, urticária): `supabase/017_sintomas_novos.sql` já rodado (conferido pelo conector em 12/10).
- Privacidade (LGPD): Política de Privacidade e Termos de Uso revisados pelo advogado (07/10); páginas e
  aceites no código, 015 rodado, falta publicar o app. O que ainda falta está na seção "LGPD" abaixo.

## Ajustes de 11/10 (no código, falta publicar)

Pedidos do Patrick antes da App Store. Prévia aprovada (privada): https://claude.ai/artifact/RxKax5wEmB2WgcXSJDgi8r

Não muda o banco; basta publicar.

- **Média diária de sono no mês:** o cartão Sono do resumo do mês vira "Sono por dia" (média dos dias que
  terminaram e têm registro, como no painel da semana), com o total do mês e o maior sono seguido embaixo.
  O texto para mandar ganha "(13h20 por dia)".
- **Para a idade do bebê:** cartão novo no painel da semana (depois de "Média por dia") e no resumo do mês,
  com a faixa de referência e o ponto da média. Sono por dia, com as sonecas (National Sleep Foundation,
  2015): 14 a 17 h até 3 meses, 12 a 15 h de 4 a 11 meses, 11 a 14 h de 1 a 2 anos. Fraldas com xixi:
  6 ou mais por dia a partir do 6º dia (Academia Americana de Pediatria). Cocô fica de fora (varia
  demais). Só com o nascimento anotado; some depois dos 2 anos. Não diz acima nem abaixo.
- **Marcos em faixa:** na aba do bebê › Marcos, as faixas da OMS dos seis marcos motores (WHO Motor
  Development Study, 2006, percentis 1 a 99), de 0 a 18 meses, com a linha de hoje e o ponto do marco
  anotado; a lista mostra a faixa ao lado. Sem nascimento, só as faixas, com o aviso de onde anotar.
  As sugestões passam a usar os nomes da OMS ("Ficou em pé com apoio", "Andou com apoio", "Ficou em pé
  sozinho", "Andou sozinho"); marcos antigos "Ficou em pé" e "Primeiros passos" ficam sem faixa.
- **Alerta marrom:** "vazou da fralda" virou "aperte em caso de emergência".
- **Fora:** o relatório para pediatra não muda. Avisos nos outros celulares ficaram para depois
  (decidido em 11/10).
- **Conferir no celular:** o mês e a semana com o cartão "Para a idade"; a aba do bebê com e sem
  nascimento; a fralda com cocô.

Testado em 11/10 no navegador com um Supabase de mentira: claro e escuro, 390 px, com e sem nascimento,
mês atual e anterior, sem rolagem para o lado e sem erros; a conferência de identidade do `CLAUDE.md` passa.

## Política, Termos e aceites (07/10, no código, falta publicar)

Prévias aprovadas (privadas): páginas https://claude.ai/artifact/LgiAW4qTtok63X8T5yw641 e aceites
https://claude.ai/artifact/1xKVtsyNF485sSZGwpsfMr (sem a caixinha separada de amamentação: Mamada, Sono e
Fralda continuam sempre completos, e a autorização da amamentação está na caixinha do bebê).

`supabase/015_aceites.sql` rodado em 07/10 e conferido pelo conector (tabela `consents` vazia, gatilhos
`consents_guard` e `member_left`, trava dos registros nova). Falta só publicar o app.

- **Páginas públicas:** https://soneca.app.br/privacidade e https://soneca.app.br/termos (pastas com `index.html`, os estilos do app e `legal.js`
  para seguir o claro ou escuro escolhido no Perfil). Texto da versão 1.0, revisado pelo advogado. Links na
  entrada. Ao mudar o texto: subir `TERMS_VERSION` no `app.js`, guardar a versão antiga em
  `privacidade/1.0.html` e listar no rodapé.
- **Aceites:** caixinha na tela do nome (primeiro acesso); tela "Política e Termos do Soneca" para quem já
  usa e a cada versão nova; cartão "Dados do bebê e de saúde" ao criar a família, ao adicionar bebê e, nas
  famílias que já existem, para quem criou, antes de abrir; compromisso de quem entra por convite. Cada um
  vai para `consents` (só acrescenta; a prova fica mesmo depois de apagar a conta).
- **Perfil › Privacidade:** política, termos, "Cópia dos seus dados" e "Falar com o encarregado" (abrem um
  e-mail endereçado), e a versão aceita com a data.
- **Sair da família sem deixar o nome:** quem sai ou é removido deixa registros, remédios, medidas, marcos e
  dúvidas na família sem autor (gatilho `member_left` do 015). O segundo toque de "Sair da família" avisa.
- **Conferir no celular:** a tela de aceite e a dos dados do bebê na sua família; Perfil › Privacidade (os
  links abrem as páginas e o e-mail); sair da família com uma conta de teste e ver o registro dela sem nome.

Testado em 07/10: o 015 num Postgres local com todos os arquivos de `supabase/` (aceite não se edita nem se
apaga pelo app, a conta e a hora vêm do banco; sair e ser removido tiram o autor de registros, medidas e
dúvidas; apagar a conta e apagar a família continuam funcionando); o app no navegador com um Supabase de
mentira, claro e escuro, 390 px (32 checagens: cada caixinha obrigatória, aceites gravados, membro sem a
tela do bebê, páginas sem rolagem para o lado).

## App do iPhone (Capacitor), começo (11/10, no código)

O mesmo código do site, dentro de um app nativo, com os arquivos no próprio app (a Apple recusa app que
só abre um site). Bundle ID `br.app.soneca`, só iPhone, só em pé, região pt-BR, criptografia isenta já
declarada no `Info.plist`.

- **Sem nada de fora:** a biblioteca do Supabase (`vendor/supabase-js-2.117.1.js`, a mesma versão, num
  arquivo só) e a DM Sans (`fonts/`, variável, licença OFL) passam a vir do próprio site, no site também.
  Saem o jsDelivr e o Google Fonts da política de segurança das páginas. Testado em 11/10 no navegador:
  claro e escuro, a fonte carrega e nenhuma chamada sai para fora.
- **Montar o app:** `npm install` uma vez; depois `npm run ios` (copia o site para `www/` e atualiza
  `ios/`). O projeto do Xcode fica em `ios/App` (pacotes pelo Swift Package Manager, sem CocoaPods).
  Compilar e enviar à Apple é na nuvem (Codemagic), porque não há Mac: `codemagic.yaml` (12/10), só ao
  clicar em "Start new build". Faz `npm ci`, `npm run ios`, assina com a chave da App Store Connect
  cadastrada no Codemagic como `soneca.asc` (Integrations → Developer Portal) e manda para o TestFlight (teste
  interno, sem revisão beta), com o número da compilação seguinte ao último do TestFlight. O esquema `App` fica compartilhado em
  `ios/App/App.xcodeproj/xcshareddata`.
- **Site:** continua sem build. O `.vercelignore` deixa fora da Vercel o que não é do site (`ios/`,
  `scripts/`, `supabase/`, os `.md` e o `package.json`, para a Vercel não tentar instalar nada).

- **Ícone e abertura (12/10):** prévia aprovada (privada): https://claude.ai/artifact/HQG9RW4a4cCcaJq3tHvGLN.
  Ícone de 1024 px igual ao do site (céu do sono e capivara marrom), com a versão para ícones escuros do
  iOS (fundo da noite, capivara azul-céu). Abertura com a capivara e o nome, creme de dia e cinza-azulado
  de noite, trocando com o modo do celular. Gerados por `scripts/icones.mjs`.
- **Convites (decidido em 12/10):** o link de convite abre o app; quem não tem o app cai numa página do
  Soneca com o botão da App Store e "depois de instalar, toque no link de novo". O link de indicar leva
  à App Store. Precisa do domínio próprio `soneca.app.br` (o Patrick vai comprar), que fica no ar só com
  a Política, os Termos, a página de convite e o arquivo que liga o link ao app. Prévia antes de programar.

**Relatório em PDF no app (13/10, no código):** "Emitir PDF" abre a folha de imprimir do iPhone pelo plugin
`@capgo/capacitor-printer` (`printWebView`, com as mesmas regras de impressão da página), que tem "Salvar em
Arquivos" e "Compartilhar". No site, continua o imprimir do navegador. Conferir no iPhone se a folha sai igual.

**Página da loja:** textos, respostas do App Privacy e notas para a revisão em `APP-STORE.md`.

**Enviado para a revisão da Apple (14/10):** versão 1.0, compilação 2 (do `main`, com a Política 1.3, sem a
dica de instalar e com o PDF pelo imprimir do iPhone), só Brasil, grátis, publicação manual depois da
aprovação. Imagens em `loja/app-store-6.3/`. Durante a revisão, não mexer na conta do revisor nem rodar o 013.
Fica para depois do lançamento: o teste de apagar a conta que entrou com a Apple (passo 5 abaixo), os modelos
de e-mail do Supabase ainda com "Caderninho" (Authentication → Emails → Templates e o Sender name), o aviso
do remédio com o app fechado, os links de convite, o remetente próprio e a Play Store.

**Ainda falta no app:** links de convite e de indicação; o aviso do remédio com o app fechado.

**TestFlight (14/10):** a compilação do Codemagic já roda e o app está no iPhone de quem testa. Entrar com
a Apple e com o Google conferidos no iPhone. Falta conferir lá: o PDF do relatório e o passo 5 do
cancelamento da Apple (abaixo).

**Sem dica de instalar (14/10):** saiu o aviso "Para usar como app: toque em Compartilhar… Adicionar à
Tela de Início" (aparecia também dentro do app do iPhone), com o botão "Instalar o Soneca" do Android.
O texto de indicar não diz mais "Não precisa baixar na loja". As sugestões dizem "app do iPhone" ou
"no navegador".

**Domínio (14/10):** `soneca.app.br` no ar. O `vercel.json` leva `caderninho-bay.vercel.app/privacidade`
e `/termos` para o domínio novo (o resto do endereço antigo continua igual, para ninguém perder a
entrada). Na App Store, a política é `https://soneca.app.br/privacidade`.

## Revisão das regras de acesso (10/10; 016 rodado em 11/10)

Feita pelo conector, só lendo regras, funções, permissões e ligações (nenhum dado de família). Tudo certo:
as 13 tabelas com RLS; quem não entrou não alcança tabela nem função; cada regra pede ser membro (ou quem
criou, para convidar, remover e apagar); famílias e membros só nascem pelas funções `create_family` e
`accept_invite`; as travas fixam autor, família e bebê ao editar; as ligações de bebê com família
impedem um registro de apontar para o bebê de outra família; convites com 64 caracteres aleatórios e
7 dias; o tempo real (registros, remédios e botões) segue as mesmas regras; nenhum arquivo guardado.

- **Corrigir:** as seis primeiras tabelas ainda davam TRUNCATE, REFERENCES e TRIGGER a quem entrou.
  Pela API do app não dá para usar, mas saem: `supabase/016_revisao_acessos.sql`, no SQL Editor,
  rodado em 11/10 e conferido pelo conector (nenhuma tabela dá mais TRUNCATE; a leitura continua).
- **Avisos do Supabase que ficam:** as 7 funções chamadas pelo app (é de propósito; todas conferem quem
  chama) e "senhas vazadas" desligado, que só vale para a conta da revisão (a das famílias é por código).

## Conta de demonstração para a revisão da Apple (07/10, no código, falta publicar)

O revisor da Apple não recebe o código no e-mail, então entra com senha. Prévia aprovada (privada):
https://claude.ai/artifact/Di5shtYzm6ZieXcAHLXfJY

- **Para as famílias, nada muda.** Só com o e-mail da revisão (o apelido `+revisao` do Gmail do
  Patrick), "Receber código" vira o pedido de senha, e nenhum e-mail sai. O endereço não fica no site:
  `config.js` guarda só o SHA-256 dele (`DEMO_EMAIL_SHA256`).
- **Criar a conta:** Supabase › Authentication › Users › Add user › Create new user, com o e-mail da
  revisão, uma senha forte e "Auto Confirm User". A senha vai só no formulário da Apple (App Review
  Information), nunca no código.
- **Dados de exemplo:** logo antes de mandar para a revisão, rodar `supabase/013_conta_da_revisao.sql`.
  Apaga e monta de novo a "Família Revisão" (Theo, 4 meses, 3 semanas de mamadas, sono, fraldas,
  vitamina D, duas medidas e um marco), com as datas contadas a partir do dia em que roda.
- **Se o revisor apagar a conta:** criar de novo no painel e rodar o 013 outra vez.
- **Feito em 14/10:** conta criada (confirmada) e 013 rodado; pelo conector, 1 família, 1 bebê e 528
  registros até 14/10. A entrada com senha conferida no iPhone. Sem aceites gravados: o revisor passa
  pelas telas de aceite na primeira entrada (dito nas notas do `APP-STORE.md`). Rodar o 013 de novo no
  dia do envio.

Testado em 07/10: o 013 rodado duas vezes num Postgres local com todos os arquivos de `supabase/`
(fica uma família só); a entrada no navegador com um Supabase de mentira (e-mail comum recebe código,
o da revisão pede senha, senha errada, senha certa), claro e escuro, 390 px.

## Apagar a conta (07/10, no ar)

Exigência da Apple (regra 5.1.1) e da LGPD. Prévia aprovada (privada): https://claude.ai/artifact/Qpu3Mpad93wJ4GQ9hwGcMc

`supabase/012_apagar_conta.sql` e `supabase/014_apagar_conta_travas.sql` rodados em 07/10 (o 014 em duas
partes, porque o editor cortava o texto; as cinco travas conferidas pelo conector). Sem o 014, apagar a conta falhava para quem anotou algo numa família que continua (as travas de edição
devolviam o autor que a ligação do banco tentava esvaziar). Encontrado em 07/10 num Postgres local com
todos os arquivos de `supabase/`; com o 014, a família compartilhada passa para quem entrou antes, os
registros, remédios, medidas, dúvidas e botões ficam sem o autor, e a trava continua impedindo mudar
o autor pelo app.

- **Perfil:** "Apagar minha conta" no fim, embaixo de "Desconectar deste celular". Abre uma folha com o que
  acontece com cada família e pede um segundo toque. Depois, volta para a entrada com o aviso "Conta apagada".
- **Família com outras pessoas:** passa para o membro mais antigo depois de quem saiu (decidido em 07/10;
  antes, a família era apagada junto com o criador). Família só com a pessoa: apagada, com bebês e
  registros. Família em que entrou por convite: ela sai, e o que anotou fica sem o autor. As sugestões
  que mandou são apagadas.
- **Conferir no celular:** com uma conta de teste que criou uma família e convidou outra conta, apagar a
  primeira e ver, na segunda, a família continuar com ela como criadora.

Testado em 07/10 no navegador com um Supabase de mentira: claro e escuro, 390 px, as três situações de
família (a herdeira é quem entrou antes, mesmo fora de ordem na lista), os dois toques e o aviso na entrada.

## Apagar bebê de volta à vista (06/10, no ar)

Com as abas de 01/10, a linha do bebê em Família passou a abrir a aba do bebê, e o "Apagar bebê" ficou
escondido em Nome e nascimento › Editar. Agora fica também no fim da aba do bebê, só para quem criou a
família (é a regra do banco); o toque abre a edição já na confirmação de sempre. Prévia aprovada
(privada): https://claude.ai/artifact/RqQw9t9eXQchY5Dp2uBvkX

Não muda o banco; basta publicar. **Conferir no celular:** com quem criou a família, o botão no fim da
aba do bebê, Cancelar e Apagar; com outro membro, o botão não aparece.

Testado em 06/10 no navegador com um Supabase de mentira: claro e escuro, 390 px, criador e não
criador, cancelar e apagar o único bebê (a aba volta para "Adicionar bebê").

## Cuidados, botão +, noite cinza-azulada e curvas da OMS (02/10, no ar; SQL 011 conferido no banco em 07/10)

Pedidos de 02/10 (Patrick, Carol e Fabi). Prévia aprovada (privada): https://claude.ai/artifact/TR5E1huU9uh2zqnS6wLPT3
Comparações que levaram às escolhas: cores e temas https://claude.ai/artifact/LQmfEU7PSHUzw6G1SboFTg,
crescimento, noite e botão + https://claude.ai/artifact/V32VWJQhf1tDE4zHcQywyS

**Para publicar:** rodar `supabase/011_cuidados_e_curvas.sql` no SQL Editor antes do app. Sem ele, o app
não salva tummy time, banho de sol, outro cuidado, comprimento nem menina/menino, e não deixa desligar
Cuidados; o resto funciona. Conferir pelo conector: as regras `entries_kind_check`, `entries_symptom_dur`,
`entries_care_note`, `weights_some_measure` e as colunas `weights.cm` e `babies.sex`.

- **Botão Cuidados:** um só, como Remédio, no lugar de Massagem, Banho e Lavagem nasal. O + abre a
  escolha: Massagem, Banho, Lavagem nasal, Tummy time, Banho de sol e Outro (texto livre, obrigatório).
  Tummy time e banho de sol podem ter os minutos (atalhos de 3, 5, 10 e 15). Na linha do tempo, cada um
  com o nome próprio; no resumo, "Cuidados: 2 tummy times (22 min), 1 banho". Em Família › Botões, um
  interruptor só; quem tinha os três antigos desligados continua sem o botão.
- **Tocar anota, a listinha mostra:** tocar no botão de registro anota; a listinha (três linhas com
  pontos) no alto, ao lado do ícone, abre **os últimos 3 dias** daquele registro (hoje, ontem e
  anteontem, com hora, detalhe e quem anotou; tocar numa linha edita; embaixo, "+ Anotar"). Antes era
  o contrário, com um + no canto. Outros e Editar continuam como eram.
- **Noite cinza-azulada**, como o WhatsApp (fundo `#111B21`), no lugar do azul-noite. As cores dos
  botões não mudam. Contraste conferido: textos de 4,9 a 14,8 : 1.
- **Menina ou menino:** opcional, ao criar a família, ao adicionar e ao editar o bebê. Serve só para a
  curva da OMS; mudar troca a curva na hora.
- **Peso e comprimento:** "Anotar peso" vira "Anotar medida" (peso, comprimento ou os dois). Na aba do
  bebê, as abas Peso e Comprimento, sobre as curvas da OMS (percentis 3, 15, 50, 85 e 97, as mesmas das
  folhas da OMS, conferidas valor a valor), com 6 meses, 1 ano, 2 anos e 5 anos, pinça e rodinha para
  zoom e arrastar para os lados. Sem nascimento ou sem menina/menino, só os pontos, com o aviso de onde
  anotar. As tabelas da OMS vão no app (`who.js`).
- **Relatório para pediatra:** com nascimento e menina/menino, peso e comprimento lado a lado sobre as
  curvas, na folha clara; o texto para copiar ganha o comprimento.
- **Conferir no celular:** o toque no botão (anota) e na listinha (últimos 3 dias) em cada registro; Cuidados com tummy time e
  minutos, banho de sol e Outro; desligar e ligar Cuidados em Família; menina/menino ao criar, adicionar
  e editar; o gráfico com pinça no iPhone e no Android; o relatório em PDF com as duas curvas; a noite
  nova (Perfil › Escuro).

Testado em 02/10 no navegador com um Supabase de mentira (29 checagens, claro e escuro, 390 px, sem
rolagem para o lado) e o 011 num Postgres local imitando o Supabase, rodado sobre dados antigos (19
casos). Pelo conector, nenhum registro do banco fica fora da regra de minutos, que ficou mais rígida.

## Plano até as lojas (até 30/11)

Ideias e pendências por impacto e esforço, e o calendário de 60 dias (privado):
https://claude.ai/artifact/XJ9WgoF4DYKftixXP57Umc. Primeiro, para tirar atrito do login: ligar Entrar
com o Google no site já na semana 1 (só configuração; passos em "Entrar com Google"). Depois os
obrigatórios das lojas: app nativo (Capacitor) com Google nativo e, no iPhone, Entrar com a Apple
(exigida quando há Google), apagar a conta no app, privacidade (LGPD, abaixo), revisão das regras de
acesso, remetente de e-mail e o teste fechado da Play Store (12 testadores por 14 dias, começar até
~25/10). Entram no lançamento: aviso do remédio com o app fechado e o cartão do dia sem IA. O
relatório para pediatra, que no plano entrava só se o resto estivesse em dia, já está no código
(01/10). Não agora: saber quem indicou quem, registrar sem internet e resumo por e-mail. Saiu:
remédios no painel da semana.

**Rumo à App Store (07/10).** Trilha com caixinhas, pontos e níveis (privada; o que se marca fica salvo
na página): https://claude.ai/artifact/W5WUjezWR1dyASWTb9u9Wv. Decidido: conta de desenvolvedor da Apple
como pessoa física, feita pelo iPad (dá para trocar para empresa depois, pelo suporte da Apple); no
iPhone, lançar só com o código por e-mail (mudou em 12/10: a 1.0 sai com Google e Apple, seção
"Entrar com Google e Apple"); categoria Saúde e fitness (não Infantil), só Brasil e só iPhone. Sem Mac, compilar na
nuvem (Codemagic ou GitHub Actions). Falta ainda uma conta de demonstração para o revisor da Apple, que
não recebe o código por e-mail.

**App Store Connect (10/10):** conta de desenvolvedor aprovada (pessoa física, Team ID `JVL75DAS3X`).
App criado como **"Soneca: rotina do bebê"** ("Soneca" sozinho já era de outro app), Bundle ID
`br.app.soneca`, SKU `soneca-ios`, Apple ID (o número do app na App Store) `6821448149`. Embaixo do ícone, no iPhone, o nome continua "Soneca". Versão 1.0 grátis.

## LGPD: o que falta no app para a política valer

**Versão 1.3 (13/10, no código, falta publicar e mandar ao advogado):** a Política inclui "Entrar com a
Apple" junto do Google (dados da seção 3 e empresas da seção 9, com o cancelamento do acesso na Apple ao
apagar a conta). Os Termos só mudam de número. `TERMS_VERSION` 1.3: quem aceitou a 1.2 vê a tela "mudaram".
Detalhes em `VERSOES-TERMOS.md`. A seção 13 passa a dar o endereço `soneca.app.br/privacidade` (antes,
`caderninho-bay.vercel.app`, que não é mais o site).

**Versão 1.1 (10/10, no código, falta publicar e mandar ao advogado):** muda só a seção 6 dos Termos
("Grátis agora, assinatura depois": grátis hoje, aviso de 30 dias, famílias pioneiras grátis, preço só no
aviso) e, na Política, a seção 6 e a frase do fim da assinatura na 10. A 1.0 ficou em `termos/1.0.html` e
`privacidade/1.0.html`, com link no rodapé. `TERMS_VERSION` subiu para 1.1: ao publicar, quem já aceitou a
1.0 vê a tela "mudaram" e aceita de novo. A mudança só amplia direitos, por isso vale já, sem os 30 dias.
O que cada versão tem e o passo a passo de uma versão nova: `VERSOES-TERMOS.md`.

Política de Privacidade e Termos de Uso, versão 1.0 de 06/10/2026, em abas (privado; revisados pelo
advogado em 07/10, sem mudanças): https://claude.ai/code/artifact/c14d4862-321a-4361-83ec-ac7e34696e24 —
o Anexo B tem esta lista com os detalhes.

Decidido em 07/10: controlador é o Patrick, pessoa física (CPF e endereço no texto, pelo Decreto
7.962/2013), com empresa mais adiante; ele mesmo é o encarregado, pelo e-mail do Soneca. Assinatura
pelas lojas (compra dentro do app da Apple e do Google), sem anúncios nem parcerias. Os 7 primeiros
dias depois de criar a família são grátis, sem assinar nem cadastrar cartão; depois, um membro assina. Dados ficam 6 meses depois do fim da assinatura, com aviso 30 dias antes de apagar.
Cópia dos dados por e-mail em até 15 dias, sem botão por enquanto. Supabase no plano Free, sem cópias de
segurança (a política diz isso): para cobrar, vale passar ao Pro e trocar a frase da seção 10. Preço R$ 9,90 por mês, uma assinatura para a família toda.
Sem assinatura, depois do teste, a família só vê o que já anotou (e gera o relatório), sem registros novos.
Decidido em 10/10: a versão 1.0 da App Store sai **grátis**, sem assinatura; a cobrança vem numa versão seguinte, com aviso no app e por e-mail 30 dias antes. **Famílias pioneiras** (criadas antes do início da cobrança) ficam grátis para sempre, com todos os membros, inclusive os que entrarem depois. O site sai do ar quando o app entrar na loja; só `/privacidade` e `/termos` continuam públicos (a Apple exige o endereço da política). O Soneca não envia nada a pediatras: a família gera o PDF e manda ela mesma. Telas novas passam
antes pela prévia; mudança no banco vira arquivo novo em `supabase/`.

**Ainda falta:**

- **Cópia dos dados**: por e-mail, exportada à mão pelo Supabase; o botão (JSON e CSV) fica para depois.
- Domínio próprio no ar (14/10): a seção 13 da Política 1.3 já usa `soneca.app.br`, e o `vercel.json` leva
  `caderninho-bay.vercel.app/privacidade` e `/termos` para o novo.
- Apagar as provas de aceite com mais de 5 anos (tarefa agendada; a primeira vence em 2031).
- DM Sans servida pelo próprio site, sem Google Fonts (`index.html` e a política de segurança da página).
- Remetente dos e-mails em serviço próprio com domínio do Soneca (já acima).
- Registros de acesso (IP, data e hora) por 6 meses, pelo Marco Civil: conferir quanto o Supabase e a Vercel
  guardam no plano atual; se for menos, guardar à parte.
- Revisão das regras de acesso (RLS) (já acima).

**Quando chegarem:** cobrança pelas lojas, com os 7 dias grátis contados pelo app, plano e datas da
assinatura guardados 5 anos, e a tarefa agendada que avisa e apaga famílias 6 meses depois do fim da
assinatura de todos os membros. Estatísticas de uso saíram da versão 1.0; se vierem, voltam à política
antes, desligadas por padrão e sem nada do que foi anotado.

**Já resolvido:** aceites, páginas públicas, Perfil › Privacidade e sair da família sem deixar o nome (no
código em 07/10, seção "Política, Termos e aceites"); apagar a conta no Perfil, com as sugestões apagadas junto (012 e 014, no ar em 07/10);
controlador, encarregado, preço, prazos e plano do Supabase definidos; revisão do advogado (07/10).

## Identidade visual: Soneca (no ar)

O app passa a se chamar **Soneca** ("o Soneca" no texto), com a capivara dormindo de mascote.
Moodboard (privado): https://claude.ai/artifact/RBE6Qu4c4YFAJ7wnVwNsLj
Prévia aprovada das telas, antes e depois, de dia e de noite (privada): https://claude.ai/artifact/5ivtMLy5pNcHfVMPefEmz8

- **Fonte:** DM Sans, pesos 400 e 500, em tudo.
- **Cores:** creme e caramelo de dia, cinza-azulado à noite (era azul-noite até 02/10). Mamada e ordenha em menta, sono em azul-céu
  (lavanda à noite), fralda em manteiga, sintomas e remédio em salmão (igual para qualquer remédio),
  cuidados em caramelo claro, outros em neutro. À noite cada botão tem um tom escuro da própria cor,
  para não ficarem todos parecidos. Botão caramelo com texto marrom; links em caramelo escuro; ícones e
  gráficos na versão escura de cada cor.
- **Modo noite:** segue o celular; no Perfil dá para escolher claro ou escuro.
- **Capivara:** um traço só, sem preenchimento. Só no cartão do sono (e, com o nome, na entrada); nunca
  em saúde nem no resumo para a consulta. Sem frase junto. O desenho é esboço; a arte final vai para um
  ilustrador.
- **Ícones:** app azul-céu com a capivara marrom (`icons/`); fralda com fitas no lugar da gota; remédio
  em cápsula nos gráficos.
- **Tom:** humor sutil e raro na rotina; saúde e resumo neutros.

**Para publicar:** não muda o banco; basta publicar. **Conferir no celular:** claro e escuro (Perfil),
os botões da tela inicial com cores diferentes à noite, a capivara no cartão do sono, o ícone novo ao
instalar de novo (o celular pode guardar o antigo até reinstalar).

Testado em 01/10 no navegador com um Supabase de mentira: 15 telas em claro e escuro, a 390 px, sem
erros, já com as abas, o relatório para pediatra, as dúvidas para a consulta e a divisão de tarefas;
contraste de todos os textos conferido nos dois modos. O relatório usa as cores do Soneca em versão
sóbria e continua em papel claro; dúvida respondida passou para menta.

**Daqui em diante:** toda atualização segue esta identidade. As regras e a lista de conferência estão
no `CLAUDE.md` ("Identidade visual: obrigatória em toda atualização").

### Troca do nome para Soneca (no ar)

No app: título e nome instalado (`index.html`, `manifest.webmanifest`), a entrada com a capivara ao
lado do nome, a tela de abrir, a barra de baixo, Perfil (indicar, sugestões), avisos das telas de
saúde, resumo do mês e as mensagens de convite e indicação. `CONTEXT.md` e `CLAUDE.md` também; o
`CLAUDE.md` agora traz as regras da identidade, para as telas que ainda estão mudando já saírem certas.
Não muda: os comentários dos arquivos em `supabase/` (histórico) e as chaves `cad-` guardadas no
celular (trocar faria todo mundo perder a família aberta e o tema escolhido).

As telas que entraram em 01/10 (relatório para pediatra, dúvidas, divisão de tarefas) já vieram para
este branch com o nome novo. A conferência
`grep -rn "Caderninho" --include=*.js --include=*.html --include=*.webmanifest .` não acha nada.

**Fora do código, com você:**

1. **E-mails do login** (Supabase → Authentication → Emails): trocar "Caderninho" por "Soneca" no
   assunto e no texto dos modelos "Confirm sign up" e "Magic link". Se o envio usa SMTP próprio, trocar
   também o nome do remetente (Authentication → Emails → SMTP Settings → Sender name).
2. **Endereço do app:** por enquanto continua o mesmo. Trocar de endereço quebra os apps já instalados,
   os convites em aberto e o retorno do login (Site URL e Redirect URLs no Supabase, origens no Google);
   se um dia mudar, é uma etapa à parte, com o endereço antigo redirecionando para o novo.
3. **Google** (quando for ligar o "Entrar com Google"): nome do app "Soneca" na identidade visual.
4. **Quem já instalou:** no iPhone, o nome e o ícone antigos ficam até remover da tela de início e
   adicionar de novo; no Android, o Chrome atualiza sozinho em alguns dias.

**Conferir no celular:** a entrada com a capivara e "Soneca", o título da aba, o nome ao instalar,
"Indicar o Soneca" no Perfil e o texto que vai junto, e o aviso das telas de saúde.

## Melhorias de 27/09: no ar

Pedidos da conversa de 27/09 (os ajustes de 28/09 e as abas de 01/10 logo abaixo): remédios, sono x mamada e cocô, peso e marcos, resumo para os pais,
entrar com Google e, depois das prévias, botões da tela inicial, Sintomas e cuidados. Tudo no código;
detalhes de cada um abaixo.

**Para publicar, nesta ordem:**

1. Rodar `supabase/007_peso_e_marcos.sql` no SQL Editor e conferir pelo conector (seção "Peso e marcos").
2. Rodar `supabase/008_botoes_e_sintomas.sql` no SQL Editor e conferir pelo conector (seção "Botões da
   tela inicial, Sintomas e cuidados"). O app novo precisa dele para salvar sintoma e cuidado.
3. Rodar `supabase/009_tamanho_do_coco.sql` no SQL Editor e conferir pelo conector (seção "Tamanho do
   cocô, −5 min e ícones").
4. Rodar `supabase/010_duvidas.sql` no SQL Editor e conferir pelo conector (seção "Relatório para
   pediatra e dúvidas para a consulta").
5. Rodar `supabase/011_cuidados_e_curvas.sql` no SQL Editor e conferir pelo conector (seção "Cuidados,
   botão +, noite cinza-azulada e curvas da OMS").
6. Publicar o app. Tudo vai junto; o botão do Google continua escondido.
7. Conferir no celular o roteiro de cada seção abaixo.
8. Quando quiser ligar o Google: os passos da seção "Entrar com Google", `GOOGLE_LOGIN = true` em
   `config.js` e publicar de novo.

Testado em 27/09 no navegador com um Supabase de mentira (152 checagens), claro e escuro, em 360 e
390 px, e o 007 e o 008 num Postgres local imitando o Supabase (32 e 36 casos).

### Divisão de tarefas no resumo (01/10)

Prévia aprovada (privada): https://claude.ai/artifact/QtrE78v57huTWv2A6ExBtY

Não muda o banco; basta publicar.

- **Cartão "Como foi a divisão de tarefas de Marina"** no resumo do mês, depois dos totais, e no fim
  do painel da semana, antes de mandar.
- **Chef Favorito** no alto, em rosa, quando houver mamada no peito: quantas e as horas no peito
  (sem minutos anotados, só quantas). Sem nome, porque o app sabe quem anotou, não quem amamentou.
- **Campeão do Cocô** (fraldas), **Hipnotizador de Bebê** (dormiu) e **Garçom de Leite** (mamadeiras):
  quem mais anotou, o número e "2º lugar: nome". Empate divide ("Ana e João dividem"). Cada título
  precisa de 3 registros; o cartão some quando só uma pessoa registrou no período.
- **Resumo para mandar:** ganha "Divisão de tarefas:" com uma linha por título, só quem ganhou.
- **Fora:** sintomas, vômito, remédio, ordenha, peso e marcos.
- **Conferir no celular:** o mês e uma semana com registros de duas pessoas; uma semana só sua (o
  cartão some); o texto de Copiar.

Testado em 01/10 com registros de mentira: empate no 1º e no 2º, título abaixo de 3 registros, uma
pessoa só, peito com e sem minutos; claro e escuro em 360 px, sem rolagem para o lado.

### Relatório para pediatra e dúvidas para a consulta (01/10)

Pedido de 01/10: um relatório para mandar ao pediatra e as dúvidas para a consulta (que estavam em
"Ideias para depois"). Prévias aprovadas (privadas): o relatório,
https://claude.ai/artifact/3qWdFGRkZoLDHMsWNYWzcM, e as dúvidas,
https://claude.ai/artifact/STD5JCa3238oLDUp2jYVfo

**Para publicar:** rodar `supabase/010_duvidas.sql` antes do app. Sem ele, a aba do bebê avisa que
não conseguiu carregar as dúvidas e não deixa anotar; o relatório sai sem a parte das dúvidas.
Conferir pelo conector: tabela `questions`, as quatro regras de acesso e nenhum erro nos logs.

- **Botão "Emitir relatório para pediatra"**, na aba do bebê, logo abaixo dos três números. Em 320 e
  360 px o nome quebra em duas linhas; em 390 px cabe numa.
- **Tela de emitir:** o período (7, 14 ou 30 dias até hoje; "desde" o último peso anotado numa
  consulta, quando foi há mais de 7 dias e cabe nos 60 dias que o app carrega) e o que vai junto
  (rotina, sintomas e vômitos, remédios, peso e marcos, dúvidas). "Emitir PDF" abre o imprimir do
  celular, que salva em PDF ou compartilha; o nome do arquivo é "Relatório de Marina 01-10-2026".
  "Ver antes" mostra a folha; "Copiar texto" leva o mesmo em texto.
- **A folha (A4, sempre clara):** nome, nascimento e idade; o peso em gráfico, com o valor em cada
  ponto, e os marcos com a idade, desde o nascimento; a média por dia da rotina (dias que terminaram
  e têm registro, hoje não entra), com o maior sono seguido e o maior intervalo entre cocôs; os dias
  lado a lado de 0h a 24h; sintomas e vômitos como foram anotados; doses dadas e puladas de cada
  remédio, com como está programado; as dúvidas que faltam perguntar, com caixinha. Não mostra quem
  anotou.
- **Dúvidas para a consulta**, na aba do bebê, embaixo do botão do relatório: as que faltam
  perguntar, da mais antiga para a mais nova, com o dia. O círculo marca "perguntei" (com Desfazer no
  aviso). Tocar no texto abre para editar, desmarcar ou anotar "O que o pediatra disse" (opcional).
  **Respostas do pediatra** lista as já perguntadas, da mais recente para a mais antiga.
- **Banco (010):** tabela `questions` (bebê, texto até 300, dia em que perguntou, resposta até 500).
  Quem anotou e quem marcou "perguntei" vêm do banco; só membros da família veem, anotam, editam e
  apagam. Sem canal ao vivo (como os botões, para não derrubar a sincronização antes do 010):
  recarrega ao voltar para o app.
- **Conferir no celular:** anotar uma dúvida, marcar perguntei e desfazer; anotar o que o pediatra
  disse e achar em Respostas do pediatra; emitir o PDF no iPhone (app instalado) e no Android, e ver
  se sai em uma ou duas folhas A4 com as cores; copiar o texto e colar no WhatsApp.

Testado em 01/10 no navegador com um Supabase de mentira (37 checagens): dúvidas (anotar, marcar e
desfazer, editar, responder, apagar), relatório em 7 e 14 dias e "desde", com e sem dúvidas, sem o 010,
claro e escuro, em 320, 360 e 390 px, sem rolagem para o lado, e o PDF gerado pelo Chromium. O 010
num Postgres local imitando o Supabase (13 casos).

### Abas embaixo: Hoje, bebê, Família e Perfil (01/10)

Pedido de 29/09: não estava claro onde ficava cada coisa (o que é do bebê estava escondido no nome, e
o menu misturava família, pessoa e app). Prévia aprovada (privada), com o mapa de qual botão leva aonde
e as tarefas antes e agora: https://claude.ai/artifact/NVbCtNeTWgdp9eqrzvQNip

Não muda o banco; basta publicar. Mudar o nome da família já era permitido ao criador pelo
`003_endurece_colunas.sql`; faltava a tela.

- **Barra embaixo**, fixa: Hoje, o nome do bebê, Família e Perfil (ícone da pessoa com engrenagem).
  Tocar na aba aberta volta para o alto dela. Abrir outra família volta para Hoje.
- **Hoje:** igual, menos o alto. Saem o lápis do nome, a lua/sol e o botão de pessoas. Tocar no nome
  ou na foto abre a aba do bebê. O Editar da grade leva a Família › Botões da tela inicial.
- **Aba do bebê** (era a tela que abria no nome): peso, remédios programados, marcos e, no fim, nome
  e nascimento. Tocar no nome e na idade, no alto, rola até Nome e nascimento e destaca. Os três
  números do alto (peso, remédios, marcos) levam a cada parte. Os remédios aparecem aqui também, com
  Ver doses e Programar: dá para programar mesmo com o botão Remédio desligado (antes, não dava).
  Com dois bebês, a escolha fica no alto da aba e no Hoje.
- **Família:** nome da família (novo: o criador muda; os outros veem o aviso), membros e convite,
  bebês (abrem a aba do bebê), botões da tela inicial com os interruptores e, no fim, apagar ou sair.
- **Perfil:** seu nome, aparência (novo: claro, escuro ou do celular; vale só neste aparelho), suas
  famílias, indicar o Caderninho, Sugestões e problemas (agora abre numa tela própria; antes ocupava
  metade do menu) e desconectar.
- **Saiu:** o menu e a tela "Botões da tela inicial" separada.
- **Ficou para depois:** a jornada de cada aba (o que aparece vazio, a primeira vez de quem entra por convite).
- **Conferir no celular:** tocar no nome do bebê no Hoje e, na aba, no nome de novo (rola até o fim);
  anotar um peso pela aba; programar um remédio pela aba com o botão Remédio desligado; mudar o nome
  da família; escolher Escuro e depois Do celular; ver se a barra não cobre o último registro do dia
  e se fica certa com o app instalado no iPhone (a faixa de baixo da tela).

Testado em 01/10 no navegador com um Supabase de mentira (76 checagens): as quatro abas, os caminhos
do mapa da prévia, quem criou e quem não criou a família, dois bebês, sem bebê e sem remédios, claro e
escuro, em 320, 360 e 390 px, sem rolagem para o lado.

### Tamanho do cocô, −5 min e ícones (28/09)

Prévia aprovada (privada): https://claude.ai/artifact/L7rc7Zx1LZnedfeYQcqoNQ

**Para publicar:** rodar `supabase/009_tamanho_do_coco.sql` antes do app. Sem ele, a fralda salva
normalmente, mas não salva quando se escolhe o tamanho ou o alerta marrom (avisa "Não foi possível
salvar"). Conferir pelo conector: colunas `poo_size` e `poo_alert` em `entries` e nenhum erro nos logs.

- **Ícones:** Editar ganhou o lápis (a engrenagem parecia o sol do modo noturno) e Outros ganhou o
  mais, no botão e na linha do tempo.
- **−5 min** no horário de todos os registros e em "Horário que deu" do remédio. Os quatro atalhos
  dividem a linha por igual e cabem em 320 px.
- **Tamanho do cocô:** ao marcar Cocô na fralda, pequeno, médio, grande ou gigante (opcional; tocar de
  novo desmarca) e, em destaque marrom, o **alerta marrom** ("vazou da fralda"). Desmarcar Cocô limpa
  os dois. Na linha do tempo: "Xixi + cocô gigante", e o alerta ganha uma etiqueta marrom. Não entra
  nos gráficos, no painel da semana nem no resumo para mandar.
- **Humor leve, só aí:** "Salvo às 14:32. Que fralda!" no gigante e "Alerta marrom às 14:32. Coragem!"
  no alerta. O aviso de salvo agora quebra a linha em vez de sair da tela.
- **Banco (009):** em `entries`, `poo_size` ('pequeno', 'medio', 'grande', 'gigante') e `poo_alert`
  (só true ou vazio), os dois só na fralda com cocô. O app só manda essas colunas quando há tamanho ou
  alerta (ou para apagar ao editar).
- **Conferir no celular:** anotar uma fralda com cocô gigante e alerta marrom, ver a mensagem e a
  etiqueta; editar e desmarcar Cocô; tocar em −5 min; ver o lápis no Editar no modo noturno.

Testado em 28/09 no navegador com um Supabase de mentira (19 checagens, claro e escuro, 320 e 360 px,
também sem o 009) e o 009 num Postgres local imitando o Supabase, depois do 001 ao 008 (10 casos).

### Dose pulada e gráficos que seguem os botões (28/09)

Não muda o banco; basta publicar. Prévia aprovada (privada): https://claude.ai/artifact/KkWBsnhCpBFDLTsrzAxgNn

- **Dose pulada** não aparece mais na linha do tempo do Dia nem vira marca nos gráficos. Continua em
  "Remédios e horários", com Desfazer.
- **Gráficos só com os botões da família** ("Como foi o dia" e o painel da semana): Mamada, Sono e
  Fralda sempre; Ordenha, Sintomas (com vômito), Remédio (só dose dada) e Cuidados só com o botão
  ligado, mesmo que haja registro antigo. Na semana, sem Ordenha ligada, some também o quadro da
  média, a opção em "Dia a dia" e a linha em "Nestes 7 dias". Outros fica fora dos gráficos.
- **Lugar de cada marca**, igual no dia e na semana: fralda embaixo, mamada no meio e em cima o resto
  (ordenha quadrado, sintomas losango, remédio bolinha lilás, cuidados triângulo laranja).
- **Conferir no celular:** pular uma dose e ver que ela não entra no Dia; desligar Ordenha em Editar e
  ver sumir da semana; ligar Massagem, anotar uma e ver o triângulo no dia e na semana.

### Botões da tela inicial, Sintomas e cuidados

Pedido de 27/09: a tela estava poluída. Decidido em três prévias (privada, com as escolhas guardadas:
https://claude.ai/artifact/Aer9Qjy3YWKnaD14jGtAuV).

**Para publicar:** rodar `supabase/008_botoes_e_sintomas.sql` antes do app. Sem ele, o app novo mostra
todos os botões e salva o resto, mas não salva sintoma, massagem, banho nem lavagem nasal, e Editar
avisa que não conseguiu carregar. Conferir pelo conector: tabela `family_settings`, colunas `symptom`,
`temp_c` e `duration_min` em `entries`, regras de acesso e nenhum erro nos logs. No celular: desligar
Ordenha em Editar e ver sumir no celular de outro membro; anotar febre com temperatura, cólica com
duração e um vômito por Sintomas; anotar uma massagem; ver os losangos em "Como foi o dia".

**Como ficou:**

- **Grade de três por linha.** Mamada, Sono e Fralda sempre. Remédio, Sintomas, Ordenha, Massagem,
  Banho e Lavagem nasal a família liga ou desliga; sem nada salvo, todos aparecem. Na última linha,
  Outros de um lado e **Editar** do outro. Um botão que sobra sozinho numa linha ocupa a linha toda.
- **Editar:** "Botões da tela inicial", com um interruptor para cada botão. Salva na hora e vale para
  todos da família; muda ao vivo no celular dos outros. Desligar Remédio não para os remédios
  programados: o cartão continua aparecendo na hora da dose.
- **Sintomas:** febre (temperatura opcional, de 34 a 43 °C), cólica e choro inconsolável (duração
  opcional, em minutos), vômito, diarreia, muco nas fezes, tosse, assadura, urticária, reação à vacina,
  incômodo dos dentes e outro (com o
  que aconteceu escrito). Vômito continua sendo o registro de vômito; o botão Vômito saiu da tela. O
  botão mostra o último sintoma do dia ("febre há 2h"). Na telinha: "O Caderninho só anota o que a
  família marcar; não avalia nem orienta."
- **Cuidados:** Massagem, Banho e Lavagem nasal, com horário e observação, como o vômito.
- **Como foi o dia:** numa linha só, como no painel da semana (barra de sono, ponto de mamada, ponto de
  fralda com miolo marrom se teve cocô, quadradinho de ordenha), um pouco maior, e um losango âmbar
  para sintomas e vômito. Embaixo, a contagem: sono, mamadas, xixi, cocô, ordenha e sintomas. Saiu a
  linha com ml na mamadeira, minutos no peito e último peito (o último peito aparece ao abrir Mamada; os
  totais estão no painel da semana e no Mês).
- **Resumo para mandar** (Semana e Mês): segue os botões da família. Sem Ordenha ligada, não fala de
  ordenha; sem Remédio, não fala de doses; os cuidados ligados entram ("Cuidados: 15 massagens, 26
  banhos"). Sintomas e vômito ficam sempre de fora.
- **Peso:** a tela do bebê abre tocando no nome, agora com um lápis ao lado. O campo virou "Dia da
  pesagem".
- **Banco (008):** tabela `family_settings` (uma linha por família, com os botões desligados; só membros
  veem e mudam; não se apaga pelo app; vai para a sincronização ao vivo) e, em `entries`, os tipos
  `symptom`, `massage`, `bath` e `nasal`, com `symptom`, `temp_c` (só na febre) e `duration_min` (só na
  cólica e no choro). "Outro" exige a observação.

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

### Horário digitado, sem o relógio do celular

Pedido de 27/09: tocar nos números só selecionava, e o relógio do celular deixava o "Definir" fora
da tela em alguns aparelhos. Esse relógio é do sistema, e o app não consegue mudar o tamanho dele.
Decidido na prévia (https://claude.ai/artifact/C4L2it3q32xLyTWF7htHL5): o ajuste fica na própria
tela (`clock.js`). Digitar é o principal: tocar na hora, digitar dois números, e o cursor pula para
os minutos. O − e o + mudam de 1 em 1, e segurando anda rápido. Vale nos registros, na dose, na
primeira dose e nos horários fixos do remédio. Nos horários fixos, tocar na etiqueta abre o ajuste
embaixo.

**No celular:** anotar uma mamada digitando 1447 (vira 14:47); segurar o + dos minutos; num remédio
com horários fixos, tocar num horário, mudar e salvar. Conferir com teclado de Android e de iPhone.

### Entrar com Google e Apple (12/10, no código, falta compilar e testar no iPhone)

Prévia aprovada (privada): https://claude.ai/artifact/Xx3bceKbJaFe7cncctYYQx. Na entrada, "Continuar com a
Apple" (só no app do iPhone) e "Continuar com o Google" (no app e no site), com o mesmo tamanho, acima do
código por e-mail, que continua igual. Apple preta de dia e branca de noite; Google sempre claro.

- **No app do iPhone:** os dois abrem a janela do próprio iPhone (plugin `@capgo/capacitor-social-login`,
  com Facebook e Twitter desligados no `capacitor.config.json`). O token volta para o app e vai para o
  Supabase (`signInWithIdToken`), com um número de uso único (nonce). O plugin é chamado pela ponte do
  Capacitor (`vendor/capacitor-core-8.5.3.js`, a mesma versão do `@capacitor/core`, carregada antes do
  `app.js`; no site ela só se apresenta como "web").
- **No site:** só o Google, como antes (sai para o Google e volta com a sessão).
- **Nome:** a Apple manda o nome só na primeira entrada; ele é guardado e já vem preenchido em "Como você
  quer aparecer para a família?", como o do Google.
- **Contas:** o Supabase junta pelo e-mail. Quem já entrava com o código e usa Google ou Apple com o
  mesmo e-mail cai na mesma conta, com as mesmas famílias, sem fazer nada. Quem escolhe "Ocultar meu
  e-mail" na Apple vira uma conta nova, sem as famílias (pode voltar ao código, ou ser convidado de novo).
- **Ligar e desligar:** `GOOGLE_LOGIN` e `APPLE_LOGIN` em `config.js` (os dois ligados).
- **Compilar:** `npm ci` e `npm run ios` antes do Xcode (o `cap sync` tira o Facebook do plugin). Sign In
  with Apple está nas permissões do app (`ios/App/App/App.entitlements`); o endereço de volta do Google no
  `Info.plist`.

**Configuração (feita em 12/10):**

1. **Apple Developer:** Sign In with Apple marcado no App ID `br.app.soneca` (primário). O perfil de
   assinatura do Codemagic precisa ser gerado de novo depois disso.
2. **Google Cloud,** projeto "soneca", Google Auth Platform: Branding (nome Soneca, sem logo, para não
   precisar de verificação; `https://soneca.app.br` com `/privacidade` e `/termos`; domínios
   `soneca.app.br` e `vrhgirpklyklhvzwdfiq.supabase.co`), público externo publicado, e dois clientes:
   Web (origem `https://soneca.app.br`, redirecionamento
   `https://vrhgirpklyklhvzwdfiq.supabase.co/auth/v1/callback`) e iOS (Bundle ID `br.app.soneca`, Team
   ID `JVL75DAS3X`). IDs em `config.js`; a chave secreta do Web fica só no Supabase.
3. **Supabase,** Sign In / Providers: Google com os dois IDs (Web primeiro, separados por vírgula), a
   chave secreta do Web e "Skip nonce checks" ligado; Apple com `br.app.soneca` em Client IDs, sem chave.
   URL Configuration: Site URL `https://soneca.app.br` e `https://soneca.app.br/` em Redirect URLs.

**Falta:**

- ~~Compilar no Codemagic e testar no iPhone: entrar com a Apple e com o Google~~ (feito, 14/10).
- Cancelar o acesso da Apple ao apagar a conta (exigência da Apple; no código desde 13/10, falta ligar):
  ao entrar com a Apple, o app manda o código da Apple para a função `apple-login`
  (`supabase/functions/apple-login/index.ts`), que troca pela chave de acesso e guarda em
  `public.apple_tokens` (tabela fechada: só a função alcança). Ao apagar a conta, o app pede à função
  que cancele o acesso na Apple antes do `delete_my_account`; quem não entrou com a Apple não muda nada.
  Se a função falhar, a entrada e o apagar seguem. Ligado em 13/10 (passos 1 a 4 feitos; tabela conferida
  pelo conector: RLS ligado, ninguém do app lê, vazia). Falta o passo 5. Para ligar:
  1. Apple Developer → Keys → + → "Soneca Apple Login", Sign in with Apple com o App ID
     `br.app.soneca`. Baixar o .p8 (uma vez só) e anotar o Key ID.
  2. Supabase → Edge Functions → Secrets: `APPLE_TEAM_ID` = `JVL75DAS3X`, `APPLE_KEY_ID` e
     `APPLE_PRIVATE_KEY` (o .p8 inteiro, com as linhas BEGIN e END).
  3. SQL Editor: rodar `supabase/018_chave_da_apple.sql` e a conferência do fim do arquivo.
  4. Supabase → Edge Functions → Deploy a new function → Via editor: nome `apple-login`, colar o
     `index.ts`, deixar "Verify JWT" ligado, Deploy.
  5. Testar no iPhone: entrar com a Apple numa conta de teste, apagar a conta e ver o Soneca sumir de
     Ajustes → (seu nome) → Entrar com a Apple. Pelo conector, só contar as linhas de `apple_tokens`.

**Cuidados:**

- A tela do Google no site mostra "vrhgirpklyklhvzwdfiq.supabase.co" como destino. Para mostrar o nome
  do app é preciso um domínio próprio no Supabase (Custom Domain, pago). No app do iPhone, não aparece.
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

## Painel da semana, calendário e sugestões: no ar

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

- **Cartão "como está o bebê", no alto do Hoje** (sugestão de 01/10, vinda de uma conversa no
  ChatGPT). Exemplo: "Martin — 23 dias. Dormiu 12h48 nas últimas 24h, 42 min a menos que a média
  dos últimos 7 dias. Última mamada: 2h17 atrás. Próxima janela provável de sono: 21:40–22:10.
  Insight do dia: está ficando acordado uns 18 min a mais à noite do que há uma semana." A ideia é
  transformar os registros em algo que os pais usem de relance. Os dados já estão no app, e boa parte
  não precisa de IA:
  - **Contas simples, sem IA:** sono nas últimas 24h, comparação com a média dos 7 dias (o painel
    da semana já calcula a média) e tempo desde a última mamada. Dá para fazer só no app, sem mudar
    o banco.
  - **Previsão e "insight":** a janela provável de sono e a frase do dia interpretam os registros,
    e hoje o Soneca só junta o que foi anotado, sem avaliar nem sugerir (`CONTEXT.md`). Fazer
    exige decidir antes se o app passa a interpretar e como dizer isso aos pais (ex.: "pelos
    registros desta semana", nunca como orientação).
  - **Com IA:** os registros do bebê (dado de saúde de criança) iriam para um serviço de fora
    (Claude ou outro), com a chave guardada no servidor (função no Supabase), nunca no app. Decidir o
    que vai (só números, sem observações nem sintomas), avisar as famílias e ver o custo por família.
    Uma frase calculada pelo app ("acordado 18 min a mais à noite que na semana passada") talvez dê
    o mesmo resultado sem IA.
- **"Pergunte ao Soneca"** (mesma conversa): perguntar em texto livre sobre o histórico do
  bebê. Exemplos: "Quando foi a última vez que ficou mais de 6 horas sem cocô?", "Quanto está
  mamando por dia?", "Faça um resumo da última semana para mandar para a pediatra" e "Por que está
  dormindo pior hoje?". As três primeiras só buscam e somam registros; a última pede um porquê, e a
  resposta da sugestão ("isso pode estar contribuindo para...") já é orientação, o que o Soneca
  hoje não faz. Precisa do mesmo que o cartão com IA (registros indo para fora, chave no servidor) e
  de regra clara para a IA: responder só com o que está anotado, dizer de onde tirou cada número e,
  diante de sintoma ou "por quê", mandar falar com o pediatra.
- **Registro falando ou escrevendo** (mesma conversa): com o bebê no colo, dizer ou digitar "Martin
  mamou 90 ml agora" ou "Martin dormiu" em vez de tocar em vários botões; depois, talvez pelo
  WhatsApp. O Huckleberry já faz isso no plano pago. Com IA para entender a frase; o app mostra o
  registro montado e a pessoa confirma antes de salvar, para não gravar errado. Pelo WhatsApp exige
  a API do WhatsApp Business, um servidor e ligar o número de telefone à conta. Antes de IA, vale
  ver se o ditado do teclado do celular num campo de texto, com o app separando "mamou", "90 ml",
  "dormiu", já resolve os casos mais comuns.
- **O Soneca não termina aos 12 meses** (mesma conversa): hoje a família usa muito no começo e
  larga quando o bebê pega rotina. A ideia é o app acompanhar cada fase: 0–6 meses (sono, mamadas,
  fraldas, peso), 6–12 meses (introdução alimentar, sono, crescimento, dentes), 1–2 anos
  (alimentação, marcos, fala) e 2–5 anos (crescimento, vacinas, saúde). Boa parte cabe no que já
  existe: peso e marcos na aba do bebê e os botões que a família liga ou desliga (a grade de cada
  fase). Novos seriam refeição (o que comeu, primeira vez de um alimento), dentes e vacinas (com a
  data, como os marcos). Sem "idade esperada" para cada coisa, como já se decidiu nos marcos.
- **Resumo por e-mail, todo mês ou toda semana.** O texto já existe no app (aba Mês); falta mandar
  sozinho. Precisa, nesta ordem: (1) o remetente dedicado da primeira pendência, com domínio próprio e
  um serviço de envio (Resend, Postmark ou parecido), com os registros de DNS; (2) uma função no
  Supabase que monte o resumo de cada família no servidor, com a chave `service_role` (ignora as
  regras de acesso: é a parte mais sensível); (3) o agendamento com `pg_cron`; (4) cada membro
  escolher se quer receber, e um link de "não quero mais" em todo e-mail; (5) o fuso da família
  (o servidor roda em UTC). Dado de saúde de criança sai do app e fica na caixa de e-mail: decidir
  o que vai no e-mail (talvez só os números, sem remédios).

- Aviso no celular na hora do remédio, mesmo com o app fechado.
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
