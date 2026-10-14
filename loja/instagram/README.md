# Soneca no Instagram: kit para o estúdio (Remotion)

O que passar para o estúdio que faz os vídeos: **as instruções** (o texto da seção "Briefing", para colar)
e **o kit** (`kit/`, as telas e os vídeos do app com dados inventados). O estúdio não abre o app nem o
repositório; ele só sabe o que estiver no briefing e nos arquivos.

## O kit

Gerado por `node loja/ferramentas/reels.mjs` (Playwright com o Chromium), com o Soneca de verdade e o
Supabase de mentira das imagens da loja: Helena, 3 meses; família Andrade (Carol, Pedro e Vó Lúcia);
hoje é 7/10, 14h32. Fica fora do git (pesa uns 20 MB); para mandar ao estúdio, compactar `kit/`.
Refazer sempre que a tela mudar.

```
kit/
  mamada-dia/  mamada-noite/      anotar mamada no peito esquerdo, 12 min
  fralda-dia/  fralda-noite/      fralda com xixi e cocô
  sono-dia/    sono-noite/        acordou e dormiu de novo (faixa "Dormindo há", com a capivara)
  resumo-dia/  resumo-noite/      linha do tempo, semana, médias, mês, divisão da família
  familia-dia/ familia-noite/     a aba Família
  relatorio-dia/ relatorio-noite/ relatório para o pediatra (sem capivara)
  marca/       capivara (dia e noite, SVG), ícone do app, fonte DM Sans e a licença dela
  loja/        as 8 imagens da Google Play (1080 × 1920), já com título e moldura
```

Em cada pasta de passo a passo:

- `1-...png`, `2-...png`...: um quadro por momento, 1290 × 2796 px (a tela inteira de um iPhone).
- `tela.webm`: o vídeo da tela fazendo os mesmos passos devagar, 860 × 1864 px, com um círculo onde o
  dedo toca. Serve de referência de ritmo, ou para usar direto dentro do celular desenhado.

## Briefing (colar no estúdio)

> Faça Reels de passo a passo do **Soneca**, um app brasileiro para a família anotar a rotina do bebê
> (mamadas, sono, fraldas, remédios) numa linha do tempo que todos veem no próprio celular. Grátis, sem
> anúncios. Site: soneca.app.br. Público: mães e pais de bebês de 0 a 2 anos, cansados, no celular de
> madrugada.
>
> **Formato:** 1080 × 1920, 30 fps, 15 a 25 segundos, MP4 (H.264). Deixe livres de texto os 250 px de
> cima, os 380 px de baixo e os 120 px da direita (é onde o Instagram põe nome, legenda e botões).
> Sem música (a música entra no Instagram); se quiser som, só um clique suave nos toques.
>
> **Material anexado:** pastas com as telas reais do app, um quadro por passo (`1-...png`,
> `2-...png`...) e um vídeo da tela (`tela.webm`) com o mesmo passo a passo. Use as telas dentro de um
> celular desenhado de forma simples (cantos arredondados, moldura na cor do texto), sem modelo de
> iPhone de verdade. Pode dar zoom e mover a câmera sobre a tela para destacar o botão tocado. Não
> redesenhe nem invente telas: só o que está nas imagens.
>
> **Estrutura de cada Reel:**
> 1. Gancho (0 a 2 s): uma frase grande, sem o celular ainda.
> 2. Passo a passo (2 a 18 s): o celular entra; cada passo com uma legenda curta no alto (até 6
>    palavras), trocando no ritmo dos quadros.
> 3. Fecho (últimos 3 s): a capivara (`marca/capivara-*.svg`, desenhada traço a traço) ao lado da
>    palavra "Soneca", e embaixo "soneca.app.br".
>
> **Identidade (obrigatória):**
> - Fonte DM Sans (anexada), só pesos 400 e 500. Nada de negrito 600 ou 700, nada de caixa alta.
> - Cores, de dia: fundo `#FFF8EE`, cartão `#FFFFFF`, texto `#4A3522`, texto secundário `#826449`,
>   destaque caramelo `#E8A87C` (só em formas, nunca em texto). De noite: fundo `#111B21`, cartão
>   `#1F2C34`, texto `#E9EDEF`, secundário `#9AA8B1`, destaque `#C98B62`.
> - Cor de cada registro (círculos, fundos de destaque): mamada menta `#9ED9B8` (noite `#245C41`),
>   sono azul-céu `#9CC8F0` (noite lavanda `#4E477C`), fralda manteiga `#FFD98A` (noite `#68521E`),
>   remédio e sintomas salmão `#F6A5A0` (noite `#703540`), cuidados caramelo claro `#F5CDB0`.
> - Formas suaves e arredondadas, sombras leves, movimentos calmos (entradas com mola suave, nada de
>   tremer, piscar ou girar). É um app de bebê usado com sono: tranquilo, não agitado.
> - Capivara só em rotina (mamada, sono, fralda, fecho). Nunca no vídeo do relatório para o pediatra.
> - Tom: frases curtas, em português do Brasil, como uma amiga falando. Humor raro e leve, só na rotina.
>   Nada de promessa de saúde ("melhora o sono", "evita cólica"): o Soneca anota, não orienta.
> - O nome é sempre "Soneca" ("o Soneca"), nunca "Caderninho".
>
> **Faça primeiro só o Reel 1, de dia**, para eu aprovar o estilo; depois os outros.

### Roteiros

| # | Pasta | Gancho | Legendas dos passos | Observação |
|---|---|---|---|---|
| 1 | `mamada-dia` | Qual peito foi a última mamada? | Toque em Mamada · Escolha o peito · Os minutos, se quiser · Salvo. A família toda vê | Destaque a frase "Última no peito: direito, há 2h41" no quadro 2 |
| 2 | `fralda-noite` | 3 da manhã. Fralda trocada. | Toque em Fralda · Xixi, cocô · Salvo, sem acender a luz | Versão noite: mostra o modo escuro. Pode mostrar o "Alerta marrom" de relance (humor) |
| 3 | `sono-dia` | Dormiu! Agora anota. | Faixa "Dormindo há" · Acordou · Dormiu de novo · O tempo corre sozinho | A capivara da faixa é o momento fofo |
| 4 | `resumo-dia` | Como foi a semana dela? | O dia numa linha · A semana lado a lado · As médias por dia · Quem trocou mais fraldas | O último quadro (divisão da família) é o fecho com humor |
| 5 | `familia-dia` + `mamada-dia` | Pai, mãe, avó, babá. Um só caderno. | Cada um no seu celular · Todo mundo vê na hora | Pode usar dois celulares lado a lado |
| 6 | `relatorio-dia` | Consulta amanhã? | As últimas semanas num PDF · Pronto para o pediatra | Sóbrio: sem capivara, sem piada, sem cor forte |

### Imagem para os stories de quem indica

Pedir ao estúdio uma imagem parada (1080 × 1920, PNG), de dia e de noite, para outras pessoas postarem:

> Uma imagem de story para quem usa o Soneca indicar a amigos. No alto, "A gente anota a rotina da
> nossa bebê no Soneca" (com versões "do nosso bebê" e neutra, "a rotina do bebê"). No meio, a tela
> `loja/01-rotina.png` (ou `mamada-dia/1-inicio.png` num celular desenhado), com um círculo menta atrás.
> Embaixo, "Mamadas, sono e fraldas. A família toda vê. Grátis." e um espaço vazio de 600 × 200 px
> para o adesivo de link do Instagram (soneca.app.br). Capivara pequena ao lado de "Soneca". Mesma
> identidade do briefing dos Reels. Sem foto de bebê.

Quando o app sair na App Store, trocar "soneca.app.br" pelo link da loja (ou manter o site, que leva às
duas).
