# Soneca

Antes Caderninho. App para famílias registrarem a rotina dos bebês (mamadas, sono, fraldas, vômitos, remédios) numa
linha do tempo compartilhada. Site instalável na tela do celular, sem loja. Vocabulário em `CONTEXT.md`.

- **Front:** HTML/CSS/JS puro, sem build. Publicado no Vercel.
- **Back:** Supabase (região São Paulo) — banco, login por código no e-mail, sincronização.
- **Login:** e-mail + código de 6 dígitos (modelos "Confirm sign up" e "Magic link" usam `{{ .Token }}`).
  Entrar com Google está pronto no código, desligado em `config.js` até a configuração abaixo.

## Pendências antes de convidar amigos

- Trocar o remetente dos e-mails (hoje o Gmail profissional do Patrick) por uma conta dedicada. Com a
  indicação a outras famílias, mais gente nova recebe esses e-mails, e o Gmail limita quantos saem por dia.
- Revisão de segurança das regras de acesso do banco (RLS).

## Identidade visual: Soneca (no código, falta publicar)

O app passa a se chamar **Soneca** ("o Soneca" no texto), com a capivara dormindo de mascote.
Moodboard (privado): https://claude.ai/artifact/RBE6Qu4c4YFAJ7wnVwNsLj
Prévia aprovada das telas, antes e depois, de dia e de noite (privada): https://claude.ai/artifact/5ivtMLy5pNcHfVMPefEmz8

- **Fonte:** DM Sans, pesos 400 e 500, em tudo.
- **Cores:** creme e caramelo de dia, azul-noite à noite. Mamada e ordenha em menta, sono em azul-céu
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

### Troca do nome para Soneca (no código, falta publicar)

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

## Melhorias de 27/09: feito, falta publicar

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
5. Publicar o app. Tudo vai junto; o botão do Google continua escondido.
6. Conferir no celular o roteiro de cada seção abaixo.
7. Quando quiser ligar o Google: os passos da seção "Entrar com Google", `GOOGLE_LOGIN = true` em
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
  opcional, em minutos), vômito, tosse, assadura, reação à vacina, incômodo dos dentes e outro (com o
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

### Entrar com Google

O botão "Continuar com o Google" fica acima do e-mail; o código por e-mail continua igual. A mesma
pessoa, com o mesmo e-mail, cai na mesma conta (o Supabase junta as duas formas de entrar), com as
mesmas famílias. Quem entra pela primeira vez já vem com o nome do Google preenchido, e pode trocar.

**Para ligar, nesta ordem (é tudo com você; o código já está pronto):**

1. **Google Cloud** (console.cloud.google.com): criar um projeto "Soneca". Em Google Auth Platform:
   - Identidade visual: nome "Soneca", e-mail de suporte e, em domínios autorizados,
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
