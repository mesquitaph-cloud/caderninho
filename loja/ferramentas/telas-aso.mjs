// Fotos das telas para as capturas de ASO (v2): o Soneca de verdade (1.0.4) com o Supabase de mentira.
// Uso: PLAYWRIGHT=<pasta do playwright> CH=chrome node loja/ferramentas/telas-aso.mjs [nome ...]
// Sem nomes, tira todas. Saída em loja/ferramentas/telas/aso-<nome>-<dia|noite>.png (fora do git).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT ? pathToFileURL(path.join(process.env.PLAYWRIGHT, 'index.mjs')).href : 'playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..'), OUT = path.join(HERE, 'telas');
const FAKE = fs.readFileSync(path.join(HERE, 'fake-sb.js'), 'utf8') + '\n' + fs.readFileSync(path.join(HERE, 'aso-dados.js'), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
fs.mkdirSync(OUT, { recursive: true });
const want = process.argv.slice(2);
const browser = await chromium.launch(process.env.CH ? { channel: process.env.CH, args: ['--headless=new'] } : {});

// Cada foto: nome, esquema (dia/noite), cenário do aso-dados.js e o que fazer na tela antes do clique da câmera.
const SHOTS = JSON.parse(fs.readFileSync(path.join(HERE, 'aso-telas.json'), 'utf8'));
// Telas montadas dentro do app (com o styles.css, o janela.js e a marcação do próprio Soneca): o resumo da janela de
// sono e o "Quem fez o Soneca", no padrão do onboarding. Não são telas que o app tem hoje; ver o PR.
const ONB = `(async (corpo) => { const m = await import('/janela.js'); document.getElementById('scrMain').hidden = true;
  for (const id of ['dock', 'tabbar', 'pop', 'popScrim']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; }
  const o = document.getElementById('scrOnb'); o.hidden = false; o.style.minHeight = '840px'; o.innerHTML = corpo(m); window.scrollTo(0, 0); })`;
const SETA = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="align-self:center;color:var(--muted)"><path d="M6 9l6 6 6-6"/></svg>';
const CAPI = '<svg class="capi" viewBox="0 0 120 70" aria-hidden="true"><path vector-effect="non-scaling-stroke" d="M73 54H12C7 54 5.5 51 5.5 45.5C5.5 30 16 19 35 18.4C45 18.1 53 18.2 58 18.6C62 18.9 64 20 66.5 20C70 20 73.5 15.5 81 15.5H100C108.5 15.5 113 21 113 31V42C113 46.5 111 49 106.5 49H83C78.5 49 77.5 54 73 54Z"/><path vector-effect="non-scaling-stroke" d="M80 15.8C80 9.5 86.5 8.5 87.5 14.6"/><path vector-effect="non-scaling-stroke" d="M85.5 26.5Q90 30.5 94.5 27"/><path vector-effect="non-scaling-stroke" d="M107.6 24.6L108.3 28"/><path vector-effect="non-scaling-stroke" d="M57 54C58 48.5 65.5 47.5 68.5 53"/></svg>';
const FN = {
  resumoJanela: `${ONB}((m) => {
    const min = 6e4, baby = { sex: 'F', name: 'Helena' }, idade = m.wakeRef('2026-07-02', Date.now());
    return '<div class="onbtop"><span class="back"></span></div><h1>Como a janela de sono é calculada</h1>'
      + '<div class="card whohow" style="display:flex;flex-direction:column;gap:4px;padding:14px"><b>1 · A idade</b><span>Mostra a janela típica para a idade, de referências internacionais.</span>' + m.rulerHtml(45 * min, idade) + '</div>'
      + '${SETA}'
      + '<div class="card whohow" style="display:flex;flex-direction:column;gap:4px;padding:14px"><b>2 · O próprio bebê</b><span>Ajusta com os registros dela, por metodologia própria.</span>' + m.counterHtml(2, baby) + '</div>'
      + '${SETA}'
      + '<div class="hw onbwin" style="padding:14px 14px 8px"><b style="font-weight:500">3 · A janela da Helena</b><span class="hwt">Acordada há 45 min · Janela de sono em <b>15 min</b></span>' + m.rulerHtml(45 * min, [60 * min, 105 * min]) + '</div>'
      + '<div class="onbcapi">' + ${JSON.stringify(CAPI)} + '</div>';
  })`,
  quem: `${ONB}((m) => '<div class="onbtop"><span class="back"></span></div><h1>Soneca: seu companheiro para a rotina do bebê</h1>'
    + '<div class="whoblk" style="margin-top:20px"><p class="whol">Feito por um médico que também é pai</p>'
    + '<div class="card whoc"><img src="/loja/landing/patrick.jpg" alt="" width="64" height="64" style="object-position:50% 25%;width:88px;height:88px"><div><b>Dr. Patrick Harris</b><span>[texto e CRM: a decidir]</span></div></div></div><button class="save" type="button" style="margin-top:auto">Continuar</button>')`,
};
const run = async (s) => {
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: s.dsf || 3, colorScheme: s.scheme || 'light', timezoneId: 'America/Sao_Paulo', locale: 'pt-BR' });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('pageerror', s.name, e.message));
  await page.clock.setFixedTime(new Date(s.when || '2026-10-07T14:32:00-03:00'));
  await page.addInitScript(() => { try { localStorage.setItem('cad-novidades', '1.0.4'); localStorage.setItem('cad-nov60-u-carol', '1'); localStorage.setItem('cad-troca60-b-1', '1'); } catch {} });
  await page.route('http://soneca.test/**', r => {
    let p = new URL(r.request().url()).pathname; if (p === '/') p = '/index.html';
    if (/^\/vendor\/supabase-js-/.test(p)) return r.fulfill({ contentType: 'text/javascript', body: FAKE });
    const f = path.join(REPO, p);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await page.goto('http://soneca.test/?aso=' + (s.cen || 'base'));
  await page.waitForSelector(s.wait || '#scrMain:not([hidden])');
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '*{caret-color:transparent!important}' });
  for (const st of s.steps || []) {
    if (st.click) await page.click(st.click);
    if (st.eval) await page.evaluate(st.eval);
    if (st.fn) await page.evaluate(FN[st.fn]);
    if (st.wait) await page.waitForTimeout(st.wait);
    if (st.el) { await page.addStyleTag({ content: 'html,body{background:transparent!important}' }); await page.waitForTimeout(250); await page.locator(st.el).screenshot({ path: path.join(OUT, `aso-${st.shotEl}-dia.png`), omitBackground: true }); }
    if (st.shot) { await page.waitForTimeout(250); await page.screenshot({ path: path.join(OUT, `aso-${st.shot}-${s.scheme === 'dark' ? 'noite' : 'dia'}.png`) }); }
  }
  await ctx.close();
};
for (const s of SHOTS) if (!want.length || want.includes(s.name)) { console.log('->', s.name); await run(s).catch(e => console.error('FALHOU', s.name, e.message.split('\n')[0])); }
await browser.close();
