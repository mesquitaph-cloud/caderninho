// Gera o ícone (1024 px, claro e escuro) e a tela de abertura (2732 px, dia e noite) do app do iPhone,
// a partir do traço da capivara. Prévia aprovada em 12/10: https://claude.ai/artifact/HQG9RW4a4cCcaJq3tHvGLN
// Uso: npm i --no-save playwright-core && node scripts/icones.mjs <pasta de saída> "$PWD"
// Depois: tirar a transparência (a Apple recusa ícone com canal alfa) e copiar para ios/App/App/Assets.xcassets.

import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
const [out, repo] = process.argv.slice(2);
const CAPI = `<path d="M73 54H12C7 54 5.5 51 5.5 45.5C5.5 30 16 19 35 18.4C45 18.1 53 18.2 58 18.6C62 18.9 64 20 66.5 20C70 20 73.5 15.5 81 15.5H100C108.5 15.5 113 21 113 31V42C113 46.5 111 49 106.5 49H83C78.5 49 77.5 54 73 54Z"/><path d="M80 15.8C80 9.5 86.5 8.5 87.5 14.6"/><path d="M85.5 26.5Q90 30.5 94.5 27"/><path d="M107.6 24.6L108.3 28"/><path d="M57 54C58 48.5 65.5 47.5 68.5 53"/>`;
const icon = (bg, ink) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="${bg}"/><g transform="translate(99 295) scale(7)" fill="none" stroke="${ink}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round">${CAPI}</g></svg>`;
// Abertura: 2732 px, recortada pelo iPhone em "preencher"; o conteúdo fica no centro, pequeno.
const splash = (bg, mascot, ink) => `<html><head><style>
@font-face{font-family:"DM Sans";font-weight:100 1000;src:url(file://${repo}/fonts/dm-sans-latin-opsz-normal.woff2)}
html,body{margin:0;width:2732px;height:2732px;background:${bg}}
.c{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:61px}
svg{width:467px;height:auto;fill:none;stroke:${mascot};stroke-width:2.4px;stroke-linecap:round;stroke-linejoin:round}
b{font:500 172px "DM Sans";letter-spacing:-.02em;color:${ink}}
</style></head><body><div class="c"><svg viewBox="0 0 120 70">${CAPI}</svg><b>Soneca</b></div></body></html>`;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
for (const [n, bg, ink] of [['icon-day', '#9CC8F0', '#4A3522'], ['icon-dark', '#111B21', '#9CC8F0']]) {
  await p.setContent(`<html><body style="margin:0">${icon(bg, ink)}</body></html>`);
  await p.screenshot({ path: `${out}/${n}.png`, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
}
await p.setViewportSize({ width: 2732, height: 2732 });
for (const [n, bg, m, ink] of [['splash-day', '#FFF8EE', '#7A5A3C', '#4A3522'], ['splash-dark', '#111B21', '#E6CDB5', '#E9EDEF']]) {
  writeFileSync(`${out}/splash.html`, splash(bg, m, ink)); await p.goto(`file://${out}/splash.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/${n}.png` });
}
await b.close();
