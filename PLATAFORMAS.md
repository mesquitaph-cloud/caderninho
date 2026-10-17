# Site, iPhone e Android: o que muda em cada um

Controle das correções e melhorias nas três versões do Soneca. Antes de mexer, conferir aqui se a mudança
vale para todas e o que cada uma precisa para chegar a quem usa.

## Como o código se divide

- **Código comum (quase tudo):** `app.js`, `styles.css`, `index.html` e os outros `.js` da raiz. O mesmo
  arquivo vira o site e, copiado para `www/` (`npm run ios` / `npm run android`), vai dentro dos dois apps.
  Erro aqui aparece nos três; correção aqui conserta os três.
- **Só do iPhone:** `ios/` e a parte `ios` do `capacitor.config.json`.
- **Só do Android:** `android/`.
- **Banco (Supabase) e e-mails:** um só para todos. Mudança no banco vale na hora para os três, inclusive
  para o app que está na revisão da Apple.

## Como cada um recebe a correção

| | Quando a correção chega | O que precisa |
|---|---|---|
| Site | Na hora | Juntar no `main` (a Vercel publica sozinha) |
| iPhone, TestFlight | Depois de uma compilação nova | "Start new build" no Codemagic (`ios-testflight`). Teste interno: sem revisão. Teste externo: revisão beta |
| iPhone, App Store | Depois de uma versão nova aprovada | Compilação nova + versão nova na App Store Connect + revisão da Apple |
| Android, teste interno | Depois de uma compilação nova | "Start new build" no Codemagic (`android-play`) e subir o `.aab` no Play Console |

Os apps levam uma cópia do código dentro deles: juntar no `main` **não** muda o app de ninguém, só o site.

## Diferenças que já deram erro

- **Endereço do próprio app.** No site, `location.origin` é `https://soneca.app.br`. No iPhone é
  `capacitor://localhost`, e no Android, `https://localhost` (padrão do Capacitor; não testado no
  aparelho). Link que vai para outra pessoa nunca pode usar `location.origin` dentro do app.
- **Compartilhar (`navigator.share`).** No iPhone existe, mas recusa link que não seja `https://`. No
  WebView do Android, em geral, não existe: o botão "Compartilhar" nem aparece (não conferido no aparelho).

- **Ramo do Android.** Até 16/10 o Android vive no ramo `claude/android-play-store`, à frente do `main`.
  Correção feita no `main` precisa ser trazida para esse ramo antes da compilação do Android, até ele ser
  juntado.

## O que falta em cada plataforma

ok: feito · falta: ainda não feito · quebrado: erro que alguém já encontrou · —: não se aplica.
A mesma lista está na aba "Plataformas" do Painel do Soneca (https://claude.ai/artifact/Gfwcfe5WMRZ5YHr2nck1n1).

| Item | Tipo | Site | iPhone | Android | Nota |
|---|---|---|---|---|---|
| Link de convite | Correção | ok | ok | falta | Endereço interno do app no link (Bruno, 16/10). Corrigido em 16/10; conferido pelo Bruno no TestFlight depois de atualizar. Android: próxima compilação. A 1.0 (2) na revisão da Apple ainda tem o erro |
| Link de "Indicar o Soneca" | Correção | ok | quebrado | quebrado | Ainda não sai o link certo no app (Patrick, 16/10). Para os próximos PRs (README, item 9) |
| Aviso de versão nova | Melhoria | — | falta | falta | Avisar quem está com versão antiga para atualizar (Patrick, 16/10; README, item 8) |
| Anotar registro em outro dia | Correção | falta | falta | falta | Nenhum registro tem campo de dia (Bruno, 16/10). Prévia antes |
| Convite pelo navegador não chega ao app | Correção | — | quebrado | quebrado | O link abre no Safari e o app não recebe o convite; cai em "Criar família" (Ca, 17/10). "Tenho um convite" na tela de criar; README, item 10 |
| Sono que nunca terminou | Melhoria | falta | falta | falta | "Dormiu" sem "Acordou" deixou o bebê dormindo por dias (Bruno, 17/10); README, item 11 |
| Cronômetro da mamada | Melhoria | falta | falta | falta | Contar o tempo de cada peito sozinho (Ca, 17/10); README, item 12 |
| Cronômetro na tela de bloqueio | Melhoria | — | falta | falta | Atividade ao Vivo no iPhone, notificação fixa no Android (Ca, 17/10); README, item 13 |
| Android junto do `main` | Código | — | — | falta | Ramo `claude/android-play-store` ainda separado |
| Links abrindo o app | Melhoria | falta | falta | falta | Universal Links (iPhone) e App Links (Android), cada um com sua configuração |
| Outros membros também convidarem | Melhoria | falta | falta | falta | Decidido em 16/10, no backlog (README, item 5): qualquer membro convida, e fica guardado quem convidou. SQL novo, tela e versão nova dos Termos e da Política |
| Passar a família para outro membro | Melhoria | falta | falta | falta | Decidido em 16/10, no backlog (README, item 6): quem criou entrega o controle e pode sair sem apagar. Junto com o anterior |
| Aviso do remédio com o app fechado | Melhoria | — | falta | falta | Notificação: plugin e permissão em cada celular |
| PDF do relatório no aparelho | Conferência | ok | falta | falta | Ver num aparelho se a folha sai igual |
| Entrar com o Google | Conferência | ok | ok | ok | Android na versão 5 |
| Publicação na loja | Loja | — | em revisão | falta | iPhone 1.0 (2) desde 14/10; Android: teste fechado até ~25/10 |
| Nome antigo nos e-mails | Correção | falta | falta | falta | Supabase, igual para todos |
| Tirar o site do ar | Decisão | falta | — | — | Só depois do Android na loja e da página de convite |

Quando um item chegar a todos, ele sai desta tabela e vai para o `README.md`.
