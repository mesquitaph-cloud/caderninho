# Caderninho

App para famílias registrarem a rotina dos bebês (mamadas, sono, fraldas, vômitos) numa linha do
tempo compartilhada. Site instalável na tela do celular, sem loja. Vocabulário em `CONTEXT.md`.

- **Front:** HTML/CSS/JS puro, sem build. Publicado no Vercel.
- **Back:** Supabase (região São Paulo) — banco, login por código no e-mail, sincronização.
- **Login:** e-mail + código de 6 dígitos (modelos "Confirm sign up" e "Magic link" usam `{{ .Token }}`).

## Pendências antes de convidar amigos

- Trocar o remetente dos e-mails (hoje o Gmail profissional do Patrick) por uma conta dedicada. Com a
  indicação a outras famílias, mais gente nova recebe esses e-mails, e o Gmail limita quantos saem por dia.
- Revisão de segurança das regras de acesso do banco (RLS).

## Feito recentemente

- **25/09, peito na mamada e ordenha:** no ar. Prévia usada para decidir:
  https://claude.ai/artifact/RM2MDniYfSfwCAZciyz9py. Banco: `supabase/004_peito_e_ordenha.sql`.
- **25/09, `supabase/003_endurece_colunas.sql` rodado:** quem está logado só grava nas colunas que o
  app usa (antes, gravava em qualquer uma). Conferido pelo conector, sem erro de permissão nos logs.

## Próximo: painel da semana, calendário e feedback

Prévia interativa (privada): https://claude.ai/artifact/AsJs7ewJnFY3Jfhn3yoTUP

Decidido em 25/09:

- **Painel da semana:** aba "Dia | Semana" logo abaixo dos botões de registro. Sempre 7 dias,
  terminando no dia escolhido; as setas andam 7 dias. Mostra:
  - "Como foram os dias": uma linha por dia, de 0h a 24h. Sono em barras; mamadas, fraldas e
    ordenhas em marcas, com filtro por tipo. Tocar num dia abre a linha do tempo dele.
  - "Média por dia", sem contar hoje: sono (e o maior sono seguido), mamadas (tempo no peito e ml
    na mamadeira), fraldas (quantas com cocô) e ordenhas (ml por dia).
  - "Dia a dia": uma barra por dia de sono, mamadas, fraldas ou ml de ordenha; hoje mais claro.
  - "Nestes 7 dias": maior sono seguido, maior intervalo entre mamadas, vezes em cada peito e
    total ordenhado.
  - Sono de dia e de noite juntos. Só o que foi registrado, sem avaliar nem comparar.
- **Calendário:** tocar na data abre o mês, com um ponto nos dias que têm registros e hoje marcado.
  Só os últimos 60 dias (o que o app já carrega) e nada no futuro. No modo Semana, o dia escolhido
  é o último dos 7.
- **Sugestões e problemas:** seção nova no menu. Tipo opcional (Sugestão ou Algo deu errado),
  texto de até 1000 caracteres, aviso do que vai junto (nome, família e tipo de celular) e
  "Recebido, obrigado!" ao enviar.
  - Banco: tabela nova `feedback` (arquivo novo em `supabase/`) com quem mandou, família, tipo,
    texto, data e aparelho. Pelo app, só dá para enviar; ninguém lê. Limite de envios por pessoa
    por dia.
  - Para ler: painel do Supabase, em Table Editor → `feedback`. O e-mail de quem mandou está em
    Authentication → Users.
  - Aviso por e-mail de mensagem nova: depende do remetente dedicado (primeira pendência).
  - Trava do Claude: pôr a coluna do texto na lista de dados pessoais de `supabase-guard.mjs`.
  - Outras opções, piores: link de e-mail (depende de o celular ter e-mail configurado) e
    formulário externo (os dados ficam fora do Supabase e não se sabe quem mandou).

Falta: implementar, testar e publicar. Painel e calendário mudam só o app; o feedback precisa do SQL
rodado antes. Termos novos no `CONTEXT.md` ao implementar.

## Ideias para depois

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
