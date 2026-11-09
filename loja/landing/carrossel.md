# Carrossel da página inicial (soneca.app.br)

Aprovado por Patrick em 08/11/2026.

## Título, acima dos cartões

"Você já se perguntou isso hoje?"

## Cartões

Imagens em `inicio/carrossel/`, 1080 × 1350, uma de dia (`-dia.png`) e uma de noite (`-noite.png`) para
cada cartão. O texto está dentro da imagem; o `alt` repete a pergunta e a linha.

| # | Arquivo | Pergunta | Linha |
|---|---|---|---|
| 1 | `1-sono` | Quanto o bebê dormiu hoje? | Toque em Sono e em Acordou. O Soneca soma as horas. |
| 2 | `2-janela` | Já está na hora de dormir de novo? | Veja há quanto tempo seu bebê acordou. |
| 3 | `3-mamadas` | Que horas ela mamou? | Está na tela inicial, sem fazer conta. |
| 4 | `4-fralda` | Quantas fraldas foram hoje? | O Soneca conta xixi e cocô de cada dia. |
| 5 | `5-remedio` | Que horas é o remédio? | O Soneca avisa no celular na hora de cada dose. |
| 6 | `6-pediatra` | Na consulta, deu branco? | Anote as dúvidas no dia a dia e marque o que já perguntou. |
| 7 | `7-familia` | O grupo da família virou diário do bebê? | No Soneca, cada um anota e todos veem na hora. |

As telas são do app de verdade, com os dados de exemplo da Helena (cenário `carrossel` e `normal` em
`testes/cenarios.js`). A capivara aparece em todos os cartões, inclusive remédio e pediatra: exceção
aprovada só para este carrossel, não vale para o app nem para o relatório.
