// Material para Reels: o Soneca de verdade com o Supabase de mentira, fazendo os passos devagar.
// Para cada passo a passo, tira uma foto de cada momento e grava um vídeo da tela, de dia e de noite.
// Os toques aparecem como um círculo, para quem assiste ver onde o dedo foi.
// Saída: loja/instagram/kit/ (fora do git; ver loja/instagram/README.md).
const { chromium } = await import('playwright').catch(() => import('/opt/node22/lib/node_modules/playwright/index.mjs'));
import fs from 'node:fs'; import path from 'node:path';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const REPO = path.resolve(HERE, '../..'), OUT = path.join(REPO, 'loja/instagram/kit');
const FAKE = fs.readFileSync(path.join(HERE, 'fake-sb.js'), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const W = 430, H = 932;
// O círculo do toque usa as cores do próprio app (variáveis do styles.css).
const TAP = `document.addEventListener('pointerdown', e => {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;'
    + 'background:color-mix(in srgb, var(--ink) 22%, transparent);border:2px solid color-mix(in srgb, var(--ink) 45%, transparent);'
    + 'left:' + e.clientX + 'px;top:' + e.clientY + 'px;transition:transform .45s ease-out,opacity .45s ease-out';
  document.body.appendChild(d);
  requestAnimationFrame(() => { d.style.transform = 'scale(1.6)'; d.style.opacity = '0'; });
  setTimeout(() => d.remove(), 600);
}, true);`;

const FLOWS = {
  // 1. Anotar uma mamada no peito
  mamada: async (p, snap) => {
    await snap('1-inicio');
    await p.click('.act[data-k="feed"]'); await snap('2-mamada-aberta');
    await p.click('[data-act="pick"][data-val="l"]'); await p.waitForTimeout(400);
    for (let i = 0; i < 12; i++) { await p.click('[data-act="minstep"][data-val="l:1"]'); await p.waitForTimeout(90); }
    await snap('3-peito-esquerdo-12min');
    await p.click('[data-act="save"]'); await snap('4-salvo');
  },
  // 2. Trocar a fralda (xixi e cocô)
  fralda: async (p, snap) => {
    await snap('1-inicio');
    await p.click('.act[data-k="diaper"]'); await snap('2-fralda-aberta');
    await p.click('[data-act="pee"]'); await p.waitForTimeout(400);
    await p.click('[data-act="poo"]'); await snap('3-xixi-e-coco');
    await p.click('[data-act="save"]'); await snap('4-salvo');
  },
  // 3. Acordou e dormiu de novo: a faixa "Dormindo há", com a capivara, some e volta
  sono: async (p, snap) => {
    await snap('1-dormindo-ha-1h15');
    await p.click('#wakeBtn'); await snap('2-acordou');
    await p.click('.act[data-k="sleep"], .act[data-k="wake"]'); await snap('3-sono-aberto');
    await p.click('[data-act="sk"][data-val="sleep"]'); await p.waitForTimeout(400);
    await p.click('[data-act="save"]'); await snap('4-dormiu-de-novo');
  },
  // 4. Rever o dia, a semana e o mês
  resumo: async (p, snap) => {
    await p.evaluate(() => document.getElementById('tabDay').scrollIntoView({ block: 'start', behavior: 'smooth' })); await snap('1-linha-do-tempo');
    await p.click('#tabWeek'); await p.evaluate(() => document.getElementById('tabDay').scrollIntoView({ block: 'start' })); await snap('2-semana');
    await p.evaluate(() => window.scrollBy({ top: 700, behavior: 'smooth' })); await snap('3-semana-medias');
    await p.click('#tabMonth'); await p.evaluate(() => document.getElementById('tabDay').scrollIntoView({ block: 'start' })); await snap('4-mes');
    await p.evaluate(() => { const h = [...document.querySelectorAll('#monthView h3,#monthView h4,#monthView .card')].find(x => /divis/i.test(x.textContent) && x.textContent.length < 4000); (h || document.body).scrollIntoView({ block: 'start', behavior: 'smooth' }); }); await snap('5-divisao-da-familia');
  },
  // 5. A família: quem cuida do bebê, cada um no seu celular
  familia: async (p, snap) => {
    await snap('1-inicio');
    await p.click('#tabbar [data-tab="family"]'); await p.evaluate(() => window.scrollTo(0, 0)); await snap('2-familia');
  },
  // 6. Relatório para o pediatra (sem capivara, tom neutro)
  relatorio: async (p, snap) => {
    await p.click('#tabbar [data-tab="baby"]'); await p.evaluate(() => window.scrollTo(0, 0)); await snap('1-aba-do-bebe');
    await p.click('[data-act="report"]'); await snap('2-relatorio-opcoes');
    const v = p.locator('[data-act="rpView"]'); if (await v.count()) { await v.first().click(); await snap('3-relatorio'); }
  },
};

const browser = await chromium.launch();
for (const scheme of ['light', 'dark']) for (const [flow, run] of Object.entries(FLOWS)) {
  if (process.argv[2] && !process.argv.slice(2).includes(flow)) continue;
  const dir = path.join(OUT, `${flow}-${scheme === 'light' ? 'dia' : 'noite'}`);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, colorScheme: scheme, timezoneId: 'America/Sao_Paulo', locale: 'pt-BR', hasTouch: false,
    recordVideo: { dir, size: { width: W * 2, height: H * 2 } } });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.error(flow, scheme, 'pageerror', e.message));
  await p.clock.setFixedTime(new Date('2026-10-07T14:32:00-03:00'));
  await p.route('http://soneca.test/**', r => {
    let u = new URL(r.request().url()).pathname; if (u === '/') u = '/index.html';
    if (/^\/vendor\/supabase-js-/.test(u)) return r.fulfill({ contentType: 'text/javascript', body: FAKE });
    const f = path.join(REPO, u);
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await p.addInitScript(TAP);
  await p.goto('http://soneca.test/');
  await p.waitForSelector('#scrMain:not([hidden])');
  await p.evaluate(() => document.fonts.ready);
  await p.addStyleTag({ content: '*{caret-color:transparent!important}' });
  await p.waitForTimeout(800);
  // Cada foto espera um pouco antes (a tela assenta) e depois (o vídeo fica parado no momento).
  const snap = async name => { await p.waitForTimeout(700); await p.screenshot({ path: path.join(dir, `${name}.png`) }); await p.waitForTimeout(900); };
  await run(p, snap);
  await p.waitForTimeout(600);
  const video = p.video();
  await ctx.close();
  fs.renameSync(await video.path(), path.join(dir, 'tela.webm'));
  console.log('ok', path.relative(REPO, dir));
}
await browser.close();
