# Soneca na App Store: o que preencher

Rascunho de 13/10 para copiar no App Store Connect (app "Soneca: rotina do bebê", Apple ID 6821448149).
Revisar antes de colar. Tom neutro e claro; nada de promessa de saúde.

## App Information

- **Subtitle (30):** `Mamadas, sono e fraldas`
- **Category:** Primary `Health & Fitness`; Secondary `Lifestyle` (ou vazio). Não usar Kids nem Medical.
- **Content Rights:** "No, it does not contain, show, or access third-party content".
- **Age Rating:** None/No em tudo; conteúdo médico "None" (o app só registra o que a família faz). Deve dar 4+.
- **Privacy Policy URL:** `https://soneca.app.br/privacidade`

## Pricing and Availability

- **Price:** Free (Grátis).
- **Availability:** só Brasil.

## Versão 1.0 (página da loja, em português)

**Promotional Text (170):**

> Anote mamadas, sono e fraldas num toque, e toda a família vê na hora. No fim da semana, o resumo mostra como o bebê está indo.

**Description:**

> O Soneca é o caderninho da rotina do bebê, feito para a família inteira usar junto.
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

**Keywords (100):** `mamada,amamentação,sono,fralda,bebê,recém-nascido,diário,pediatra,ordenha,remédio,família,cólica`

**Support URL:** `https://soneca.app.br` (ou a página de contato, quando houver).

**Copyright:** `2026 Patrick Harris de Mesquita`

**Screenshots:** iPhone 6,9" (1320 × 2868), de 3 a 10. Sugestão de ordem: tela inicial com os botões;
linha do tempo do dia; painel da semana; resumo do mês; remédios; relatório para pediatra. Com dados de
exemplo (a "Família Revisão" do 013 serve), de dia, e uma de noite.

## App Privacy (questionário "Data Types")

"Do you or your third-party partners collect data from this app?" → **Yes**.

Para todos os tipos abaixo: **Linked to the user: Yes**; **Used for tracking: No**.

| Categoria → tipo | Por quê | Finalidade |
|---|---|---|
| Contact Info → **Name** | Nome de exibição na família; nome vindo da Apple ou do Google | App Functionality |
| Contact Info → **Email Address** | Entrar (código, Apple, Google) | App Functionality |
| Health & Fitness → **Health** | Sintomas, temperatura, remédios, peso, marcos do bebê; amamentação | App Functionality |
| User Content → **Other User Content** | Observações, dúvidas para a consulta, nome e nascimento do bebê | App Functionality |
| User Content → **Customer Support** | Sugestões e problemas enviados pelo app | App Functionality |
| Identifiers → **User ID** | O número da conta, que liga os registros a quem anotou | App Functionality |
| Diagnostics → **Other Diagnostic Data** | Modelo do aparelho junto das sugestões e problemas | App Functionality |

Não marcar: Location, Contacts, Photos, Purchases (só quando houver assinatura), Usage Data, Browsing,
Search, Financial, Sensitive Info (a Apple trata saúde em Health & Fitness), Device ID, Advertising.

## App Review Information

- **Sign-in required:** Yes.
- **User name / Password:** a conta de demonstração (e-mail `+revisao` do Gmail e a senha criada no
  Supabase, Authentication → Users → Add user, "Auto Confirm User"). Logo antes de enviar, rodar
  `supabase/013_conta_da_revisao.sql` para os dados de exemplo ficarem com datas recentes.
- **Contact:** nome, telefone e e-mail do Patrick.
- **Notes (em inglês):**

> Soneca is a shared baby-care log for families in Brazil (Portuguese only). Families record feedings,
> sleep, diapers, medicines and other care, and everyone in the family sees the same timeline.
>
> Sign-in: regular users sign in with Sign in with Apple, Google, or a one-time code sent by email.
> For review, please use the demo account above: type the email on the first screen and tap
> "Receber código". For this account only, the app asks for a password instead of sending a code.
> The demo account already has a family ("Família Revisão") with a 4-month-old baby and three weeks
> of sample records.
> On the first sign-in, the app asks the user to accept the Privacy Policy and Terms of Use and to
> authorize the baby and health data (required by Brazilian data protection law, LGPD). Please accept
> to continue.
>
> Account deletion: Perfil (last tab) → "Apagar minha conta", then tap again to confirm. If the
> account was created with Sign in with Apple, the app also revokes the Apple token.
>
> The app is free, has no in-app purchases and no ads. It does not provide medical advice; the
> pediatrician report (PDF) only compiles what the family recorded.
