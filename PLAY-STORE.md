# Soneca na Play Store: o que preencher

Rascunho de 15/10 para o Play Console (app "Soneca: rotina do bebê", pacote `br.app.soneca`), a partir do
`APP-STORE.md`. **Os textos da loja esperam a aprovação do Patrick, palavra por palavra.** Tom neutro e
claro; nada de promessa de saúde. Onde está escrito "(a conferir)", é de memória: os nomes dos campos do
Play Console mudam, e confiro com você na tela.

## Criar o app

- **Nome do app (30):** `Soneca: rotina do bebê`
- **Idioma padrão:** Português (Brasil) – pt-BR
- **App ou jogo:** App. **Gratuito ou pago:** Gratuito (depois de publicado grátis, não dá para virar pago;
  a assinatura futura é compra dentro do app, o que é permitido).
- Aceitar as Políticas do programa para desenvolvedores e as leis de exportação dos EUA.

## Página da loja (Presença na loja → Página principal da loja)

**Descrição curta (80):**

> Mamadas, sono e fraldas do bebê, anotados pela família inteira, na hora.

**Descrição completa (4.000):** a mesma da App Store, sem mudar nada:

> O Soneca é o diário da rotina do bebê, feito para a família inteira usar junto.
>
> Quem está com o bebê anota em um toque: mamada (peito, lado e minutos, ou mamadeira), sono, fralda,
> ordenha, remédio, banho e outros cuidados. Todo mundo da família vê a mesma linha do tempo, no
> celular de cada um, na hora.
>
> O QUE DÁ PARA FAZER
> • Anotar mamadas, sonos, fraldas e cocôs, ordenhas, remédios e cuidados do dia a dia
> • Ver há quanto tempo foi a última mamada ou fralda, logo na tela inicial
> • Ver a hora do próximo remédio e marcar a dose dada ou pulada
> • Acompanhar peso, medidas e marcos, com as curvas de crescimento da OMS
> • Ver o resumo da semana e do mês, com médias por dia e a divisão das tarefas da família
> • Anotar dúvidas para a próxima consulta
> • Gerar um relatório em PDF para levar ao pediatra
>
> FEITO PARA A FAMÍLIA
> Convide quem cuida do bebê: pais, avós, babá. Cada um entra com a própria conta e vê os mesmos
> registros. Dá para ter mais de um bebê na mesma família.
>
> SEUS DADOS
> Os registros ficam só com a sua família. O Soneca não tem anúncios e não vende dados. Você pode
> apagar a sua conta a qualquer momento, pelo próprio app.
>
> O Soneca organiza o que a família anota; ele não faz diagnóstico nem substitui o pediatra.

A última frase cobre a regra do Google para apps de saúde: o aviso na descrição de que o app não
substitui o profissional.

**Imagens** (todas em `loja/google-play/`):

- Ícone (512 × 512, PNG): `icons/icon-512.png`, o mesmo céu e a mesma capivara do app.
- Imagem de destaque (1024 × 500): `feature-graphic.png`.
- Capturas de tela do celular: as 8 de 1080 × 1920, na ordem dos números.

## Configurações da loja (Presença na loja → Configurações da loja)

- **Categoria:** **Criação dos filhos** ("Parenting"). É onde ficam os apps de rotina do bebê no Google
  Play, e ela não existe na Apple (lá foi Saúde e fitness). Não usar "Medicina" ("Medical"): app médico
  exige conta de empresa. Alternativa, se preferir igual à Apple: Saúde e fitness.
- **Tags:** as que o Play Console sugerir para bebê e família (a conferir).
- **E-mail de contato:** `drpatrickharrisdemesquita@gmail.com`
- **Site:** `https://soneca.app.br`
- **Telefone:** deixar em branco (é opcional e fica público).
- **Política de privacidade** (em Conteúdo do app): `https://soneca.app.br/privacidade`

## Conteúdo do app (Política → Conteúdo do app)

**Acesso ao app:** "Todas ou algumas funcionalidades são restritas". Instruções (em inglês, como na
Apple): a conta de demonstração, com o mesmo texto das notas da App Store, trocando a última parte:

> Soneca is a shared baby-care log for families in Brazil (Portuguese only). Families record feedings,
> sleep, diapers, medicines and other care, and everyone in the family sees the same timeline.
>
> Sign-in: regular users sign in with Google or a one-time code sent by email. For review, please use
> the demo account above: type the email on the first screen and tap "Receber código". For this
> account only, the app asks for a password instead of sending a code. The demo account already has a
> family ("Família Revisão") with a 4-month-old baby and three weeks of sample records.
> On the first sign-in, the app asks the user to accept the Privacy Policy and Terms of Use and to
> authorize the baby and health data (required by Brazilian data protection law, LGPD). Please accept
> to continue.
>
> Account deletion: Perfil (last tab) → "Apagar minha conta", then tap again to confirm.
>
> The app is free, has no in-app purchases and no ads. It does not provide medical advice; the
> pediatrician report (PDF) only compiles what the family recorded.

O campo "Any other information" do Play Console (agora "Sign in details") aceita só 500 caracteres. Versão
usada em 16/10 (488):

> Portuguese-only baby-care log for families in Brazil. Sign in with the email and password above: type
> the email on the first screen and tap "Receber código"; for this demo account only, the app asks for a
> password instead of a code. Then accept the Privacy Policy and Terms (required by Brazilian law, LGPD).
> The account has a family ("Família Revisão") with a sample baby and 3 weeks of records. Delete account:
> Perfil tab > "Apagar minha conta". No ads, no purchases, no medical advice.

Antes de enviar para o Google, rodar `supabase/013_conta_da_revisao.sql` (datas recentes), como na Apple.
Atenção: a Apple está revisando com a mesma conta; esperar a aprovação dela antes de rodar.

**Anúncios:** Não, o app não tem anúncios.

**Classificação do conteúdo** (questionário IARC, a conferir): categoria "Todos os outros tipos de app"
(não é jogo). Violência, sexo, linguagem, drogas, apostas: não em tudo. "Os usuários podem interagir ou
trocar conteúdo?": **Sim**, porque os membros da família veem os registros uns dos outros (só quem foi
convidado; não há conversa com desconhecidos). "Compartilha a localização?": Não. "Compras digitais?":
Não. Deve dar Livre (L), com o aviso "Usuários interagem".

**Público-alvo e conteúdo:** só **18 anos ou mais**. O app é para os pais; o bebê não usa. Marcar faixas
de criança põe o app nas regras de "Famílias", que não cabem aqui. "O app pode atrair crianças sem
querer?": Não.

**Apps de notícias:** Não. **Apps governamentais:** Não. **Recursos financeiros:** nenhum.

**Apps de saúde** (declaração feita em 16/10: só Sleep management e Nutrition and weight management, nada de "Medical", nem "Medication and treatment management", que existe na lista; os remédios ficam declarados como Health info na Segurança dos dados): marcar só o que o app faz, nada de "Médico"/"Dispositivo médico" (a
conferir os nomes exatos na tela). O Soneca anota rotina e saúde do dia a dia; não diagnostica, não
mede nada pelo celular e não é feito por instituição de saúde.

**Segurança dos dados:** abaixo.

## Segurança dos dados

**Coleta e segurança:**

- O app coleta ou compartilha dados do usuário? **Sim.**
- Os dados são criptografados em trânsito? **Sim** (HTTPS até o Supabase).
- Criação de conta: "Username and other authentication" (código por e-mail) e "OAuth" (Google). Não
  "Username and password": a senha só existe na conta do revisor.
- Exclusão da conta: `https://soneca.app.br/apagar-conta` (no ar desde 16/10). Exclusão de parte dos
  dados sem apagar a conta: Sim, `https://soneca.app.br/apagar-conta#bebe`.

**Compartilhamento:** **Nenhum.** Para o Google, enviar dados a empresas que trabalham para nós
(Supabase, Vercel, Google para o login) não conta como compartilhar. Nenhum dado vai para anúncios ou
para terceiros por conta própria.

**Tipos de dados coletados** (todos: coletados, não compartilhados, processados não só no aparelho):

| Tipo no formulário | O que é no Soneca | Obrigatório? | Finalidade |
|---|---|---|---|
| Informações pessoais → Nome | Nome de exibição na família; nome vindo do Google | Obrigatório | Funcionalidade do app; Gerenciamento da conta |
| Informações pessoais → Endereço de e-mail | Entrar (código ou Google) | Obrigatório | Funcionalidade do app; Gerenciamento da conta; Comunicações do desenvolvedor (aviso de mudança da Política) |
| Informações pessoais → IDs de usuário | O número da conta, que liga os registros a quem anotou | Obrigatório | Funcionalidade do app; Gerenciamento da conta |
| Informações pessoais → Outras informações | Nome, nascimento e sexo do bebê | Obrigatório (o nome do bebê) | Funcionalidade do app |
| Saúde e condicionamento físico → Informações de saúde | Sintomas, temperatura, remédios, peso, marcos, amamentação | Opcional | Funcionalidade do app |
| Atividade no app → Outro conteúdo gerado pelo usuário | Registros do dia a dia, observações, dúvidas para a consulta | Opcional | Funcionalidade do app |
| Mensagens → Outras mensagens no app | Sugestões e problemas enviados pelo app | Opcional | Funcionalidade do app (suporte) |
| Informações e desempenho do app → Outros dados de desempenho | Modelo do aparelho junto das sugestões | Opcional | Funcionalidade do app (corrigir falhas) |

"Opcional" quer dizer que a pessoa usa o app sem informar aquilo. Não marcar: Local, Contatos,
Fotos e vídeos, Arquivos, Agenda, Financeiro, Navegação na Web, Pesquisa, IDs do dispositivo, Registros
de falhas (o Soneca não usa ferramenta de falhas).

Os registros de acesso (IP, data e hora) que a lei manda guardar ficam na Vercel e no Supabase, para
segurança; o Google não pede declarar o que é só registro técnico do servidor (a conferir no formulário).

## Teste fechado e produção

- Faixa de teste fechado: só **Brasil** em Países/regiões.
- Testadores: uma lista de e-mails no Play Console (12 ou mais, mantidos 14 dias seguidos). O link de
  entrada no teste vai para cada um por mensagem.
- Depois dos 14 dias: Painel → "Solicitar acesso à produção", com as respostas sobre o teste.
