# Imagens para as lojas

Aprovadas em 07/10; refeitas em 14/10 com o app atual (Política 1.3, sem a dica de instalar). Refeitas
de novo em 09/11 com a tela inicial nova: agora são 6, e as duas primeiras se emendam (o celular da
tela inicial passa de uma para a outra). Saíram a da família e a do relatório. Prévia aprovada
(privada): https://claude.ai/artifact/Hn9wcbss23jKGUZa92RVoW

- `app-store/`: 6 imagens de 1290 × 2796 px (iPhone de 6,9").
- `app-store-6.3/`: as mesmas 6 em 1206 × 2622 px, o tamanho que a App Store Connect pediu em 14/10 ("iPhone with Dynamic Island, medium display").
- `google-play/`: as mesmas 6 em 1080 × 1920 px e o destaque (`feature-graphic.png`, 1024 × 500 px).

**Na loja, a ordem importa:** `01-rotina` e `02-semana` sempre juntas e nessa ordem, senão o celular
cortado na divisa fica sem sentido.

As telas são o app de verdade com dados inventados (Helena, 3 meses, família Andrade; Carol, Pedro e Vó
Lúcia), num Supabase de mentira que não sai do computador. A capivara só aparece nas imagens de rotina.

**Para refazer** depois de mudar o app (precisa do Playwright com o Chromium; o `fake-sb.js` toma o lugar de `vendor/supabase-js-*.js`, e os aceites dele seguem a `TERMS_VERSION`):

    node loja/ferramentas/telas.mjs     # tira as fotos das telas, de dia e de noite
    node loja/ferramentas/quadros.mjs   # monta as imagens das lojas

No Windows, com o Playwright instalado em outra pasta e o Chrome do computador:
`PLAYWRIGHT=<pasta>/node_modules/playwright CH=chrome node loja/ferramentas/telas.mjs` (e o mesmo para o
`quadros.mjs`). Se a tela inicial mudar, conferir onde a divisa corta o celular nas duas primeiras: ela
deve passar à direita de "Última fralda" e descer entre "Dormindo há" e "Acordou" (medidas no `PANO` do
`quadros.html`).

Os textos e a ordem ficam em `loja/ferramentas/quadros.html`; os dados de exemplo, em `fake-sb.js`.
