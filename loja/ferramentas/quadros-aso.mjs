// Monta as capturas v2 (ASO) a partir de quadros-aso.html e das fotos em telas/aso-*.png (telas-aso.mjs).
// Saída: loja/app-store-v2/ (1290 x 2796), loja/app-store-6.3-v2/ (1206 x 2622), loja/google-play-v2/ (1080 x 1920)
// e loja/apple-ios27/ (cabeçalho 3840 x 1646 e cartão da busca 3840 x 2560).
// Uso: PLAYWRIGHT=<pasta do playwright> CH=chrome node loja/ferramentas/quadros-aso.mjs
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT ? pathToFileURL(path.join(process.env.PLAYWRIGHT, 'index.mjs')).href : 'playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url)), OUT = path.resolve(HERE, '..');
const b = await chromium.launch(process.env.CH ? { channel: process.env.CH, args: ['--headless=new'] } : {});
const DIRS = { ios: 'app-store-v2', ios63: 'app-store-6.3-v2', and: 'google-play-v2', i27h: 'apple-ios27', i27s: 'apple-ios27' };
const only = process.argv.slice(2);
for (const k of Object.keys(DIRS)) {
  if (only.length && !only.includes(k)) continue;
  const dir = path.join(OUT, DIRS[k]); fs.mkdirSync(dir, { recursive: true });
  const p = await b.newPage({ viewport: { width: 4000, height: 3000 } });
  await p.goto(pathToFileURL(path.join(HERE, 'quadros-aso.html')).href + '?k=' + k);
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  const pano = await p.$('#pano');
  if (pano) {
    const bb = await pano.boundingBox(), w = bb.width / 2;
    await p.screenshot({ path: path.join(dir, '01-sono-num-toque.png'), clip: { x: bb.x, y: bb.y, width: w, height: bb.height } });
    await p.screenshot({ path: path.join(dir, '02-janela-sempre-a-vista.png'), clip: { x: bb.x + w, y: bb.y, width: w, height: bb.height } });
  }
  for (const el of await p.$$('.f, .i27')) {
    const id = await el.getAttribute('id');
    await el.screenshot({ path: path.join(dir, id.replace(/-\d+x\d+$/, '') + '.png') });
  }
  await p.close();
}
await b.close();
