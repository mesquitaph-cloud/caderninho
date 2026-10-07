const { chromium } = await import('playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'));
import path from 'node:path'; import fs from 'node:fs';
const HERE = path.dirname(new URL(import.meta.url).pathname), OUT = path.resolve(HERE, '..');
const b = await chromium.launch();
for (const k of ['ios', 'and', 'feat']) {
  const dir = path.join(OUT, { ios: 'app-store', and: 'google-play', feat: 'google-play' }[k]); fs.mkdirSync(dir, { recursive: true });
  const p = await b.newPage({ viewport: { width: 1500, height: 3000 } });
  await p.goto('file://' + path.join(HERE, 'quadros.html') + '?k=' + k);
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  for (const el of await p.$$('.f')) { const id = await el.getAttribute('id'); await el.screenshot({ path: path.join(dir, id + '.png') }); }
}
await b.close();
