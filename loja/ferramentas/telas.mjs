// Abre o Soneca de verdade com o Supabase de mentira e tira as fotos das telas, de dia e de noite.
const { chromium } = await import('playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'));
import fs from 'node:fs'; import path from 'node:path';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, '../..'), OUT = path.join(HERE, 'telas');
const FAKE = fs.readFileSync(path.join(HERE, 'fake-sb.js'), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, colorScheme: scheme, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' });
  await ctx.addInitScript(() => { try { localStorage.setItem('cad-install-tip', 'x'); } catch {} });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('pageerror', e.message));
  await page.clock.setFixedTime(new Date('2026-10-07T14:32:00-03:00'));
  await page.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: FAKE }));
  await page.route('http://soneca.test/**', r => {
    let p = new URL(r.request().url()).pathname; if (p === '/') p = '/index.html';
    const f = path.join(REPO, p);
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await page.goto('http://soneca.test/');
  await page.waitForSelector('#scrMain:not([hidden])');
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '.installTip{display:none!important}*{caret-color:transparent!important}' });
  const snap = async name => { await page.waitForTimeout(250); await page.screenshot({ path: path.join(OUT, `${name}-${scheme}.png`) }); };
  const top = () => page.evaluate(() => window.scrollTo(0, 0));

  await top(); await snap('home');
  await page.evaluate(() => document.getElementById('tabDay').scrollIntoView({ block: 'start' })); await page.evaluate(() => window.scrollBy(0, -12)); await snap('day');
  await page.click('#tabWeek'); await page.evaluate(() => document.getElementById('tabDay').scrollIntoView({ block: 'start' })); await snap('week');
  await page.evaluate(() => window.scrollBy(0, 700)); await snap('week2');
  await page.click('#tabMonth'); await page.evaluate(() => document.getElementById('tabDay').scrollIntoView({ block: 'start' })); await snap('month');
  await page.evaluate(() => { const h=[...document.querySelectorAll('#monthView h3,#monthView h4,#monthView .card')].find(x=>/divis/i.test(x.textContent)&&x.textContent.length<4000); (h||document.body).scrollIntoView({block:'start'}); window.scrollBy(0,-16); }); await snap('division');
  await page.click('#tabDay'); await top();
  // listinha dos últimos 3 dias da mamada
  const pl = page.locator('.cell .pl').first(); if (await pl.count()) { await pl.click(); await snap('hist'); await page.keyboard.press('Escape'); await page.evaluate(() => { const s = document.getElementById('scrim'); s && s.click(); }); }
  await page.click('#tabbar [data-tab="baby"]'); await top(); await snap('baby');
  await page.evaluate(() => document.getElementById('babyWeight')?.scrollIntoView({ block: 'start' })); await page.evaluate(() => window.scrollBy(0, -20)); await snap('growth');
  await page.click('#tabbar [data-tab="family"]'); await top(); await snap('family');
  await page.click('#tabbar [data-tab="baby"]'); await top();
  await page.click('[data-act="report"]'); await snap('reportsheet');
  const v = page.locator('[data-act="rpView"]'); if (await v.count()) { await v.first().click(); await snap('report'); }
  await ctx.close();
}
await browser.close();
