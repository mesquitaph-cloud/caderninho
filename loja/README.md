# Imagens para as lojas

Aprovadas em 07/10. Prévia (privada): https://claude.ai/artifact/MsXegQrEamYiSJ2hAJXXgs

- `app-store/`: 8 imagens de 1290 × 2796 px (iPhone de 6,9").
- `google-play/`: as mesmas 8 em 1080 × 1920 px e o destaque (`feature-graphic.png`, 1024 × 500 px).

As telas são o app de verdade com dados inventados (Helena, 3 meses, família Andrade; Carol, Pedro e Vó
Lúcia), num Supabase de mentira que não sai do computador. A capivara só aparece nas imagens de rotina.

**Para refazer** depois de mudar o app (precisa do Playwright com o Chromium):

    node loja/ferramentas/telas.mjs     # tira as fotos das telas, de dia e de noite
    node loja/ferramentas/quadros.mjs   # monta as imagens das lojas

Os textos e a ordem ficam em `loja/ferramentas/quadros.html`; os dados de exemplo, em `fake-sb.js`.
