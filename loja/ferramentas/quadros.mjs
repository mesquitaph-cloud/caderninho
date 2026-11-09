// Monta as imagens das lojas a partir de quadros.html e das fotos em telas/.
// No Windows: PLAYWRIGHT=<pasta do pacote playwright> e CH=chrome (ou msedge) para usar o navegador instalado.
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT ? pathToFileURL(path.join(process.env.PLAYWRIGHT, 'index.mjs')).href : 'playwright')
  .catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
const HERE = path.dirname(fileURLToPath(import.meta.url)), OUT = path.resolve(HERE, '..');
const b = await chromium.launch(process.env.CH ? { channel: process.env.CH, args: ['--headless=new'] } : {});
for (const k of ['ios', 'ios63', 'and', 'feat']) {
  const dir = path.join(OUT, { ios: 'app-store', ios63: 'app-store-6.3', and: 'google-play', feat: 'google-play' }[k]); fs.mkdirSync(dir, { recursive: true });
  const p = await b.newPage({ viewport: { width: 2700, height: 3000 } });
  await p.goto(pathToFileURL(path.join(HERE, 'quadros.html')).href + '?k=' + k);
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  // Quadro duplo da abertura: cortado na metade, vira 01-rotina e 02-semana.
  const pano = await p.$('#pano');
  if (pano) {
    const bb = await pano.boundingBox(), w = bb.width / 2;
    await p.screenshot({ path: path.join(dir, '01-rotina.png'), clip: { x: bb.x, y: bb.y, width: w, height: bb.height } });
    await p.screenshot({ path: path.join(dir, '02-semana.png'), clip: { x: bb.x + w, y: bb.y, width: w, height: bb.height } });
  }
  for (const el of await p.$$('.f')) { const id = await el.getAttribute('id'); await el.screenshot({ path: path.join(dir, id + '.png') }); }
}
await b.close();
