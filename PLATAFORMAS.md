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

- **Ramo do Android.** De 16/10 a 27/10 o Android viveu no ramo `claude/android-play-store`. Foi juntado
  ao `main` em 27/10: desde então os dois apps saem do mesmo código. Código só do Android que ficar num
  ramo à parte (como o PR #42) deixa os dois diferentes até ser juntado.

## O que falta em cada plataforma

Conferido em 28/10 pelo código e pelo histórico do `main` (não pelo Codemagic nem pelas lojas). Os dois
apps estão na 1.0.1, com os mesmos plugins.

ok: feito e já no app · no `main`: programado, mas a compilação 1.0.1 (`d4b90b8`) saiu antes, então só
chega com uma compilação nova · falta: ainda não feito · quebrado: erro que alguém já encontrou · —: não se
aplica. A mesma lista está na aba "Plataformas" do Painel do Soneca
(https://claude.ai/artifact/Gfwcfe5WMRZ5YHr2nck1n1), que ainda mostra a versão de 17/10.

| Item | Tipo | Site | iPhone | Android | Nota |
|---|---|---|---|---|---|
| Link de convite abrindo o app | Melhoria | — | ok | no `main` | iPhone: Universal Links, na 1.0.1 (a 1.0 da loja ainda tem o link quebrado). Android: App Links em 28/10 (`assetlinks.json` e filtro no `AndroidManifest.xml`), depois da compilação |
| Cronômetro da mamada | Melhoria | ok | no `main` | no `main` | Item 12, programado em 28/10 |
| Cronômetro na tela de bloqueio | Melhoria | — | falta | falta | Item 13. Android: notificação fixa pronta no PR #42, ainda não juntado. iPhone: Atividade ao Vivo, não começada. Juntar só o Android deixa os apps diferentes |
| Aviso do remédio com o app fechado | Melhoria | — | no `main` | no `main` | Item 1, PR #43. Ainda sem teste em celular de verdade |
| Voltar para o app sem a tela vazia | Correção | ok | no `main` | no `main` | PR #44, 28/10 |
| Link de "Indicar o Soneca" | Correção | ok | quebrado | quebrado | O app mostra `location.host`, que dentro dele é "localhost" (Patrick, 16/10; README, item 9) |
| Aviso de versão nova | Melhoria | — | falta | falta | Avisar quem está com versão antiga para atualizar (Patrick, 16/10; README, item 8) |
| Outros membros também convidarem | Melhoria | falta | falta | falta | Decidido em 16/10, no backlog (README, item 5): qualquer membro convida, e fica guardado quem convidou. SQL novo, tela e versão nova dos Termos e da Política |
| Passar a família para outro membro | Melhoria | falta | falta | falta | Decidido em 16/10, no backlog (README, item 6): quem criou entrega o controle e pode sair sem apagar. Junto com o anterior |
| PDF do relatório no aparelho | Conferência | ok | falta | falta | Ver num aparelho se a folha sai igual |
| Publicação na loja | Loja | — | ok | falta | iPhone: 1.0 publicada, 1.0.1 compilada. Android: teste fechado até ~01/11, depois o pedido de produção |
| Nome antigo nos e-mails | Correção | falta | falta | falta | Supabase, igual para todos |
| Tirar o site do ar | Decisão | falta | — | — | Item 14. Só depois do Android na loja e da página de convite |

Chegaram a todos na 1.0.1 e saíram da tabela: endereço certo no link de convite, "Recebeu um convite?" na
tela Criar família, anotar registro em outro dia, "Ainda dormindo?" para o sono sem fim, Android junto do
`main` e Entrar com o Google (detalhes no `README.md`).

Quando um item chegar a todos, ele sai desta tabela e vai para o `README.md`.
