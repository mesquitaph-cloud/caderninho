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

## Em andamento: peito na mamada e ordenha

Prévia interativa (privada): https://claude.ai/artifact/RM2MDniYfSfwCAZciyz9py

Decidido:

- **Mamada no peito:** um toque marca o esquerdo, o direito ou os dois; marcar não é obrigatório.
  Minutos de cada peito são opcionais (1 a 180); mexer nos minutos marca o peito, desmarcar apaga.
  Linha do tempo: "Peito direito", "Peito esquerdo · 15 min", "Os dois peitos · 20 min" com
  "esquerdo 12 min, direito 8 min" embaixo. O painel mostra "Última no peito: direito, há 1h20".
- **Resumo do dia:** mamadas, ml e minutos no peito; logo depois, "último peito: direito · há 1h20"
  (só em Hoje).
- **Ordenha:** botão novo, azul, na 5ª posição ("Outros" deixa de ser largo). Peito opcional:
  esquerdo, direito ou os dois. ml obrigatório, um total só. Linha: "Ordenha · 120 ml" com
  "os dois peitos" embaixo; resumo "2 ordenhas · 190 ml". Termo novo no `CONTEXT.md`.
- **Tempo acima de 24 horas em dias:** "há 1 dia", "há 2 dias".

Banco: arquivo novo em `supabase/`, rodado à mão **antes** de publicar o código. O banco tem
registros de uso real, então só acrescenta: `kind` aceita `pump`; colunas `side` (`left`, `right`,
`both`), `left_min` e `right_min` (1 a 180); ordenha exige `ml`; minutos só com o peito
correspondente; liberar as colunas novas nos grants do `003`.

Falta: escrever o SQL, implementar no app, testar e publicar.

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
