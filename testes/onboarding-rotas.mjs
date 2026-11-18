// Testes de navegador do onboarding v02 (18/11): o login no FIM, as respostas só no aparelho e cada rota de
// entrada pela conta. Abre o Soneca de teste (testes/servidor.mjs, Supabase de mentira) num Chrome de verdade
// e confere o que aparece e o que seria gravado (window.escritas, de testes/cenarios.js). Nada sai daqui.
//   node testes/onboarding-rotas.mjs
// Precisa do Playwright e do Chrome. O Playwright vem de PLAYWRIGHT_DIR (a pasta do playwright-core) ou, se
// faltar, do cache do npx (`npx playwright --version` o baixa uma vez). Sai com erro (código 1) se algum caso falhar.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function achaPlaywright() {
  if (process.env.PLAYWRIGHT_DIR) return process.env.PLAYWRIGHT_DIR;
  const npx = path.join(os.homedir(), 'AppData/Local/npm-cache/_npx'), alt = path.join(os.homedir(), '.npm/_npx');
  for (const raiz of [npx, alt]) {
    if (!fs.existsSync(raiz)) continue;
    for (const d of fs.readdirSync(raiz)) { const p = path.join(raiz, d, 'node_modules/playwright-core'); if (fs.existsSync(p)) return p; }
  }
  throw new Error('Playwright não encontrado: defina PLAYWRIGHT_DIR');
}
const { chromium } = createRequire(import.meta.url)(achaPlaywright());

const PORT = 5179, BASE = 'http://localhost:' + PORT + '/';
const srv = spawn(process.execPath, [path.join(REPO, 'testes/servidor.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const browser = await chromium.launch({ channel: 'chrome', headless: true });

let falhas = 0;
const ok = (c, m) => { if (!c) { falhas++; console.log('FALHOU:', m); } else console.log('ok:', m); };
async function caso(nome, fn) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' });
  const page = await ctx.newPage();
  const erros = []; page.on('pageerror', e => erros.push(e.message));
  try { await fn(page); } catch (e) { falhas++; console.log('FALHOU (erro):', nome, '-', e.message.split('\n')[0]); }
  if (erros.length) { falhas++; console.log('FALHOU: erro de JavaScript em', nome, '-', erros[0]); }
  await ctx.close();
}
const vis = (page, id) => page.locator('#' + id).isVisible();
const esperaTela = (page, id) => page.locator('#' + id).waitFor({ state: 'visible', timeout: 6000 });
const passo = page => page.locator('#scrOnb').getAttribute('data-step');
const escritas = page => page.evaluate(() => window.escritas);
const abrir = (page, cen, q = '') => page.goto(BASE + '?cenario=' + cen + q);
const ls = (page, k) => page.evaluate(k => localStorage.getItem(k), k);

// Do começo às perguntas do bebê e do sono, até a tela do login. ramo: 'acordada' | 'dormindo' | 'pular'.
async function perguntas(page, { ramo = 'acordada', sexo = 'Menina', conta = false } = {}) {
  await esperaTela(page, 'scrOnb');
  ok(await passo(page) === 'bebe', 'abre em "Sobre o bebê"');
  const nasc = new Date(); nasc.setMonth(nasc.getMonth() - 2); nasc.setDate(nasc.getDate() - 3);
  await page.fill('#oName', 'Marina');
  await page.fill('#oBirth', nasc.toISOString().slice(0, 10));
  await page.click(`[data-sex="${sexo === 'Menina' ? 'F' : 'M'}"]`);
  await page.click('#fOnb .save');
  ok(await passo(page) === 'mama', '"Como mama hoje?" depois do bebê');
  await page.click('[data-pick="feed"][data-v="breast"]');
  if (!conta) {
    ok(await passo(page) === 'quem', 'quem começa por "Começar" vê "Quem fez o Soneca"');
    ok((await page.locator('#scrOnb').innerText()).includes('CRM-SP 192.379 · RQE 92.300'), 'a tela 4 traz CRM-SP 192.379 · RQE 92.300');
    await page.click('[data-onb="next"]');
  } else ok(await passo(page) === 'gancho', 'quem já tem conta não vê "Quem fez o Soneca"');
  ok(await passo(page) === 'gancho', 'gancho do sono');
  await page.click('button:has-text("Sim, quero ajuda")');
  ok(await passo(page) === 'agora', '"acordada ou dormindo agora?"');
  if (ramo === 'pular') { await page.click('[data-onb="skip"]'); return; }
  if (ramo === 'acordada') {
    await page.click('[data-sleep="wake"]');
    ok(await passo(page) === 'acordada', 'ramo Acordada');
    const ha = new Date(Date.now() - 50 * 60000), hh = String(ha.getHours()).padStart(2, '0') + ':' + String(ha.getMinutes()).padStart(2, '0');
    await page.fill('#oAt', hh);
    await page.click('[data-nap="60"]');
    await page.click('[data-night="20"]');
    await page.click('#fOnb .save');
    ok(await passo(page) === 'janela', 'tela da janela de sono');
    const t = await page.locator('#scrOnb').innerText();
    ok(/A próxima janela de sono começa em \d+ minutos? e termina às \d+h/.test(t), 'a frase da janela: ' + t.split('\n').find(l => l.includes('próxima')));
    ok(t.includes('depois das 17h'), 'aviso da soneca tardia usa a noite menos 3 h (20h → 17h)');
    await page.click('[data-onb="next"]');
  } else {
    await page.click('[data-sleep="sleep"]');
    ok(await passo(page) === 'dormindo', 'ramo Dormindo');
    await page.click('#fOnb .save');   // campo vazio: 30 minutos atrás
    ok(await passo(page) === 'dormindo2', 'tela "está dormindo"');
    ok((await page.locator('#scrOnb').innerText()).includes('Dormindo há 30 min'), 'sem horário, o Soneca usa 30 min atrás');
    await page.click('[data-onb="next"]');
  }
}
const naTelaDeLogin = async page => { await esperaTela(page, 'scrLogin'); ok(await vis(page, 'loginFlow'), 'login no fim: título do onboarding'); };
async function quasePronto(page, { nome = 'Marina Pai', fam = 'Família Teste' } = {}) {
  await esperaTela(page, 'scrOnb');
  ok(await passo(page) === 'quase', 'retoma em "Quase pronto"');
  await page.fill('#oPname', nome);
  await page.click('[data-role="mae"]');
  await page.fill('#oFam', fam);
  await page.check('#oOk');
  await page.click('#fOnb .save');
  await esperaTela(page, 'scrMain');
}

// 1. Sem conta e sem respostas: Boas-vindas.
await caso('boas-vindas', async page => {
  await abrir(page, 'onb-novo');
  await esperaTela(page, 'scrWelcome');
  const t = await page.locator('#scrWelcome').innerText();
  ok(t.includes('Bem-vindo ao Soneca') && t.includes('Começar') && t.includes('Já tenho conta'), 'rota 1: sem conta e sem respostas = Boas-vindas ("Começar" / "Já tenho conta")');
  ok(!t.includes('Política'), 'as Boas-vindas não têm mais o aceite da Política e dos Termos');
  ok((await escritas(page)).length === 0, 'Boas-vindas: nada gravado');
  await page.click('#wLogin');
  await esperaTela(page, 'scrLogin');
  ok(!(await vis(page, 'loginFlow')) && await vis(page, 'loginBrand'), '"Já tenho conta" vai ao login de sempre (logo)');
  ok((await page.locator('.legalp').innerText()).startsWith('Ao continuar, você aceita a Política de Privacidade e os Termos de Uso.'), 'o login traz a frase do aceite');
  await page.click('#loginBack');
  await esperaTela(page, 'scrWelcome');
  await page.click('#wStart');
  await esperaTela(page, 'scrOnb');
});

// 2. O fluxo todo, com o login do Google saindo da página (redirecionamento): as respostas voltam e retoma em "Quase pronto".
await caso('google-redireciona', async page => {
  await abrir(page, 'onb-novo');
  await esperaTela(page, 'scrWelcome'); await page.click('#wStart');
  await perguntas(page);
  await naTelaDeLogin(page);
  ok((await page.locator('#loginH').innerText()) === 'Guarde a rotina da Marina', 'título do login com o nome do bebê');
  ok((await escritas(page)).length === 0, 'rota 2: nada gravado no banco antes do login');
  ok(JSON.parse(await ls(page, 'cad-onb')).name === 'Marina', 'as respostas estão no armazenamento do aparelho');
  await page.click('#googleBtn');   // sai da página (recarrega) e volta já com a sessão
  await quasePronto(page, {});
});
// (a verificação do que foi gravado no fim vem no caso seguinte, que segue o mesmo caminho)

await caso('criar-familia-grava-tudo', async page => {
  await abrir(page, 'onb-novo');
  await esperaTela(page, 'scrWelcome'); await page.click('#wStart');
  await perguntas(page);
  await naTelaDeLogin(page);
  await page.click('#googleBtn');
  await esperaTela(page, 'scrOnb');
  const antes = await escritas(page);
  ok(antes.join() === 'consents:insert', 'depois do login só o aceite da Política e dos Termos é gravado (' + antes.join() + ')');
  ok(!antes.some(x => x.startsWith('rpc:') || x.startsWith('babies') || x.startsWith('families')), 'nenhuma família nem bebê antes de "Criar família"');
  const c = await page.evaluate(() => window.testeT.consents.map(x => x.kind + ':' + x.version));
  ok(c.includes('terms:1.3'), 'aceite registrado com a versão vigente (1.3, VERSOES-TERMOS.md)');
  // o aceite do quadro de saúde é exigido
  await page.fill('#oPname', 'Marina Pai'); await page.fill('#oFam', 'Família Teste');
  await page.click('#fOnb .save');
  ok((await page.locator('#errOnb').innerText()).includes('autorização'), 'sem o aceite do quadro de saúde não cria');
  await page.click('[data-role="avoa"]'); await page.click('[data-side="pai"]');
  await page.check('#oOk');
  await page.click('#fOnb .save');
  await esperaTela(page, 'scrMain');
  const w = await escritas(page);
  ok(w.includes('rpc:create_family') && w.includes('profiles:insert') && w.includes('entries:insert'), 'Criar família grava perfil, família e o primeiro registro (' + w.join(', ') + ')');
  const T = await page.evaluate(() => ({ p: window.testeT.profiles.find(p => p.id === 'u-nova'), e: window.testeT.entries.map(e => e.kind), b: window.testeT.babies[0], fs: window.testeT.family_settings }));
  ok(T.p && T.p.display_name === 'Marina Pai' && T.p.caregiver === 'avoa' && T.p.family_side === 'pai', 'nome, "Você é" e lado saem de "Quase pronto"');
  ok(T.e.join() === 'wake', 'Acordada: a resposta vira o primeiro registro (acordou às)');
  ok(T.b.sex === 'F' && T.b.feeding === 'breast', 'bebê com menina e como mama');
  ok(await ls(page, 'cad-onb') === null, 'as respostas guardadas somem depois de criar a família');
  ok((await page.locator('#bvTop').innerText()).includes('Tudo pronto para a Marina'), 'tela inicial com "Tudo pronto"');
  ok((await page.locator('#sleepWin').innerText()).includes('Acordada há'), 'a faixa da janela aparece na tela inicial');
});

// 3. O código por e-mail troca de tela (sem recarregar): as respostas continuam valendo.
await caso('codigo-por-email', async page => {
  await abrir(page, 'onb-novo');
  await esperaTela(page, 'scrWelcome'); await page.click('#wStart');
  await perguntas(page);
  await naTelaDeLogin(page);
  await page.fill('#emailIn', 'nova@exemplo.com'); await page.click('#fEmail .save');
  await page.locator('#fCode').waitFor({ state: 'visible' });
  ok((await escritas(page)).length === 0, 'enviar o código não grava nada');
  await page.fill('#codeIn', '000000'); await page.click('#fCode .save');
  ok((await page.locator('#errCode').innerText()).includes('inválido'), 'código errado fica na tela do código');
  await page.fill('#codeIn', '123456'); await page.click('#fCode .save');
  await quasePronto(page, {});
  ok(true, 'rota 2: o código por e-mail retoma em "Quase pronto"');
});

// 4. Fechar o app no meio: sem conta e com respostas = volta à etapa.
await caso('retoma-etapa', async page => {
  await abrir(page, 'onb-novo');
  await esperaTela(page, 'scrWelcome'); await page.click('#wStart');
  await esperaTela(page, 'scrOnb');
  await page.fill('#oName', 'Marina'); await page.click('[data-sex="F"]'); await page.click('#fOnb .save');
  ok(await passo(page) === 'mama', 'chegou em "Como mama"');
  await page.reload();
  await esperaTela(page, 'scrOnb');
  ok(await passo(page) === 'mama', 'rota 3: sem conta e com respostas = volta à etapa em que parou');
  ok((await page.locator('#scrOnb h1').innerText()).includes('Marina'), 'com as respostas (o nome da Marina)');
  await page.click('[data-onb="back"]');
  ok((await page.inputValue('#oName')) === 'Marina', 'voltar mostra o que foi respondido');
  ok((await escritas(page)).length === 0, 'nada gravado');
});

// 5. Com conta e sem família: as perguntas, sem a tela de login, sem a tela 4, depois Quase pronto.
await caso('conta-sem-familia', async page => {
  await abrir(page, 'onb-sem-familia');
  await esperaTela(page, 'scrOnb');
  await perguntas(page, { ramo: 'dormindo', conta: true });
  await esperaTela(page, 'scrOnb');
  ok(await passo(page) === 'quase', 'rota 4: com conta e sem família, depois do sono vai direto a "Quase pronto" (sem login)');
  ok(await page.inputValue('#oPname') === 'Nova', 'o nome da conta já vem preenchido');
  ok((await escritas(page)).length === 0, 'nada gravado até "Criar família"');
  await page.fill('#oFam', 'Família Teste'); await page.check('#oOk');
  await page.click('#fOnb .save');
  await esperaTela(page, 'scrMain');
  const T = await page.evaluate(() => window.testeT.entries.map(e => ({ kind: e.kind, min: Math.round((Date.now() - Date.parse(e.at)) / 60000) })));
  ok(T.length === 1 && T[0].kind === 'sleep' && Math.abs(T[0].min - 30) <= 1, 'Dormindo sem horário: o "Dormiu" é de 30 min atrás (' + JSON.stringify(T) + ')');
  ok((await page.locator('#strip').innerText()).includes('Dormindo há'), 'a tela inicial abre com a faixa "Dormindo há" contando');
  ok((await page.locator('#strip').innerText()).includes('Acordou'), 'com o botão Acordou');
});

// 6. Pular não registra nada e leva ao login (sem janela de sono).
await caso('pular', async page => {
  await abrir(page, 'onb-novo');
  await esperaTela(page, 'scrWelcome'); await page.click('#wStart');
  await perguntas(page, { ramo: 'pular' });
  await naTelaDeLogin(page);
  ok(JSON.parse(await ls(page, 'cad-onb')).sleep === null, 'Pular: sem resposta de sono');
  await page.click('#googleBtn');
  await quasePronto(page, {});
  const e = await page.evaluate(() => window.testeT.entries.length);
  ok(e === 0, 'Pular não registra nada');
  ok(!(await vis(page, 'sleepWin')), 'o app abre sem faixa de janela');
});

// 7. Com conta e com família: tela inicial, as respostas guardadas são descartadas.
await caso('conta-com-familia', async page => {
  await page.addInitScript(() => { if (!localStorage.getItem('cad-onb')) localStorage.setItem('cad-onb', JSON.stringify({ v: 1, via: 'novo', k: 'mama', name: 'Sobra', sex: 'F' })); });
  await abrir(page, 'normal');
  await esperaTela(page, 'scrMain');
  ok(await ls(page, 'cad-onb') === null, 'rota 5: com conta e com família vai à tela inicial e descarta as respostas guardadas');
  ok(!(await vis(page, 'scrOnb')) && !(await vis(page, 'scrWelcome')), 'sem onboarding');
});

// 8. Convite pelo link: login primeiro, depois "Entrar na família", sem tela 4 nem perguntas do bebê.
await caso('convite', async page => {
  await abrir(page, 'onb-novo', '&convite=teste-convite');
  await esperaTela(page, 'scrLogin');
  ok(!(await vis(page, 'loginFlow')), 'rota 6: convite = login primeiro (logo de sempre, sem perguntas)');
  await page.click('#googleBtn');
  await esperaTela(page, 'scrName');   // conta nova: nome e "Você é" antes do convite
  await page.fill('#nameIn', 'Pessoa Convidada');
  await page.click('#fName .save');
  await esperaTela(page, 'scrInvite');
  ok((await page.locator('#inviteTitle').innerText()).includes('Entrar na Família Andrade'), '"Entrar na família" do convite');
  ok(!(await vis(page, 'scrOnb')), 'sem tela 4 nem perguntas do bebê');
  await page.check('#okInvite'); await page.click('#acceptInvite');
  await esperaTela(page, 'scrMain');
  ok(!(await escritas(page)).includes('rpc:create_family'), 'o convite não cria família');
});

// 9. O app (Android de mentira): o login do Google pela janela do celular (sem sair da página) e o lembrete da janela.
await caso('app-nativo-e-lembrete', async page => {
  await abrir(page, 'onb-app');
  await esperaTela(page, 'scrWelcome'); await page.click('#wStart');
  await perguntas(page);
  await naTelaDeLogin(page);
  ok(await ls(page, 'cad-janela') === null, 'antes: nada decidido sobre o lembrete');
  await page.evaluate(() => 0);
  // volta à janela para escolher o lembrete (a pergunta só aparece no app)
  await page.click('#loginBack');
  await esperaTela(page, 'scrOnb');
  ok(await passo(page) === 'janela', 'voltar do login leva à janela de sono');
  await page.click('[data-alert="1"]');
  await page.waitForFunction(() => localStorage.getItem('cad-janela') === '1');
  ok(true, 'o "Sim" do lembrete pede a permissão e guarda a escolha no aparelho');
  ok((await escritas(page)).length === 0, 'o lembrete não grava nada no banco antes do login');
  await page.click('[data-onb="next"]');
  await naTelaDeLogin(page);
  await page.click('#googleBtn');   // pelo plugin do celular: sem recarregar
  await quasePronto(page, {});
  const w = await page.evaluate(() => window.testeT.profiles.find(p => p.id === 'u-nova')?.sleep_alert);
  ok(w === true, 'depois do login, a preferência do aviso é gravada no perfil');
});

await browser.close(); srv.kill();
console.log(falhas ? '\n' + falhas + ' falha(s).' : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
