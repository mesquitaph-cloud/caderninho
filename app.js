import { createClient } from './vendor/supabase-js-2.117.1.js';
import { SUPABASE_URL, SUPABASE_KEY, GOOGLE_LOGIN, APPLE_LOGIN, GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, DEMO_EMAIL_SHA256 } from './config.js';
import { ICON, MIN, HOUR, DAY, pad, startOfDay, addDays, hm, dur, ago, esc, dayTitle, shortDay, rangeTitle, navDayTitle, navRangeTitle, navMonthTitle, ageText, fullDate, shortDate,
         sleepIntervals, label, detail, SIDE_SHORT, MESES_L, lsGet, lsSet, SYMPTOM, CARE, CARE_MIN, BURP, POO_SIZE, aloneText,
         LONG_SLEEP, localDate, reduceMotion, CAPI } from './util.js';
import { weekHtml, dayLine, zoomHead, ZOOM_H } from './week.js';
import { clockHtml } from './clock.js';
import { MILESTONES, motorRange, motorChart, refHtml, kg, parseKg, parseCm, cmText, ageOn, sortWeights, sortMilestones, weightChart, growthChart, growthWindow, MAX_MONTHS } from './growth.js';
import { periodStats, reportText, monthHtml, shareHtml, division, divisionHtml } from './report.js';
import { nightsHtml } from './noites.js';
import { trendsHtml, trendWindow, CAPI_HAT } from './tendencias.js';
import { monthsOld, wakeRef, winText, rulerHtml, winNotice, forms, WAKE_MAX } from './janela.js';
import { OLD_RULE, STARTS, ENDS, ONB_STARTS, NIGHT_START, NIGHT_END, nightRule, nightNow, nightSave, nightText, isDefault, deName, nightTitle } from './noite.js';
import { reportStats, reportHtml, reportPlain, periodShort, pdfName } from './pediatra.js';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = id => document.getElementById(id);
const SCREENS = ['scrLoading','scrLogin','scrName','scrStart','scrPaste','scrTerms','scrBabyOk','scrInvite','scrOnb','scrMain'];
const KEEP_DAYS = 60;
// Política de Privacidade e Termos de Uso (/privacidade e /termos). Ao mudar o texto, sobe a versão:
// todos veem a tela de aceite de novo na próxima abertura.
const TERMS_VERSION = '1.3', TERMS_SINCE = '13/10/2026';
const PRIVACY_EMAIL = 'drpatrickharrisdemesquita@gmail.com';

const st = {
  user: null, profile: null,
  consents: [],                // aceites da pessoa (Política e Termos, dados do bebê, convite), do 015
  families: [], family: null,
  babies: [], baby: null,
  members: [], names: {},
  entries: new Map(),          // id -> registro (com t = ms)
  meds: [],                    // remédios programados do bebê aberto (sem os parados)
  routines: [],                // tarefas programadas do bebê aberto (sem as tiradas da rotina), do 023
  routinesOk: true,            // falso se não deu para carregar (antes do 023)
  measures: [], weights: [], lengths: [], milestones: [], // medidas (com peso, comprimento ou os dois) e marcos do bebê aberto, do mais antigo ao mais recente
  growthOk: true,              // falso se não deu para carregar (por exemplo, antes do 007)
  questions: [],               // dúvidas para a consulta do bebê aberto (as perguntadas também)
  questionsOk: true,           // falso se não deu para carregar (por exemplo, antes do 010)
  settings: { hidden: [] },    // botões que a família desligou (vale para todos da família)
  tab: 'home',                 // aba aberta na barra de baixo: 'trends' (Tendências), 'baby', 'home' (Diário), 'family' ou 'profile'
  trend: { tab: 'sono', mode: 'd', off: 0, sel: null, info: null }, // Tendências: guia, dia a dia ou semana a semana, janelas para trás, barra tocada e botão i aberto
  view: 'day',                 // 'day' (linha do tempo), 'week' (painel da semana) ou 'month' (resumo do mês)
  viewDay: startOfDay(Date.now()),
  weekEnd: startOfDay(Date.now()),   // último dos 7 dias do painel
  month: 0,                    // primeiro dia do mês do resumo (0 = o mês atual)
  shareText: '',               // o resumo da semana ou do mês aberto, pronto para compartilhar
  show: { sleep: true, feed: true, diaper: true, pump: true },   // filtro de "Como foram os dias"
  zoom: { day: null, week: null }, // trecho aproximado de cada gráfico (hora de início) ou null
  metric: 'sleep',             // o que aparece em "Dia a dia"
  channel: null,
};

/* ---------- utilidades de tela ---------- */
function show(id) { for (const s of SCREENS) $(s).hidden = s !== id; }
function err(id, msg) { $(id).textContent = msg || ''; $(id).hidden = !msg; }
function toast(msg, undo) {
  const el = $('toast'); el.textContent = msg;
  if (undo) { const b = document.createElement('button'); b.textContent = 'Desfazer'; b.onclick = () => { el.hidden = true; undo(); }; el.appendChild(b); }
  el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, undo ? 5000 : 1800);
}
function busy(btn, on) { btn.disabled = on; }
const ERR = {
  invite_used: 'Este convite já foi usado. Peça um novo a quem te convidou.',
  invite_expired: 'Este convite venceu. Peça um novo a quem te convidou.',
  invite_not_found: 'Este convite não existe. Confira o link com quem te convidou.',
};
function errMsg(e) { const m = e?.message || ''; for (const k in ERR) if (m.includes(k)) return ERR[k]; return 'Não foi possível concluir. Confira a conexão e tente de novo.'; }
// Indicação: link do app, sem convite. Quem abre cria a própria família.
const REFER_TEXT = 'Conhece o Soneca? É um app para anotar a rotina do bebê (mamadas, sono, fraldas) numa linha do tempo que toda a família vê junto. Baixe pelo link, entre com seu e-mail e crie a sua família.';

/* ---------- início ---------- */
async function boot() {
  const tok = new URLSearchParams(location.search).get('convite');
  if (tok) { lsSet('cad-invite', tok); history.replaceState(null, '', '/'); }
  await launchInvite();
  // Acabou de apagar a conta: volta para a entrada com o aviso.
  const gone = new URLSearchParams(location.search).get('conta') === 'apagada';
  if (gone) history.replaceState(null, '', '/');

  // Voltou do Google sem entrar (cancelou ou deu erro): o endereço traz "#error=...".
  const googleFailed = /[#&]error/.test(location.hash);
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    if (googleFailed) { history.replaceState(null, '', location.pathname + location.search); err('errSso', 'Não foi possível entrar com o Google. Tente de novo ou use o código por e-mail.'); }
    show('scrLogin'); if (gone) toast('Conta apagada'); return;
  }
  st.user = session.user;

  // select('*'): o "Você é" e o aviso da janela de sono (024) vêm junto quando existem.
  const { data: prof } = await sb.from('profiles').select('*').eq('id', st.user.id).maybeSingle();
  if (!prof) {
    // Quem entrou pelo Google ou pela Apple já vem com o nome; dá para trocar antes de continuar.
    const meta = st.user.user_metadata || {};
    if (!$('nameIn').value) $('nameIn').value = String(meta.full_name || meta.name || '').trim().slice(0, 40);
    show('scrName'); $('nameIn').focus(); return;
  }
  st.profile = prof; st.names[prof.id] = prof.display_name;

  await loadConsents();
  if (!hasConsent('terms')) return showTerms();

  const inv = lsGet('cad-invite');
  if (inv) return showInvite(inv);

  await loadFamilies();
  // Sem família: "Como você vai começar?" (criar uma ou entrar por convite).
  if (!st.families.length) return show('scrStart');
  const saved = lsGet('cad-family');
  await openFamily((st.families.find(f => f.id === saved) || st.families[0]).id);
}

async function loadFamilies() {
  const { data, error } = await sb.from('families').select('id,name,creator_id').order('created_at');
  if (error) throw error;
  st.families = data;
}

/* ---------- login ---------- */
let loginEmail = '';
$('fEmail').addEventListener('submit', async e => {
  e.preventDefault(); err('errEmail');
  const btn = e.submitter; busy(btn, true);
  loginEmail = $('emailIn').value.trim().toLowerCase();
  if (await isDemoEmail(loginEmail)) {
    busy(btn, false);
    $('passTo').textContent = 'Conta de demonstração (' + loginEmail + '). Digite a senha.';
    $('passIn').value = ''; $('fEmail').hidden = true; $('fPass').hidden = false; $('passIn').focus();
    return;
  }
  const { error } = await sb.auth.signInWithOtp({ email: loginEmail, options: { shouldCreateUser: true } });
  busy(btn, false);
  if (error) return err('errEmail', 'Não foi possível enviar o código. Confira o e-mail e tente de novo em alguns minutos.');
  $('sentTo').textContent = 'Código enviado para ' + loginEmail + '. Confira também o spam.';
  $('codeIn').value = ''; $('fEmail').hidden = true; $('fCode').hidden = false; $('codeIn').focus();
});
$('fCode').addEventListener('submit', async e => {
  e.preventDefault(); err('errCode');
  const token = $('codeIn').value.replace(/\D/g, '');
  if (token.length < 6) return err('errCode', 'Digite o código completo que chegou no e-mail.');
  const btn = e.submitter; busy(btn, true);
  const { error } = await sb.auth.verifyOtp({ email: loginEmail, token, type: 'email' });
  busy(btn, false);
  if (error) return err('errCode', 'Código inválido ou vencido. Peça outro.');
  $('fCode').hidden = true; $('fEmail').hidden = false;
  show('scrLoading'); boot();
});
$('backEmail').onclick = () => { $('fCode').hidden = true; $('fEmail').hidden = false; };
// Conta de demonstração da revisão da Apple: o revisor não recebe o código, então entra com senha.
async function isDemoEmail(email) {
  if (!DEMO_EMAIL_SHA256 || !crypto.subtle) return false;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('') === DEMO_EMAIL_SHA256;
}
$('fPass').addEventListener('submit', async e => {
  e.preventDefault(); err('errPass');
  const btn = e.submitter; busy(btn, true);
  const { error } = await sb.auth.signInWithPassword({ email: loginEmail, password: $('passIn').value });
  busy(btn, false);
  if (error) return err('errPass', /invalid/i.test(error.message || '') ? 'Senha errada. Confira e tente de novo.'
                                                                      : 'Não foi possível entrar. Confira a conexão e tente de novo.');
  $('fPass').hidden = true; $('fEmail').hidden = false;
  show('scrLoading'); boot();
});
$('backPass').onclick = () => { $('fPass').hidden = true; $('fEmail').hidden = false; };
// Entrar com Google e Apple. No app (iPhone e Android), pela janela do próprio celular (plugin
// SocialLogin): o token volta para o app e o Supabase confere. A Apple, só no app do iPhone. No site, só
// o Google: sai para o Google e volta para cá já com a sessão (o convite, se houver, ficou guardado no
// celular). A mesma pessoa, com o mesmo e-mail, cai na mesma conta do código; quem escolhe "Ocultar meu
// e-mail" na Apple vira uma conta nova.
const NATIVE = !!window.Capacitor?.isNativePlatform?.();
const ANDROID = NATIVE && window.Capacitor.getPlatform() === 'android';
const IOS_APP = NATIVE && !ANDROID;
if (NATIVE) document.documentElement.dataset.app = ANDROID ? 'android' : 'ios';
// Link que vai para outra pessoa (convite, indicação): no app, location.origin é o endereço interno
// (capacitor://localhost no iPhone, https://localhost no Android), que não abre em outro celular.
const LINK_BASE = NATIVE ? 'https://soneca.app.br' : location.origin;
const social = NATIVE ? window.Capacitor.registerPlugin('SocialLogin') : null;
// No app, a Política e os Termos abrem no navegador do celular, por cima do app: o endereço relativo
// (/privacidade, /termos) caía nos arquivos do próprio app, que abria de novo (defeito de 30/10).
if (NATIVE) {
  const browser = window.Capacitor.registerPlugin('Browser');
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href="/privacidade"],a[href="/termos"]'); if (!a) return;
    e.preventDefault(); browser.open({ url: LINK_BASE + a.getAttribute('href') });
  }, true);
}
// Link do Soneca tocado com o app instalado (Universal Links no iPhone, App Links no Android): o
// celular abre o app em vez do navegador, e o convite do link chega aqui. Sem isso, o convite ficava
// guardado no navegador e o app abria em "Criar família" (Ca, 17/10).
const appPlugin = NATIVE ? window.Capacitor.registerPlugin('App') : null;
const inviteIn = url => { try { return new URL(url).searchParams.get('convite'); } catch { return null; } };
let launchChecked = false;
async function launchInvite() {
  if (!appPlugin || launchChecked) return;
  launchChecked = true;
  const r = await appPlugin.getLaunchUrl().catch(() => null);
  const tok = r?.url && inviteIn(r.url);
  if (tok) lsSet('cad-invite', tok);
}
appPlugin?.addListener('appUrlOpen', ({ url }) => {
  const tok = inviteIn(url); if (!tok) return;
  lsSet('cad-invite', tok);
  // Sem sessão, o convite espera a entrada; com sessão, abre a tela do convite já.
  if (st.user) { show('scrLoading'); boot(); }
});
let socialReady = null;
$('sso').hidden = !GOOGLE_LOGIN && !(IOS_APP && APPLE_LOGIN);
$('googleBtn').hidden = !GOOGLE_LOGIN;
$('appleBtn').hidden = !(IOS_APP && APPLE_LOGIN);
const SSO_NAME = { google: 'o Google', apple: 'a Apple' };

// Número de uso único contra token reaproveitado: o provedor recebe o SHA-256, o Supabase o original.
async function nonces() {
  const raw = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return { raw, hashed: [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('') };
}

async function nativeLogin(provider, btn) {
  err('errSso'); busy(btn, true);
  try {
    // No Android, o Google pede o ID do cliente Web (o cliente Android só existe no Google Cloud, ligado
    // à assinatura do app); no iPhone, o do cliente iOS.
    socialReady ||= social.initialize(ANDROID
      ? { google: { webClientId: GOOGLE_WEB_CLIENT_ID, mode: 'online' } }
      : { google: { iOSClientId: GOOGLE_IOS_CLIENT_ID, iOSServerClientId: GOOGLE_WEB_CLIENT_ID, mode: 'online' },
          apple: { clientId: 'br.app.soneca' } });
    await socialReady;
    const { raw, hashed } = await nonces();
    // No Android, o plugin já pede e-mail e perfil e recusa qualquer lista de permissões ("scopes").
    const scopes = provider === 'apple' ? ['email', 'name'] : ['email', 'profile'];
    const options = ANDROID ? { nonce: hashed } : { scopes, nonce: hashed };
    const { result } = await social.login({ provider, options });
    if (!result?.idToken) throw new Error('sem token');
    const { error } = await sb.auth.signInWithIdToken({ provider, token: result.idToken, nonce: raw });
    if (error) throw error;
    // A Apple manda o nome só na primeira vez: guarda para já vir preenchido em "Como você quer aparecer".
    const p = result.profile || {};
    const full = [p.givenName, p.familyName].filter(Boolean).join(' ').trim();
    if (provider === 'apple' && full) await sb.auth.updateUser({ data: { full_name: full } });
    // Guarda a chave de acesso da Apple, para cancelar o acesso se a pessoa apagar a conta (exigência
    // da Apple). Se falhar, a entrada segue: só o cancelamento fica para trás.
    const code = result.authorizationCode || result.accessToken?.token;
    if (provider === 'apple' && code) await sb.functions.invoke('apple-login', { body: { action: 'save', code } }).catch(() => {});
    busy(btn, false);
    show('scrLoading'); boot();
  } catch (e) {
    busy(btn, false); socialReady = null;
    if (/cancel/i.test(e?.message || '')) return; // fechou a janela: fica na entrada, sem aviso
    err('errSso', 'Não foi possível entrar com ' + SSO_NAME[provider] + '. Tente de novo ou use o código por e-mail.');
  }
}

$('appleBtn').onclick = () => nativeLogin('apple', $('appleBtn'));
$('googleBtn').onclick = async () => {
  if (NATIVE) return nativeLogin('google', $('googleBtn'));
  err('errSso'); busy($('googleBtn'), true);
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/' } });
  if (error) { busy($('googleBtn'), false); err('errSso', 'Não foi possível abrir o Google. Confira a conexão e tente de novo.'); }
};

/* ---------- nome de exibição ---------- */
$('fName').addEventListener('submit', async e => {
  e.preventDefault(); err('errName');
  const name = $('nameIn').value.trim();
  if (!name) return err('errName', 'Escreva como você quer aparecer.');
  if (!$('okName').checked) return err('errName', 'Para continuar, marque que leu a Política e os Termos.');
  const btn = e.submitter; busy(btn, true);
  if (!await addConsent('terms')) { busy(btn, false); return err('errName', 'Não foi possível registrar o aceite. Confira a conexão e tente de novo.'); }
  const { error } = await sb.from('profiles').insert({ id: st.user.id, display_name: name });
  if (error) { busy(btn, false); return err('errName', errMsg(error)); }
  // "Você é" vai à parte: sem o 024, o nome salva do mesmo jeito.
  if (role) await sb.from('profiles').update({ caregiver: role }).eq('id', st.user.id);
  busy(btn, false);
  show('scrLoading'); boot();
});
// "Você é" (item 47): Mãe, Pai ou Outro cuidador; opcional, e tocar de novo desmarca.
let role = null;
$('rolePick').addEventListener('click', e => {
  const b = e.target.closest('[data-role]'); if (!b) return;
  role = role === b.dataset.role ? null : b.dataset.role;
  for (const o of $('rolePick').children) { const on = o.dataset.role === role; o.classList.toggle('on', on); o.setAttribute('aria-pressed', on); }
});
// "Como você vai começar?" e o link do convite.
$('startCreate').onclick = () => onbStart('start');
$('startJoin').onclick = () => { err('errPaste'); show('scrPaste'); $('pasteIn').focus(); };
$('backPaste').onclick = () => show('scrStart');

/* ---------- aceites (015) ---------- */
// A prova de cada aceite fica no banco (conta, tipo, versão, data e hora); ninguém edita nem apaga.
async function loadConsents() {
  const { data } = await sb.from('consents').select('kind,version,family_id,created_at').order('created_at');
  st.consents = data || [];
}
function hasConsent(kind, fid) {
  return st.consents.some(c => c.kind === kind && (kind === 'terms' ? c.version === TERMS_VERSION : c.family_id === fid));
}
async function addConsent(kind, extra = {}) {
  const { data, error } = await sb.from('consents').insert({ kind, version: TERMS_VERSION, ...extra })
    .select('kind,version,family_id,created_at').single();
  if (error) return false;
  st.consents.push(data); return true;
}
// Quem já usava (ou numa versão nova): a mesma tela, dizendo o que mudou.
function showTerms() {
  const before = st.consents.some(c => c.kind === 'terms');
  $('termsText').textContent = before
    ? `A Política de Privacidade e os Termos de Uso mudaram (versão ${TERMS_VERSION}, em vigor desde ${TERMS_SINCE}). Leia e confirme para continuar.`
    : 'O Soneca agora tem uma Política de Privacidade e Termos de Uso. Eles explicam o que guardamos, quem vê e como você apaga tudo. Leia e confirme para continuar.';
  document.querySelectorAll('#scrTerms .tv').forEach(el => el.textContent = 'versão ' + TERMS_VERSION);
  $('okTerms').checked = false; err('errTerms'); show('scrTerms');
}
$('acceptTerms').onclick = async () => {
  if (!$('okTerms').checked) return err('errTerms', 'Para continuar, marque que leu os dois.');
  busy($('acceptTerms'), true);
  const ok = await addConsent('terms');
  busy($('acceptTerms'), false);
  if (!ok) return err('errTerms', 'Não foi possível registrar o aceite. Confira a conexão e tente de novo.');
  show('scrLoading'); boot();
};
function showBabyOk(fid) {
  const fam = st.families.find(f => f.id === fid);
  $('babyOkTitle').textContent = fam.name;
  $('okBaby2').checked = false; err('errBabyOk'); show('scrBabyOk');
  $('acceptBaby').onclick = async () => {
    if (!$('okBaby2').checked) return err('errBabyOk', 'Para continuar, marque a autorização dos dados do bebê.');
    busy($('acceptBaby'), true);
    const ok = await addConsent('baby', { family_id: fid });
    busy($('acceptBaby'), false);
    if (!ok) return err('errBabyOk', 'Não foi possível registrar a autorização. Confira a conexão e tente de novo.');
    openFamily(fid);
  };
}

/* ---------- convite ---------- */
// "Família Andrade" já traz a palavra: sem isso saía "na família Família Andrade".
const famName = n => /^fam[íi]lia\s/i.test(n) ? n : 'família ' + n;
async function showInvite(tok) {
  show('scrInvite'); err('errInvite'); $('acceptInvite').hidden = false; $('inviteOk').hidden = false; $('okInvite').checked = false;
  $('inviteTitle').textContent = 'Convite'; $('inviteCard').hidden = true;
  const [{ data, error }, kid] = await Promise.all([sb.rpc('invite_info', { tok }), sb.rpc('invite_baby', { tok })]);
  const row = data && data[0];
  if (error || !row || !row.is_valid) {
    err('errInvite', row && !row.is_valid ? 'Este convite não vale mais. Peça um novo a quem te convidou.' : ERR.invite_not_found);
    $('acceptInvite').hidden = true; $('inviteOk').hidden = true; return;
  }
  // Prévia 3 (13/11): "Entrar na Família Mesquita", o bebê e "Convite de Ana". Sem o 024, sem o bebê.
  $('inviteTitle').textContent = 'Entrar na ' + famName(row.family_name);
  const bb = !kid?.error && kid?.data?.[0];
  $('inviteCapi').innerHTML = CAPI;
  $('inviteBaby').textContent = bb ? [bb.baby_name, ageText(bb.birth_date)].filter(Boolean).join(' · ') : '';
  $('inviteBaby').hidden = !bb;
  $('inviteFrom').textContent = 'Convite de ' + row.creator_name;
  $('inviteCard').hidden = false;
  $('acceptInvite').onclick = async () => {
    if (!$('okInvite').checked) return err('errInvite', 'Para entrar, marque o compromisso acima.');
    err('errInvite'); busy($('acceptInvite'), true);
    const { data: fid, error } = await sb.rpc('accept_invite', { tok });
    if (!error) await addConsent('invite', { family_id: fid });
    busy($('acceptInvite'), false);
    if (error) return err('errInvite', errMsg(error));
    lsSet('cad-invite', null); await loadFamilies(); openFamily(fid);
  };
}
$('skipInvite').onclick = () => { lsSet('cad-invite', null); show('scrLoading'); boot(); };

// Convite colado: para quem abriu o link no navegador ou estava com uma versão antiga do app (Ca, 17/10).
// Aceita o link inteiro, com ou sem https://, ou só o código.
$('fPaste').addEventListener('submit', e => {
  e.preventDefault(); err('errPaste');
  const s = $('pasteIn').value.trim();
  const tok = (s.match(/[?&]convite=([\w-]+)/) || [])[1] || (/^[\w-]{20,}$/.test(s) ? s : null);
  if (!tok) return err('errPaste', 'Não achei um convite nesse link. Confira com quem te convidou.');
  $('pasteIn').value = ''; lsSet('cad-invite', tok); showInvite(tok);
});

/* ---------- criar família: uma pergunta por tela ---------- */
// Itens 40, 46, 57 e 60 (prévia aprovada em 13/11: https://claude.ai/artifact/RYPyjm5Z4ARWtnvXJrmffU;
// textos aprovados palavra por palavra). Sobre o bebê → como mama → o que vai na mamadeira (só com
// mamadeira) → outros alimentos (só com 6 meses ou mais) → sono → criar a família. As respostas ficam
// só na memória até "Criar família": antes disso, nada é gravado.
let O = null;
function onbStart(from) {
  O = { from, i: 0, name: '', birth: '', sex: null, feed: null, milk: null, food: null, sleep: null, at: '', track: null, alert: null, night: NIGHT_START, fam: '', ok: false };
  show('scrOnb'); onbDraw(); window.scrollTo(0, 0);
}
const onbSteps = () => ['bebe', 'mama', ...(O.feed === 'bottle' || O.feed === 'both' ? ['mamadeira'] : []),
  ...(monthsOld(O.birth, Date.now()) >= 6 ? ['comida'] : []), 'sono', 'familia'];
// "Como a Marina mama hoje?"; sem menina ou menino anotado, só o nome.
const onbArt = (a, o) => O.sex === 'F' ? a : O.sex === 'M' ? o : '';
const onbNome = () => esc(O.name.trim());
const CHK_BOX = '<span class="box" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5"/></svg></span>';
const pressed = (on, attrs, txt) => `<button type="button" class="opt${on ? ' on' : ''}" ${attrs} aria-pressed="${on}">${txt}</button>`;
function onbDraw() {
  const steps = onbSteps(), k = steps[O.i] || 'familia', n = steps.length;
  let h = `<div class="onbtop"><button type="button" class="back" data-onb="back" aria-label="Voltar"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button>`
    + `<div class="onbsteps" role="progressbar" aria-label="Passo ${O.i + 1} de ${n}" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${O.i + 1}">${steps.map((_, j) => `<i class="${j <= O.i ? 'on' : ''}"></i>`).join('')}</div></div>`;
  const big = (key, opts) => `<div class="big">${opts.map(([v, txt, ic]) => `<button type="button" data-pick="${key}" data-v="${v}" aria-pressed="${O[key] === v}">${ic || ''}<span>${txt}</span></button>`).join('')}</div>`;
  if (k === 'bebe') h += `<h1>Sobre o bebê</h1><form id="fOnb">`
    + `<div><div class="lbl">Nome</div><input class="field" id="oName" maxlength="40" placeholder="Marina" required value="${esc(O.name)}" aria-label="Nome do bebê"></div>`
    + `<div><div class="lbl">Nascimento</div><input class="field" id="oBirth" type="date" value="${esc(O.birth)}" aria-label="Nascimento"></div>`
    + `<div class="pick2" role="group" aria-label="Menina ou menino">${pressed(O.sex === 'F', 'data-sex="F"', 'Menina')}${pressed(O.sex === 'M', 'data-sex="M"', 'Menino')}</div>`
    + '<button class="save" type="submit">Continuar</button></form>';
  if (k === 'mama') h += `<h1>Como ${onbArt('a ', 'o ')}${onbNome()} mama hoje?</h1>`
    + big('feed', [['breast', 'No peito', ICON.nursing], ['bottle', 'Na mamadeira', ICON.feed], ['both', 'Nos dois', '<span class="two">' + ICON.nursing + ICON.feed + '</span>']]);
  if (k === 'mamadeira') h += '<h1>O que vai na mamadeira?</h1>' + big('milk', [['breast_milk', 'Leite materno'], ['formula', 'Fórmula'], ['both', 'Os dois']]);
  if (k === 'comida') h += `<h1>${onbArt('A ', 'O ')}${onbNome()} já come outros alimentos?</h1>` + big('food', [['1', 'Já come'], ['0', 'Ainda não']]);
  if (k === 'sono') {
    const f = forms(O.sex), Ac = f.ac.charAt(0).toUpperCase() + f.ac.slice(1);
    // O aviso só vale no app e com a faixa da idade (nascimento anotado e menos de 12 meses).
    const canAlert = !!medNotif && !!wakeRef(O.birth || null, Date.now());
    // Item 65 (prévia 4 e textos aprovados em 13/11): a pergunta de acompanhar o sono; só com Sim
    // aparecem o aviso da janela e o começo da noite (18h a 22h; sem resposta, 18h; o fim fica 6h).
    const de = esc(deName({ name: O.name, sex: O.sex }));
    h += `<h1>${onbArt('A ', 'O ')}${onbNome()} está ${f.ac} ou dormindo?</h1><form id="fOnb">`
      + `<div class="pick2">${pressed(O.sleep === 'wake', 'data-sleep="wake"', Ac)}${pressed(O.sleep === 'sleep', 'data-sleep="sleep"', 'Dormindo')}</div>`
      + (O.sleep ? `<div><div class="lbl">${O.sleep === 'wake' ? 'Acordou às' : 'Dormiu às'}</div><input class="field" id="oAt" type="time" value="${esc(O.at)}" aria-label="${O.sleep === 'wake' ? 'Acordou às' : 'Dormiu às'}"></div>` : '')
      + '<div class="onbdiv"></div>'
      + `<div><div class="lbl strong" id="oTrackLbl">Quer que o Soneca acompanhe o sono ${de} com você?</div><div class="pick2" role="group" aria-labelledby="oTrackLbl">${pressed(O.track === true, 'data-track="1"', 'Sim')}${pressed(O.track === false, 'data-track="0"', 'Agora não')}</div>`
      + (O.track === true ? `<p class="hint onbhint">Mostra a janela de sono no cartão ${de} e conta a noite no horário da sua casa.</p>`
        : O.track === false ? '<p class="hint onbhint">Dá para ligar depois na aba Família.</p>' : '') + '</div>'
      + (O.track !== true ? '' : '<div class="onbmore">'
        + (canAlert ? `<div><div class="lbl" id="oAlertLbl">Avisar quando a janela de sono estiver chegando?</div><div class="pick2" role="group" aria-labelledby="oAlertLbl">${pressed(O.alert === true, 'data-alert="1"', 'Sim')}${pressed(O.alert === false, 'data-alert="0"', 'Agora não')}</div></div>` : '')
        + `<div><div class="lbl" id="oNightLbl">A partir de que horas você quer que ${onbArt('a ', 'o ')}${onbNome()} durma à noite?</div><div class="nchips" role="group" aria-labelledby="oNightLbl">${ONB_STARTS.map(x => pressed(O.night === x, `data-night="${x}"`, x + 'h')).join('')}</div></div>`
        + '</div>')
      + '<p class="err" id="errOnb" hidden></p><button class="save" type="submit">Continuar</button><button type="button" class="link" data-onb="skip">Pular</button></form>';
  }
  if (k === 'familia') h += '<h1>Criar a família</h1><form id="fOnb">'
    + `<div><div class="lbl">Nome da família</div><input class="field" id="oFam" maxlength="60" placeholder="Família Mesquita" required value="${esc(O.fam)}" aria-label="Nome da família"></div>`
    + '<div class="consent"><b>Dados do bebê e de saúde</b><p class="txt">O Soneca guarda o que você anotar sobre o bebê: rotina, incluindo amamentação e ordenha, e, se quiser, sintomas, temperatura, remédios e peso. Esses dados são de uma criança e de saúde, e só os membros da sua família os veem. Não vendemos, não usamos para publicidade e você apaga tudo quando quiser.</p>'
    + `<label class="chk"><input type="checkbox" id="oOk"${O.ok ? ' checked' : ''}>${CHK_BOX}<span>Sou pai, mãe ou responsável legal por este bebê e autorizo o Soneca a guardar esses dados, inclusive de amamentação, para o uso da minha família.</span></label></div>`
    + '<p class="err" id="errOnb" hidden></p><button class="save" type="submit">Criar família</button></form>';
  $('scrOnb').innerHTML = h;
  $('scrOnb').dataset.step = k;
}
function onbGo(d) {
  O.i += d;
  if (O.i < 0) { const from = O.from; O = null; return show(from === 'profile' ? 'scrMain' : 'scrStart'); }
  onbDraw(); window.scrollTo(0, 0);
}
const nowHm = () => hm(Date.now());
$('scrOnb').addEventListener('input', e => {
  const t = e.target, map = { oName: 'name', oBirth: 'birth', oFam: 'fam', oAt: 'at' };
  if (map[t.id]) O[map[t.id]] = t.value;
  if (t.id === 'oOk') O.ok = t.checked;
});
$('scrOnb').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || !O) return;
  if (b.dataset.onb === 'back') return onbGo(-1);
  if (b.dataset.onb === 'skip') { O.sleep = null; return onbGo(1); }
  if (b.dataset.sex) { O.sex = O.sex === b.dataset.sex ? null : b.dataset.sex; return onbDraw(); }
  // Como mama, mamadeira e outros alimentos: um toque escolhe e passa para a próxima.
  if (b.dataset.pick) {
    O[b.dataset.pick] = b.dataset.v;
    if (b.dataset.pick === 'feed' && O.feed === 'breast') O.milk = null;
    return onbGo(1);
  }
  if (b.dataset.sleep) { O.sleep = b.dataset.sleep; if (!O.at) O.at = nowHm(); onbDraw(); return $('oAt')?.focus(); }
  if (b.dataset.track) { O.track = b.dataset.track === '1'; return onbDraw(); }
  if (b.dataset.night) { O.night = +b.dataset.night; return onbDraw(); }
  // "Sim" pede a permissão do celular na hora (decisão de 13/11). Negada, fica "Agora não".
  if (b.dataset.alert) {
    O.alert = b.dataset.alert === '1'; onbDraw();
    if (O.alert && !(await notifPerm()).ok) { O.alert = false; onbDraw(); toast(NOTIF_DENIED); }
  }
});
$('scrOnb').addEventListener('submit', async e => {
  e.preventDefault(); if (!O) return;
  const k = $('scrOnb').dataset.step;
  if (k === 'bebe') { if (!O.name.trim()) return; return onbGo(1); }
  if (k === 'sono') {
    // Horário apagado: vale o de agora (o campo já abre com ele).
    if (O.sleep && !/^\d\d:\d\d$/.test(O.at)) O.at = nowHm();
    return onbGo(1);
  }
  if (!O.ok) return err('errOnb', 'Para criar a família, marque a autorização dos dados do bebê.');
  const btn = e.submitter; busy(btn, true);
  const ok = await onbCreate();
  busy(btn, false);
  if (ok !== true) err('errOnb', ok);
});
// "Criar família": só aqui se grava. A família e o bebê pela função do banco; menina ou menino, o jeito de
// alimentar, o primeiro registro de sono e o aviso vão à parte (sem o 024, só não salvam as respostas).
async function onbCreate() {
  const { data: fid, error } = await sb.rpc('create_family', {
    family_name: O.fam.trim(), baby_name: O.name.trim(), baby_birth: O.birth || null,
  });
  if (error) return errMsg(error);
  const { data: bb } = await sb.from('babies').select('id').eq('family_id', fid).order('created_at');
  const bid = bb?.[0]?.id;
  if (bid && O.sex) await sb.from('babies').update({ sex: O.sex }).eq('id', bid);
  if (bid && O.feed) await sb.from('babies').update({ feeding: O.feed, bottle_milk: O.feed === 'breast' ? null : O.milk,
    eats_food: O.food === null ? null : O.food === '1' }).eq('id', bid);
  await addConsent('baby', { family_id: fid });
  // A resposta do sono vira o primeiro registro: hoje, ou ontem se o horário ainda não chegou.
  if (bid && O.sleep) {
    const now = Date.now(); let t = atTime(startOfDay(now), O.at); if (t > now) t = atTime(addDays(startOfDay(now), -1), O.at);
    await sb.from('entries').insert({ family_id: fid, baby_id: bid, ...fields({ kind: O.sleep, t }) });
  }
  // Item 65: "Acompanhar o sono" da família (só se respondeu) e o começo da noite do bebê (com Sim). Sem
  // o 025, só não salvam: fica ligado e a noite fica 18h às 6h.
  if (O.track !== null) await sb.from('family_settings').upsert({ family_id: fid, sleep_track: O.track });
  if (bid && O.track && O.night !== NIGHT_START) await sb.from('babies').update({ night: nightSave(null, O.night, NIGHT_END, Date.now()) }).eq('id', bid);
  if (O.track && O.alert !== null) await setWinAlert(O.alert, true);
  O = null;
  await loadFamilies(); openFamily(fid);
  return true;
}

/* ---------- abrir família ---------- */
async function openFamily(fid) {
  const fam = st.families.find(f => f.id === fid);
  // Quem criou a família autoriza os dados do bebê antes de abrir (famílias de antes do 015).
  if (fam.creator_id === st.user.id && !hasConsent('baby', fid)) return showBabyOk(fid);
  show('scrLoading');
  st.family = fam;
  lsSet('cad-family', fid);
  const [{ data: babies }, { data: mem }, { data: fset }] = await Promise.all([
    sb.from('babies').select('*').eq('family_id', fid).order('created_at'),
    sb.from('family_members').select('user_id,joined_at').eq('family_id', fid).order('joined_at'),
    // "Acompanhar o sono" (025): sem linha da família, ou sem o 025, fica ligado.
    sb.from('family_settings').select('*').eq('family_id', fid).maybeSingle(),
  ]);
  st.babies = babies || []; st.members = mem || []; st.track = fset?.sleep_track !== false;
  await loadNames(st.members.map(m => m.user_id));
  const savedBaby = lsGet('cad-baby-' + fid);
  st.baby = st.babies.find(b => b.id === savedBaby) || st.babies[0] || null;
  subscribe(fid);
  await Promise.all([loadEntries(), loadMeds(), loadGrowth(), loadQuestions()]);
  st.tab = 'home'; FP.invite = null;
  show('scrMain'); render(); ftSync(); openAlertDose(); openRemTap();
}

async function loadNames(ids) {
  const missing = [...new Set(ids)].filter(id => id && !(id in st.names));
  if (!missing.length) return;
  const { data } = await sb.from('profiles').select('id,display_name').in('id', missing);
  for (const p of data || []) st.names[p.id] = p.display_name;
}

// Recarregar não esvazia a tela: os registros antigos ficam até os novos chegarem inteiros. O que
// chega ao vivo durante o download fica na fila e é refeito sobre os novos.
let entryQ = null;
// Desde quando os registros do bebê aberto estão no celular.
let entriesFrom = Infinity;
// Os últimos 60 dias e, para o resumo do mês anterior sair inteiro, desde o dia 1º dele.
const baseSince = () => Math.min(startOfDay(Date.now() - KEEP_DAYS * DAY), prevMonth());
// Um mês mais antigo do resumo precisa dos registros desde a véspera do dia 1º (o sono da virada).
const monthSince = m => Math.min(baseSince(), addDays(m, -1));
async function loadEntries() {
  const b = st.baby;
  if (!b) { st.entries = new Map(); entriesFrom = Infinity; return; }
  // Recarregar com um mês antigo aberto no resumo já traz desde ele.
  const t0 = st.view === 'month' && st.month ? monthSince(clampMonth(st.month)) : baseSince(), since = new Date(t0).toISOString();
  const fresh = new Map(), q = entryQ = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('entries').select('*').eq('baby_id', b.id)
      .gte('at', since).order('at').range(from, from + 999);
    if (error) { if (entryQ === q) entryQ = null; return toast('Não foi possível carregar os registros.'); }
    for (const r of data) fresh.set(r.id, withT(r));
    if (data.length < 1000) break;
  }
  await loadNames([...fresh.values()].flatMap(e => [e.author_id, e.done_by]));
  if (entryQ !== q) return;   // outro recarregamento começou depois deste
  entryQ = null;
  if (st.baby?.id !== b.id) return;
  for (const p of q) applyEntry(fresh, p);
  st.entries = fresh; entriesFrom = t0;
}
// Mês antigo do resumo (Patrick, 02/11: voltar até o nascimento): busca só o que falta, da véspera do
// mês até onde o celular já tem, e junta aos outros. Fica até o próximo recarregamento. O que chega ao
// vivo durante o download vai para a fila, como no loadEntries.
let olderQ = null, olderFail = 0;
const olderMissing = m => entriesFrom < Infinity && monthSince(m) < entriesFrom;
const olderFailed = () => Date.now() - olderFail < 15000;   // depois de 15 s, tenta de novo
async function loadOlder(m) {
  const b = st.baby, map = st.entries, until = entriesFrom, t0 = monthSince(m);
  if (!b || !olderMissing(m) || olderQ || entryQ || olderFailed()) return;
  const got = new Map(), q = olderQ = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('entries').select('*').eq('baby_id', b.id)
      .gte('at', new Date(t0).toISOString()).lt('at', new Date(until).toISOString()).order('at').range(from, from + 999);
    if (error) { olderQ = null; olderFail = Date.now(); return olderDone(); }
    for (const r of data) got.set(r.id, withT(r));
    if (data.length < 1000) break;
  }
  await loadNames([...got.values()].flatMap(e => [e.author_id, e.done_by]));
  olderQ = null;
  // Recarregou ou trocou de bebê no meio: o que veio fica de fora, e a tela pede de novo se precisar.
  if (st.entries === map && st.baby?.id === b.id && entriesFrom === until) {
    for (const p of q) applyEntry(got, p);
    for (const [id, e] of got) if (!map.has(id)) map.set(id, e);
    entriesFrom = t0;
  }
  olderDone();
}
function olderDone() { refresh(); if (S?.mode === 'cal') drawCal(); }
function applyEntry(map, p) {
  if (p.eventType === 'DELETE') map.delete(p.old.id);
  else if (st.baby && p.new.baby_id === st.baby.id) map.set(p.new.id, withT(p.new));
}
const withT = r => ({ ...r, t: Date.parse(r.at) });

async function loadMeds() {
  const b = st.baby;
  if (!b) { st.meds = []; st.routines = []; return; }
  const [{ data, error }] = await Promise.all([
    sb.from('medicines').select('*').eq('baby_id', b.id).is('stopped_at', null).order('created_at'), loadRoutines()]);
  if (error) return toast('Não foi possível carregar os remédios.');
  if (st.baby?.id === b.id) st.meds = data;
}
// Tarefas programadas (023). Sem aviso de erro: antes do 023 a tabela não existe, e o resto funciona.
async function loadRoutines() {
  const b = st.baby;
  if (!b) { st.routines = []; return; }
  const { data, error } = await sb.from('routines').select('*').eq('baby_id', b.id).is('stopped_at', null).order('created_at');
  if (st.baby?.id !== b.id) return;
  st.routinesOk = !error; st.routines = data || [];
}
async function loadGrowth() {
  const b = st.baby;
  if (!b) { st.measures = st.weights = st.lengths = []; st.milestones = []; return; }
  const [w, m] = await Promise.all([sb.from('weights').select('*').eq('baby_id', b.id),
                                    sb.from('milestones').select('*').eq('baby_id', b.id)]);
  if (st.baby?.id !== b.id) return;
  st.growthOk = !w.error && !m.error;
  st.measures = sortWeights(w.data || []); st.milestones = sortMilestones(m.data || []);
  splitMeasures();
}
// Cada medida pode ter peso, comprimento ou os dois. O resto do app usa só os pesos.
function splitMeasures() {
  st.weights = st.measures.filter(r => r.grams != null);
  st.lengths = st.measures.filter(r => r.cm != null);
}
// Dúvidas para a consulta. Sem canal ao vivo: antes do 010 a tabela não existe. Recarrega ao voltar
// para o app, como o resto.
async function loadQuestions() {
  const b = st.baby;
  if (!b) { st.questions = []; return; }
  const { data, error } = await sb.from('questions').select('*').eq('baby_id', b.id);
  if (st.baby?.id !== b.id) return;
  st.questionsOk = !error; st.questions = data || [];
}
// Botões da família. Canal ao vivo à parte: antes do 008 a tabela não existe, e ela no mesmo canal
// dos registros poderia derrubar a sincronização de tudo.
// Mudou algo vindo de outro celular: redesenha a tela e, se estiver aberta, a lista de remédios.
function refresh() { if (!S) render(); else if (S.mode === 'meds') { render(); drawMeds(); } else if (S.mode === 'tasks' || S.mode === 'task') { render(); redrawTasks(); } }

function subscribe(fid) {
  if (st.channel) sb.removeChannel(st.channel);
  st.channel = sb.channel('familia-' + fid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: 'family_id=eq.' + fid }, async p => {
      applyEntry(st.entries, p); entryQ?.push(p); olderQ?.push(p);
      if (p.eventType !== 'DELETE' && st.baby && p.new.baby_id === st.baby.id) await loadNames([p.new.author_id, p.new.done_by]);
      refresh();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'medicines', filter: 'family_id=eq.' + fid }, p => {
      const m = p.new; if (!m?.id || !st.baby || m.baby_id !== st.baby.id) return;
      st.meds = st.meds.filter(x => x.id !== m.id);
      if (!m.stopped_at) st.meds = [...st.meds, m].sort((a, b) => a.created_at < b.created_at ? -1 : 1);
      refresh();
    })
    .subscribe();
  // Tarefas num canal à parte: antes do 023 a tabela não existe e poderia derrubar o canal dos registros.
  if (st.taskChannel) sb.removeChannel(st.taskChannel);
  st.taskChannel = sb.channel('tarefas-' + fid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'routines', filter: 'family_id=eq.' + fid }, p => {
      const r = p.new; if (!r?.id || !st.baby || r.baby_id !== st.baby.id) return;
      st.routines = st.routines.filter(x => x.id !== r.id);
      if (!r.stopped_at) st.routines = [...st.routines, r].sort((a, b) => a.created_at < b.created_at ? -1 : 1);
      refresh();
    })
    .subscribe();
}

/* ---------- tela do dia ---------- */
// Os registros em ordem de horário. Um redesenho pede várias vezes: ordena uma vez e vale até o fim dele.
// Quem usa não pode mexer na lista (só filter, slice, map).
let sortedC = null;
function sortedEntries() {
  if (sortedC?.map === st.entries && sortedC.n === st.entries.size) return sortedC.list;
  const list = [...st.entries.values()].sort((a, b) => a.t - b.t);
  sortedC = { map: st.entries, n: st.entries.size, list };
  queueMicrotask(() => { sortedC = null; });
  return list;
}
// Primeiro dia que dá para ver: o app carrega os últimos 60 dias.
const firstDay = () => addDays(startOfDay(Date.now()), -(KEEP_DAYS - 1));
// Resumo do mês: do mês do nascimento (sem a data anotada, do mês do cadastro) até o atual; o mês
// anterior sempre, como antes.
const monthStart = (t, n = 0) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime(); };
const curMonth = () => monthStart(Date.now()), prevMonth = () => monthStart(Date.now(), -1);
const firstMonth = () => { const b = st.baby; return !b ? prevMonth() : Math.min(prevMonth(), monthStart(b.birth_date ? dayOf(b.birth_date) : Date.parse(b.created_at))); };
const clampMonth = t => Math.min(curMonth(), Math.max(monthStart(t), firstMonth()));
// Última mamada em que marcaram o peito (no banco, só a mamada no peito tem peito marcado).
const lastBreast = evs => evs.findLast(e => e.kind === 'feed' && e.side);

// Redesenha a aba aberta e a barra de baixo. Hoje é redesenhada sempre, mesmo escondida: é leve e
// fica pronta para quando a pessoa voltar.
const PANES = { trends: 'paneTrends', home: 'paneHome', baby: 'paneBaby', family: 'paneFamily', profile: 'paneProfile' };
function render() {
  if ($('scrMain').hidden) return;
  for (const k in PANES) $(PANES[k]).hidden = k !== st.tab;
  $('dock').hidden = st.tab !== 'home'; if (st.tab !== 'home') closePop();
  document.querySelectorAll('#tabbar [data-tab]').forEach(x => x.dataset.tab === st.tab ? x.setAttribute('aria-current', 'page') : x.removeAttribute('aria-current'));
  $('tabBabyName').textContent = st.baby ? st.baby.name : 'Bebê';
  $('tabBabyInitial').textContent = (st.baby ? st.baby.name : '?').charAt(0).toUpperCase();
  if (st.tab === 'baby') drawBabyPane(); else if (st.tab === 'family') drawFamilyPane(); else if (st.tab === 'profile') drawProfilePane();
  else if (st.tab === 'trends') drawTrendsPane();
  renderHome(); renderBv(); medAlertsLater(); taskAlertsLater(); winSyncLater(); dockSize();
}
// Trocar de aba: começa do alto. Tocar na aba aberta volta para o alto dela. "anchor" leva até uma seção.
function goTab(t, anchor) {
  if (t === st.tab && !anchor) return window.scrollTo({ top: 0, behavior: smooth() });
  if (t !== st.tab) { if (st.tab === 'family') FP.invite = null; st.tab = t; window.scrollTo(0, 0); }
  render();
  if (anchor) spotlight(anchor);
}
const smooth = () => reduceMotion() ? 'auto' : 'smooth';
// Rola até a seção e deixa ela em destaque por um instante.
function spotlight(id) {
  const el = $(id); if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: smooth() });
  el.classList.remove('spot'); void el.offsetWidth; el.classList.add('spot');
  clearTimeout(spotlight.t); spotlight.t = setTimeout(() => el.classList.remove('spot'), 2200);
}
const babyChips = () => st.babies.map(x => `<button data-baby="${esc(x.id)}" class="${x.id === st.baby?.id ? 'on' : ''}">${esc(x.name)}</button>`).join('');

// Sono que nunca terminou (Bruno, 17/10): um "Dormiu" sem "Acordou" há mais de 14 horas (decidido em
// 27/10) vira a pergunta "Ainda dormindo?" e fica fora dos gráficos e das médias até alguém corrigir.
const liveOpen = (open, now) => open !== null && now - open > LONG_SLEEP ? null : open;
const DIAS_LONGOS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function renderHome() {
  const evs = sortedEntries(), now = Date.now(), b = st.baby;
  $('babyName').textContent = b ? b.name : 'Sem bebê';
  $('babyInitial').textContent = (b ? b.name : '?').charAt(0).toUpperCase();
  $('babyAge').textContent = !b ? 'toque para cadastrar'
    : [ageText(b.birth_date), st.weights.length ? kg(st.weights.at(-1).grams) : ''].filter(Boolean).join(' · ') || 'peso, remédios e marcos';

  const tabs = $('babyTabs');
  tabs.hidden = st.babies.length < 2;
  tabs.innerHTML = babyChips();

  const last = kinds => { for (let i = evs.length - 1; i >= 0; i--) if (kinds.includes(evs[i].kind)) return evs[i]; return null; };
  const { out: intervals, open: open0 } = sleepIntervals(evs), open = liveOpen(open0, now);
  const old = open0 !== null && open === null;
  $('sleepBanner').hidden = !old;
  if (old) { const d = new Date(open0); $('sleepOldTxt').textContent = `O último "Dormiu" foi ${DIAS_LONGOS[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}, às ${pad(d.getHours())}h${pad(d.getMinutes())}. Faltou anotar quando acordou?`; }
  renderWin(last, open, now);
  renderDock(last, open, now);
  renderLast(last, open, now);
  renderMeds(); renderTasks();

  const today = startOfDay(now), week = st.view === 'week', month = st.view === 'month';
  $('tabDay').setAttribute('aria-selected', st.view === 'day'); $('tabWeek').setAttribute('aria-selected', week); $('tabMonth').setAttribute('aria-selected', month);
  $('dayView').hidden = st.view !== 'day'; $('weekView').hidden = !week; $('monthView').hidden = !month;
  $('prevDay').setAttribute('aria-label', week ? 'Semana anterior' : month ? 'Mês anterior' : 'Dia anterior');
  $('nextDay').setAttribute('aria-label', week ? 'Próxima semana' : month ? 'Próximo mês' : 'Próximo dia');
  // O resumo segue os botões da família (sem Ordenha ligada, não fala de ordenha).
  const sleep = { out: intervals, open }, logs = { weights: st.weights, lengths: st.lengths, milestones: st.milestones, on: isOn };
  if (month) {
    st.month = clampMonth(st.month || now);
    const d = new Date(st.month), end = monthStart(st.month, 1), partial = end > now;
    const title = MESES_L[d.getMonth()] + ' ' + d.getFullYear();
    $('dayText').textContent = navMonthTitle(st.month); $('dayTitle').setAttribute('aria-label', title + '. Escolher no calendário');
    $('nextDay').disabled = st.month >= curMonth(); $('toToday').hidden = st.month >= curMonth(); $('prevDay').disabled = st.month <= firstMonth();
    if (!b) { st.shareText = ''; $('monthView').innerHTML = '<div class="empty">Cadastre um bebê para começar.</div>'; return; }
    // Mês de mais de 60 dias atrás: os registros dele ainda estão chegando.
    if (olderMissing(st.month)) {
      loadOlder(st.month); st.shareText = '';
      $('monthView').innerHTML = `<div class="empty">${olderFailed() ? 'Não foi possível carregar os registros.' : 'Carregando…'}</div>`;
      return;
    }
    const s = periodStats({ a: st.month, z: end, evs, sleep, now, ...logs, sex: b.sex, rule: ruleOf(b) });
    const div = division({ a: st.month, z: end, evs, now, name: firstName });
    const heading = MESES_L[d.getMonth()] + ' de ' + b.name + (partial ? ', até ' + shortDate(localDate(now)) : '');
    st.shareText = s.any ? reportText(s, { title: heading, name: b.name, span: 'mês', div }) : '';
    const ref = refHtml({ birth: b.birth_date, at: localDate(Math.min(end - 1, now)), name: b.name, sleep: s.sleepDay, pee: s.peeDay,
                          cap: 'Médias de ' + MESES_L[d.getMonth()].toLowerCase() + ', nos dias com registros.' });
    $('monthView').innerHTML = monthHtml(s, { heading }) + ref + divisionHtml(div, { name: b.name })
      + (s.any ? shareHtml(st.shareText) : '') + nightsHtml({ a: st.month, z: end, evs, sleeps: intervals, now, rule: ruleOf(b), de: deName(b) });
    return;
  }
  if (week) {
    // Os 7 dias ficam dentro do que o app carrega.
    st.weekEnd = Math.min(today, Math.max(st.weekEnd, addDays(firstDay(), 6)));
    const title = rangeTitle(addDays(st.weekEnd, -6), st.weekEnd);
    $('dayText').textContent = navRangeTitle(addDays(st.weekEnd, -6), st.weekEnd); $('dayTitle').setAttribute('aria-label', title + '. Escolher no calendário');
    $('nextDay').disabled = $('toToday').hidden = st.weekEnd >= today;
    $('prevDay').disabled = st.weekEnd <= addDays(firstDay(), 6);
    // No fim do painel, o resumo destes 7 dias pronto para mandar.
    const wa = addDays(st.weekEnd, -6), wz = addDays(st.weekEnd, 1);
    const s = b && periodStats({ a: wa, z: wz, evs, sleep, now, ...logs, sex: b.sex, rule: ruleOf(b) });
    const div = b && division({ a: wa, z: wz, evs, now, name: firstName });
    st.shareText = s?.any ? reportText(s, { title: 'Semana de ' + b.name + ', ' + title, name: b.name, span: 'semana', div }) : '';
    $('weekView').innerHTML = !b ? '<div class="empty">Cadastre um bebê para começar.</div>'
      : weekHtml({ end: st.weekEnd, evs, sleep, now, show: st.show, metric: st.metric, on: isOn, zoom: st.zoom.week, rule: ruleOf(b),
                   ref: refHtml({ birth: b.birth_date, at: localDate(Math.min(wz - 1, now)), name: b.name, sleep: s.sleepDay, pee: s.peeDay,
                                  cap: 'Médias destes 7 dias, nos dias com registros.' }) })
        + divisionHtml(div, { name: b.name })
        + (st.shareText ? shareHtml(st.shareText, { heading: 'Mandar a semana para a família', note: 'Os totais destes 7 dias, para mandar no WhatsApp ou por mensagem.' }) : '');
    return;
  }

  const d0 = st.viewDay, d1 = addDays(d0, 1);
  $('dayText').textContent = navDayTitle(d0); $('dayTitle').setAttribute('aria-label', dayTitle(d0) + '. Escolher no calendário');
  $('nextDay').disabled = $('toToday').hidden = d0 >= today;
  $('prevDay').disabled = d0 <= firstDay();

  const day = evs.filter(e => e.t >= d0 && e.t < d1);
  // Como foi o dia: numa linha só, como no painel da semana, com a contagem embaixo.
  const sleeps = open === null ? intervals : [...intervals, [open, now]];
  const slept = sleeps.some(([a, z]) => z > d0 && a < d1);
  $('summary').innerHTML = !b || (!day.length && !slept) ? ''
    : `<div class="card daycard"><h3>Como foi o dia</h3>${zoomHead(st.zoom.day, 'Toque duas vezes para aproximar.')}${dayLine({ d0, evs, sleeps, now, on: isOn, zoom: st.zoom.day })}</div>`;

  // Dose pulada não entra na linha do tempo; continua em "Remédios e horários", com Desfazer.
  const rows = day.filter(e => !(e.kind === 'med' && e.skipped));
  $('timeline').innerHTML = !b ? '<div class="empty">Cadastre um bebê para começar.</div>'
    : !rows.length ? `<div class="empty">${d0 === today ? 'Toque num botão abaixo para anotar o primeiro.' : 'Nada registrado neste dia.'}</div>`
    : rows.slice().reverse().map(e => {
        // A pomada da troca de fralda vai junto da troca (prévia de 08/11): duas linhas, um horário só.
        if (e.kind === 'ointment' && e.diaper_id && st.entries.has(e.diaper_id)) return '';
        const o = e.kind === 'diaper' && diaperOint(e.id);
        if (o) return `<div class="rg"><span class="h">${hm(e.t)}</span><div>${rowIn(e, evs, b, e.id)}${rowIn(o, evs, b, e.id)}</div></div>`;
        return `<button class="row" data-id="${esc(e.id)}"><span class="h">${hm(e.t)}</span>${rowBody(e, evs, b)}</button>`;
      }).join('');
  enterFresh();
}

// Uma linha da linha do tempo, sem o horário: o ícone, o que foi e, embaixo, o detalhe e quem fez.
function rowBody(e, evs, b) {
  const noteIsName = e.kind === 'other' || e.kind === 'care' || (e.kind === 'symptom' && e.symptom === 'outro');
  const sub = [esc(detail(e)), !noteIsName && e.note ? esc(e.note) : '', esc(byText(e))].filter(Boolean).join(' · ');
  return `<span class="d k-${e.kind}">${ICON[e.kind]}</span><span><span class="l">${esc(label(e, evs, b.sex))}${e.poo_alert ? '<span class="brownpill">alerta marrom</span>' : ''}</span>${sub ? `<span class="s">${sub}</span>` : ''}</span>`;
}
// Linha dentro do par fralda + pomada: as duas abrem a troca.
const rowIn = (e, evs, b, id) => `<button class="row rin" data-id="${esc(id)}">${rowBody(e, evs, b)}</button>`;

// Há quanto tempo (Patrick, 07/11; prévia https://claude.ai/artifact/8uHTiptEmsVdo7KzRgdbxi): última
// mamada (do começo dela), sono e fralda, logo acima do gráfico. Fala de agora, por isso fica em Dia,
// Semana e Mês. Ao rolar, gruda embaixo do cartão do bebê e os dois viram um cartão só.
function renderLast(last, open, now) {
  const el = $('lastRow'), b = st.baby;
  const f = last(['feed']), w = last(['wake']), d = last(['diaper']), t = ftGet();
  el.hidden = !b || (!f && !w && !d && open === null && !t);
  if (el.hidden) return;
  const cell = (k, lbl, val) => `<div class="lc"><span class="ic k-${k}">${ICON[k]}</span><span><small>${lbl}</small><b>${val}</b></span></div>`;
  const since = x => x ? ago(x) : 'sem registro';
  el.innerHTML = (t ? cell('feed', 'Mamando', ago(t.start)) : cell('feed', 'Última mamada', since(f?.t)))
    + (open !== null ? cell('sleep', 'Dormindo', ago(open)) : cell('sleep', 'Acordou', since(w?.t)))
    + cell('diaper', 'Última fralda', since(d?.t));
  stickLast();
}
// A faixa grudou no cartão do bebê? Então os dois viram um cartão só.
function stickLast() {
  const el = $('lastRow'), hc = document.querySelector('#paneHome .hcard');
  if (!hc) return;
  document.documentElement.style.setProperty('--hch', hc.offsetHeight + 'px');
  const stuck = !el.hidden && !$('paneHome').hidden && el.getBoundingClientRect().top <= hc.getBoundingClientRect().bottom + 1;
  $('paneHome').classList.toggle('lstuck', stuck);
}
addEventListener('scroll', stickLast, { passive: true });

/* ---------- janela de sono (item 60) ---------- */
// No cartão do bebê, no alto (prévia 9, opção 2, escolhida em 13/11): com o bebê acordado, "Acordada há
// 45 min · Janela de sono em 15 min" e a régua da referência da idade (janela.js). Dormindo, some: volta a
// faixa "Dormindo há" de baixo. De 12 meses em diante e sem nascimento, só o contador.
const lastWake = (last, open, now) => {
  if (open !== null || last(['sleep', 'wake'])?.kind !== 'wake') return null;
  const w = last(['wake']);
  return w && now - w.t >= 0 && now - w.t <= WAKE_MAX ? w : null;
};
function renderWin(last, open, now) {
  const el = $('sleepWin'), b = st.baby, w = b && st.track !== false && lastWake(last, open, now);
  if (!w) { if (!el.hidden) { el.hidden = true; el.innerHTML = ''; } return; }
  const awake = now - w.t, ref = wakeRef(b.birth_date, now);
  const h = `<span class="hwt">${winText(awake, ref, b.sex)}</span>` + (ref ? rulerHtml(awake, ref) : '');
  if (el.innerHTML !== h) el.innerHTML = h;
  el.hidden = false;
}
// O aviso no celular: quem disse Sim no onboarding, e só com "Acompanhar o sono" ligado na família (item 65). Fica no perfil da pessoa
// (sleep_alert, 024) e, sem o 024, só neste celular.
const winOn = () => lsGet('cad-janela') === '1' || (lsGet('cad-janela') == null && !!st.profile?.sleep_alert);
async function setWinAlert(on, quiet) {
  lsSet('cad-janela', on ? '1' : '0');
  if (st.profile) st.profile.sleep_alert = on;
  await sb.from('profiles').update({ sleep_alert: on }).eq('id', st.user.id);
  if (!quiet) winSyncLater();
}
// Um aviso por soneca, 15 min antes do começo da janela, só entre 6h e 18h (decisão de 13/11). O celular
// guarda um aviso por bebê; um "Acordou" novo troca o aviso, e o "Dormiu" cancela o que não tocou.
const winId = id => alertId('janela-' + id);
let winTimer = 0;
const winSyncLater = () => { if (medNotif) { clearTimeout(winTimer); winTimer = setTimeout(winSync, 1000); } };
async function winSync() {
  const b = st.baby; if (!medNotif || !b) return;
  try {
    const now = Date.now(), evs = sortedEntries();
    const last = kinds => { for (let i = evs.length - 1; i >= 0; i--) if (kinds.includes(evs[i].kind)) return evs[i]; return null; };
    const open = liveOpen(sleepIntervals(evs).open, now), w = lastWake(last, open, now);
    const n = w && winOn() && st.track !== false && winNotice(w.t, wakeRef(b.birth_date, w.t), b);
    const want = n && n.at > now + 5000 ? n.at + '|' + n.title + '|' + n.body : '';
    const key = 'cad-janela-at-' + b.id;
    if ((lsGet(key) || '') === want) return;
    await medNotif.cancel({ notifications: [{ id: winId(b.id) }] });
    lsSet(key, want || null);
    if (!want || !(await notifGranted())) return;
    if (ANDROID) await medNotif.createChannel({ id: 'janela', name: 'Janela de sono', importance: 4, visibility: 1, vibration: true });
    await medNotif.schedule({ notifications: [{ id: winId(b.id), title: n.title, body: n.body, schedule: { at: new Date(n.at), allowWhileIdle: true },
      channelId: 'janela', smallIcon: 'ic_stat_sono', extra: { baby: b.id, go: 'day' } }] });
  } catch {}
}
addEventListener('resize', stickLast);

/* ---------- noite de cada bebê e "Acompanhar o sono" (item 65) ---------- */
// Decidido com o Patrick em 13/11; prévias aprovadas: https://claude.ai/artifact/8qdYxEkgAWJ5LdszNH7bMZ
// (tela de edição e abas) e https://claude.ai/artifact/MLAYnM3BS8u4eMxnp35AyL (onboarding e aba Família);
// textos aprovados palavra por palavra. A regra está em noite.js. A noite aparece e muda nas abas Bebê
// (seção Noite) e Família (seção Sono), sempre, com o "Acompanhar o sono" ligado ou não: o interruptor
// só liga e desliga a janela de sono (a faixa no cartão e o aviso no celular).
const ruleMemo = new WeakMap();
const ruleOf = b => { if (!b) return OLD_RULE; let r = ruleMemo.get(b); if (!r) ruleMemo.set(b, r = nightRule(b)); return r; };
async function setTrack(on) {
  st.track = on; render(); winSyncLater();
  const { error } = await sb.from('family_settings').upsert({ family_id: st.family.id, sleep_track: on });
  if (error) { st.track = !on; render(); winSyncLater(); toast(errMsg(error)); }
}
// A tela de edição: Começa (16h a 23h), Termina (4h a 9h), a régua de 24 h e os exemplos no botão i.
function nightSheet(b) {
  if (!b) return;
  const c = nightNow(b);
  S = { mode: 'night', b, start: c.start, end: c.end, info: false }; drawNight();
}
const h24 = h => (h % 24) + 'h';
function nightRuler(c) {
  const W = 300, x = h => (h / 24 * W).toFixed(1);
  let s = `<svg class="nrul" viewBox="0 0 ${W} 48" role="img" aria-label="Régua de 24 horas com a noite de ${c.start}h às ${c.end}h">`
    + `<rect class="nday" x="0" y="6" width="${W}" height="18" rx="6"/>`
    + `<rect class="nnight" x="${x(c.start)}" y="6" width="${(W - x(c.start)).toFixed(1)}" height="18" rx="6"/>`
    + `<rect class="nnight" x="0" y="6" width="${x(c.end)}" height="18" rx="6"/>`;
  for (const h of [0, 6, 12, 18, 24]) s += `<line x1="${x(h)}" x2="${x(h)}" y1="26" y2="30"/><text x="${Math.min(Math.max(+x(h), 8), W - 8)}" y="43" text-anchor="middle">${h24(h)}</text>`;
  return s + '</svg>';
}
function drawNight() {
  const { b, start, end, info } = S, opts = (hs, v) => hs.map(h => `<option value="${h}"${h === v ? ' selected' : ''}>${h}h</option>`).join('');
  let h = `<div class="grab"></div><div class="shead"><h3 class="nth">${esc(nightTitle(b))}<button class="tri" data-act="nInfo" aria-expanded="${info}" aria-controls="nEx" aria-label="O que conta como noite">i</button></h3><button class="x" data-act="close" aria-label="Fechar">×</button></div>`;
  if (info) h += `<div class="nex" id="nEx" role="note"><b>O que conta como noite</b>`
    + `<p><i class="nnight"></i>Dormiu às ${h24(start - 1)}40: o sono conta inteiro como noite.</p>`
    + `<p><i class="nnight"></i>Acordou e voltou a dormir entre ${h24(start)} e ${h24(end)}: conta como despertar.</p>`
    + `<p><i class="nline"></i>Só dormiu às ${h24(start + 1)}30: o tempo acordado antes não conta como despertar.</p>`
    + `<p><i class="nnap"></i>Dormiu às ${h24(end + 1)}: conta como soneca.</p></div>`;
  h += `<div class="ntimes"><div><label class="lbl" for="nStart">Começa</label><select class="field" id="nStart">${opts(STARTS, start)}</select></div>`
    + `<div><label class="lbl" for="nEnd">Termina</label><select class="field" id="nEnd">${opts(ENDS, end)}</select></div></div>`
    + `<div class="nbox">${nightRuler({ start, end })}</div>`
    + '<p class="dim">Vale para todos da família, a partir de hoje. Os dias anteriores ficam como estavam.</p>'
    + '<div class="err" id="nErr" hidden></div><button class="save" data-act="saveNight">Salvar</button>'
    + `<button class="link" data-act="nightReset">Voltar para ${NIGHT_START}h às ${NIGHT_END}h</button>`;
  openPanel(h);
}
async function saveNight(btn) {
  const b = S.b, night = nightSave(b, S.start, S.end, Date.now());
  busy(btn, true);
  const { data, error } = await sb.from('babies').update({ night }).eq('id', b.id).select('id');
  busy(btn, false);
  if (error || !data?.length) return err('nErr', errMsg(error));
  b.night = night; ruleMemo.delete(b);
  closeSheet(); toast('Salvo');
}
function nightAction(a, b) {
  if (a === 'nInfo') { S.info = !S.info; return drawNight(); }
  if (a === 'nightReset') { S.start = NIGHT_START; S.end = NIGHT_END; return drawNight(); }
  if (a === 'saveNight') return saveNight(b);
}
$('sheetIn').addEventListener('change', e => {
  if (S?.mode !== 'night' || !['nStart', 'nEnd'].includes(e.target.id)) return;
  S[e.target.id === 'nStart' ? 'start' : 'end'] = +e.target.value;
  if (S.info) return drawNight();
  $('sheetIn').querySelector('.nbox').innerHTML = nightRuler(S);
});

/* ---------- boas-vindas ---------- */
// Cartões para quem acabou de entrar numa família, um de cada vez e na ordem: boas-vindas (quem criou)
// ou "Você entrou" (quem veio por convite), o convite e a semana (com 3 dias de registros). Visto ou pulado, não volta; a marca fica neste celular, uma por família. Só para
// quem entrou na família a partir de BV_DESDE: quem já usava o Soneca não vê nada novo.
// Os testes (testes/cenarios.js) mudam a data por window.testeBvDesde.
const BV_DESDE = window.testeBvDesde || Date.parse('2026-10-30T00:00:00-03:00');
// Na faixa do sono, a mesma capivara com dois z acima da cabeça: o pequeno aparece, depois o grande
// (em cima), e os dois somem juntos (prévia de 08/11). Parados para quem pede menos movimento.
const CAPI_Z = CAPI.replace('</svg>', '<path class="z z1" vector-effect="non-scaling-stroke" d="M93 4H99L93 10H99"/>'
  + '<path class="z z2" vector-effect="non-scaling-stroke" d="M103 -14H112L103 -5H112"/></svg>');
const bvKey = () => 'cad-bv-' + st.family.id;
const bvDone = () => { try { return JSON.parse(lsGet(bvKey())) || []; } catch { return []; } };
const bvSkip = k => lsSet(bvKey(), JSON.stringify([...new Set([...bvDone(), k])]));
// Quando a pessoa adiou o convite pela primeira vez (ms), para ele voltar uma vez 3 dias depois.
const bvAdiou = () => +lsGet(bvKey() + '-convite') || 0;
// "a Marina", "o Pedro"; sem menina ou menino anotado, só o nome.
const artigo = (b, a, o, nada) => b.sex === 'F' ? a : b.sex === 'M' ? o : nada;
function bvCard() {
  const b = st.baby, f = st.family, me = st.members.find(m => m.user_id === st.user.id);
  const joined = me ? Date.parse(me.joined_at) : NaN;
  if (!b || !f || !(joined >= BV_DESDE)) return null;
  const done = bvDone(), evs = [...st.entries.values()], creator = f.creator_id === st.user.id;
  // O sono anotado no onboarding (item 57) não conta: o cartão pergunta a última mamada mesmo assim.
  if (creator && !evs.some(x => x.kind !== 'sleep' && x.kind !== 'wake')) return done.includes('ola') ? null : 'ola';
  if (!creator && !done.includes('entrou')) return 'entrou';
  // Item 56 (prévia aprovada em 12/11: https://claude.ai/artifact/CUY2ZjNWqmbAEr3b1GbiMw): o primeiro
  // "Agora não" (ou ×) só adia o convite; ele volta uma única vez, 3 dias do calendário depois, com outro
  // texto ('convite2'). O segundo encerra. O convite da aba Família fica sempre. Saiu o cartão da semana.
  if (!creator || st.members.length >= 2 || done.includes('convite')) return null;
  const adiou = bvAdiou();
  if (!adiou) return 'convite';
  return startOfDay(Date.now()) >= addDays(startOfDay(adiou), 3) ? 'convite2' : null;
}
// O redesenho de 30 em 30 s só troca o cartão que mudou, para não apagar o que a pessoa digitou nele.
const bvHtml = {};
const bvPaint = (id, h) => { if (bvHtml[id] === h) return false; bvHtml[id] = $(id).innerHTML = h; return true; };
function renderBv() {
  const k = bvCard(), b = st.baby;
  const x = `<button class="x" data-bv="${k}" aria-label="Fechar">×</button>`;
  const go = (label, no) => `<div class="btns"><button class="save" data-bvgo="${k}">${label}</button>${no ? `<button class="link" data-bv="${k}">${no}</button>` : ''}</div>`;
  const card = h => `<div class="card bv">${h}</div>`;
  const nome = b ? esc(b.name) : '';
  // Item 30 (prévia aprovada em 07/11): o primeiro registro já sai do cartão, com a última mamada. Desde o
  // onboarding novo (13/11), no jeito que a família escolheu: peito com o lado, mamadeira com os ml, e nos
  // dois "Como foi". Sem resposta (antes do 024), como antes: o peito.
  const fd = b?.feeding, src = fd === 'bottle' ? 'bottle' : fd === 'both' ? bvSrc : 'breast';
  const top = k === 'ola' ? card(x + `<div class="bvtop">${CAPI}<h3>Tudo pronto para ${artigo(b, 'a ', 'o ', '')}${nome}</h3></div>`
      + '<p>Quando foi a última mamada?</p>'
      + `<div class="bvrow"><div><div class="lbl">Horário</div><input class="field bvtime" type="time" id="bvTime" value="${esc(bvTimeV)}" aria-label="Horário da última mamada"></div>`
      + (src === 'bottle' ? `<div><div class="lbl">ml</div><input class="field bvml" id="bvMl" inputmode="numeric" maxlength="4" value="${esc(bvMlV)}" aria-label="Mililitros"></div>` : '') + '</div>'
      + (fd === 'both' ? '<div><div class="lbl">Como foi</div><div class="seg bvside k-feed">'
        + ['breast', 'bottle'].map(v => `<button class="opt${src === v ? ' on' : ''}" data-bvsrc="${v}" aria-pressed="${src === v}">${v === 'breast' ? 'Peito' : 'Mamadeira'}</button>`).join('') + '</div></div>' : '')
      + (src === 'breast' ? '<div><div class="lbl">Peito</div><div class="seg bvside k-feed">'
        + '<button class="opt" data-bvside="left" aria-pressed="false">Esquerdo</button><button class="opt" data-bvside="right" aria-pressed="false">Direito</button></div></div>' : '')
      + '<p class="err" id="bvErr" hidden></p>'
      + '<div class="btns"><button class="save" data-bvfeed="1">Anotar mamada</button><button class="link" data-bv="ola">Pular</button></div>')
    : k === 'entrou' ? card(`<div class="bvtop">${CAPI}<h3>Você entrou na ${esc(famName(st.family.name))}</h3></div>`
      + '<p>O que alguém anota aparece para todos.</p>' + go('Entendi'))
    : '';
  if (bvPaint('bvTop', top) && k === 'ola') bvSide = null;
  bvPaint('bvEnd', k === 'convite' ? card(x + '<h3>Primeiro registro anotado</h3><p>O Soneca fica melhor com quem cuida junto: quem você convidar vê e anota na mesma linha do tempo.</p>' + go('Convidar alguém', 'Agora não'))
    : k === 'convite2' ? card(x + '<h3>Alguém mais cuida junto?</h3><p>Quem você convidar vê e anota na mesma linha do tempo. Se preferir depois, o convite fica na aba Família.</p>' + go('Convidar alguém', 'Agora não'))
    : '');
}
// A última mamada do cartão "Tudo pronto": horário de hoje (ou de ontem, se ainda não chegou) e o peito, se marcado.
let bvSide = null, bvSrc = 'breast', bvTimeV = '', bvMlV = '';
$('paneHome').addEventListener('click', async e => {
  const c = e.target.closest('[data-bvsrc]');
  if (c) {
    bvSrc = c.dataset.bvsrc; bvTimeV = $('bvTime')?.value || ''; bvMlV = $('bvMl')?.value || '';
    bvSide = null; return renderBv();
  }
  const s = e.target.closest('[data-bvside]');
  if (s) {
    bvSide = bvSide === s.dataset.bvside ? null : s.dataset.bvside;
    for (const o of $('bvTop').querySelectorAll('[data-bvside]')) { const on = o.dataset.bvside === bvSide; o.classList.toggle('on', on); o.setAttribute('aria-pressed', on); }
    return;
  }
  const f = e.target.closest('[data-bvfeed]');
  if (f) {
    const v = $('bvTime').value, err = $('bvErr');
    if (!/^\d\d:\d\d$/.test(v)) { err.textContent = 'Informe o horário da última mamada.'; err.hidden = false; return $('bvTime').focus(); }
    const now = Date.now(), d0 = startOfDay(now);
    let t = atTime(d0, v); if (t > now) t = atTime(addDays(d0, -1), v);
    const fd = st.baby.feeding, src = fd === 'bottle' ? 'bottle' : fd === 'both' ? bvSrc : bvSide || fd ? 'breast' : null;
    const ml = src === 'bottle' ? +($('bvMl')?.value || '').replace(/\D/g, '') : null;
    if (src === 'bottle' && !(ml > 0)) { err.textContent = 'Informe quantos ml.'; err.hidden = false; return $('bvMl').focus(); }
    if (ml > 1000) { err.textContent = 'No máximo 1000 ml.'; err.hidden = false; return $('bvMl').focus(); }
    busy(f, true);
    const ok = await addEntry({ kind: 'feed', t, src, side: src === 'breast' ? bvSide : null, ml });
    busy(f, false);
    if (ok) { bvSkip('ola'); toast('Salvo às ' + hm(t)); }
    return;
  }
}, true);
$('paneHome').addEventListener('click', e => {
  const b = e.target.closest('[data-bv],[data-bvgo]'); if (!b) return;
  const k = b.dataset.bv || b.dataset.bvgo;
  // Primeiro "Agora não" (ou ×) do convite: só adia. Convidar, ou dispensar a volta, encerra o convite.
  if (k === 'convite' && !b.dataset.bvgo) lsSet(bvKey() + '-convite', String(Date.now()));
  else bvSkip(k === 'convite2' ? 'convite' : k);
  if (!b.dataset.bvgo || k === 'entrou') return render();
  if (k === 'convite' || k === 'convite2') return goTab('family', 'famMembers');
});

/* ---------- botões da tela inicial ---------- */
// Os botões ficam presos embaixo, em cima das abas, numa linha só (prévia aprovada em 06/11:
// https://claude.ai/artifact/K2FDN2JaaYbKBhc937hAHE): Mamada, Sono, Fralda, Ordenha (se a família ligou) e
// Outros. Outros abre, logo acima, uma linha com Remédio, Sintomas e Tarefas (os que a família ligou) e
// Anotação livre. Um toque anota; segurar abre os últimos 3 dias daquele registro. Desde 07/11 toda família
// tem os mesmos botões (saiu Família › Botões da tela inicial).
const BTN = {
  feed: ['Mamada', 'k-feed'], sleep: ['Sono', 'k-sleep'], diaper: ['Fralda', 'k-diaper'],
  med: ['Remédio', 'k-med'], symptom: ['Sintomas', 'k-symptom'], pump: ['Ordenha', 'k-pump'], care: ['Tarefas', 'k-care'],
};
const FIXED = ['feed', 'sleep', 'diaper'];
// Todos os registros ligados para todas as famílias (Patrick, 07/11). Fica a função para os resumos e
// gráficos, que perguntam por ela; o que as versões antigas guardaram em family_settings não vale mais.
const isOn = () => true;
// O último sintoma de hoje, para o leitor de tela: "febre há 2h". Vômito conta como sintoma.
function symptomSub(last, now) {
  const e = last(['symptom', 'vomit']);
  if (!e || e.t < startOfDay(now)) return 'nada hoje';
  return (e.kind === 'vomit' ? 'vômito' : e.symptom === 'outro' ? 'outro' : (SYMPTOM[e.symptom] || 'sintoma').toLowerCase()) + ' ' + ago(e.t);
}
// Desde o onboarding novo (itens 40 e 61, 13/11), a linha segue as respostas do bebê aberto: na mamadeira,
// sem Ordenha; com "Já come", o botão Comida. Nenhum registro some dos resumos.
const rowKeys = () => [...FIXED, ...(isOn('pump') && st.baby?.feeding !== 'bottle' ? ['pump'] : []),
  ...(st.baby?.eats_food ? ['food'] : []), 'more'];
const popKeys = () => [...['med', 'symptom', 'care'].filter(isOn), 'other'];
function renderGrid(last, open, now, joined) {
  // Há quanto tempo, só para o leitor de tela: na tela, a linha do tempo logo acima já mostra a hora.
  const sub = k => {
    const e = last([k === 'sleep' ? 'wake' : k]);
    if (k === 'sleep') return open !== null ? 'dormindo' : e ? 'acordou ' + ago(e.t) : 'sem registro';
    if (k === 'diaper') return e ? 'troca ' + ago(e.t) : 'sem registro';
    if (k === 'feed') { const t = ftGet(); if (t) return t.run ? 'mamando' : 'pausada'; }
    if (k === 'med') return medSub();
    if (k === 'symptom') return symptomSub(last, now);
    if (k === 'care') { const c = last(Object.keys(CARE)); return c ? (c.kind === 'care' ? 'outra tarefa' : c.kind === 'burp' ? (c.burp === 'put' ? 'pôs para arrotar' : 'arrotou') : CARE[c.kind].toLowerCase()) + ' ' + ago(c.t) : 'sem registro'; }
    return e ? ago(e.t) : 'sem registro';
  };
  const ks = rowKeys();
  $('grid').style.setProperty('--n', ks.length);
  $('grid').classList.toggle('n6', ks.length > 5);   // com Comida e Ordenha: seis botões, letra menor
  $('grid').innerHTML = ks.map((k, i) => {
    if (k === 'more') return `<button class="rb k-other" data-k="more" aria-haspopup="dialog" aria-expanded="false">${ICON.other}<b>Outros</b></button>`;
    if (k === 'food') return `<button class="rb k-food" data-k="food" aria-haspopup="dialog">${ICON.food}<b>Comida</b></button>`;
    const j = k === joined ? ` joined${i === 0 ? ' jl' : ''}` : '';
    return `<button class="rb ${BTN[k][1]}${j}" data-k="${k}" aria-label="Anotar ${esc(ADD[k])} (${esc(sub(k))}). Segure para ver os últimos 3 dias">${ICON[k]}<b>${BTN[k][0]}</b>${j ? '<span class="neck" aria-hidden="true"><i class="l"></i><i class="r"></i></span>' : ''}</button>`;
  }).join('');
}
// Outros: a linha com os outros registros, do mesmo tamanho, logo acima dos botões; um toque fora fecha.
function openPop() {
  const ks = popKeys(), bt = $('grid').querySelector('.rb').getBoundingClientRect();
  $('popIn').style.setProperty('--n', rowKeys().length);
  $('popIn').classList.toggle('n6', rowKeys().length > 5);
  $('popIn').innerHTML = ks.map(k => k === 'other'
    ? `<button class="rb k-other" data-k="other">${ICON.edit}<b>Livre</b></button>`
    : `<button class="rb ${BTN[k][1]}" data-k="${k}" aria-label="Anotar ${esc(ADD[k])}. Segure para ver os últimos 3 dias">${ICON[k]}<b>${BTN[k][0]}</b></button>`).join('');
  $('pop').style.bottom = (window.innerHeight - bt.top + 12) + 'px';
  $('pop').hidden = $('popScrim').hidden = false;
  document.body.classList.add('pop-open');
  document.querySelector('#grid [data-k="more"]')?.setAttribute('aria-expanded', 'true');
}
function closePop() {
  if ($('pop').hidden) return false;
  $('pop').hidden = $('popScrim').hidden = true;
  document.body.classList.remove('pop-open');
  document.querySelector('#grid [data-k="more"]')?.setAttribute('aria-expanded', 'false');
  return true;
}

/* ---------- faixa do sono e da mamada ---------- */
// Com o bebê dormindo ou a mamada no cronômetro, o botão dela cresce para cima numa faixa da mesma cor,
// com o tempo correndo (prévia de 06/11). A faixa vaza do botão em círculo ao começar e, ao acordar ou
// terminar, estreita e desce de volta para dentro dele. Com as duas ao mesmo tempo, fica a da mamada.
let stripK = null, stripBusy = false, stripReady = false;
function stripHtml(k, open, now) {
  if (k === 'sleep') return `<div class="ext k-sleep">${CAPI_Z}<span class="tx"><small>Dormindo há</small><span class="t" id="stripT">${dur(now - open)}</span></span><button class="spill" data-strip="wake">Acordou</button></div>`;
  const t = ftGet();
  return `<div class="ext k-feed" data-strip="open" role="button" tabindex="0" aria-label="Abrir o cronômetro da mamada"><span class="fi">${ICON.feed}</span><span class="tx"><small>${t.run ? 'Mamando há' : 'Mamada pausada'}</small><span class="t" id="stripT">${dur(ftTotal(t, now))}</span><small class="sd">${t.run ? 'no ' + FT_SIDE[t.run] : 'começou às ' + hhmm(t.start)}</small></span><button class="spill" data-strip="end">Terminar</button></div>`;
}
function renderDock(last, open, now) {
  const want = ftGet() ? 'feed' : open !== null ? 'sleep' : null;
  if (stripBusy) return;
  if (want !== stripK && stripK && stripReady && !reduceMotion() && !$('dock').hidden) { closeStrip(); return; }
  const opening = want && want !== stripK && stripReady && !reduceMotion() && !$('dock').hidden;
  stripK = want; stripReady = true;
  renderGrid(last, open, now, want);
  // A faixa do sono que já está na tela só troca o tempo: recriá-la reiniciava os zz no meio do ciclo.
  const keep = want === 'sleep' && $('strip').querySelector('.ext.k-sleep');
  if (keep) $('stripT').textContent = dur(now - open);
  else $('strip').innerHTML = want ? stripHtml(want, open, now) : '';
  $('din').classList.toggle('on', !!want);
  // Com a tela de registro aberta (ou fechando), a faixa espera escondida: a tela encolhe até ela.
  if (opening) { if (closing || (S && !$('sheet').hidden)) $('din').classList.add('pre'); else openStrip(); }
  dockSize();
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const fadeAll = (els, a, b, ms, step = 0) => Promise.all(els.map((el, i) => el.animate([{ opacity: a }, { opacity: b }], { duration: ms, delay: i * step, easing: 'ease-out', fill: 'both' }).finished));
// Ida: a cor sai do alto do botão em círculo, enchendo a emenda e a faixa juntas; os cantos de cima do
// botão ficam retos; por fim o conteúdo aparece.
async function openStrip() {
  const ext = $('strip').firstElementChild, btn = $('grid').querySelector('.joined'), neck = btn?.querySelector('.neck');
  if (!ext || !btn) return;
  stripBusy = true;
  const kids = [...ext.children]; kids.forEach(k => k.style.opacity = 0);
  const e = ext.getBoundingClientRect(), b = btn.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top;
  const R = Math.max(...[[e.left, e.top], [e.right, e.top], [e.left, e.bottom], [e.right, e.bottom]].map(([x, y]) => Math.hypot(x - cx, y - cy))) + 4;
  const circ = (el, r) => { const q = el.getBoundingClientRect(); return `circle(${r}px at ${cx - q.left}px ${cy - q.top}px)`; };
  const ms = 490, ease = 'cubic-bezier(.4,0,.2,1)';
  btn.animate([{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }, { borderTopLeftRadius: '0px', borderTopRightRadius: '0px' }], { duration: ms * 0.3, easing: 'ease-out' });
  try {
    await Promise.all([ext, neck].filter(Boolean).map(el => el.animate([{ clipPath: circ(el, 0) }, { clipPath: circ(el, R) }], { duration: ms, easing: ease }).finished));
    await Promise.all(kids.map((k, i) => k.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 200, delay: i * 35, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'backwards' }).finished));
  } catch {}
  kids.forEach(k => k.style.opacity = '');
  stripBusy = false; render();
}
// Volta: a forma inteira (faixa, emenda, as curvinhas dos lados e os cantos do botão) é redesenhada a cada
// quadro, para a faixa continuar ligada ao botão até entrar nele, sem bolha nem quina.
function rrPath(x, y, w, h, tl, tr, br, bl) {
  return `M${x + tl} ${y}H${x + w - tr}${tr ? `A${tr} ${tr} 0 0 1 ${x + w} ${y + tr}` : ''}V${y + h - br}${br ? `A${br} ${br} 0 0 1 ${x + w - br} ${y + h}` : ''}H${x + bl}${bl ? `A${bl} ${bl} 0 0 1 ${x} ${y + h - bl}` : ''}V${y + tl}${tl ? `A${tl} ${tl} 0 0 1 ${x + tl} ${y}` : ''}Z`;
}
async function closeStrip() {
  const ext = $('strip').firstElementChild, btn = $('grid').querySelector('.joined');
  if (!ext || !btn) { stripK = null; return render(); }
  stripBusy = true;
  await fadeAll([...ext.children], 1, 0, 90).catch(() => {});
  const din = $('din'), d = din.getBoundingClientRect(), e = ext.getBoundingClientRect(), b = btn.getBoundingClientRect();
  const X = v => v - d.left, Y = v => v - d.top, gap = b.top - e.bottom, midTop = e.top + e.height * 0.35;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'shape s-' + stripK); svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<path/>'; const path = svg.firstChild;
  din.insertBefore(svg, $('grid'));
  din.classList.add('pre');
  const lerp = (a, z, k) => a + (z - a) * k, ease = t => 1 - Math.pow(1 - t, 1.6);
  const draw = t => {
    const u = ease(t); let L, R, top, bot;
    if (u <= .55) { const a = u / .55; L = lerp(e.left, b.left, a); R = lerp(e.right, b.right, a); top = lerp(e.top, midTop, a); bot = e.bottom; }
    else { const c = (u - .55) / .45; L = b.left; R = b.right; top = lerp(midTop, b.top, c); bot = lerp(e.bottom, b.bottom, c); }
    const exL = Math.max(0, b.left - L), exR = Math.max(0, R - b.right), rt = Math.min(18, (R - L) / 2, (bot - top) / 2);
    let dd = rrPath(X(L), Y(top), R - L, bot - top, rt, rt, Math.min(18, exR), Math.min(18, exL));
    if (bot < b.top) {
      dd += rrPath(X(b.left), Y(bot) - .5, b.width, b.top - bot + 1, 0, 0, 0, 0);
      const fL = Math.min(gap, exL), fR = Math.min(gap, exR), y = Y(bot);
      if (fL > .5) { const x = X(b.left); dd += `M${x - fL} ${y}L${x} ${y}L${x} ${y + fL}A${fL} ${fL} 0 0 0 ${x - fL} ${y}Z`; }
      if (fR > .5) { const x = X(b.right); dd += `M${x + fR} ${y}L${x} ${y}L${x} ${y + fR}A${fR} ${fR} 0 0 1 ${x + fR} ${y}Z`; }
    }
    path.setAttribute('d', dd);
    // os cantos de cima do botão ficam retos enquanto há cor em cima dele e arredondam quando ela chega
    const r = Math.max(0, Math.min(16, 16 - (b.top - top))) + 'px';
    btn.style.borderTopLeftRadius = r; btn.style.borderTopRightRadius = r;
  };
  draw(0);
  // Se o app for para o fundo no meio (sem quadros), a volta termina mesmo assim.
  await new Promise(res => { const t0 = performance.now(), ms = 430; setTimeout(res, ms + 200);
    const step = now => { const t = Math.min(1, (now - t0) / ms); draw(t); t < 1 ? requestAnimationFrame(step) : res(); }; requestAnimationFrame(step); });
  svg.remove(); din.classList.remove('pre', 'on'); $('strip').innerHTML = '';
  stripK = null; stripBusy = false; render();
}
// A altura das abas e dos botões, para a tela rolar até o fim sem nada escondido atrás deles.
function dockSize() {
  const r = document.documentElement.style;
  r.setProperty('--tabh', $('tabbar').offsetHeight + 'px');
  r.setProperty('--dockh', ($('dock').hidden ? 0 : $('dock').offsetHeight) + 'px');
}
// O registro que acabou de ser anotado aqui: os de baixo descem e ele entra da esquerda.
let freshT = 0;
function enterFresh() {
  if (!st.freshId || freshT) return;
  freshT = setTimeout(() => {
    freshT = 0; const id = st.freshId; st.freshId = null;
    const r = $('timeline').querySelector(`[data-id="${CSS.escape(id)}"]`); if (!r || reduceMotion()) return;
    const h = r.offsetHeight, cs = getComputedStyle(r), pt = cs.paddingTop, pb = cs.paddingBottom;
    r.animate([
      { height: '0px', paddingTop: '0px', paddingBottom: '0px', transform: 'translateX(-105%)', opacity: 0, offset: 0 },
      { height: h + 'px', paddingTop: pt, paddingBottom: pb, transform: 'translateX(-105%)', opacity: 0, offset: .4 },
      { height: h + 'px', paddingTop: pt, paddingBottom: pb, transform: 'none', opacity: 1 }
    ], { duration: 520, easing: 'cubic-bezier(.3,.7,.2,1)' });
  }, 40);
}

// O nome de cada botão no "Anotar…" e no título dos últimos 3 dias.
const ADD = { feed: 'mamada', sleep: 'sono', diaper: 'fralda', med: 'remédio', symptom: 'sintoma', pump: 'ordenha', care: 'tarefa' };

/* ---------- gravar registros ---------- */
// As colunas do sintoma só vão no sintoma, e as do tamanho do cocô só quando há tamanho ou alerta:
// assim, se o 008 ou o 009 ainda não rodou, o resto continua salvando.
function fields(ev) {
  const f = { kind: ev.kind, at: new Date(ev.t).toISOString(), src: ev.src ?? null, ml: ev.ml ?? null,
           side: ev.side ?? null, left_min: ev.left_min ?? null, right_min: ev.right_min ?? null,
           pee: ev.pee ?? null, poo: ev.poo ?? null, note: ev.note ?? null,
           medicine_id: ev.medicine_id ?? null, med_name: ev.med_name ?? null, med_amount: ev.med_amount ?? null,
           dose_at: ev.dose_at ?? null, skipped: ev.skipped ?? null };
  if (ev.kind === 'symptom') Object.assign(f, { symptom: ev.symptom, temp_c: ev.temp_c ?? null, duration_min: ev.duration_min ?? null });
  if ('poo_size' in ev) Object.assign(f, { poo_size: ev.poo_size ?? null, poo_alert: ev.poo_alert ?? null });
  if (CARE[ev.kind]) f.duration_min = ev.duration_min ?? null;
  if ('lap_min' in ev) f.lap_min = ev.lap_min ?? null;
  if (ev.kind === 'burp') f.burp = ev.burp;
  if (ev.kind === 'ointment') { f.ointments = ev.ointments; f.diaper_id = ev.diaper_id ?? null; }
  // Quem fez e o "pegou no sono sozinha" também só vão quando há o que mandar (ou apagar): sem o 022.
  if ('done_by' in ev) f.done_by = ev.done_by ?? null;
  if ('self_settled' in ev) f.self_settled = ev.self_settled ?? null;
  return f;
}
async function addEntry(ev) {
  const { data, error } = await sb.from('entries')
    .insert({ family_id: st.family.id, baby_id: st.baby.id, ...fields(ev) }).select().single();
  // 23505: a dose já foi marcada (duas pessoas marcaram juntas). Recarrega para mostrar quem marcou.
  if (error?.code === '23505') { toast('Alguém já marcou esta dose.'); await loadEntries(); refresh(); return null; }
  if (error) { toast('Não foi possível salvar. Confira a conexão.'); return null; }
  st.entries.set(data.id, withT(data)); st.freshId = data.id; render();
  // A janela de permissão do lembrete e o pedido de avaliação nunca no mesmo registro.
  remAfterEntry(data).then(asked => { if (!asked) askReview(data); });
  return data;
}
// Pedido de avaliação na loja, só no app. A janela é a do próprio celular (a Apple não aceita outra): o
// iPhone mostra no máximo 3 vezes por ano, e o app não fica sabendo se ela apareceu nem se a pessoa
// avaliou. Por isso só pedimos em boa hora: logo depois de um registro de rotina, entre 8h e 17h, para
// quem anotou pelo menos 7 dias atrás e em 5 dias diferentes, e no máximo uma vez a cada 60 dias.
// Nunca depois de febre, sintomas ou remédio.
const ROUTINE = ['feed', 'pump', 'sleep', 'wake', 'diaper'];
const appReview = NATIVE ? window.Capacitor.registerPlugin('AppReview') : null;
// No Android (item 23, prévia aprovada em 07/11), no lugar da janela do Google, o nosso pedido no meio da
// tela, com o link para a Play Store: o Google não aceita pergunta nossa antes da janela dele, e a janela
// pode não aparecer (cota). "Avaliar" não pede mais; "Agora não" volta em 60 dias, pela mesma regra.
const STORE_URL = ANDROID ? 'https://play.google.com/store/apps/details?id=br.app.soneca' : 'https://apps.apple.com/app/id6821448149?action=write-review';
const STORE_NAME = ANDROID ? 'Play Store' : 'App Store';
const RATE_TEXT = 'O Soneca é feito pelos pais da Marina, e sua avaliação seria muito importante para nós!';
function askReview(e) {
  if (!appReview || !ROUTINE.includes(e.kind) || lsGet('cad-review-feito')) return;
  const h = new Date().getHours(); if (h < 8 || h >= 17) return;
  if (Date.now() - (+lsGet('cad-review') || 0) < 60 * DAY) return;
  const days = new Set([...st.entries.values()].filter(x => x.author_id === st.user.id && ROUTINE.includes(x.kind)).map(x => startOfDay(x.t)));
  if (days.size < 5 || Math.min(...days) > startOfDay(Date.now()) - 7 * DAY) return;
  lsSet('cad-review', String(Date.now()));
  setTimeout(() => ANDROID ? ratePopup() : appReview.requestReview().catch(() => {}), 1500);   // depois de o painel fechar
}
function ratePopup() {
  if (!$('ask').hidden) return;
  $('ask').innerHTML = `<div class="cbox rate" role="dialog" aria-modal="true" aria-describedby="rateP"><p id="rateP">${esc(RATE_TEXT)}</p>`
    + `<a class="save" data-rate="go" href="${STORE_URL}">Avaliar na ${STORE_NAME}</a><button class="link" data-rate="no">Agora não</button></div>`;
  $('ask').hidden = false; $('ask').querySelector('[data-rate="go"]').focus();
}
// O link segue para a loja (o app abre fora dele); o popup fecha nos dois casos.
// Comida, primeira etapa (item 61): só o aviso, com a capivara de capacete. Nada é gravado.
function foodSoon() {
  if (!$('ask').hidden) return;
  $('ask').innerHTML = `<div class="cbox soon" role="dialog" aria-modal="true" aria-labelledby="soonH">${CAPI_HAT}<h3 id="soonH">Em construção</h3>`
    + '<p>O registro de comida chega numa próxima versão.</p><button class="save" data-soon="1">Entendi</button></div>';
  $('ask').hidden = false; $('ask').querySelector('[data-soon]').focus();
}
$('ask').addEventListener('click', e => {
  if (e.target.closest('[data-soon]') || (e.target === $('ask') && $('ask').querySelector('.soon'))) return closeAsk();
  const b = e.target.closest('[data-rate]'); if (!b) return;
  if (b.dataset.rate === 'go') lsSet('cad-review-feito', '1');
  closeAsk();
});

/* ---------- Lembrete para anotar (item 30, prévia aprovada em 07/11) ---------- */
// Vale só neste celular e vem ligado: só a chave do Perfil desliga. A cada registro feito aqui, o app remarca
// três avisos, de 3 em 3 horas sem registro; os que cairiam entre 18h e 7h não tocam (nem passam para a
// manhã). Os três passarem sem nenhum registro neste celular desliga a chave. Quem começa a anotar neste
// celular depois desta versão recebe também um aviso às 17h nos dias 1, 3 e 7; no dia de um deles, o de
// 3 horas não toca. A permissão do celular é pedida uma vez, logo depois de um registro.
const REM = 'cad-lembrete', REM_EVERY = 3 * HOUR, REM_N = 3, REM_IDS = [9101, 9102, 9103], ONB_IDS = [9111, 9113, 9117];
const remOn = () => lsGet(REM) !== '0';
const remCancel = async () => medNotif?.cancel({ notifications: [...REM_IDS, ...ONB_IDS].map(id => ({ id })) });
const quietHour = t => { const h = new Date(t).getHours(); return h >= 18 || h < 7; };
const remSlots = () => { try { return JSON.parse(lsGet('cad-lembrete-at') || '[]'); } catch { return []; } };
// "Como vai a Helena?", "O primeiro dia do Pedro": o nome com o artigo, quando o sexo está anotado.
const aNome = b => artigo(b, 'a ', 'o ', '') + b.name, daNome = b => artigo(b, 'da ', 'do ', 'de ') + b.name;
// Os avisos da primeira semana: dia 1 (o do primeiro registro, se foi antes das 17h), dia 3 e dia 7.
function onbList(b) {
  const f = +lsGet('cad-lembrete-1o'); if (!f) return [];
  return [[0, 'O primeiro dia ' + daNome(b) + ' no Soneca', 'Veja no Diário tudo o que foi anotado.', 'day'],
          [2, 'A semana ' + daNome(b) + ' já aparece', 'Na aba Semana, os dias lado a lado: sono, mamadas e fraldas.', 'week'],
          [6, 'O resumo da semana ' + daNome(b), 'Sono, mamadas e fraldas dos últimos 7 dias, para ver e mandar para a família.', 'week']]
    .map(([n, title, body, go], i) => ({ id: ONB_IDS[i], t: atTime(addDays(startOfDay(f), n), '17:00'), title, body, go }))
    .filter(x => x.t > f);
}
// A permissão de avisos do celular: pede só se ainda não tem. Devolve se ficou liberada e se a janela apareceu.
const NOTIF_DENIED = 'Permita as notificações do Soneca nas configurações do celular.';
const notifGranted = async () => (await medNotif.checkPermissions().catch(() => ({}))).display === 'granted';
async function notifPerm() {
  if (await notifGranted()) return { ok: true, asked: false };
  const p = await medNotif.requestPermissions().catch(() => ({}));
  return { ok: p.display === 'granted', asked: true };
}
// Três avisos passaram sem registro: desliga a chave, e o Perfil explica por quê.
function remCheck() {
  const s = remSlots();
  if (remOn() && s.length === REM_N && s[REM_N - 1] < Date.now()) { lsSet(REM, '0'); lsSet('cad-lembrete-auto', '1'); lsSet('cad-lembrete-at', null); }
}
async function remSync(base) {
  if (!medNotif) return;
  try {
    await remCancel();
    lsSet('cad-lembrete-at', null);
    const b = st.baby;
    if (!b || !remOn() || !(await notifGranted())) return;
    if (ANDROID) await medNotif.createChannel({ id: 'lembrete', name: 'Lembrete para anotar', importance: 3, visibility: 1 });
    const now = Date.now(), onb = onbList(b), onbDays = new Set(onb.map(x => startOfDay(x.t)));
    const slots = [];
    for (let k = 1; slots.length < REM_N && k <= 16; k++) {
      const t = base + k * REM_EVERY;
      if (t > now + 5000 && !quietHour(t) && !onbDays.has(startOfDay(t))) slots.push(t);
    }
    const n = (id, t, title, body, go) => ({ id, title, body, schedule: { at: new Date(t), allowWhileIdle: true },
      channelId: 'lembrete', smallIcon: 'ic_stat_mamada', extra: { baby: b.id, go } });
    const list = [...slots.map((t, i) => n(REM_IDS[i], t, 'Como vai ' + aNome(b) + '?', 'Se teve mamada, sono ou fralda, dá para anotar com o horário certo.', 'day')),
                  ...onb.filter(x => x.t > now + 5000).map(x => n(x.id, x.t, x.title, x.body, x.go))];
    if (list.length) await medNotif.schedule({ notifications: list });
    lsSet('cad-lembrete-at', JSON.stringify(slots));
  } catch {}
}
// Depois de um registro feito neste celular. Devolve true quando mostrou a janela de permissão.
async function remAfterEntry(e) {
  if (!medNotif) return false;
  remCheck();
  if (lsGet('cad-lembrete-1o') == null) {
    // Quem já tinha anotado antes desta versão não recebe os avisos da primeira semana.
    const before = [...st.entries.values()].some(x => x.id !== e.id && x.author_id === st.user.id);
    lsSet('cad-lembrete-1o', before ? '0' : String(Date.now()));
  }
  let asked = false;
  if (remOn() && lsGet('cad-lembrete-pedido') == null) {
    lsSet('cad-lembrete-pedido', '1');
    const p = await notifPerm(); asked = p.asked;
    if (!p.ok) lsSet(REM, '0');
  }
  await remSync(Date.now());
  return asked;
}
// A chave do Perfil. Ligar pede a permissão se ainda não tem; negada, a chave fica desligada.
async function setReminder(on) {
  if (on) {
    if (!(await notifPerm()).ok) { toast(NOTIF_DENIED); return drawProfilePane(); }
  }
  lsSet(REM, on ? '1' : '0'); lsSet('cad-lembrete-auto', null);
  drawProfilePane();
  await remSync(Date.now());
}
// Tocar num aviso do lembrete abre a tela Hoje ou a Semana (o "ouvido" fica junto do aviso do remédio).
let remTap = null;
async function openRemTap() {
  const x = remTap; if (!x || !st.family || $('scrMain').hidden) return;
  remTap = null;
  if (st.baby?.id !== x.baby && st.babies.some(b => b.id === x.baby)) await selectBaby(x.baby);
  st.view = x.go === 'week' ? 'week' : 'day'; st.weekEnd = st.viewDay = startOfDay(Date.now());
  goTab('home');
}
async function updateEntry(id, ev) {
  const { data, error } = await sb.from('entries').update(fields(ev)).eq('id', id).select().single();
  if (error) { toast('Não foi possível salvar. Confira a conexão.'); return false; }
  st.entries.set(data.id, withT(data)); render(); return true;
}
async function deleteEntry(id) {
  const { error } = await sb.from('entries').delete().eq('id', id);
  if (error) { toast('Não foi possível apagar. Confira a conexão.'); return false; }
  st.entries.delete(id);
  // A pomada da troca de fralda vai junto (no banco, apagada em cascata).
  for (const e of [...st.entries.values()]) if (e.diaper_id === id) st.entries.delete(e.id);
  render(); return true;
}

/* ---------- painel de registro ---------- */
let S = null;   // estado do painel aberto (null = fechado)
const TITLE = { feed:'Mamada', pump:'Ordenha', sleep:'Sono', wake:'Sono', diaper:'Fralda', vomit:'Vômito', other:'Outros', med:'Remédio',
                symptom:'Sintomas', care:'Tarefa avulsa' };
// As opções do botão Sintomas, na ordem da tela. Vômito grava o registro de vômito de sempre.
const SYMPTOM_OPTS = [['febre', 'Febre'], ['colica', 'Cólica'], ['choro', 'Choro inconsolável'], ['vomito', 'Vômito'],
                      ['diarreia', 'Diarreia'], ['muco', 'Muco nas fezes'], ['tosse', 'Tosse'], ['assadura', 'Assadura'],
                      ['urticaria', 'Urticária'], ['vacina', 'Reação à vacina'], ['dentes', 'Incômodo dos dentes'], ['outro', 'Outro']];
const withDuration = sym => sym === 'colica' || sym === 'choro';
// Atalhos de minutos no tummy time e no banho de sol.
const CARE_CHIPS = [3, 5, 10, 15];
// Atalhos do tempo no colo, no Dormiu e no Acordou.
const LAP_CHIPS = [10, 20, 30, 60];
// Atalhos embaixo do relógio: agora ou tantos minutos antes do horário que está nele.
const QUICK_TIME = '<div class="time quick"><button class="small" data-act="now">Agora</button>'
  + [5, 10, 30].map(m => `<button class="small" data-act="back" data-val="${m}">−${m} min</button>`).join('') + '</div>';
function openPanel(html) {
  const from = sheetFrom, was = !$('sheet').hidden; sheetFrom = null;
  $('scrim').hidden = false; $('sheet').hidden = false; $('sheetIn').innerHTML = html;
  // A tela de uma tarefa ocupa a tela inteira (prévia de 08/11).
  $('sheet').classList.toggle('full', S?.mode === 'task');
  if (was) return;
  sheetK = from ? from.home : null; stripAtOpen = stripK;
  if (from && !reduceMotion()) growSheet(from);
}
function closeSheet() {
  const sh = $('sheet'), k = sheetK, anim = !sh.hidden && k && !reduceMotion() && !$('dock').hidden;
  const r = anim ? sh.getBoundingClientRect() : null, surf = anim ? getComputedStyle(sh).backgroundColor : '';
  sheetK = null; closing = !!anim;
  S = null; $('scrim').hidden = true; sh.hidden = true; sh.classList.remove('full'); render(); closing = false;
  // A faixa do sono ou da mamada que começou com a tela aberta esperou escondida: a tela encolhe até
  // ela (quando é o mesmo registro) ou ela sai do botão como antes.
  if ($('din').classList.contains('pre') && !stripBusy && stripK && stripK !== stripAtOpen) {
    if (anim && k === stripK) return shrinkToStrip(r, surf);
    $('din').classList.remove('pre'); openStrip();
  }
  if (anim) shrinkToBtn(r, surf, k);
}

/* ---------- o botão vira a tela (prévia aprovada em 07/11) ---------- */
// Tocar num botão de registro: a cor do botão cresce até a tela de salvar (menos de 0,2 s) e clareia até o
// fundo dela; fechar faz o caminho de volta. Os botões de Outros voltam para o Outros.
let sheetFrom = null, sheetK = null, stripAtOpen = null, closing = false;
const M_EASE = 'cubic-bezier(.3,.7,.2,1)';
const boxOf = r => ({ left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
// O que a tela precisa do botão: onde ele está, a cor, o ícone e o nome, e para qual botão ela volta.
function fromBtn(b, home) {
  const cs = getComputedStyle(b), svg = b.querySelector('svg');
  return { rect: b.getBoundingClientRect(), bg: cs.backgroundColor, ic: svg ? getComputedStyle(svg).color : '', html: (svg?.outerHTML || '') + (b.querySelector('b')?.outerHTML || ''), home };
}
function morphEl(html, ic) {
  const m = document.createElement('div'); m.className = 'morph';
  if (html) { m.innerHTML = `<span class="mi">${html}</span>`; const s = m.querySelector('svg'); if (s) s.style.color = ic; }
  document.body.appendChild(m); return m;
}
function scrimFx(a, z, ms) {
  const f = document.createElement('div'); f.className = 'scrimfx'; document.body.appendChild(f);
  f.animate([{ opacity: a }, { opacity: z }], { duration: ms, easing: a ? 'ease-in' : 'ease-out', fill: 'forwards' }).finished.catch(() => {}).then(() => f.remove());
}
async function growSheet(from) {
  const sh = $('sheet'), r = sh.getBoundingClientRect(), surf = getComputedStyle(sh).backgroundColor, ms = 180;
  sh.style.visibility = 'hidden'; $('scrim').style.opacity = 0;
  const m = morphEl(from.html, from.ic);
  $('scrim').animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: 'ease-out' });
  m.querySelector('.mi')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, fill: 'forwards' });
  try {
    await m.animate([
      { ...boxOf(from.rect), borderRadius: '16px', backgroundColor: from.bg },
      { offset: .55, backgroundColor: from.bg },
      { ...boxOf(r), borderRadius: '24px 24px 0 0', backgroundColor: surf }
    ], { duration: ms, easing: M_EASE, fill: 'forwards' }).finished;
  } catch {}
  m.remove(); sh.style.visibility = ''; $('scrim').style.opacity = '';
  for (const c of $('sheetIn').children) c.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 90, easing: M_EASE });
}
async function shrinkToBtn(r, surf, k) {
  const b = document.querySelector(`#grid [data-k="${k}"]`); if (!b) return;
  const to = fromBtn(b), ms = 150, m = morphEl(to.html, to.ic);
  scrimFx(1, 0, ms);
  m.querySelector('.mi')?.animate([{ opacity: 0 }, { offset: .7, opacity: 0 }, { opacity: 1 }], { duration: ms, fill: 'forwards' });
  try {
    await m.animate([
      { ...boxOf(r), borderRadius: '24px 24px 0 0', backgroundColor: surf },
      { offset: .45, backgroundColor: to.bg },
      { ...boxOf(to.rect), borderRadius: '16px', backgroundColor: to.bg }
    ], { duration: ms, easing: M_EASE, fill: 'forwards' }).finished;
  } catch {}
  m.remove();
}
// Dormiu agora ou um peito tocado: a tela encolhe direto até a faixa que conta o tempo. Dois pedaços saem
// juntos, um vira a faixa e o outro a ligação até o botão; como um sempre cobre a borda do outro, a forma
// fica presa ao botão em todos os quadros. Depois aparece o conteúdo da faixa.
async function shrinkToStrip(r, surf) {
  const din = $('din'), ext = $('strip').firstElementChild, btn = $('grid').querySelector('.joined');
  if (!ext || !btn) { din.classList.remove('pre'); return; }
  stripBusy = true;
  const e = ext.getBoundingClientRect(), b = btn.getBoundingClientRect(), bg = getComputedStyle(ext).backgroundColor, ms = 180;
  const first = btn.classList.contains('jl'), kids = [...ext.children];
  const neck = { left: b.left, top: e.bottom - 18, width: b.width, height: b.top + 2 - (e.bottom - 18) };
  kids.forEach(c => c.style.opacity = 0);
  const mA = morphEl(), mB = morphEl();
  scrimFx(1, 0, ms);
  const kf = (to, rad) => [{ ...boxOf(r), borderRadius: '24px 24px 0 0', backgroundColor: surf }, { offset: .5, backgroundColor: bg }, { ...boxOf(to), borderRadius: rad, backgroundColor: bg }];
  try {
    await Promise.all([
      mA.animate(kf(e, first ? '18px 18px 18px 0' : '18px'), { duration: ms, easing: M_EASE, fill: 'forwards' }).finished,
      mB.animate(kf(neck, '0'), { duration: ms, easing: M_EASE, fill: 'forwards' }).finished
    ]);
  } catch {}
  din.classList.remove('pre'); mA.remove(); mB.remove();
  try { await Promise.all(kids.map(c => c.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 90, easing: M_EASE }).finished)); } catch {}
  kids.forEach(c => c.style.opacity = '');
  stripBusy = false; render();
}
// O botão de salvar confirma (07/11): o texto gira e some, e no lugar gira a lua (Sono) ou o check (Fralda e
// Ordenha), que cresce um pouco e fica à vista um instante. Uns 0,8 s; o registro salva ao mesmo tempo.
function confirmSave(btn, icon) {
  const sgi = btn.querySelector('.sgi'); if (!sgi || reduceMotion()) return null;
  btn.insertAdjacentHTML('beforeend', `<span class="sgok" aria-hidden="true">${icon}</span>`);
  const ok = btn.lastElementChild; ok.style.opacity = 0;
  const as = [];
  const done = (async () => {
    as.push(sgi.animate([{ transform: 'none', opacity: 1 }, { transform: 'rotate(120deg) scale(.5)', opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' }));
    await as[0].finished; ok.style.opacity = '';
    as.push(ok.animate([{ transform: 'rotate(-120deg) scale(.4)', opacity: 0 }, { offset: .65, transform: 'rotate(0deg) scale(1.3)', opacity: 1 }, { transform: 'rotate(0deg) scale(1.15)', opacity: 1 }], { duration: 380, easing: M_EASE, fill: 'forwards' }));
    await as[1].finished; await new Promise(res => setTimeout(res, 250));
  })().catch(() => {});
  return { done, cancel: () => { as.forEach(a => a.cancel()); ok.remove(); } };
}
// Caixa de confirmação para apagar (e sair, remover): o primeiro toque abre a caixa, só o botão de
// dentro age. Cancelar, Esc ou um toque fora fecham sem fazer nada.
let askYes = null;
function askConfirm(title, text, yes, onYes) {
  askYes = onYes;
  $('ask').innerHTML = `<div class="cbox" role="alertdialog" aria-modal="true" aria-labelledby="askT" aria-describedby="askP"><h3 id="askT">${esc(title)}</h3><p id="askP">${esc(text)}</p>
    <div class="row2"><button class="ghost" data-ask="no">Cancelar</button><button class="go-del" data-ask="yes">${esc(yes)}</button></div></div>`;
  $('ask').hidden = false; $('ask').querySelector('[data-ask="no"]').focus();
}
function closeAsk() { $('ask').hidden = true; $('ask').innerHTML = ''; askYes = null; }
$('ask').addEventListener('click', async e => {
  const b = e.target.closest('[data-ask]');
  if (!b) { if (e.target === $('ask')) closeAsk(); return; }
  if (b.dataset.ask === 'no' || !askYes) return closeAsk();
  const f = askYes; busy(b, true); await f(b); closeAsk();
});
// "Dormiu, hoje às 13h05": o registro na caixa de apagar.
const askWhen = t => { const d = new Date(t), d0 = startOfDay(Date.now()), day = startOfDay(t);
  return (day === d0 ? 'hoje' : day === addDays(d0, -1) ? 'ontem' : pad(d.getDate()) + '/' + pad(d.getMonth() + 1)) + ' às ' + pad(d.getHours()) + 'h' + pad(d.getMinutes()); };
const ymdDdmm = ymd => ymd.slice(8, 10) + '/' + ymd.slice(5, 7);   // "2026-10-01" vira "01/10"
const head = t => `<div class="grab"></div><div class="shead"><h3>${esc(t)}</h3><button class="x" data-act="close" aria-label="Fechar">×</button></div>`;
const opt = (txt, on, act, val, big) => `<button class="opt${big ? ' big' : ''}${on ? ' on' : ''}" data-act="${act}" data-val="${val}">${txt}</button>`;
const mlBlock = k => `<div><div class="lbl">Quantidade</div><div class="seg k-${k}" style="background:none;margin-bottom:10px">${[30,60,90,120,150,180].map(v => opt(v + ' ml', +S.ml === v, 'ml', v)).join('')}</div>
  <div class="ml"><button data-act="mlstep" data-val="-10" aria-label="Menos 10 ml">−</button><input id="mlIn" inputmode="numeric" value="${esc(S.ml)}" placeholder="0" aria-label="Mililitros"><em>ml</em><button data-act="mlstep" data-val="10" aria-label="Mais 10 ml">+</button></div></div>`;
// Quem fez (02/11): opcional, nada marcado de saída; um toque escolhe, outro desmarca. Só com duas
// pessoas ou mais na família. Não têm: peito e ordenha (só quem amamenta faz), o Acordou e o sono que
// pegou sozinho (ninguém fez dormir), sintomas, vômito e Outro. A dose pulada também não.
const canBy = () => st.members.length > 1 && (S.k === 'feed' ? S.src === 'bottle'
  : S.k === 'sleep' ? S.sk === 'sleep' && !S.alone : S.k === 'med' ? !S.edit?.skipped : S.k === 'diaper' || S.k === 'care');
// Você primeiro, depois os outros pelo primeiro nome, dividindo a linha por igual (4 pessoas: 2 por linha).
function byHtml(k, lbl) {
  const ms = [...st.members].sort((a, b) => (b.user_id === st.user.id) - (a.user_id === st.user.id));
  const n = ms.length === 4 ? 2 : Math.min(ms.length, 3);
  return `<div><div class="lbl">${lbl} <small>(opcional)</small></div><div class="whos k-${k}" style="--n:${n};background:none">${ms.map(m =>
    opt(m.user_id === st.user.id ? 'Você' : esc(firstName(m.user_id)), S.by === m.user_id, 'by', esc(m.user_id))).join('')}</div></div>`;
}
// O "Dormiu" que um "Acordou" às t fecha: o primeiro depois do último "Acordou", como em sleepIntervals.
function sleepOf(t) {
  let s = null;
  for (const e of sortedEntries()) {
    if (e.t >= t) break;
    if (e.kind === 'sleep' && (!s || e.t - s.t > LONG_SLEEP)) s = e;
    if (e.kind === 'wake') s = null;
  }
  return s;
}
// O tempo no colo some no sono que pegou sozinho: no "Dormiu" marcado e no "Acordou" que fecha esse sono.
const lapShown = () => S.sk === 'sleep' ? !S.alone : !sleepOf(computeT())?.self_settled;
// Peito na mamada: um toque marca o peito; mexer nos minutos também marca, desmarcar apaga os minutos.
const CHECK =`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`;
const sideRow = (key, name) => `<div class="side${S[key] ? ' on' : ''}" id="row-${key}">
  <button class="pick" data-act="pick" data-val="${key}" aria-pressed="${S[key]}"><span class="ck">${CHECK}</span><b>${name}</b></button>
  <div class="step"><button data-act="minstep" data-val="${key}:-1" aria-label="Menos 1 minuto no peito ${name.toLowerCase()}">−</button>
  <input id="min-${key}" inputmode="numeric" value="${esc(S[key + 'min'])}" placeholder="–" aria-label="Minutos no peito ${name.toLowerCase()} (opcional)"><em>min</em>
  <button data-act="minstep" data-val="${key}:1" aria-label="Mais 1 minuto no peito ${name.toLowerCase()}">+</button></div></div>`;
const totalText = () => { const t = (+S.lmin || 0) + (+S.rmin || 0); return t ? 'Total: ' + dur(t * MIN) : ''; };
function markSide(key) { const r = $('row-' + key); if (!r) return; r.classList.toggle('on', S[key]); r.querySelector('.pick').setAttribute('aria-pressed', S[key]); }

// Cronômetro da mamada (Ca, 17/10; prévia aprovada em 28/10): cada peito começa ou pausa o seu tempo, e
// só um conta por vez. Fica só no celular de quem começou, sem banco: a hora do primeiro toque, o tempo já
// contado de cada peito e, se um está contando, desde quando. Depois de 2 horas contando, pausa sozinho.
const FT_MAX = 2 * HOUR;
const ftKey = () => st.baby ? 'cad-feedtimer-' + st.baby.id : null;
const ftMs = (t, key, now) => t[key] + (t.run === key ? now - t.since : 0);
const ftTotal = (t, now) => ftMs(t, 'l', now) + ftMs(t, 'r', now);
// Tela de bloqueio (item 13): a notificação fixa do Android e a Atividade ao Vivo do iPhone recebem o
// estado a cada mudança; no Android, "ask" pede a permissão de notificações na mamada que acabou de começar.
const mamadaPlugin = NATIVE ? window.Capacitor.registerPlugin('Mamada') : null;
function ftSet(t, ask) {
  const k = ftKey(); if (!k) return;
  if (t) { t.at = Date.now(); t.baby = st.baby.id; }
  lsSet(k, t ? JSON.stringify(t) : null);
  mamadaPlugin?.update({ state: t ? JSON.stringify(t) : null, ask: !!ask }).catch(() => {});
}
// Ao abrir ou voltar ao app: adota o que a notificação mudou ("Pausar", "Trocar de peito", "Continuar") e grava a
// mamada se alguém tocou em "Terminar" nela.
async function ftSync() {
  if (!mamadaPlugin || !st.baby) return;
  const r = await mamadaPlugin.get().catch(() => null); if (!r) return;
  let n = null; try { n = r.state ? JSON.parse(r.state) : null; } catch {}
  if (n && n.baby === st.baby.id) { const t = ftGet(); if (!t || (n.at || 0) > (t.at || 0)) lsSet(ftKey(), JSON.stringify(n)); }
  if (r.finish) return ftFinish();
  if (S?.mode === 'entry' && S.k === 'feed') drawEntry(); else if (!S) render();
}
mamadaPlugin?.addListener('changed', ftSync);
function ftGet() {
  const k = ftKey(); if (!k) return null;
  let t; try { t = JSON.parse(lsGet(k)); } catch { return null; }
  if (!t || typeof t.start !== 'number') return null;
  const now = Date.now();
  if (t.run && ftTotal(t, now) > FT_MAX) { t[t.run] += FT_MAX - t.l - t.r; t.run = null; ftSet(t); }
  return t;
}
// Um toque no peito parado começa a contar (e pausa o outro); no peito que conta, pausa.
function ftTap(key) {
  const now = Date.now(), old = ftGet(), t = old || { start: now, l: 0, r: 0, run: null, since: 0 };
  if (t.run) t[t.run] += now - t.since;
  t.run = t.run === key ? null : key; t.since = now;
  if (t.run) t.last = t.run;   // "Continuar" na tela de bloqueio volta para este peito
  ftSet(t, !old);
}
function ftPause() { const t = ftGet(); if (t?.run) { t[t.run] += Date.now() - t.since; t.run = null; ftSet(t); } return t; }
// Minutos de cada peito: o mais próximo; menos de 30 segundos não conta.
const ftMin = ms => ms < 30000 ? 0 : Math.max(1, Math.round(ms / MIN));
const hhmm = t => { const d = new Date(t); return pad(d.getHours()) + 'h' + pad(d.getMinutes()); };
const mss = ms => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + pad(s % 60); };
const FT_SIDE = { l: 'esquerdo', r: 'direito' };
function ftSidesHtml(t, now) {
  const one = (key, name) => {
    const run = t?.run === key, ms = t ? ftMs(t, key, now) : 0;
    return `<button class="tside${run ? ' run' : ''}" data-act="ftTap" data-val="${key}" aria-pressed="${run}"><b>${name}</b><span class="tm" id="ft-${key}">${mss(ms)}</span><small>${run ? 'tocar para pausar' : ms ? 'pausado' : 'tocar para começar'}</small></button>`;
  };
  return one('l', 'Esquerdo') + one('r', 'Direito');
}
const ftTotalText = (t, now) => 'Total: ' + dur(ftTotal(t, now)) + ' · começou às ' + hhmm(t.start);
async function ftFinish() {
  const t = ftPause(); if (!t) return;
  const lm = ftMin(t.l), rm = ftMin(t.r);
  if (S?.mode === 'entry') closeSheet();
  if (!lm && !rm) return ftDiscard(t);
  const ev = { kind: 'feed', t: t.start, src: 'breast', side: lm && rm ? 'both' : lm ? 'left' : 'right' };
  if (lm) ev.left_min = lm;
  if (rm) ev.right_min = rm;
  ftSet(null); render();
  const row = await addEntry(ev);
  if (!row) { ftSet(t); return render(); }
  toast(savedText(ev, true), () => deleteEntry(row.id));
}
function ftDiscard(t = ftGet()) {
  if (!t) return;
  ftSet(null);
  if (S?.mode === 'entry') closeSheet(); else render();
  toast('Mamada descartada', () => { ftSet(t); render(); });
}
// A cada segundo: os relógios da folha e da faixa; se o cronômetro pausou sozinho, redesenha.
let ftRun;
setInterval(() => {
  const t = ftGet(), now = Date.now(), run = t ? t.run : undefined;
  if (run !== ftRun) { ftRun = run; if (S?.mode === 'entry' && S.k === 'feed') drawEntry(); if (!S) render(); return; }
  if (!t) return;
  for (const key of ['l', 'r']) { const el = $('ft-' + key); if (el) el.textContent = mss(ftMs(t, key, now)); }
  const tot = $('ftTotal'); if (tot) tot.textContent = ftTotalText(t, now);
  if (stripK === 'feed' && !stripBusy && $('stripT')) $('stripT').textContent = dur(ftTotal(t, now));
}, 1000);

function openEntry(k, edit, avulsa) {
  if (!st.baby) return babySheet(null);
  if (k === 'med' && !edit) return medsSheet();
  // Tarefas (08/11): o botão abre a lista da rotina; a tarefa avulsa é o formulário de antes.
  if (k === 'care' && !edit && !avulsa) return tasksSheet();
  // A pomada marcada na Fralda abre a própria troca.
  if (edit?.kind === 'ointment' && edit.diaper_id && st.entries.get(edit.diaper_id)) { edit = st.entries.get(edit.diaper_id); k = 'diaper'; }
  // Um "Dormiu" esquecido (mais de 14 h) não conta: o Sono abre em "Dormiu agora", como na tela inicial.
  const open = liveOpen(sleepIntervals(sortedEntries()).open, Date.now());
  const t = edit ? edit.t : Date.now(), side = edit?.side;
  S = { mode: 'entry', k: k === 'wake' ? 'sleep' : CARE[k] ? 'care' : k, edit, ck: CARE[k] && k !== 'care' || edit?.kind === 'care' ? k : null, base: startOfDay(t), time: hm(t),
        src: edit ? (edit.src || '') : st.baby.feeding === 'bottle' ? 'bottle' : 'breast', ml: edit ? (edit.ml || '') : k === 'pump' ? '' : 90,
        l: side === 'left' || side === 'both', r: side === 'right' || side === 'both',
        lmin: edit?.left_min || '', rmin: edit?.right_min || '',
        pee: edit ? !!edit.pee : false, poo: edit ? !!edit.poo : false, bput: edit?.burp === 'put' || edit?.burp === 'both', bdone: edit?.burp === 'done' || edit?.burp === 'both', psize: edit?.poo_size || null, palert: !!edit?.poo_alert,
        sk: edit ? edit.kind : (open !== null ? 'wake' : 'sleep'), note: edit?.note || '', err: '',
        sym: edit?.symptom || null, temp: edit?.temp_c != null ? String(edit.temp_c).replace('.', ',') : '', dmin: edit?.duration_min || edit?.lap_min || '',
        by: edit?.done_by || null, alone: !!edit?.self_settled,
        oint: new Set(edit?.kind === 'ointment' ? edit.ointments : edit?.kind === 'diaper' ? diaperOint(edit.id)?.ointments || [] : []) };
  S.other = startOfDay(t) < addDays(startOfDay(Date.now()), -1);
  // Sono (com o bebê acordado), Mamada, Fralda e Ordenha novos abrem a tela curta.
  S.compact = !edit && ((S.k === 'sleep' && S.sk === 'sleep') || S.k === 'feed' || S.k === 'diaper' || S.k === 'pump'); S.openO = false; S.openT = false; S.t0 = S.time;
  drawEntry();
}
// Cor do ajuste de horário para cada tipo de registro.
const INK = { wake: 'sleep', vomit: 'vomit', symptom: 'vomit' };
// Telas curtas do Sono e da Mamada (prévia aprovada em 06/11), e da Fralda e da Ordenha (07/11): o caso
// comum num toque, e o resto em "Outras opções" e no horário, recolhidos. O botão grande fica no pé,
// perto do polegar. Sem Observação no Sono, na Mamada e na Ordenha (07/11); a Fralda tem, em Outras opções (08/11).
const orow = (act, txt, open) => `<button class="orow${open ? ' open' : ''}" data-act="${act}" aria-expanded="${open}"><span>${txt}</span><i class="cv" aria-hidden="true">›</i></button>`;
function timeRow(k) {
  const d0 = startOfDay(computeT()), t0 = startOfDay(Date.now());
  const day = S.other || d0 < addDays(t0, -1) ? ymdDdmm(localDate(d0)) + ', ' : d0 === addDays(t0, -1) ? 'Ontem, ' : '';
  let h = `<button class="orow tm${S.openT ? ' open' : ''}" data-act="openT" aria-expanded="${S.openT}" aria-label="Horário: ${day}${S.time}. Editar o horário"><span class="v">${day}${S.time}</span><span class="pen" aria-hidden="true">${ICON.edit}</span></button>`;
  if (S.openT) {
    h += `<div class="ofold">${daySeg()}`;
    if (S.other) h += `<div><div class="lbl">Dia</div><input class="field" type="date" id="dayIn" min="${localDate(addDays(startOfDay(Date.now()), -BACK_DAYS))}" max="${localDate(Date.now())}" value="${localDate(S.base)}"></div>`;
    h += `<div>${clockHtml('timeIn', S.time, INK[k] || k)}${QUICK_TIME}</div></div>`;
  }
  return h;
}
const sfoot = (k, txt) => `<div class="sfoot">${S.err ? `<div class="err">${esc(S.err)}</div>` : ''}<button class="save sgo k-${k}" data-act="save"><span class="sgi">${ICON[k]}<span>${txt}</span></span></button></div>`;
function drawSleepCompact() {
  let h = head('Sono') + orow('openO', 'Outras opções', S.openO);
  if (S.openO) {
    const t = aloneText(st.baby.sex);
    h += `<div class="ofold"><div class="alone k-sleep" style="background:none">${opt(t[0].toUpperCase() + t.slice(1), S.alone, 'alone', 1)}</div>`;
    if (lapShown()) h += `<div><div class="lbl">Quanto tempo no colo <small>(opcional)</small></div><div class="ml"><input id="durIn" inputmode="numeric" value="${esc(S.dmin)}" placeholder="20" aria-label="Minutos no colo"><em>min</em></div>
      <div class="seg k-sleep" style="margin-top:8px;background:none">${LAP_CHIPS.map(m => `<button class="small${+S.dmin === m ? ' on' : ''}" data-act="dchip" data-val="${m}">${m === 60 ? '1 h' : m + ' min'}</button>`).join('')}</div></div>`;
    if (canBy()) h += byHtml('sleep', 'Quem fez');
    h += '</div>';
  }
  h += timeRow('sleep');
  // "Dormiu agora" salva com a hora de agora; mexeu em algo, o botão vira "Salvar".
  const changed = S.openO || S.openT || S.time !== S.t0 || S.base !== startOfDay(Date.now());
  h += sfoot('sleep', changed ? 'Salvar' : 'Dormiu agora');
  openPanel(h);
}
function drawFeedCompact() {
  let h = head('Mamada') + `<div class="seg k-feed" style="background:none">${opt('Peito', S.src === 'breast', 'src', 'breast', 1)}${opt('Mamadeira', S.src === 'bottle', 'src', 'bottle', 1)}</div>`;
  if (S.src === 'breast') {
    // Tocar num peito já começa o cronômetro: a tela fecha e a faixa sai do botão Mamada.
    const lb = lastBreast(sortedEntries());
    h += `<div><div class="lbl">Qual peito</div>${lb ? `<div class="hint">Última no peito: ${esc(SIDE_SHORT[lb.side])}, ${esc(ago(lb.t))}</div>` : ''}<div class="tsides">${ftSidesHtml(null, Date.now())}</div></div>`;
    h += orow('openO', 'Outras opções', S.openO);
    if (S.openO) {
      h += `<div class="ofold"><div><div class="lbl">Digitar os minutos</div><div class="sides">${sideRow('l', 'Esquerdo')}${sideRow('r', 'Direito')}</div><div class="total" id="total">${totalText()}</div></div></div>`;
      h += timeRow('feed') + sfoot('feed', 'Salvar');
    }
    return openPanel(h);
  }
  // Mamadeira: os atalhos e, ao lado de 150 e 180, o campo de ml com − e + (dá para digitar qualquer valor).
  h += `<div class="mlg" role="group" aria-label="Quantidade">${[30, 60, 90, 120, 150, 180].map(v => opt(v + ' ml', +S.ml === v, 'ml', v)).join('')}
    <div class="mls"><button data-act="mlstep" data-val="-10" aria-label="Menos 10 ml">−</button><label><input id="mlIn" inputmode="numeric" value="${esc(S.ml)}" placeholder="0" aria-label="Mililitros"><em>ml</em></label><button data-act="mlstep" data-val="10" aria-label="Mais 10 ml">+</button></div></div>`;
  if (canBy()) { h += orow('openO', 'Outras opções', S.openO); if (S.openO) h += `<div class="ofold">${byHtml('feed', 'Quem fez')}</div>`; }
  h += timeRow('feed') + sfoot('feed', 'Salvar');
  openPanel(h);
}
// Fralda: Xixi e Cocô; com cocô, o tamanho (sem título) e o alerta marrom. Outras opções sempre, por
// causa da Observação (08/11); o Quem fez só com duas pessoas ou mais.
function drawDiaperCompact() {
  let h = head('Fralda') + `<div class="seg k-diaper" style="background:none">${opt('Xixi', S.pee, 'pee', 1, 1)}${opt('Cocô', S.poo, 'poo', 1, 1)}</div>`;
  if (S.poo) h += `<div>${pooHtml()}</div>`;
  S.wig = false;
  h += ointList() || ointNudge();
  h += orow('openO', 'Outras opções', S.openO);
  if (S.openO) h += `<div class="ofold">${canBy() ? byHtml('diaper', 'Quem fez') : ''}${noteField('Observação (opcional)')}</div>`;
  h += timeRow('diaper') + sfoot('diaper', 'Salvar');
  openPanel(h);
}
// Ordenha: a última ordenha, o peito (opcional, um ou os dois) e os ml, como na mamadeira. Sem "Quem fez"
// (só quem amamenta faz), então sem Outras opções.
function drawPumpCompact() {
  const lp = sortedEntries().findLast(e => e.kind === 'pump');
  const last = lp ? 'Última ordenha: ' + [lp.ml ? lp.ml + ' ml' : '', SIDE_SHORT[lp.side] || '', ago(lp.t)].filter(Boolean).join(', ') : '';
  let h = head('Ordenha') + `<div>${last ? `<div class="hint">${esc(last)}</div>` : ''}<div class="seg k-pump" style="background:none">${opt('Esquerdo', S.l, 'pick', 'l', 1)}${opt('Direito', S.r, 'pick', 'r', 1)}</div></div>`;
  h += `<div><div class="lbl">Quantidade</div><div class="mlg k-pump" role="group" aria-label="Quantidade" style="background:none">${[30, 60, 90, 120, 150, 180].map(v => opt(v + ' ml', +S.ml === v, 'ml', v)).join('')}
    <div class="mls"><button data-act="mlstep" data-val="-10" aria-label="Menos 10 ml">−</button><label><input id="mlIn" inputmode="numeric" value="${esc(S.ml)}" placeholder="0" aria-label="Mililitros"><em>ml</em></label><button data-act="mlstep" data-val="10" aria-label="Mais 10 ml">+</button></div></div></div>`;
  h += timeRow('pump') + sfoot('pump', 'Salvar');
  openPanel(h);
}
const noteField = ph => `<input class="field" id="noteIn" maxlength="300" placeholder="${ph}" value="${esc(S.note)}">`;
// O tamanho do cocô e, embaixo, o alerta marrom, para quando vazou da fralda.
const pooHtml = () => `<div class="psize">${Object.entries(POO_SIZE).map(([id, n]) => opt(n[0].toUpperCase() + n.slice(1), S.psize === id, 'psize', id)).join('')}</div>
    <button class="brown${S.palert ? ' on' : ''}${S.wig ? ' wig' : ''}" data-act="palert" aria-pressed="${S.palert}">${ICON.siren}<span><b>Alerta marrom</b><small>aperte em caso de emergência</small></span></button>`;

// Pomada na Fralda e na tarefa avulsa (prévia de 08/11): as pomadas da família numa lista de marcar, com
// o círculo da dose. Sem nenhuma cadastrada, não aparece. extra: os nomes de um registro antigo que já
// não estão na lista (para dar para desmarcar).
const ointRoutine = () => st.routines.find(r => r.kind === 'ointment');
function ointList(extra) {
  const names = [...new Set([...(ointRoutine()?.items || []), ...(extra || [])])];
  if (!names.length) return '';
  return `<div><div class="lbl">Pomada</div><div class="olist">${names.map(n => { const on = S.oint.has(n);
    return `<button class="oline${on ? ' on' : ''}" data-act="oint" data-val="${esc(n)}" role="checkbox" aria-checked="${on}"><span class="ck">${CHECK}</span><span>${esc(n)}</span></button>`; }).join('')}</div></div>`;
}
// Sem pomada cadastrada (prévia de 09/11, https://claude.ai/artifact/LuTpMQ8LQ3uGNeqHBY1hBo): no lugar da
// lista, o aviso que leva à tela da Pomada. Some 15 dias depois de aparecer pela primeira vez neste
// celular, para este bebê, se ninguém cadastrar pomada (Patrick, 09/11). Antes do 023, não aparece.
const NUDGE_DAYS = 15;
function ointNudge() {
  if (!st.routinesOk || ointRoutine()) return '';
  const k = 'cad-pomada-aviso-' + st.baby.id, first = +lsGet(k) || 0, now = Date.now();
  if (!first) lsSet(k, String(now));
  if (first && now - first > NUDGE_DAYS * DAY) return '';
  return `<div><div class="lbl">Pomada</div><button class="ointcfg" data-act="ointCfg">${ICON.ointment}<span>Configure aqui as pomadas</span><i class="cv" aria-hidden="true">›</i></button></div>`;
}
// A pomada marcada numa troca de fralda.
const diaperOint = id => { for (const e of st.entries.values()) if (e.kind === 'ointment' && e.diaper_id === id) return e; return null; };

function drawEntry() {
  const k = S.k, c = 'k-' + k;
  if (S.compact && k === 'sleep' && S.sk === 'sleep') return drawSleepCompact();
  if (S.compact && k === 'feed' && !S.manual && !ftGet()) return drawFeedCompact();
  if (S.compact && k === 'diaper') return drawDiaperCompact();
  if (S.compact && k === 'pump') return drawPumpCompact();
  let h = head(S.edit ? (k === 'symptom' ? 'Editar sintoma' : k === 'care' ? 'Editar tarefa' : 'Editar ' + TITLE[k].toLowerCase()) : TITLE[k]);
  if (k === 'feed') {
    h += `<div><div class="lbl">Como foi</div><div class="seg ${c}" style="background:none">${opt('Peito', S.src === 'breast', 'src', 'breast', 1)}${opt('Mamadeira', S.src === 'bottle', 'src', 'bottle', 1)}</div></div>`;
    // Mamada nova no peito: o cronômetro. "Digitar os minutos" volta para os minutos digitados.
    if (S.src === 'breast' && !S.edit && !S.manual) {
      const t = ftGet(), now = Date.now(), lb = !t && lastBreast(sortedEntries());
      h += `<div><div class="lbl">Qual peito</div>${lb ? `<div class="hint">Última no peito: ${esc(SIDE_SHORT[lb.side])}, ${esc(ago(lb.t))}</div>` : ''}<div class="tsides">${ftSidesHtml(t, now)}</div>${t ? `<div class="total" id="ftTotal">${ftTotalText(t, now)}</div>` : ''}</div>`;
      if (t) h += `<button class="save" data-act="ftEnd">Terminar mamada</button>`;
      h += `<div class="ftlinks"><button class="lnk" data-act="ftManual">Digitar os minutos</button>${t ? '<button class="lnk mut" data-act="ftDrop">Descartar mamada</button>' : ''}</div>`;
      return openPanel(h);
    }
    if (S.src === 'breast') {
      const lb = !S.edit && lastBreast(sortedEntries());
      h += `<div><div class="lbl">Qual peito <small>(minutos opcionais)</small></div>${lb ? `<div class="hint">Última no peito: ${esc(SIDE_SHORT[lb.side])}, ${esc(ago(lb.t))}</div>` : ''}<div class="sides">${sideRow('l', 'Esquerdo')}${sideRow('r', 'Direito')}</div><div class="total" id="total">${totalText()}</div></div>`;
    }
    if (S.src === 'bottle') h += mlBlock(k);
  }
  if (k === 'pump') h += `<div><div class="lbl">Qual peito <small>(opcional, marque um ou os dois)</small></div><div class="seg ${c}" style="background:none">${opt('Esquerdo', S.l, 'pick', 'l', 1)}${opt('Direito', S.r, 'pick', 'r', 1)}</div></div>` + mlBlock(k);
  if (k === 'sleep') h += `<div class="seg ${c}" style="background:none">${opt('Dormiu', S.sk === 'sleep', 'sk', 'sleep', 1)}${opt('Acordou', S.sk === 'wake', 'sk', 'wake', 1)}</div>`;
  if (k === 'diaper') h += `<div><div class="lbl">Marque o que tinha</div><div class="seg ${c}" style="background:none">${opt('Xixi', S.pee, 'pee', 1, 1)}${opt('Cocô', S.poo, 'poo', 1, 1)}</div></div>`;
  // Com cocô: o tamanho, opcional, e embaixo o alerta marrom, para quando vazou da fralda.
  if (k === 'diaper' && S.poo) h += `<div>${pooHtml()}</div>`;
  if (k === 'diaper') h += ointList(S.edit && diaperOint(S.edit.id)?.ointments) || (S.edit ? '' : ointNudge());
  S.wig = false;   // a sirene balança só no toque que liga o alerta, não a cada redesenho
  if (k === 'other') h += `<div><div class="lbl">O que aconteceu</div><input class="field" id="noteIn" placeholder="Consulta com o pediatra" value="${esc(S.note)}"></div>`;
  if (k === 'med') h += `<div class="soft"><b>${esc(label(S.edit))}</b> · ${esc(detail(S.edit))}</div>`;
  // Sintomas: o que aconteceu; a febre pode ter a temperatura, a cólica e o choro a duração.
  if (k === 'symptom') {
    const opts = S.edit ? SYMPTOM_OPTS.filter(([id]) => id !== 'vomito') : SYMPTOM_OPTS;
    h += `<div><div class="lbl">O que aconteceu</div><div class="seg ${c}" style="background:none">${opts.map(([id, n]) => opt(n, S.sym === id, 'sym', id)).join('')}</div></div>`;
    if (S.sym === 'febre') h += `<div><div class="lbl">Temperatura <small>(opcional)</small></div><div class="ml"><input id="tempIn" inputmode="decimal" class="tbox" value="${esc(S.temp)}" aria-label="Temperatura em graus Celsius"><em>°C</em></div></div>`;
    if (withDuration(S.sym)) h += `<div><div class="lbl">Quanto tempo durou <small>(opcional)</small></div><div class="ml"><input id="durIn" inputmode="numeric" value="${esc(S.dmin)}" placeholder="30" aria-label="Minutos"><em>min</em></div></div>`;
  }
  // Tarefa avulsa: qual foi; tummy time e banho de sol podem ter os minutos; a pomada, quais foram
  // passadas; a outra tarefa, o que foi feito.
  if (k === 'care') {
    h += `<div><div class="lbl">Qual tarefa</div><div class="copts">${Object.entries(CARE).map(([id, n]) => `<button class="copt${S.ck === id ? ' on' : ''}" data-act="ck" data-val="${id}" aria-pressed="${S.ck === id}">${ICON[id]}<span>${id === 'care' ? 'Outra' : n}</span></button>`).join('')}</div></div>`;
    if (S.ck === 'ointment') h += ointList(S.edit?.ointments) || '<div class="soft">Cadastre as pomadas em Tarefas, na Pomada para assadura.</div>';
    if (CARE_MIN.includes(S.ck)) h += `<div><div class="lbl">Quanto tempo <small>(opcional)</small></div><div class="ml"><input id="durIn" inputmode="numeric" value="${esc(S.dmin)}" placeholder="10" aria-label="Minutos"><em>min</em></div>
      <div class="seg" style="margin-top:8px">${CARE_CHIPS.map(m => `<button class="small${+S.dmin === m ? ' on' : ''}" data-act="dchip" data-val="${m}">${m} min</button>`).join('')}</div></div>`;
    // Arroto: como xixi e cocô, um ou os dois; cada registro é só o momento, sem tempo.
    if (S.ck === 'burp') h += `<div><div class="lbl">Marque o que aconteceu</div><div class="seg ${c}" style="background:none">${opt('Pôs para arrotar', S.bput, 'bput', 1, 1)}${opt('Arrotou', S.bdone, 'bdone', 1, 1)}</div></div>`;
  }
  h += daySeg();
  if (S.other) h += `<div><div class="lbl">Dia</div><input class="field" type="date" id="dayIn" min="${localDate(addDays(startOfDay(Date.now()), -BACK_DAYS))}" max="${localDate(Date.now())}" value="${localDate(S.base)}"></div>`;
  h += `<div><div class="lbl">Horário</div>${clockHtml('timeIn', S.time, INK[k] || k)}${QUICK_TIME}</div>`;
  // Sono: no Dormiu, se pegou no sono sozinho (marcado, o colo e o quem fez somem); quanto tempo foi no
  // colo, opcional, no Dormiu ou no Acordou.
  if (k === 'sleep' && S.sk === 'sleep') { const t = aloneText(st.baby.sex); h += `<div class="alone k-sleep" style="background:none">${opt(t[0].toUpperCase() + t.slice(1), S.alone, 'alone', 1)}</div>`; }
  if (k === 'sleep' && lapShown()) h += `<div><div class="lbl">Quanto tempo no colo <small>(opcional)</small></div><div class="ml"><input id="durIn" inputmode="numeric" value="${esc(S.dmin)}" placeholder="20" aria-label="Minutos no colo"><em>min</em></div>
    <div class="seg k-sleep" style="margin-top:8px;background:none">${LAP_CHIPS.map(m => `<button class="small${+S.dmin === m ? ' on' : ''}" data-act="dchip" data-val="${m}">${m === 60 ? '1 h' : m + ' min'}</button>`).join('')}</div></div>`;
  if (canBy()) h += byHtml(k, k === 'med' ? 'Quem deu' : 'Quem fez');
  // Sono, Mamada e Ordenha não têm Observação (07/11), nem ao editar; a que já existe continua salva.
  if (!['other', 'sleep', 'feed', 'pump'].includes(k)) h += noteField((k === 'symptom' && S.sym === 'outro') || (k === 'care' && S.ck === 'care') ? 'O que foi feito' : 'Observação (opcional)');
  if (S.err) h += `<div class="err">${esc(S.err)}</div>`;
  h += `<button class="save" data-act="save">Salvar</button>`;
  if (k === 'symptom') h += '<p class="dim">O Soneca só anota o que a família marcar; não avalia nem orienta.</p>';
  if (S.edit) h += '<button class="del" data-act="del">Apagar registro</button>';
  openPanel(h);
}
// Um pouco de humor só na rotina. O cocô gigante e o alerta marrom têm frase sempre; nos outros registros
// novos da rotina, uma frase sorteada a cada 3 (nunca a mesma duas vezes seguidas). Remédio, sintomas,
// vômito, peso e os cuidados fora o banho ficam só com "Salvo". Editar não ganha frase.
const CHEER = {
  feed: ['Barriguinha cheia.', 'Mais uma pra conta.', 'Leite servido.'],
  pump: ['Estoque reforçado.'],
  sleep: ['Shhh…', 'Bons sonhos.', 'Silêncio na casa.'],
  wake: ['Tô vivo, gente!', 'De volta ao mundo.'],
  pee: ['Bebê sequinho.', 'Troca feita.'],
  poo: ['Missão cumprida.'],
  bath: ['Cheirinho de bebê.'],
};
function cheer(ev) {
  const list = CHEER[ev.kind === 'diaper' ? (ev.poo ? 'poo' : 'pee') : ev.kind];
  if (!list || ++cheer.n % 3) return '';
  const opts = list.length > 1 ? list.filter(p => p !== cheer.last) : list;
  cheer.last = opts[Math.floor(Math.random() * opts.length)];
  return '. ' + cheer.last;
}
cheer.n = 0;
const savedText = (ev, fresh) => ev.poo_alert ? 'Alerta marrom às ' + hm(ev.t) + '. Coragem!'
  : ev.poo_size === 'gigante' ? 'Salvo às ' + hm(ev.t) + '. Que fralda!'
  // Febre: o aviso repete o que foi anotado, sem interpretar ("Febre de 38,5 °C anotada às 03:12").
  : ev.kind === 'symptom' && ev.symptom === 'febre' ? 'Febre' + (ev.temp_c != null
    ? ' de ' + ev.temp_c.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' °C' : '') + ' anotada às ' + hm(ev.t)
  : 'Salvo às ' + hm(ev.t) + (fresh ? cheer(ev) : '');
function computeT() {
  const [H, M] = (S.time || hm(Date.now())).split(':').map(Number);
  let t = S.base + H * HOUR + M * MIN;
  // Hoje com uma hora que ainda não chegou: foi ontem. Outro dia escolhido vale como está.
  if (!S.edit && S.base === startOfDay(Date.now()) && t > Date.now() + 5 * MIN) t -= DAY;
  return t;
}
// Hoje / Ontem / Outro dia, em cima do relógio (Bruno, 16/10): até 30 dias para trás, decidido em 27/10.
const BACK_DAYS = 30;
function daySeg() {
  const d0 = startOfDay(computeT()), t0 = startOfDay(Date.now());
  const on = S.other ? 'other' : d0 === t0 ? 'today' : d0 === addDays(t0, -1) ? 'yesterday' : 'other';
  return `<div class="seg" id="daySeg">${opt('Hoje', on === 'today', 'day', 'today')}${opt('Ontem', on === 'yesterday', 'day', 'yesterday')}${opt('Outro dia', on === 'other', 'day', 'other')}</div>`;
}
async function saveEntry(btn) {
  const k = S.k;
  if (k === 'diaper' && !S.pee && !S.poo) { S.err = 'Marque xixi, cocô ou os dois.'; return drawEntry(); }
  if (k === 'other' && !S.note.trim()) { S.err = 'Escreva o que aconteceu.'; return drawEntry(); }
  if (k === 'feed' && !S.src) { S.err = 'Escolha peito ou mamadeira.'; return drawEntry(); }
  if (k === 'feed' && S.src === 'bottle' && !S.edit && !(+S.ml > 0)) { S.err = 'Informe quantos ml.'; return drawEntry(); }
  if (k === 'pump' && !(+S.ml > 0)) { S.err = 'Informe quantos ml saíram.'; return drawEntry(); }
  if ((k === 'pump' || (k === 'feed' && S.src === 'bottle')) && +S.ml > 1000) { S.err = 'No máximo 1000 ml.'; return drawEntry(); }
  const okMin = v => v === '' || (+v >= 1 && +v <= 180);
  if (k === 'feed' && S.src === 'breast' && !(okMin(S.lmin) && okMin(S.rmin))) { S.err = 'O tempo em cada peito vai de 1 a 180 min.'; return drawEntry(); }
  const temp = parseFloat(String(S.temp).replace(',', '.')), dmin = +S.dmin;
  if (k === 'symptom') {
    if (!S.sym) { S.err = 'Escolha o que aconteceu.'; return drawEntry(); }
    if (S.sym === 'outro' && !S.note.trim()) { S.err = 'Escreva o que aconteceu.'; return drawEntry(); }
    if (S.sym === 'febre' && S.temp !== '' && !(temp >= 34 && temp <= 43)) { S.err = 'A temperatura vai de 34 a 43 °C. Ex.: 37,8'; return drawEntry(); }
    if (withDuration(S.sym) && S.dmin !== '' && !(dmin >= 1 && dmin <= 600)) { S.err = 'A duração vai de 1 a 600 minutos.'; return drawEntry(); }
  }
  if (k === 'care') {
    if (!S.ck) { S.err = 'Escolha a tarefa.'; return drawEntry(); }
    if (S.ck === 'ointment' && !S.oint.size) { S.err = 'Marque a pomada que passou.'; return drawEntry(); }
    if (S.ck === 'care' && !S.note.trim()) { S.err = 'Escreva o que foi feito.'; return drawEntry(); }
    if (S.ck === 'burp' && !S.bput && !S.bdone) { S.err = 'Marque pôs para arrotar, arrotou ou os dois.'; return drawEntry(); }
    if (CARE_MIN.includes(S.ck) && S.dmin !== '' && !(dmin >= 1 && dmin <= 600)) { S.err = 'O tempo vai de 1 a 600 minutos.'; return drawEntry(); }
  }
  if (k === 'sleep' && S.dmin !== '' && !(dmin >= 1 && dmin <= 600) && lapShown()) { S.err = 'O tempo no colo vai de 1 a 600 minutos.'; return drawEntry(); }
  // Vômito, escolhido em Sintomas, grava o registro de vômito de sempre. A tarefa avulsa grava a tarefa escolhida.
  const ev = { kind: k === 'sleep' ? S.sk : k === 'symptom' && S.sym === 'vomito' ? 'vomit' : k === 'care' ? S.ck : k, t: computeT() };
  // Na tela curta, sem mexer no horário, vale o instante do toque (não o minuto cheio): assim um "Dormiu
  // agora" logo depois de um "Acordou" fica depois dele.
  if (S.compact && S.time === S.t0 && S.base === startOfDay(Date.now())) ev.t = Date.now();
  // Só manda o colo quando há o que mandar (ou apagar): sem o 020, o resto do sono continua salvando.
  // No sono que pegou sozinho, o colo vai vazio.
  const lap = k === 'sleep' && lapShown() && S.dmin !== '';
  if (k === 'sleep' && (lap || S.edit?.lap_min)) ev.lap_min = lap ? dmin : null;
  // Quem fez e o "pegou no sono sozinha", do mesmo jeito: sem o 022, o resto continua salvando.
  const by = canBy() ? S.by : null, alone = k === 'sleep' && S.sk === 'sleep' && S.alone;
  if (by || S.edit?.done_by) ev.done_by = by;
  if (alone || S.edit?.self_settled) ev.self_settled = alone || null;
  if (k === 'care') ev.duration_min = CARE_MIN.includes(S.ck) && S.dmin !== '' ? dmin : null;
  if (ev.kind === 'burp') ev.burp = S.bput && S.bdone ? 'both' : S.bput ? 'put' : 'done';
  if (ev.kind === 'ointment') { ev.ointments = [...S.oint]; ev.diaper_id = null; }
  // As pomadas marcadas na Fralda viram um registro de pomada ligado à troca.
  const oint = k === 'diaper' ? [...S.oint] : null;
  if (ev.kind === 'symptom') {
    ev.symptom = S.sym;
    if (S.sym === 'febre' && S.temp !== '') ev.temp_c = Math.round(temp * 10) / 10;
    if (withDuration(S.sym) && S.dmin !== '') ev.duration_min = dmin;
  }
  const side = S.l && S.r ? 'both' : S.l ? 'left' : S.r ? 'right' : null;
  if (k === 'feed') {
    ev.src = S.src;
    if (S.src === 'bottle' && +S.ml > 0) ev.ml = +S.ml;
    if (S.src === 'breast') { ev.side = side; if (S.l && +S.lmin) ev.left_min = +S.lmin; if (S.r && +S.rmin) ev.right_min = +S.rmin; }
  }
  if (k === 'pump') { ev.side = side; ev.ml = +S.ml; }
  if (k === 'diaper') {
    ev.pee = !!S.pee; ev.poo = !!S.poo;
    // Só manda o tamanho e o alerta quando há o que mandar (ou apagar): sem o 009, o resto continua salvando.
    if ((S.poo && (S.psize || S.palert)) || S.edit?.poo_size || S.edit?.poo_alert) {
      ev.poo_size = S.poo ? S.psize : null; ev.poo_alert = S.poo && S.palert ? true : null;
    }
  }
  if (k === 'med') for (const f of ['medicine_id', 'med_name', 'med_amount', 'dose_at', 'skipped']) ev[f] = S.edit[f];
  if (S.note.trim()) ev.note = S.note.trim().slice(0, 300);
  busy(btn, true);
  if (S.edit) {
    const id = S.edit.id;
    if (await updateEntry(id, ev)) { if (oint) await setDiaperOint(id, ev, oint); closeSheet(); toast(savedText(ev)); } else busy(btn, false);
    return;
  }
  const fromTimer = S.fromTimer && ev.kind === 'feed' && ev.src === 'breast';
  // Na tela curta do Sono, da Fralda e da Ordenha, o botão confirma enquanto o registro salva.
  const conf = S.compact && (k === 'sleep' || k === 'diaper' || k === 'pump') ? confirmSave(btn, k === 'sleep' ? ICON.sleep : CHECK) : null;
  const row = await addEntry(ev);
  if (!row) { conf?.cancel(); return busy(btn, false); }
  if (oint?.length) await setDiaperOint(row.id, { ...ev, t: Date.parse(row.at) }, oint);
  await conf?.done;
  if (fromTimer) ftSet(null);
  closeSheet(); toast(savedText(ev, true), () => deleteEntry(row.id));
}

// Grava, troca ou apaga a pomada ligada a uma troca de fralda: mesmo horário e mesmo quem fez da troca.
async function setDiaperOint(did, ev, names) {
  const old = diaperOint(did);
  if (!names.length) return old ? deleteEntry(old.id) : true;
  const o = { kind: 'ointment', t: ev.t, ointments: names, diaper_id: did };
  if ('done_by' in ev) o.done_by = ev.done_by;
  return old ? updateEntry(old.id, o) : addEntry(o);
}

/* ---------- últimos 3 dias de um botão ---------- */
// Tocar no botão (fora do +) mostra hoje, ontem e anteontem daquele registro, do mais novo para o
// mais antigo, com a hora, o detalhe e quem anotou. Tocar numa linha abre para editar.
const HIST = { feed: ['Mamadas', ['feed']], sleep: ['Sono', ['sleep', 'wake']], diaper: ['Fraldas', ['diaper']], med: ['Remédios', ['med']],
               symptom: ['Sintomas', ['symptom', 'vomit']], pump: ['Ordenhas', ['pump']], care: ['Tarefas', Object.keys(CARE)] };
function histSheet(k) {
  if (!st.baby) return babySheet(null);
  S = { mode: 'hist', k }; drawHist(); $('sheet').scrollTop = 0;
}
function drawHist() {
  const [title, kinds] = HIST[S.k], evs = sortedEntries(), today = startOfDay(Date.now());
  let h = `<div class="grab"></div><div class="shead"><div class="htitle"><span class="d k-${S.k}">${ICON[S.k]}</span><h3>${esc(title)}<small>últimos 3 dias</small></h3></div><button class="x" data-act="close" aria-label="Fechar">×</button></div>`;
  for (let i = 0; i < 3; i++) {
    const d0 = addDays(today, -i), d1 = addDays(d0, 1);
    const rows = evs.filter(e => kinds.includes(e.kind) && e.t >= d0 && e.t < d1).reverse();
    h += `<div class="hday"><h4>${esc(dayTitle(d0))}</h4>` + (!rows.length ? '<div class="empty">Nada anotado.</div>' : '<div class="tl">' + rows.map(e => {
      const noteIsName = e.kind === 'other' || e.kind === 'care' || (e.kind === 'symptom' && e.symptom === 'outro');
      const sub = [esc(detail(e)), !noteIsName && e.note ? esc(e.note) : '', esc(byText(e))].filter(Boolean).join(' · ');
      return `<button class="row" data-act="histRow" data-val="${esc(e.id)}"><span class="h">${hm(e.t)}</span><span class="d k-${e.kind}">${ICON[e.kind]}</span><span><span class="l">${esc(label(e, evs, st.baby.sex))}${e.poo_alert ? '<span class="brownpill">alerta marrom</span>' : ''}</span>${sub ? `<span class="s">${sub}</span>` : ''}</span></button>`;
    }).join('') + '</div>') + '</div>';
  }
  h += `<button class="save" data-act="histAdd">+ Anotar ${esc(ADD[S.k])}</button>`;
  openPanel(h);
}
function histAction(a, v) {
  if (a === 'histAdd') return openEntry(S.k);
  if (a === 'histRow') { const ev = st.entries.get(v); if (ev) openEntry(ev.kind, ev); }
}

/* ---------- calendário ---------- */
// No modo Semana, o dia escolhido é o último dos 7; no Mês, o último dia do mês que já chegou.
const chosenDay = () => st.view === 'week' ? st.weekEnd
  : st.view === 'month' ? Math.min(startOfDay(Date.now()), addDays(monthStart(st.month || Date.now(), 1), -1)) : st.viewDay;
function calSheet() { const d = new Date(chosenDay()); S = { mode: 'cal', y: d.getFullYear(), m: d.getMonth() }; drawCal(); }
function drawCal() {
  const today = startOfDay(Date.now()), week = st.view === 'week', month = st.view === 'month', sel = chosenDay();
  const min = month ? firstMonth() : firstDay(), from = week ? addDays(sel, -6) : month ? monthStart(sel) : sel;
  // No Mês, os pontos de um mês antigo aparecem quando os registros dele chegam.
  if (month) loadOlder(new Date(S.y, S.m, 1).getTime());
  const has = new Set([...st.entries.values()].map(e => startOfDay(e.t)));
  const ym = t => { const d = new Date(t); return d.getFullYear() * 12 + d.getMonth(); }, cur = S.y * 12 + S.m;
  const first = new Date(S.y, S.m, 1), days = new Date(S.y, S.m + 1, 0).getDate();
  let cells = '<span></span>'.repeat(first.getDay());
  for (let dd = 1; dd <= days; dd++) {
    const d0 = new Date(S.y, S.m, dd).getTime(), off = d0 > today || d0 < min;
    const cls = [has.has(d0) && 'has', d0 === today && 'today', d0 === sel && 'sel', d0 >= from && d0 < sel && 'wk'].filter(Boolean).join(' ');
    cells += `<button class="${cls}" data-act="pickDay" data-val="${d0}"${off ? ' disabled' : ''}${d0 === sel ? ' aria-current="date"' : ''} aria-label="${esc(dayTitle(d0))}${has.has(d0) ? ', com registros' : ''}">${dd}</button>`;
  }
  const arrow = (dir, ok, name, path) => `<button data-act="mon" data-val="${dir}"${ok ? '' : ' disabled'} aria-label="${name}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="${path}"/></svg></button>`;
  openPanel(head(week ? 'Escolher semana' : month ? 'Escolher mês' : 'Escolher dia') +
    `<div class="mhead">${arrow(-1, cur > ym(min), 'Mês anterior', 'M15 5l-7 7 7 7')}<b>${MESES_L[S.m]} ${S.y}</b>${arrow(1, cur < ym(today), 'Próximo mês', 'M9 5l7 7-7 7')}</div>
    <div class="wdays" aria-hidden="true">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(w => `<span>${w}</span>`).join('')}</div>
    <div class="cal">${cells}</div>
    <div class="calkey"><i></i>dia com registros${month ? '' : ` · o Soneca mostra os últimos ${KEEP_DAYS} dias`}</div>
    ${week ? '<p class="dim">O painel mostra os 7 dias que terminam no dia escolhido.</p>' : ''}
    <button class="ghost" data-act="pickDay" data-val="${today}">Ir para hoje</button>`);
}
function calAction(a, v) {
  if (a === 'mon') { const d = new Date(S.y, S.m + (+v), 1); S.y = d.getFullYear(); S.m = d.getMonth(); return drawCal(); }
  if (a === 'pickDay') { if (st.view === 'week') st.weekEnd = +v; else if (st.view === 'month') st.month = clampMonth(+v); else st.viewDay = +v; closeSheet(); }
}

/* ---------- remédios ---------- */
// A família programa o remédio e os horários; o Soneca só lembra. Cada horário do dia é uma dose,
// identificada por "remédio@horário" (ms). Marcar ou pular a dose grava um registro de remédio.
const SOON = HOUR;   // uma hora antes, a dose aparece na tela inicial com a caixinha
const DASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M7 12h10"/></svg>`;
const EVERY = [4, 6, 8, 12];
const MED_RULE = '<p class="dim">Só a família programa. O Soneca lembra os horários; não sugere remédio nem dose.</p>';
const dayOf = ymd => startOfDay(new Date(ymd + 'T00:00').getTime());
const atTime = (d0, hhmm) => { const d = new Date(d0), [H, M] = hhmm.split(':').map(Number); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), H, M).getTime(); };
const medTimes = m => (m.times || []).map(x => x.slice(0, 5)).sort();
const medEnd = m => m.days ? addDays(dayOf(m.start_date), m.days) : Infinity;   // primeiro dia sem o remédio
const medOn = (m, d0) => m.schedule !== 'prn' && d0 >= dayOf(m.start_date) && d0 < medEnd(m);
// De X em X horas: os horários do dia que saem da conta, a partir da primeira dose.
function everyTimes(every, first) {
  const [H, M] = (first || '08:00').split(':').map(Number), step = every * 60, out = [];
  for (let k = (H * 60 + M) % step; k < 1440; k += step) out.push(pad(Math.floor(k / 60)) + ':' + pad(k % 60));
  return out;
}
// O primeiro nome de quem fez, para a divisão de tarefas (vai no texto para mandar: nunca "você").
const firstName = id => (st.names[id] || 'alguém').split(' ')[0];
// Quem deu a dose: quem fez ou, sem quem fez, quem marcou.
const whoGave = e => { const id = e.done_by || e.author_id; return id === st.user.id ? 'você' : (st.names[id] || 'alguém').split(' ')[0]; };
// A linha de baixo do registro: "por Carol" (quem fez; sem quem fez, quem anotou) e, quando quem fez
// não é quem anotou, "por Carol, anotado por Pedro".
function byText(e) {
  const by = e.done_by && e.done_by !== e.author_id && st.names[e.done_by] ? e.done_by : null;
  const author = e.author_id && st.names[e.author_id] ? firstName(e.author_id) : '';
  if (!by) return author ? 'por ' + author : '';
  return 'por ' + firstName(by) + (author ? ', anotado por ' + author : '');
}
const whenText = t => { const d0 = startOfDay(t), t0 = startOfDay(Date.now()); return (d0 === t0 ? 'hoje' : d0 === addDays(t0, -1) ? 'ontem' : shortDay(d0)) + ' às ' + hm(t); };
const dayWord = t => { const d0 = startOfDay(t), t0 = startOfDay(Date.now()); return d0 === t0 ? '' : d0 < t0 ? 'ontem' : 'amanhã'; };

// As doses com horário entre a e z, com o estado de cada uma. Horário de antes de o remédio ser
// programado não conta: quem programa às 8h40 um remédio de 6 em 6 horas não tem a dose das 7h.
// As doses marcadas, por "remédio@horário". Um redesenho pergunta várias vezes (cartão, botão, lista):
// monta uma vez e vale até o fim desse redesenho. Os registros só mudam depois de um await, já em outro.
let markedC = null;
function markedDoses() {
  if (markedC?.map === st.entries && markedC.n === st.entries.size) return markedC.m;
  const m = new Map();
  for (const e of st.entries.values()) if (e.kind === 'med' && e.dose_at) m.set(e.medicine_id + '@' + Date.parse(e.dose_at), e);
  markedC = { map: st.entries, n: st.entries.size, m };
  queueMicrotask(() => { markedC = null; });
  return m;
}
function dosesFrom(a, z) {
  const marked = markedDoses();
  const now = Date.now(), out = [];
  for (let d0 = startOfDay(a); d0 < z; d0 = addDays(d0, 1))
    for (const m of st.meds) if (medOn(m, d0)) for (const hhmm of medTimes(m)) {
      const due = atTime(d0, hhmm); if (due < a || due >= z || due < Date.parse(m.created_at)) continue;
      const id = m.id + '@' + due, e = marked.get(id);
      const state = e ? (e.skipped ? 'skip' : 'done') : now >= due ? 'late' : now >= due - SOON ? 'soon' : 'later';
      out.push({ id, m, due, hhmm, e, state });
    }
  return out.sort((x, y) => x.due - y.due || x.m.name.localeCompare(y.m.name));
}
const doseById = id => { const due = +id.split('@')[1]; return dosesFrom(due, due + 1).find(d => d.id === id); };
const todayDoses = () => { const t0 = startOfDay(Date.now()); return dosesFrom(t0, addDays(t0, 1)); };
function doseStatus(d) {
  return d.state === 'done' ? 'dada por ' + whoGave(d.e) + ' às ' + hm(d.e.t)
    : d.state === 'skip' ? 'pulada por ' + whoGave(d.e)
    : d.state === 'late' ? 'passou ' + dur(Date.now() - d.due) + ' · ainda não marcada'
    : d.state === 'soon' ? 'daqui a ' + dur(d.due - Date.now()) : '';
}
// Uma dose. Na lista completa (all), toda dose tem caixinha; na tela inicial, só perto da hora.
// Perto da hora ou atrasada, ganha também o "Pular", para quando não deu.
function doseRow(d, { all = false, tag = '' } = {}) {
  const m = d.m, name = esc(m.name), st2 = [tag, doseStatus(d)].filter(Boolean).join(' · ');
  const hot = d.state === 'soon' || d.state === 'late', can = hot || (all && d.state === 'later');
  const ck = can
      ? `<button class="ck" role="checkbox" aria-checked="false" data-act="check" data-val="${d.id}" aria-label="Marcar ${name} das ${d.hhmm} como dada">${CHECK}</button>`
    : d.e
      ? `<button class="ck" role="checkbox" aria-checked="true" data-act="dose" data-val="${d.id}" aria-label="${name} das ${d.hhmm}, ${esc(st2)}. Ver ou desmarcar">${d.state === 'skip' ? DASH : CHECK}</button>`
    : '<span class="ck" aria-hidden="true"></span>';
  const skip = hot ? `<button class="skipbtn" data-act="skipDose" data-val="${d.id}" aria-label="Pular ${name} das ${d.hhmm}: não foi dada">Pular</button>` : '';
  return `<div class="dose ${d.state}${can ? ' can' : ''}">${ck}<button class="di" data-act="dose" data-val="${d.id}"><span><b>${name}</b>${m.amount ? ` <span class="q">· ${esc(m.amount)}</span>` : ''}<span class="st">${esc(st2)}</span></span><span class="tm">${d.hhmm}</span></button>${skip}</div>`;
}

// Tela inicial: só o que precisa de alguém. De cada remédio, a dose mais recente que já está a uma
// hora ou menos do horário, se ninguém marcou nem pulou; dose marcada sai do cartão. Uma dose de hoje
// mais antiga que ficou sem marcar vira um aviso para a lista.
function homeDoses() {
  const now = Date.now(), ds = dosesFrom(now - DAY, now + SOON + 1), cur = new Map();
  for (const d of ds) cur.set(d.m.id, d);   // em ordem de horário: fica a mais recente de cada remédio
  const shown = ds.filter(d => cur.get(d.m.id) === d && (d.state === 'soon' || d.state === 'late'));
  const missed = ds.filter(d => d.state === 'late' && !shown.includes(d) && !dayWord(d.due)).length;
  return { shown, missed };
}
// Marcar ou pular na tela inicial: a linha dá o check na hora, fica meio segundo e encolhe. Enquanto
// isso o cartão não é redesenhado (medsBusy); se não salvar, ele volta como estava.
let medsBusy = 0;
const pause = ms => new Promise(r => setTimeout(r, reduceMotion() ? 0 : ms));
async function markHome(b, skipped) {
  const row = b.closest('.dose'); if (!row || row.classList.contains('done') || row.classList.contains('skip')) return;
  const ck = row.querySelector('.ck'), stx = row.querySelector('.st');
  medsBusy++;
  row.classList.add('ticking', skipped ? 'skip' : 'done');
  ck.innerHTML = skipped ? DASH : CHECK; ck.setAttribute('aria-checked', 'true');
  if (stx) stx.textContent = skipped ? 'pulada por você' : 'dada por você às ' + hm(Date.now());
  const [saved] = await Promise.all([giveDose(b.dataset.val, Date.now(), null, skipped), pause(550)]);
  if (saved) {
    row.classList.add('fade'); await pause(250);
    row.style.height = row.offsetHeight + 'px'; row.offsetHeight;
    row.classList.add('shrink'); row.style.height = '0px'; await pause(220);
    row.remove();
    if (medsBusy === 1 && !$('meds').querySelector('.dose') && !homeDoses().shown.length) { $('meds').classList.add('gone'); await pause(250); }
  }
  medsBusy--; if (!medsBusy) { $('meds').classList.remove('gone'); renderMeds(); }
}
function renderMeds() {
  if (medsBusy) return;
  const box = $('meds'), { shown, missed } = homeDoses();
  box.hidden = !shown.length && !missed; if (box.hidden) return;
  const n = todayDoses().length, more = shown.length ? 'Mais ' : '';
  box.innerHTML = `<div class="mh"><h3>${ICON.med}<span>${shown.length ? 'Hora do remédio' : 'Remédios'}</span></h3><button class="lnk" data-act="allMeds">Ver todas${n ? ' (' + n + ')' : ''}</button></div>
    ${shown.length ? `<div class="doses">${shown.map(d => doseRow(d, { tag: dayWord(d.due) })).join('')}</div>` : ''}
    ${missed ? `<button class="more" data-act="allMeds">${missed === 1 ? more + '1 dose de hoje sem marcar' : more + missed + ' doses de hoje sem marcar'}</button>` : ''}`;
}
function medSub() {
  const now = Date.now(), { shown, missed } = homeDoses(), next = dosesFrom(now, now + DAY).find(d => !d.e);
  if (missed || shown.some(d => d.state === 'late')) return 'dose sem marcar';
  const soon = shown.find(d => d.state === 'soon');
  if (soon) return 'daqui a ' + dur(soon.due - now);
  if (next) return 'próxima ' + (dayWord(next.due) ? dayWord(next.due) + ' ' : '') + 'às ' + next.hhmm;
  return st.meds.length ? 'remédios e horários' : 'programar horários';
}

// Remédios e horários: as doses de hoje, cada uma com caixinha, e os remédios programados.
function medsSheet() { S = { mode: 'meds' }; drawMeds(); $('sheet').scrollTop = 0; }
function drawMeds() {
  const ds = todayDoses(), t0 = startOfDay(Date.now()), meds = st.meds.filter(m => medEnd(m) > t0);
  let h = `<div class="grab"></div><div class="shead"><h3>Remédios e horários<span class="ps">de ${esc(st.baby.name)}</span></h3><button class="x" data-act="close" aria-label="Fechar">×</button></div>`;
  if (medNotif) h += `<button class="li tg" role="switch" aria-checked="${alertOn()}" data-act="medAlert"><span>Ativar notificações de remédios</span><span class="sw${alertOn() ? ' on' : ''}" aria-hidden="true"><i></i></span></button>`;
  if (ds.length) h += `<div class="sec"><h4>Doses de hoje</h4><div class="doses">${ds.map(d => doseRow(d, { all: true })).join('')}</div></div>`;
  h += meds.length
    ? `<div class="sec"><h4>Remédios programados</h4><div class="mlist">${meds.map(medCard).join('')}</div></div><button class="ghost" data-act="newMed">+ Programar outro remédio</button>`
    : '<ol class="steps"><li><span class="n">1</span><span>Anote o remédio, quanto dar e quando: em horários fixos, de tantas em tantas horas ou só quando precisar.</span></li>'
      + '<li><span class="n">2</span><span>Uma hora antes, a dose aparece no alto do Diário. Quem der marca, e todos da família veem.</span></li>'
      // O aviso na hora só existe no app do celular, não no site.
      + (medNotif ? '<li><span class="n">3</span><span>Se quiser, o celular avisa na hora de cada dose.</span></li>' : '') + '</ol>'
      + '<p class="dim">O Soneca só lembra o que vocês programarem. Não sugere remédio, dose nem horário.</p><button class="save" data-act="newMed">Programar um remédio</button>';
  const top = $('sheet').scrollTop; openPanel(h + (meds.length ? MED_RULE : '')); $('sheet').scrollTop = top;
}
const lastGiven = m => [...st.entries.values()].filter(e => e.kind === 'med' && e.medicine_id === m.id && !e.skipped).reduce((b, e) => !b || e.t > b.t ? e : b, null);
// "Só quando precisar" com intervalo: quando pode dar de novo (nulo se já pode).
const prnNext = (m, last = lastGiven(m)) => last && m.every_hours && last.t + m.every_hours * HOUR > Date.now() ? last.t + m.every_hours * HOUR : null;
const medWhen = m => (m.schedule === 'every' ? `de ${m.every_hours} em ${m.every_hours} horas` : 'todo dia')
  + (m.days ? ' · até ' + dayTitle(medEnd(m) - DAY / 2).toLowerCase() : ' · sem data para acabar');
function medCard(m) {
  let times, sub, sub2 = '';
  if (m.schedule === 'prn') {
    const last = lastGiven(m), next = prnNext(m, last), ask = S.prnAsk === m.id;
    times = `<span class="tpill plain">quando precisar${m.every_hours ? ` · de ${m.every_hours} em ${m.every_hours}h` : ''}</span>`
      + `<button class="pillbtn" data-act="prnNow" data-val="${esc(m.id)}">${ask ? 'Marcar mesmo assim' : 'Dei agora'}</button>`;
    sub = last ? 'última vez ' + whenText(last.t) + ', por ' + whoGave(last) : 'ainda não foi dado';
    // Intervalo programado pela família: mostra a partir de quando pode dar de novo e confirma antes.
    if (ask) sub2 = `A última foi há ${dur(Date.now() - last.t)}; vocês programaram de ${m.every_hours} em ${m.every_hours} horas.`;
    else if (next) sub2 = 'Pode dar de novo a partir das ' + hm(next) + (dayWord(next) ? ' de ' + dayWord(next) : '') + '.';
  } else {
    const nd = nowDose(m), ask = nd && S.nowAsk === m.id;
    times = medTimes(m).map(t => `<span class="tpill">${t}</span>`).join('')
      + (nd ? `<button class="pillbtn" data-act="giveNow" data-val="${esc(m.id)}">${ask ? 'Marcar a das ' + nd.hhmm : 'Dei agora'}</button>` : '');
    sub = medWhen(m);
    if (ask) sub2 = `A próxima dose é às ${nd.hhmm}${dayWord(nd.due) ? ' de ' + dayWord(nd.due) : ''}. Toque de novo para marcar como dada agora.`;
  }
  return `<div class="mcard"><div class="mtop"><div><b>${esc(m.name)}</b>${m.amount ? `<span class="mq">${esc(m.amount)}</span>` : ''}</div>
    <button data-act="editMed" data-val="${esc(m.id)}" aria-label="Editar ${esc(m.name)}">${ICON.pencil}Editar</button></div>
    <div class="mtimes">${times}</div><div class="msub">${esc(sub)}</div>${sub2 ? `<div class="msub wait">${esc(sub2)}</div>` : ''}</div>`;
}

// "Dei agora" no remédio de horário: se a dose mais recente que já passou da hora ficou sem marcar,
// é ela; senão, adianta a próxima sem marcar. Nulo se não há dose nas próximas 24 horas.
function nowDose(m) {
  const now = Date.now(), ds = dosesFrom(now - DAY, now + DAY).filter(d => d.m.id === m.id);
  const cur = ds.findLast(d => d.due <= now);
  return cur && !cur.e ? cur : ds.find(d => d.due > now && !d.e) || null;
}

// Marcar (ou pular) uma dose. Se outra pessoa marcou antes, addEntry avisa e recarrega. by: quem deu,
// quando foi escolhido (só vai quando há, para salvar mesmo sem o 022).
// Vibração bem curta quando a dose fica marcada: o toque leve do sistema. Se falhar, segue sem vibrar.
const haptics = NATIVE ? window.Capacitor.registerPlugin('Haptics') : null;
const buzz = () => haptics?.impact({ style: 'LIGHT' }).catch(() => {});
async function giveDose(id, t, note, skipped, by) {
  const d = doseById(id); if (!d) return;
  const row = await addEntry({ kind: 'med', t, medicine_id: d.m.id, med_name: d.m.name, med_amount: d.m.amount,
                               dose_at: new Date(d.due).toISOString(), skipped: skipped || null, note: note || null, ...(by ? { done_by: by } : {}) });
  if (!row) return;
  if (!skipped) buzz();
  if (S?.mode === 'meds') { drawMeds(); $('sheetIn').querySelector(`.ck[data-val="${id}"]`)?.closest('.dose').classList.add('ticking'); }
  const msg = skipped ? 'Dose de ' + d.m.name + ' pulada'
    : d.due - t > SOON ? 'Dose das ' + d.hhmm + ' marcada às ' + hm(t) : 'Dose de ' + d.m.name + ' marcada às ' + hm(t);
  toast(msg, async () => { if (await deleteEntry(row.id) && S?.mode === 'meds') drawMeds(); });
  return row;
}
async function prnNow(mid) {
  const m = st.meds.find(x => x.id === mid); if (!m) return;
  const row = await addEntry({ kind: 'med', t: Date.now(), medicine_id: m.id, med_name: m.name, med_amount: m.amount });
  if (!row) return;
  buzz();
  if (S?.mode === 'meds') drawMeds();
  toast('Dose de ' + m.name + ' marcada às ' + hm(Date.parse(row.at)), async () => { if (await deleteEntry(row.id) && S?.mode === 'meds') drawMeds(); });
}

// Uma dose: marcar com outro horário, pular ou desmarcar. "back" volta para a lista, se veio dela.
function doseSheet(id, back) { S = { mode: 'dose', id, back, base: startOfDay(Date.now()), time: hm(Date.now()), note: '', err: '' }; drawDose(); }
function drawDose() {
  const d = doseById(S.id); if (!d) return closeSheet();
  const m = d.m, when = dayWord(d.due);
  let h = head(m.name) + `<p class="dsub">${esc([m.amount, 'dose das ' + d.hhmm + (when ? ' de ' + when : '')].filter(Boolean).join(' · '))}</p>`;
  if (d.e) {
    h += `<div class="given${d.e.skipped ? ' skip' : ''}"><span class="ck">${d.e.skipped ? DASH : CHECK}</span><span>${d.e.skipped ? 'Pulada por ' + esc(whoGave(d.e)) : 'Dada por ' + esc(whoGave(d.e)) + ' às ' + hm(d.e.t)}</span></div>`;
    h += `<button class="ghost" data-act="unmark">${d.e.skipped ? 'Desfazer' : 'Desmarcar'}</button>`;
    if (!d.e.skipped) h += '<p class="dim">Desmarcar apaga o registro da linha do tempo. Use só se marcou por engano.</p>';
  } else {
    if (d.state === 'later') h += `<div class="soft">Ainda não é a hora: a dose é às ${d.hhmm}${when ? ' de ' + when : ''}. Se já deu, dá para marcar.</div>`;
    h += `<div><div class="lbl">Horário que deu</div>${clockHtml('timeIn', S.time, 'med', 'Horário que deu')}${QUICK_TIME}</div>`;
    if (st.members.length > 1) h += byHtml('med', 'Quem deu');
    h += `<input class="field" id="noteIn" maxlength="300" placeholder="Observação (opcional)" value="${esc(S.note)}">`;
    h += '<button class="save" data-act="give">Marcar como dada</button><button class="del" data-act="skip">Pular esta dose</button>';
  }
  openPanel(h);
}
const leaveDose = () => S.back === 'meds' ? medsSheet() : closeSheet();

// Programar ou editar um remédio. "back" é 'pane' quando veio da aba do bebê: ao salvar, volta para ela.
function medForm(m, back) {
  const sched = m?.schedule || 'fixed', times = m && sched !== 'prn' ? medTimes(m) : ['09:00'];
  S = { mode: 'medform', edit: m || null, name: m?.name || '', amount: m?.amount || '', sched, times,
        every: m?.every_hours || (sched === 'prn' ? 6 : 8), first: sched === 'every' ? times[0] : '08:00',
        gap: sched === 'prn' && m?.every_hours ? 'every' : 'none',
        dur: m?.days ? 'days' : 'none', days: m?.days || 7, start: m ? dayOf(m.start_date) : startOfDay(Date.now()),
        err: '', confirmStop: false, back };
  drawMedForm(); $('sheet').scrollTop = 0;
}
const everyHint = () => 'Horários: ' + everyTimes(S.every, S.first).join(', ');
function drawMedForm() {
  const today = startOfDay(Date.now());
  let h = head(S.edit ? 'Editar remédio' : 'Programar remédio');
  h += `<div><label class="lbl" for="mName">Nome</label><input class="field" id="mName" maxlength="40" placeholder="Ex.: Vitamina D" value="${esc(S.name)}"></div>`;
  h += `<div><label class="lbl" for="mAmount">Quanto <small>(opcional)</small></label><input class="field" id="mAmount" maxlength="30" placeholder="Ex.: 2 gotas, 2,5 ml" value="${esc(S.amount)}"></div>`;
  h += `<div><div class="lbl">Quando dar</div><div class="seg k-med" style="background:none">${opt('Horários fixos', S.sched === 'fixed', 'sched', 'fixed')}${opt('De X em X horas', S.sched === 'every', 'sched', 'every')}${opt('Só quando precisar', S.sched === 'prn', 'sched', 'prn')}</div></div>`;
  if (S.sched === 'fixed')
    h += `<div><div class="lbl">Horários</div><div class="tchips">${S.times.map((t, i) => `<span class="tchip${S.openTime === i ? ' on' : ''}"><button class="t" data-act="openTime" data-val="${i}" aria-expanded="${S.openTime === i}"><b id="mtl-${i}">${t}</b></button>${S.times.length > 1 ? `<button data-act="rmTime" data-val="${i}" aria-label="Tirar este horário">×</button>` : ''}</span>`).join('')}${S.times.length < 8 ? '<button class="small" data-act="addTime">+ horário</button>' : ''}</div>${S.openTime != null && S.times[S.openTime] != null ? clockHtml('mt-' + S.openTime, S.times[S.openTime], 'med', 'Horário ' + (S.openTime + 1)) : ''}</div>`;
  const stepper = `<div class="ml"><button data-act="every" data-val="-1" aria-label="Menos horas">−</button><output>${S.every}</output><em>horas</em><button data-act="every" data-val="1" aria-label="Mais horas">+</button></div>`;
  if (S.sched === 'every')
    h += `<div><div class="lbl">De quantas em quantas horas</div>${stepper}</div>
      <div><div class="lbl">Primeira dose do dia</div>${clockHtml('mFirst', S.first, 'med', 'Primeira dose do dia')}<div class="hint" id="everyHint">${esc(everyHint())}</div></div>`;
  if (S.sched === 'prn') {
    h += `<div><div class="lbl">Intervalo entre as doses <small>(opcional)</small></div><div class="seg k-med" style="background:none">${opt('Sem intervalo', S.gap === 'none', 'gap', 'none')}${opt('De X em X horas', S.gap === 'every', 'gap', 'every')}</div>`;
    if (S.gap === 'every') h += `<div style="margin-top:10px">${stepper}</div>`;
    h += '</div>';
  }
  if (S.sched !== 'prn') {
    h += `<div><div class="lbl">Até quando</div><div class="seg k-med" style="background:none">${opt('Sem data para acabar', S.dur === 'none', 'dur', 'none')}${opt('Por alguns dias', S.dur === 'days', 'dur', 'days')}</div>`;
    if (S.dur === 'days') h += `<div class="ml" style="margin-top:10px"><button data-act="days" data-val="-1" aria-label="Menos um dia">−</button><output>${S.days}</output><em>${S.days === 1 ? 'dia' : 'dias'}</em><button data-act="days" data-val="1" aria-label="Mais um dia">+</button></div>
      <div class="hint" style="margin-top:8px">${S.start === today ? 'Começa hoje' : 'Começou ' + dayTitle(S.start).toLowerCase()}. Último dia: ${dayTitle(addDays(S.start, S.days - 1)).toLowerCase()}.</div>`;
    h += '</div>';
  }
  h += `<div class="note">${ICON.med}<span>${S.sched === 'prn' ? 'Fica na lista de remédios com o botão “Dei agora” e a última vez que foi dado.' + (S.gap === 'every' ? ' Com intervalo, mostra também a partir de que horas pode dar de novo.' : '') : 'Uma hora antes de cada horário, a dose aparece em destaque no alto da tela, com a caixinha para marcar e o “Pular”. Fica assim até alguém marcar ou pular.'}</span></div>`;
  h += '<p class="dim">O Soneca só lembra o que vocês programarem. Nome, quanto e horários vêm da receita.</p>';
  if (S.err) h += `<div class="err">${esc(S.err)}</div>`;
  h += '<button class="save" data-act="saveMed">Salvar</button>';
  if (S.edit) h += `<button class="del" data-act="stopMed">${S.confirmStop ? 'Toque de novo para parar este remédio' : 'Parar este remédio'}</button>`;
  const top = $('sheet').scrollTop; openPanel(h); $('sheet').scrollTop = top;
}
async function saveMed(btn) {
  const name = S.name.trim(), amount = S.amount.trim();
  const times = S.sched === 'fixed' ? [...new Set(S.times.filter(Boolean))].sort() : S.sched === 'every' ? everyTimes(S.every, S.first) : null;
  if (!name) { S.err = 'Escreva o nome do remédio.'; return drawMedForm(); }
  if (S.sched === 'fixed' && !times.length) { S.err = 'Escolha pelo menos um horário.'; return drawMedForm(); }
  if (S.sched === 'every' && !S.first) { S.err = 'Escolha o horário da primeira dose.'; return drawMedForm(); }
  const row = { name, amount: amount || null, schedule: S.sched, times,
                every_hours: S.sched === 'every' || (S.sched === 'prn' && S.gap === 'every') ? S.every : null,
                days: S.sched !== 'prn' && S.dur === 'days' ? S.days : null };
  const back = S.back, isNew = !S.edit;
  busy(btn, true);
  const q = S.edit ? sb.from('medicines').update(row).eq('id', S.edit.id)
                   : sb.from('medicines').insert({ family_id: st.family.id, baby_id: st.baby.id, start_date: localDate(Date.now()), ...row });
  const { data, error } = await q.select().single();
  busy(btn, false);
  if (error) { S.err = 'Não foi possível salvar. Confira a conexão e tente de novo.'; return drawMedForm(); }
  st.meds = [...st.meds.filter(x => x.id !== data.id), data].sort((a, b) => a.created_at < b.created_at ? -1 : 1);
  leaveMedForm(back); toast('Salvo');
  // Quem programa o primeiro remédio de horário fica com o aviso ligado neste celular.
  if (medNotif && isNew && row.schedule !== 'prn' && lsGet(alertKey(st.baby.id)) == null) setMedAlert(true);
}
// Parar não apaga: o remédio some da lista e das doses, e os registros continuam na linha do tempo.
async function stopMed(btn) {
  const back = S.back;
  busy(btn, true);
  const { error } = await sb.from('medicines').update({ stopped_at: new Date().toISOString() }).eq('id', S.edit.id);
  busy(btn, false);
  if (error) { S.err = 'Não foi possível parar. Confira a conexão e tente de novo.'; return drawMedForm(); }
  st.meds = st.meds.filter(x => x.id !== S.edit.id);
  leaveMedForm(back); toast('Remédio parado');
}
const leaveMedForm = back => { if (back === 'pane') closeSheet(); else { render(); medsSheet(); } };

// Aviso na hora do remédio (só no app): o próprio celular agenda as doses dos próximos dias do bebê
// aberto que ninguém marcou. Sem servidor: se outra pessoa marcar com este app fechado, o aviso toca
// mesmo assim. A chave fica guardada no celular, por bebê; quem programa um remédio fica com ela ligada.
const medNotif = NATIVE ? window.Capacitor.registerPlugin('LocalNotifications') : null;
const ALERT_DAYS = 3, ALERT_MAX = 48;   // o iPhone guarda no máximo 64 avisos agendados por app
const alertKey = id => 'cad-medalert-' + id;
const alertOn = () => !!st.baby && lsGet(alertKey(st.baby.id)) === '1';
// Número do aviso: sai da dose e do texto, então mudar o nome ou o horário troca o aviso.
const alertId = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) || 1; };
let alertTimer = 0;
const medAlertsLater = () => { if (medNotif) { clearTimeout(alertTimer); alertTimer = setTimeout(medAlertsSync, 800); } };
async function medAlertsSync() {
  const b = st.baby; if (!medNotif || !b) return;
  try {
    const now = Date.now(), ok = alertOn() && await notifGranted();
    const want = (ok ? dosesFrom(now + 5000, now + ALERT_DAYS * DAY).filter(d => !d.e).slice(0, ALERT_MAX) : []).map(d => alertFor(d, b));
    if (ANDROID && want.length) await medNotif.createChannel({ id: 'remedio', name: 'Hora do remédio', importance: 4, visibility: 1, vibration: true });
    const { notifications: old } = await medNotif.getPending();
    const mine = old.filter(n => n.extra?.baby === b.id && n.extra?.dose), keep = new Set(want.map(n => n.id)), have = new Set(mine.map(n => +n.id));
    const drop = mine.filter(n => !keep.has(+n.id)), add = want.filter(n => !have.has(n.id));
    if (drop.length) await medNotif.cancel({ notifications: drop.map(n => ({ id: +n.id })) });
    if (add.length) await medNotif.schedule({ notifications: add });
    // Item 45: a dose marcada (dada ou pulada), aqui ou por outra pessoa, tira da central de notificações
    // o aviso que já tocou. Achado pelo número do aviso, que o iPhone e o Android devolvem igual.
    const doneIds = new Set(dosesFrom(now - ALERT_DAYS * DAY, now + 5000).filter(d => d.e).map(d => alertFor(d, b).id));
    if (!doneIds.size) return;
    const { notifications: shown = [] } = await medNotif.getDeliveredNotifications();
    const clear = shown.filter(n => doneIds.has(+n.id));
    if (clear.length) await medNotif.removeDeliveredNotifications({ notifications: clear });
  } catch {}
}
// O aviso de uma dose. O número sai da dose e do texto, então é o mesmo antes e depois de tocar.
function alertFor(d, b) {
  const title = 'Hora do remédio de ' + b.name, body = [d.m.name, d.m.amount, 'dose das ' + d.hhmm].filter(Boolean).join(' · ');
  return { id: alertId(d.id + title + body), title, body, schedule: { at: new Date(d.due), allowWhileIdle: true },
           channelId: 'remedio', smallIcon: 'ic_stat_remedio', extra: { baby: b.id, dose: d.id } };
}
// Ligar a chave pede a permissão de avisos na primeira vez. Negada, a chave volta a ficar desligada.
async function setMedAlert(on) {
  if (!medNotif || !st.baby) return;
  const k = alertKey(st.baby.id);
  if (on) {
    if (!(await notifPerm()).ok) { lsSet(k, '0'); toast(NOTIF_DENIED); return S?.mode === 'meds' && drawMeds(); }
  }
  lsSet(k, on ? '1' : '0');
  if (S?.mode === 'meds') drawMeds();
  medAlertsSync();
}
// Tocar no aviso abre a dose. Com o app ainda abrindo, espera a família carregar.
let alertTap = null;
medNotif?.addListener('localNotificationActionPerformed', a => {
  const x = a.notification?.extra;
  alertTap = x?.dose ? x : null;
  if (alertTap) openAlertDose(); else if (x?.go) { remTap = x; openRemTap(); }
});
async function openAlertDose() {
  const x = alertTap; if (!x || !st.family || $('scrMain').hidden) return;
  alertTap = null;
  if (st.baby?.id !== x.baby) { if (!st.babies.some(b => b.id === x.baby)) return; await selectBaby(x.baby); }
  if (doseById(x.dose)) doseSheet(x.dose);
}

function medInput(el) {
  const id = el.id, v = el.value;
  if (id === 'mName') S.name = v;
  else if (id === 'mAmount') S.amount = v;
  else if (id.startsWith('mt-')) { S.times[+id.slice(3)] = v; const l = $('mtl-' + id.slice(3)); if (l) l.textContent = v; }
  else if (id === 'mFirst') { S.first = v; $('everyHint').textContent = everyHint(); }
  else if (id === 'timeIn') S.time = v;
  else if (id === 'noteIn') S.note = v;
  if (S.err) { S.err = ''; $('sheetIn').querySelector('.err')?.remove(); }
}
async function medAction(a, v, btn) {
  if (S.mode === 'meds') {
    if (a === 'medAlert') return setMedAlert(!alertOn());
    if (a === 'newMed') return medForm(null);
    if (a === 'editMed') return medForm(st.meds.find(m => m.id === v));
    if (a === 'prnNow') {
      const m = st.meds.find(x => x.id === v);
      if (m && prnNext(m) && S.prnAsk !== v) { S.prnAsk = v; return drawMeds(); }
      S.prnAsk = null; return prnNow(v);
    }
    if (a === 'giveNow') {
      const m = st.meds.find(x => x.id === v), d = m && nowDose(m); if (!d) return;
      if (d.due - Date.now() > SOON && S.nowAsk !== v) { S.nowAsk = v; return drawMeds(); }
      S.nowAsk = null; return giveDose(d.id, Date.now());
    }
    if (a === 'check') return giveDose(v, Date.now());
    if (a === 'skipDose') return giveDose(v, Date.now(), null, true);
    if (a === 'dose') return doseSheet(v, 'meds');
    return;
  }
  if (S.mode === 'dose') {
    if (a === 'now') { S.base = startOfDay(Date.now()); S.time = hm(Date.now()); }
    else if (a === 'back') { const t = computeT() - (+v) * MIN; S.base = startOfDay(t); S.time = hm(t); }
    else if (a === 'by') S.by = S.by === v ? null : v;
    else if (a === 'give' || a === 'skip') {
      const { id, note, by } = S, t = a === 'give' ? computeT() : Date.now();
      leaveDose(); return giveDose(id, t, note.trim().slice(0, 300), a === 'skip', a === 'give' ? by : null);
    }
    else if (a === 'unmark') {
      const d = doseById(S.id); leaveDose();
      if (d?.e && await deleteEntry(d.e.id)) { if (S?.mode === 'meds') drawMeds(); toast(d.e.skipped ? 'Dose de volta' : 'Dose desmarcada'); }
      return;
    }
    return drawDose();
  }
  if (a === 'sched') S.sched = v;
  else if (a === 'dur') S.dur = v;
  else if (a === 'gap') S.gap = v;
  else if (a === 'addTime') { const [H, M] = (S.times.filter(Boolean).at(-1) || '09:00').split(':').map(Number); S.times.push(pad((H + 12) % 24) + ':' + pad(M)); S.openTime = S.times.length - 1; }
  else if (a === 'rmTime') { S.times.splice(+v, 1); if (S.openTime === +v) S.openTime = null; else if (S.openTime > +v) S.openTime--; }
  else if (a === 'openTime') S.openTime = S.openTime === +v ? null : +v;
  else if (a === 'every') S.every = EVERY[Math.max(0, Math.min(EVERY.length - 1, EVERY.indexOf(S.every) + (+v)))];
  else if (a === 'days') S.days = Math.max(1, Math.min(60, S.days + (+v)));
  else if (a === 'saveMed') return saveMed(btn);
  else if (a === 'stopMed') { if (S.confirmStop) return stopMed(btn); S.confirmStop = true; }
  S.err = ''; drawMedForm();
}

/* ---------- Tarefas: a rotina programada (antes Cuidados, 08/11) ---------- */
// Prévia aprovada: https://claude.ai/artifact/GDAaPiB7wR9iuqMVHfFT8r. O botão Tarefas abre a lista da
// rotina logo abaixo do título (sem nada programado, só a capivara). Cada tarefa abre uma tela só dela.
// Na hora marcada, a tarefa de horário fixo aparece em "Hora da tarefa", no alto da tela inicial, como a
// dose do remédio; "Vezes por dia" não tem hora e fica só na lista. Marcar vibra como na dose. "Hoje não"
// tira do alto só neste celular. Anotar pelo botão (tarefa avulsa) também conta: a tarefa do dia é
// marcada por qualquer registro do mesmo tipo.
const TASKS = [['sunbath', 'Banho de sol'], ['tummy', 'Tummy time'], ['ointment', 'Pomada para assadura'], ['bath', 'Banho'],
               ['massage', 'Massagem'], ['nasal', 'Lavagem nasal'], ['care', 'Outra tarefa']];
const TASK_NAME = Object.fromEntries(TASKS);
const taskName = r => r.kind === 'care' ? r.name : TASK_NAME[r.kind];
// "Banho de sol marcado", "Massagem marcada": o feminino de cada tarefa.
const TASK_FEM = ['massage', 'nasal', 'ointment', 'care'];
const fem = (k, m, f) => TASK_FEM.includes(k) ? f : m;
const taskTimes = r => (r.times || []).map(x => x.slice(0, 5)).sort();
const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
const sameTask = (r, e) => e.kind === r.kind && (r.kind !== 'care' || (e.note || '').trim().toLowerCase() === r.name.trim().toLowerCase());
// Os horários (ou as vezes) de um dia, cada um com o registro que o marcou, na ordem em que foram feitos.
// Horário de antes de a tarefa ser programada não conta, como no remédio.
function taskSlots(r, d0 = startOfDay(Date.now())) {
  const d1 = addDays(d0, 1), made = Date.parse(r.created_at) || 0;
  const done = sortedEntries().filter(e => e.t >= d0 && e.t < d1 && sameTask(r, e));
  const slots = r.schedule === 'fixed' ? taskTimes(r).map(hh => ({ hh, due: atTime(d0, hh) })).filter(x => x.due >= made || d0 > made)
    : r.schedule === 'count' ? Array.from({ length: r.per_day }, (_, i) => ({ n: i + 1, due: null })) : [];
  slots.forEach((x, i) => { x.e = done[i] || null; x.id = r.id + '@' + (x.due ?? 'n' + x.n); });
  return slots;
}
// "Hoje não": só neste celular, só naquele horário.
const OFF = 'cad-tarefa-hoje-nao';
const offList = () => { try { return JSON.parse(lsGet(OFF)) || []; } catch { return []; } };
const isOff = id => offList().includes(id);
const setOff = id => lsSet(OFF, JSON.stringify([...offList().filter(x => +x.split('@')[1] > Date.now() - 2 * DAY), id]));

// Tela inicial: de cada tarefa de horário fixo, o horário mais recente que já chegou, sem marcar.
function homeTasks() {
  const now = Date.now(), out = [];
  for (const r of st.routines) {
    if (r.schedule !== 'fixed') continue;
    const x = taskSlots(r).filter(x => x.due <= now).at(-1);
    if (x && !x.e && !isOff(x.id)) out.push({ r, ...x });
  }
  return out.sort((a, b) => a.due - b.due);
}
let tasksBusy = 0;
function renderTasks() {
  if (tasksBusy) return;
  const box = $('tasks'), list = homeTasks();
  box.hidden = !list.length; if (box.hidden) return;
  box.innerHTML = `<div class="mh"><h3>${ICON.care}<span>Hora da tarefa</span></h3><button class="lnk" data-act="allTasks">Ver todas (${st.routines.length})</button></div>
    <div class="doses">${list.map(x => `<div class="dose soon can"><button class="ck" role="checkbox" aria-checked="false" data-act="tcheck" data-val="${esc(x.id)}" aria-label="Marcar ${esc(taskName(x.r))} das ${x.hh} como feito">${CHECK}</button><button class="di" data-act="topen" data-val="${esc(x.r.id)}"><span><b>${esc(taskName(x.r))}</b><span class="st"></span></span><span class="tm">${x.hh}</span></button><button class="skipbtn" data-act="tskip" data-val="${esc(x.id)}">Hoje não</button></div>`).join('')}</div>`;
}
// Marcar na tela inicial: como a dose, o check na hora, um instante, e a linha encolhe.
async function markTaskHome(b, off) {
  const row = b.closest('.dose'); if (!row || row.classList.contains('done')) return;
  const [rid] = b.dataset.val.split('@'), r = st.routines.find(x => x.id === rid);
  if (!r) return;
  if (r.kind === 'ointment' && !off) return taskScreen(r, 'home');   // a pomada pede quais foram passadas
  tasksBusy++;
  if (!off) { row.classList.add('ticking', 'done'); row.querySelector('.ck').setAttribute('aria-checked', 'true'); }
  const [saved] = await Promise.all([off ? (setOff(b.dataset.val), true) : doTask(r), pause(off ? 0 : 550)]);
  if (saved) {
    row.classList.add('fade'); await pause(250);
    row.style.height = row.offsetHeight + 'px'; row.offsetHeight;
    row.classList.add('shrink'); row.style.height = '0px'; await pause(220);
    row.remove();
    if (tasksBusy === 1 && !$('tasks').querySelector('.dose')) { $('tasks').classList.add('gone'); await pause(250); }
  }
  tasksBusy--; if (!tasksBusy) { $('tasks').classList.remove('gone'); renderTasks(); taskAlertsLater(); }
}
// Marca a tarefa agora: o mesmo registro da tarefa avulsa, com a vibração leve da dose.
async function doTask(r, ointments) {
  const ev = { kind: r.kind, t: Date.now() };
  if (r.kind === 'care') ev.note = r.name;
  if (r.kind === 'ointment') ev.ointments = ointments;
  const row = await addEntry(ev);
  if (!row) return null;
  buzz();
  toast(r.kind === 'care' ? 'Tarefa marcada às ' + hm(Date.parse(row.at)) : taskName(r) + fem(r.kind, ' marcado', ' marcada') + ' às ' + hm(Date.parse(row.at)),
        async () => { if (await deleteEntry(row.id)) redrawTasks(); });
  return row;
}
const redrawTasks = () => { if (S?.mode === 'tasks') drawTasks(); else if (S?.mode === 'task') drawTask(); };

// A folha Tarefas: a lista logo abaixo do título; sem nada programado, a capivara dormindo.
function tasksSheet() { S = { mode: 'tasks' }; drawTasks(); $('sheet').scrollTop = 0; }
function taskRow(r) {
  const slots = taskSlots(r), done = slots.filter(x => x.e).length;
  let sub, right = '';
  if (r.schedule === 'fixed') {
    sub = 'todo dia às ' + taskTimes(r).join(', ').replace(/, ([^,]*)$/, ' e $1');
    const next = slots.find(x => !x.e);
    right = !slots.length ? '' : next ? `<span class="tp">${next.hh}</span>` : `<span class="tp" aria-label="feito hoje">${CHECK}</span>`;
  } else if (r.schedule === 'count') {
    sub = (r.per_day === 1 ? '1 vez por dia' : r.per_day + ' vezes por dia') + ' · ' + done + ' de ' + r.per_day + ' hoje';
    right = `<span class="dots" aria-hidden="true">${slots.map(x => `<i${x.e ? ' class="f"' : ''}></i>`).join('')}</span>`;
  } else {
    const n = (r.items || []).length;
    sub = 'na troca de fralda · ' + (n === 1 ? '1 pomada' : n + ' pomadas');
    right = '<span></span>';
  }
  return `<button class="trow" data-act="tOpen" data-val="${esc(r.id)}"><span class="ti">${ICON[r.kind]}</span><span><b>${esc(taskName(r))}</b><small>${esc(sub)}</small></span>${right || '<span></span>'}<span class="cv" aria-hidden="true">›</span></button>`;
}
const taskAlertKey = id => 'cad-tarefaalert-' + id;
const taskAlertOn = () => !!st.baby && lsGet(taskAlertKey(st.baby.id)) === '1';
function drawTasks() {
  let h = `<div class="grab"></div><div class="shead"><h3>Tarefas<span class="ps">de ${esc(st.baby.name)}</span></h3><button class="x" data-act="close" aria-label="Fechar">×</button></div>`;
  if (!st.routines.length) h += `<div class="lake">${CAPI.replace(' class="capi"', '')}</div><button class="save" data-act="tNew">Programar tarefa</button><button class="ghost" data-act="tLoose">Anotar uma tarefa avulsa</button>`;
  else {
    h += `<div class="tlist">${st.routines.map(taskRow).join('')}</div>`;
    if (medNotif) h += `<button class="li tg" role="switch" aria-checked="${taskAlertOn()}" data-act="tAlert"><span>Ativar notificações de tarefas</span><span class="sw${taskAlertOn() ? ' on' : ''}" aria-hidden="true"><i></i></span></button>`;
    h += '<button class="ghost" data-act="tNew">+ Programar tarefa</button><button class="ghost" data-act="tLoose">Anotar uma tarefa avulsa</button>'
      + '<p class="dim">Só a família programa. O Soneca lembra os horários e não cobra o que ficou para depois.</p>';
  }
  const top = $('sheet').scrollTop; openPanel(h); $('sheet').scrollTop = top;
}
// Programar: primeiro escolhe qual tarefa; cada uma abre a sua tela. As que já estão na rotina não
// aparecem (a outra tarefa pode ter várias).
function pickSheet() {
  S = { mode: 'taskpick' };
  const free = TASKS.filter(([k]) => k === 'care' || !st.routines.some(r => r.kind === k));
  openPanel(`<div class="grab"></div><div class="shead"><h3>Programar tarefa<span class="ps">de ${esc(st.baby.name)}</span></h3><button class="x" data-act="close" aria-label="Fechar">×</button></div>
    <div class="tlist">${free.map(([k, n]) => `<button class="trow" data-act="tPick" data-val="${k}"><span class="ti">${ICON[k]}</span><span><b>${esc(n)}</b></span><span></span><span class="cv" aria-hidden="true">›</span></button>`).join('')}</div>`);
  $('sheet').scrollTop = 0;
}
// A tela de uma tarefa só (nova ou já programada). from: de onde veio, para o "voltar".
function taskScreen(r, from, kind, ret) {
  const k = r ? r.kind : kind;
  S = { mode: 'task', r: r || null, kind: k, from, ret: ret || null, name: r?.name || '', sched: r?.schedule || (k === 'ointment' ? 'diaper' : 'fixed'),
        times: r && r.schedule === 'fixed' ? taskTimes(r) : ['09:00'], per: r?.per_day || 3, items: [...(r?.items || [])],
        oint: new Set(), item: '', addOpen: false, openTime: null, err: '', confirmStop: false };
  drawTask(); $('sheet').scrollTop = 0;
}
function slotRow(r, x) {
  const name = esc(taskName(r)), when = x.hh || x.n + 'ª vez';
  if (x.e) return `<div class="dose done"><span class="ck" aria-hidden="true">${CHECK}</span><span class="di"><span><b>${name}</b><span class="st">${esc(fem(r.kind, 'feito', 'feita') + ' por ' + whoGave(x.e) + ' às ' + hm(x.e.t))}</span></span><span class="tm">${when}</span></span></div>`;
  return `<div class="dose later can"><button class="ck" role="checkbox" aria-checked="false" data-act="tTick" aria-label="Marcar ${name} (${when}) como feito">${CHECK}</button><span class="di"><span><b>${name}</b><span class="st"></span></span><span class="tm">${when}</span></span></div>`;
}
function drawTask() {
  const isNew = !S.r, k = S.kind, b = st.baby;
  if (!isNew && !st.routines.some(r => r.id === S.r.id)) return tasksSheet();   // tirada da rotina em outro celular
  const nm = k === 'care' ? (S.name.trim() || TASK_NAME.care) : TASK_NAME[k];
  let h = `<div class="tbar"><button class="bk" data-act="tBack">${BACK}${S.ret ? 'Fralda' : isNew ? 'Programar tarefa' : 'Tarefas'}</button></div>
    <div class="thero"><span class="ti">${ICON[k]}</span><div><h3>${esc(nm)}</h3><small>${isNew ? 'Nova tarefa na rotina de ' : 'Tarefa da rotina de '}${esc(b.name)}</small></div></div>`;
  if (k === 'care') h += `<div><label class="lbl" for="tName">Nome da tarefa</label><input class="field" id="tName" maxlength="40" placeholder="Ex.: Cortar as unhas" value="${esc(S.name)}"></div>`;
  // Hoje: cada horário (ou cada vez) com o círculo para marcar; a pomada, quais foram passadas agora.
  if (!isNew && S.r.schedule !== 'diaper' && k !== 'ointment') h += `<div class="sec cs"><h4>Hoje</h4><div class="doses">${taskSlots(S.r).map(x => slotRow(S.r, x)).join('')}</div></div>`;
  if (!isNew && k === 'ointment' && S.items.length)
    h += `<div class="sec"><h4>Passou agora</h4><div class="olist">${S.items.map(n => { const on = S.oint.has(n);
      return `<button class="oline${on ? ' on' : ''}" data-act="tOint" data-val="${esc(n)}" role="checkbox" aria-checked="${on}"><span class="ck">${CHECK}</span><span>${esc(n)}</span></button>`; }).join('')}</div></div>`;
  h += `<div class="cs"><div class="lbl">Quando</div><div class="seg" style="background:none">${k === 'ointment' ? opt('Na troca de fralda', S.sched === 'diaper', 'tSched', 'diaper') : ''}${opt('Horários fixos', S.sched === 'fixed', 'tSched', 'fixed')}${opt('Vezes por dia', S.sched === 'count', 'tSched', 'count')}</div></div>`;
  if (S.sched === 'fixed')
    h += `<div class="cs"><div class="lbl">Horários</div><div class="tchips">${S.times.map((t, i) => `<span class="tchip${S.openTime === i ? ' on' : ''}"><button class="t" data-act="tOpenTime" data-val="${i}" aria-expanded="${S.openTime === i}"><b id="ttl-${i}">${t}</b></button>${S.times.length > 1 ? `<button data-act="tRmTime" data-val="${i}" aria-label="Tirar este horário">×</button>` : ''}</span>`).join('')}${S.times.length < 8 ? '<button class="small" data-act="tAddTime">+ horário</button>' : ''}</div>${S.openTime != null && S.times[S.openTime] != null ? clockHtml('tt-' + S.openTime, S.times[S.openTime], 'care', 'Horário ' + (S.openTime + 1)) : ''}</div>`
      + `<div class="note cs">${ICON.care}<span>Na hora marcada, a tarefa aparece em destaque no alto da tela, com a caixinha para marcar. Fica assim até alguém marcar ou o dia acabar.</span></div>`;
  if (S.sched === 'count') h += `<div><div class="ml"><button data-act="tPer" data-val="-1" aria-label="Menos uma vez">−</button><output>${S.per}</output><em>${S.per === 1 ? 'vez por dia' : 'vezes por dia'}</em><button data-act="tPer" data-val="1" aria-label="Mais uma vez">+</button></div></div>`;
  if (k === 'ointment') {
    h += `<div class="sec"><h4>Pomadas de ${esc(b.name)}</h4>${S.items.map((n, i) => `<div class="li"><span>${esc(n)}</span><button data-act="tRmItem" data-val="${i}">Tirar</button></div>`).join('')}`
      + (S.addOpen || !S.items.length ? `<div class="addrow"><input class="field" id="tItem" maxlength="40" placeholder="Nome da pomada" value="${esc(S.item)}"><button class="small" data-act="tAddItem">Adicionar</button></div>`
                                      : (S.items.length < 12 ? '<button class="ghost" data-act="tNewItem">+ Nova pomada</button>' : '')) + '</div>';
    h += '<p class="dim">As pomadas aparecem na Fralda, para marcar na hora da troca.</p>';
  }
  // Últimos dias: os registros desta tarefa antes de hoje, do mais novo para o mais antigo.
  if (!isNew) {
    const t0 = startOfDay(Date.now()), past = sortedEntries().filter(e => e.t < t0 && e.t >= addDays(t0, -7) && sameTask(S.r, e)).slice(-5).reverse();
    if (past.length) h += `<div class="sec"><h4>Últimos dias</h4><div class="hist2">${past.map(e => `<div><span>${esc(cap1(whenText(e.t)))}${e.kind === 'ointment' ? ' · ' + esc(e.ointments.join(', ')) : ''}</span><span>${esc(byText(e))}</span></div>`).join('')}</div></div>`;
  }
  h += `<div class="sfoot">${S.err ? `<div class="err">${esc(S.err)}</div>` : ''}<button class="save" data-act="tSave">Salvar</button>${isNew ? '' : `<button class="del" data-act="tStop">${S.confirmStop ? 'Toque de novo para tirar da rotina' : 'Tirar da rotina'}</button>`}</div>`;
  const top = $('sheet').scrollTop; openPanel(h); $('sheet').scrollTop = top;
}
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
async function saveTask(btn) {
  const k = S.kind, name = S.name.trim();
  const times = S.sched === 'fixed' ? [...new Set(S.times.filter(Boolean))].sort() : null;
  if (k === 'care' && !name) { S.err = 'Escreva o nome da tarefa.'; return drawTask(); }
  if (S.sched === 'fixed' && !times.length) { S.err = 'Escolha pelo menos um horário.'; return drawTask(); }
  if (k === 'ointment' && S.item.trim() && !S.items.includes(S.item.trim())) S.items.push(S.item.trim().slice(0, 40));
  if (k === 'ointment' && !S.items.length) { S.err = 'Escreva o nome de pelo menos uma pomada.'; return drawTask(); }
  const row = { name: k === 'care' ? name : null, schedule: S.sched, times, per_day: S.sched === 'count' ? S.per : null,
                items: k === 'ointment' ? S.items : null };
  const oint = [...S.oint].filter(n => S.items.includes(n)), r0 = S.r, ret = S.ret, added = S.items;
  busy(btn, true);
  const q = r0 ? sb.from('routines').update(row).eq('id', r0.id)
               : sb.from('routines').insert({ family_id: st.family.id, baby_id: st.baby.id, kind: k, ...row });
  const { data, error } = await q.select().single();
  busy(btn, false);
  if (error) { S.err = error.code === '23505' ? 'Esta tarefa já está na rotina.' : 'Não foi possível salvar. Confira a conexão e tente de novo.'; return drawTask(); }
  st.routines = [...st.routines.filter(x => x.id !== data.id), data].sort((a, b) => a.created_at < b.created_at ? -1 : 1);
  // Veio da Fralda: volta para a mesma troca, com as pomadas novas já marcadas.
  if (ret) { S = ret; for (const n of added) S.oint.add(n); drawEntry(); toast('Salvo'); return taskAlertsLater(); }
  tasksSheet();
  if (oint.length) await doTask(data, oint); else toast('Salvo');
  taskAlertsLater();
}
// Tirar da rotina não apaga: a tarefa some da lista e do alto, e os registros continuam na linha do tempo.
async function stopTask(btn) {
  busy(btn, true);
  const { error } = await sb.from('routines').update({ stopped_at: new Date().toISOString() }).eq('id', S.r.id);
  busy(btn, false);
  if (error) { S.err = 'Não foi possível tirar da rotina. Confira a conexão e tente de novo.'; return drawTask(); }
  st.routines = st.routines.filter(x => x.id !== S.r.id);
  tasksSheet(); toast('Tirada da rotina'); taskAlertsLater();
}
function taskInput(el) {
  const id = el.id, v = el.value;
  if (id === 'tName') { S.name = v; const t = $('sheetIn').querySelector('.thero h3'); if (t) t.textContent = v.trim() || TASK_NAME.care; }
  else if (id === 'tItem') S.item = v;
  else if (id.startsWith('tt-')) { S.times[+id.slice(3)] = v; const l = $('ttl-' + id.slice(3)); if (l) l.textContent = v; }
  if (S.err) { S.err = ''; $('sheetIn').querySelector('.err')?.remove(); }
}
async function taskAction(a, v, btn) {
  if (S.mode === 'tasks') {
    if (a === 'tNew') return pickSheet();
    if (a === 'tLoose') return openEntry('care', null, true);
    if (a === 'tOpen') { const r = st.routines.find(x => x.id === v); return r && taskScreen(r, 'tasks'); }
    if (a === 'tAlert') return setTaskAlert(!taskAlertOn());
    return;
  }
  if (S.mode === 'taskpick') { if (a === 'tPick') taskScreen(null, 'pick', v); return; }
  if (a === 'tBack') { if (S.ret) { S = S.ret; return drawEntry(); } return S.r ? tasksSheet() : pickSheet(); }
  if (a === 'tSave') return saveTask(btn);
  if (a === 'tStop') { if (S.confirmStop) return stopTask(btn); S.confirmStop = true; }
  else if (a === 'tTick') { const r = S.r; await doTask(r); return S?.mode === 'task' && drawTask(); }
  else if (a === 'tOint') { if (S.oint.has(v)) S.oint.delete(v); else S.oint.add(v); }
  else if (a === 'tSched') S.sched = v;
  else if (a === 'tPer') S.per = Math.max(1, Math.min(12, S.per + (+v)));
  else if (a === 'tAddTime') { const [H, M] = (S.times.filter(Boolean).at(-1) || '09:00').split(':').map(Number); S.times.push(pad((H + 6) % 24) + ':' + pad(M)); S.openTime = S.times.length - 1; }
  else if (a === 'tRmTime') { S.times.splice(+v, 1); if (S.openTime === +v) S.openTime = null; else if (S.openTime > +v) S.openTime--; }
  else if (a === 'tOpenTime') S.openTime = S.openTime === +v ? null : +v;
  else if (a === 'tNewItem') S.addOpen = true;
  else if (a === 'tAddItem') { const n = S.item.trim().slice(0, 40); if (n && !S.items.includes(n) && S.items.length < 12) S.items.push(n); S.item = ''; S.addOpen = false; }
  else if (a === 'tRmItem') { const [n] = S.items.splice(+v, 1); S.oint.delete(n); }
  S.err = ''; drawTask();
}

// Aviso na hora da tarefa (só no app, como o do remédio): o celular agenda os horários fixos dos próximos
// dias que ninguém marcou. Só com a chave ligada (vem desligada), guardada neste celular, por bebê.
// O iPhone guarda no máximo 64 avisos: 48 do remédio, 6 do lembrete e 10 das tarefas.
const TASK_ALERT_MAX = 10;
let taskAlertTimer = 0;
const taskAlertsLater = () => { if (medNotif) { clearTimeout(taskAlertTimer); taskAlertTimer = setTimeout(taskAlertsSync, 900); } };
function taskAlertFor(r, x, b) {
  const title = taskName(r) + ' de ' + b.name, body = 'Está na hora. Toque para marcar quando fizer.';
  return { id: alertId('t' + x.id + title), title, body, schedule: { at: new Date(x.due), allowWhileIdle: true },
           channelId: 'tarefa', smallIcon: 'ic_stat_mamada', extra: { baby: b.id, task: x.id, go: 'day' } };
}
function taskSlotsFrom(a, z) {
  const out = [];
  for (let d0 = startOfDay(a); d0 < z; d0 = addDays(d0, 1))
    for (const r of st.routines) if (r.schedule === 'fixed') for (const x of taskSlots(r, d0)) if (x.due >= a && x.due < z) out.push({ r, ...x });
  return out.sort((p, q) => p.due - q.due);
}
async function taskAlertsSync() {
  const b = st.baby; if (!medNotif || !b) return;
  try {
    const now = Date.now(), ok = taskAlertOn() && await notifGranted();
    const want = (ok ? taskSlotsFrom(now + 5000, now + ALERT_DAYS * DAY).filter(x => !x.e && !isOff(x.id)).slice(0, TASK_ALERT_MAX) : []).map(x => taskAlertFor(x.r, x, b));
    if (ANDROID && want.length) await medNotif.createChannel({ id: 'tarefa', name: 'Hora da tarefa', importance: 4, visibility: 1, vibration: true });
    const { notifications: old } = await medNotif.getPending();
    const mine = old.filter(n => n.extra?.baby === b.id && n.extra?.task), keep = new Set(want.map(n => n.id)), have = new Set(mine.map(n => +n.id));
    const drop = mine.filter(n => !keep.has(+n.id)), add = want.filter(n => !have.has(n.id));
    if (drop.length) await medNotif.cancel({ notifications: drop.map(n => ({ id: +n.id })) });
    if (add.length) await medNotif.schedule({ notifications: add });
    // A tarefa marcada tira da central de notificações o aviso que já tocou, como a dose.
    const doneIds = new Set(taskSlotsFrom(now - ALERT_DAYS * DAY, now + 5000).filter(x => x.e).map(x => taskAlertFor(x.r, x, b).id));
    const { notifications: shown = [] } = await medNotif.getDeliveredNotifications();
    const clear = shown.filter(n => doneIds.has(+n.id));
    if (clear.length) await medNotif.removeDeliveredNotifications({ notifications: clear });
  } catch {}
}
// Ligar a chave pede a permissão de avisos na primeira vez. Negada, a chave volta a ficar desligada.
async function setTaskAlert(on) {
  if (!medNotif || !st.baby) return;
  const k = taskAlertKey(st.baby.id);
  if (on) {
    if (!(await notifPerm()).ok) { lsSet(k, '0'); toast(NOTIF_DENIED); return S?.mode === 'tasks' && drawTasks(); }
  }
  lsSet(k, on ? '1' : '0');
  if (S?.mode === 'tasks') drawTasks();
  taskAlertsSync();
}

/* ---------- aba do bebê ---------- */
// Peso e comprimento (sobre as curvas da OMS), remédios programados, marcos e, no fim, nome e
// nascimento. Só guarda o que a família anota; as curvas mostram as linhas, sem avaliar o bebê.
const LOG = {
  weight:    { table: 'weights',    list: 'measures',   day: 'measured_on', sort: sortWeights },
  milestone: { table: 'milestones', list: 'milestones', day: 'happened_on', sort: sortMilestones },
};
/* ---------- peso e comprimento ---------- */
// Peso ou comprimento, sobre as curvas da OMS quando há nascimento e menina ou menino; senão, só os
// pontos no tempo. G.win: o pedaço visível em meses (nulo: o padrão, até um pouco depois da última medida).
const G = { kind: 'weight', win: null, baby: null };
const G_PRESETS = [['6 meses', 6], ['1 ano', 12], ['2 anos', 24], ['5 anos', 60]];
const gRows = () => G.kind === 'weight' ? st.weights : st.lengths;
const gCurves = () => !!(st.baby.birth_date && st.baby.sex);
function gWin() {
  if (G.baby !== st.baby.id) { G.baby = st.baby.id; G.win = null; }
  return G.win || growthWindow(gRows(), st.baby.birth_date);
}
function growthSvg() {
  const b = st.baby, rows = gRows(), [a, z] = gWin();
  if (gCurves()) return growthChart({ rows, kind: G.kind, sex: b.sex, birth: b.birth_date, a, b: z, id: 'gch' });
  return rows.length >= 2 ? weightChart(rows, G.kind) : '';
}
function growthHtml() {
  const b = st.baby, curves = gCurves(), [a, z] = gWin(), w = G.kind === 'weight';
  let h = `<div class="seg2" role="tablist">${[['weight', 'Peso'], ['length', 'Comprimento']].map(([k, n]) => `<button role="tab" aria-selected="${G.kind === k}" class="${G.kind === k ? 'on' : ''}" data-act="gKind" data-val="${k}">${n}</button>`).join('')}</div>`;
  if (curves) h += `<div class="gpre">${G_PRESETS.filter(([, m]) => w || m <= MAX_MONTHS).map(([n, m]) => `<button class="${a === 0 && z === m ? 'on' : ''}" data-act="gWin" data-val="${m}">${n}</button>`).join('')}</div>`;
  const svg = growthSvg();
  if (svg) h += `<div class="svgbox${curves ? ' gzoom' : ''}" id="gBox">${svg}</div>`;
  if (curves) h += `<p class="dim">Curvas da OMS adotadas pela SBP · ${b.sex === 'F' ? 'meninas' : 'meninos'} · percentis 3, 15, 50, 85 e 97. Pinça ou rodinha para zoom; arraste para os lados.</p>`;
  else h += `<p class="dim">${!gRows().length ? (w ? 'Nenhum peso anotado. ' : 'Nenhum comprimento anotado. ') : ''}Para ver as curvas da OMS, anote ${!b.birth_date && !b.sex ? 'o nascimento e se é menina ou menino' : !b.birth_date ? 'o nascimento' : 'se é menina ou menino'} em <button class="lnk inl" data-act="editBaby" data-val="${esc(b.id)}">Nome e nascimento</button>.</p>`;
  return h;
}
// Zoom no gráfico: rodinha do mouse, pinça com dois dedos e arrastar para os lados.
function bindZoom() {
  const box = $('gBox'); if (!box || !box.classList.contains('gzoom')) return;
  const set = (a, z) => {
    let sp = Math.min(MAX_MONTHS, Math.max(3, z - a));
    a = Math.min(Math.max(0, a), MAX_MONTHS - sp); G.win = [a, a + sp];
    box.innerHTML = growthSvg();
    box.parentElement.querySelectorAll('.gpre button').forEach(e => e.classList.toggle('on', G.win[0] === 0 && G.win[1] === +e.dataset.val));
  };
  const frac = cx => { const r = box.getBoundingClientRect(); return Math.min(1, Math.max(0, (cx - r.left - r.width * 30 / 340) / (r.width * 280 / 340))); };
  box.addEventListener('wheel', e => {
    e.preventDefault();
    const [a, z] = gWin(), f = frac(e.clientX), m = a + (z - a) * f, sp = (z - a) * Math.exp(e.deltaY * .0015);
    set(m - sp * f, m - sp * f + sp);
  }, { passive: false });
  const pts = new Map(); let s0 = null;
  const start = () => { s0 = pts.size ? { win: gWin(), p: new Map(pts) } : null; };
  box.addEventListener('pointerdown', e => { box.setPointerCapture(e.pointerId); pts.set(e.pointerId, e.clientX); start(); });
  box.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !s0) return;
    pts.set(e.pointerId, e.clientX);
    const [a, z] = s0.win, sp0 = z - a, w = box.getBoundingClientRect().width * 280 / 340;
    if (pts.size === 1 && s0.p.size === 1) { const dx = e.clientX - [...s0.p.values()][0]; set(a - dx / w * sp0, z - dx / w * sp0); }
    else if (pts.size >= 2 && s0.p.size >= 2) {
      const [p1, p2] = [...pts.values()], [q1, q2] = [...s0.p.values()], fc = frac((q1 + q2) / 2), mc = a + sp0 * fc;
      const sp = sp0 * (Math.abs(q2 - q1) || 1) / (Math.abs(p2 - p1) || 1);
      set(mc - sp * fc, mc - sp * fc + sp);
    }
  });
  const up = e => { pts.delete(e.pointerId); start(); };
  box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
}

// Tendências: a 5ª aba (item 58). A janela aberta pode ir além dos 60 dias que o app carrega: busca o
// que falta como o resumo de um mês antigo (loadOlder).
const trendFirst = b => b.birth_date ? dayOf(b.birth_date) : startOfDay(Date.parse(b.created_at));
function drawTrendsPane() {
  const b = st.baby, el = $('paneTrends'), t = st.trend;
  if (!b) { el.innerHTML = '<div class="ptitle"><h2>Tendências</h2></div><div class="soft">Cadastre o bebê da família para ver as tendências.</div>'; return; }
  const now = Date.now(), first = trendFirst(b);
  let loading = '';
  if (t.tab === 'sono') {
    const { a } = trendWindow(t.mode, t.off, now, first);
    if (olderMissing(a)) { loadOlder(a); loading = olderFailed() ? 'Não foi possível carregar os registros.' : 'Carregando…'; }
  }
  el.innerHTML = trendsHtml({ t, evs: sortedEntries(), now, first, pump: isOn('pump'), loading, rule: ruleOf(b), night: { de: deName(b), c: nightNow(b) },
    who: [b.name, ageText(b.birth_date)].filter(Boolean).join(' · '), chips: st.babies.length > 1 ? `<div class="babies">${babyChips()}</div>` : '' });
}
function drawBabyPane() {
  const b = st.baby, el = $('paneBaby');
  if (!b) {
    el.innerHTML = '<div class="ptitle"><h2>Bebê</h2></div><div class="soft">Cadastre o bebê da família para anotar o peso, os remédios e os marcos.</div><button class="save" data-act="addBaby">Adicionar bebê</button>';
    return;
  }
  const ws = st.weights, ms = st.milestones, now = Date.now(), meds = st.meds.filter(m => medEnd(m) > startOfDay(now));
  const sub = [ageText(b.birth_date), b.birth_date ? 'nasceu em ' + fullDate(b.birth_date) : ''].filter(Boolean).join(' · ');
  let h = st.babies.length > 1 ? `<div class="babies">${babyChips()}</div>` : '';
  h += `<button class="ptitle" data-act="jump" data-val="babyData" aria-label="${esc(b.name)}: editar nome e nascimento"><h2>${esc(b.name)}<span class="pen" aria-hidden="true">${ICON.pencil}</span></h2>${sub ? `<small>${esc(sub)}</small>` : ''}</button>`;
  // Os três números do alto: cada um leva à sua seção.
  const lw = ws.at(-1), lm = ms.at(-1), next = dosesFrom(now, now + DAY).find(d => !d.e);
  const medText = !meds.length ? 'nenhum' : next ? (dayWord(next.due) || 'hoje') + ' ' + next.hhmm : 'quando precisar';
  const tile = (sec, color, k, v, t) => `<button data-act="jump" data-val="${sec}" style="--sw:var(${color})"><span class="k"><i></i>${k}</span><b>${esc(v)}</b><span>${esc(t)}</span></button>`;
  h += '<div class="jump">' + tile('babyWeight', '--c-weight', 'Peso', lw ? kg(lw.grams) : '–', lw ? shortDate(lw.measured_on) : 'sem peso')
    + tile('babyMeds', '--c-med', 'Remédios', String(meds.length), medText)
    + tile('babyMilestones', '--accent', 'Marcos', String(ms.length), lm ? lm.title : 'nenhum') + '</div>';
  // Para a consulta: o relatório e, logo embaixo, as dúvidas.
  h += `<button class="consult" data-act="report"><span class="ci" aria-hidden="true">${ICON.clip}</span><span><b>Emitir relatório para pediatra</b><small>Em PDF, com as últimas semanas</small></span><span class="go" aria-hidden="true">›</span></button>`;
  h += questionsHtml();
  if (!st.growthOk) h += '<div class="soft">Não foi possível carregar o peso e os marcos. Confira a conexão e abra de novo.</div>';
  else {
    h += '<div class="sec" id="babyWeight"><h4>Peso e comprimento</h4>' + growthHtml();
    const all = st.measures;
    h += all.length
      ? `<div class="recs">${all.slice().reverse().map(w => `<button class="rec" data-act="editWeight" data-val="${esc(w.id)}"><span><b>${esc(fullDate(w.measured_on))}</b><small>${esc([ageOn(b.birth_date, w.measured_on), w.note].filter(Boolean).join(' · '))}</small></span><span class="v">${esc(w.grams != null ? kg(w.grams) : cmText(w.cm))}${w.grams != null && w.cm != null ? `<small>${esc(cmText(w.cm))}</small>` : ''}</span></button>`).join('')}</div>`
      : '<div class="soft">Anote o peso e o comprimento de cada consulta ou pesagem.</div>';
    h += '<button class="ghost" data-act="newWeight">+ Anotar medida</button></div>';
  }
  h += '<div class="sec" id="babyMeds"><h4>Remédios programados</h4>';
  h += meds.length
    ? meds.map(m => {
        const when = m.schedule === 'prn' ? 'só quando precisar' + (m.every_hours ? ` · de ${m.every_hours} em ${m.every_hours} horas` : '') : medWhen(m);
        const times = m.schedule !== 'prn' && medTimes(m).length <= 4 ? `<span class="mtimes">${medTimes(m).map(t => `<span class="tpill">${t}</span>`).join('')}</span>` : '';
        return `<button class="mrow" data-act="editMed" data-val="${esc(m.id)}" aria-label="Editar ${esc(m.name)}"><span><b>${esc(m.name)}</b><small>${esc([m.amount, when].filter(Boolean).join(' · '))}</small></span>${times}</button>`;
      }).join('') + '<div class="row2"><button class="ghost" data-act="allMeds">Ver doses</button><button class="ghost" data-act="newMed">+ Programar</button></div>'
    : `<div class="soft">Nenhum remédio programado. Programe os remédios de ${esc(b.name)} para as doses aparecerem na hora, no alto do Diário.</div><button class="ghost" data-act="newMed">+ Programar remédio</button>`;
  h += '</div>';
  if (st.growthOk) {
    h += '<div class="sec" id="babyMilestones"><h4>Marcos</h4>';
    h += `<div class="card"><h3>Marcos motores</h3><p class="cap">Faixa de idade em que bebês saudáveis chegam a cada marco, pela OMS.</p>${motorChart(b.birth_date, ms)}
      <p class="foot">${b.birth_date ? '' : 'Anote o nascimento em Nome e nascimento para ver a idade de hoje e os marcos de ' + esc(b.name) + ' nas faixas. '}Cada bebê tem seu tempo. Quem avalia o desenvolvimento é o pediatra.</p></div>`;
    h += ms.length
      ? `<div class="recs">${ms.slice().reverse().map(m => `<button class="rec" data-act="editMilestone" data-val="${esc(m.id)}"><span><b>${esc(m.title)}</b><small>${esc([fullDate(m.happened_on), ageOn(b.birth_date, m.happened_on), motorRange(m.title)].filter(Boolean).join(' · '))}</small>${m.note ? `<small class="nt">${esc(m.note)}</small>` : ''}</span></button>`).join('')}</div>`
      : `<div class="soft">Anote as primeiras vezes de ${esc(b.name)}, com o dia: o primeiro sorriso, o primeiro dente…</div>`;
    h += '<button class="ghost" data-act="newMilestone">+ Anotar marco</button></div>';
  }
  h += `<div class="sec" id="babyNight"><h4>Noite</h4><div class="li"><span>${nightText(nightNow(b))}<small class="tsub">O que conta como noite em Tendências</small></span><button data-act="editNight" data-val="${esc(b.id)}">Mudar</button></div></div>`;
  h += `<div class="sec" id="babyData"><h4>Nome e nascimento</h4><div class="li"><span>${esc(b.name)}${b.birth_date || b.sex ? ' <small>' + esc([b.birth_date && fullDate(b.birth_date), { F: 'menina', M: 'menino' }[b.sex]].filter(Boolean).join(' · ')) + '</small>' : ''}</span><button data-act="editBaby" data-val="${esc(b.id)}">Editar</button></div></div>`;
  // Só o criador apaga um bebê: o botão abre a edição já na confirmação.
  if (st.family.creator_id === st.user.id) h += `<button class="danger-btn" data-act="delBabyAsk" data-val="${esc(b.id)}">Apagar bebê</button>`;
  h += '<p class="dim">O Soneca só guarda o que a família anota. As curvas são as da OMS, adotadas pela SBP; quem avalia o crescimento é o pediatra.</p>';
  el.innerHTML = h;
  bindZoom();
}

/* ---------- dúvidas para a consulta ---------- */
// A família anota a dúvida quando lembra; na consulta, marca "perguntei" e, se quiser, o que o
// pediatra disse. As que faltam perguntar vão no relatório. O Soneca só guarda.
const Q_MAX = 300, A_MAX = 500;
const byCreated = (a, b) => a.created_at < b.created_at ? -1 : 1;
const openQuestions = () => st.questions.filter(q => !q.asked_on).sort(byCreated);
const askedQuestions = () => st.questions.filter(q => q.asked_on).sort((a, b) => a.asked_on !== b.asked_on ? (a.asked_on < b.asked_on ? 1 : -1) : -byCreated(a, b));
const putQuestion = q => { st.questions = [...st.questions.filter(x => x.id !== q.id), q]; };
function questionsHtml() {
  let h = '<div class="sec" id="babyQuestions"><h4>Dúvidas para a consulta</h4>';
  if (!st.questionsOk) return h + '<div class="soft">Não foi possível carregar as dúvidas. Confira a conexão e abra de novo.</div></div>';
  const open = openQuestions(), asked = askedQuestions();
  h += open.length
    ? `<div class="qs">${open.map(q => `<div class="qi"><button class="ck" data-act="askQ" data-val="${esc(q.id)}" aria-label="Marcar como perguntada: ${esc(q.body)}">${CHECK}</button><button class="qt" data-act="editQ" data-val="${esc(q.id)}"><b>${esc(q.body)}</b><small>${esc(shortDate(localDate(Date.parse(q.created_at))))}</small></button></div>`).join('')}</div>`
    : `<div class="soft">Anote o que quiser perguntar na próxima consulta de ${esc(st.baby.name)}. As dúvidas vão junto no relatório para pediatra.</div>`;
  h += '<button class="ghost" data-act="newQ">+ Anotar dúvida</button>';
  if (asked.length) h += `<button class="li tg" data-act="answers"><span>Respostas do pediatra <small>${asked.length}</small></span><span class="go">Ver</span></button>`;
  return h + '</div>';
}
async function setAsked(id, asked_on) {
  const { data, error } = await sb.from('questions').update({ asked_on }).eq('id', id).select().single();
  if (error) { toast('Não foi possível salvar. Confira a conexão.'); return null; }
  putQuestion(data); render(); return data;
}
async function askQuestion(id) {
  if (await setAsked(id, localDate(Date.now()))) toast('Foi para Respostas do pediatra', () => setAsked(id, null));
}
function questionForm(q) {
  S = { mode: 'question', edit: q || null, body: q?.body || '', asked: q?.asked_on || null, answer: q?.answer || '', err: '' };
  drawQuestion(); $('sheet').scrollTop = 0;
}
function drawQuestion() {
  const q = S.edit;
  let h = head(q ? 'Dúvida' : 'Anotar dúvida')
    + `<p class="dsub">${q ? 'Anotada em ' + esc(shortDate(localDate(Date.parse(q.created_at)))) : 'Para a próxima consulta de ' + esc(st.baby.name)}</p>`;
  h += `<div><label class="lbl" for="qBody">A dúvida</label><textarea class="field" id="qBody" maxlength="${Q_MAX}" placeholder="Ex.: Ela pode tomar sol pela janela?">${esc(S.body)}</textarea>
    <div class="fbmeta"><span></span><span id="qCount">${S.body.length} de ${Q_MAX}</span></div></div>`;
  if (!q) h += '<p class="dim">Aparece para todos da família e vai no relatório para pediatra até alguém marcar que perguntou.</p>';
  else {
    h += S.asked
      ? `<button class="given q" data-act="qAsked"><span class="ck">${CHECK}</span><span>Perguntei em ${esc(shortDate(S.asked))}<small>tocar para desmarcar</small></span></button>`
      : `<button class="given q off" data-act="qAsked"><span class="ck"></span><span>Ainda não perguntei<small>tocar para marcar como perguntada</small></span></button>`;
    if (S.asked) h += `<div><label class="lbl" for="qAnswer">O que o pediatra disse <small>(se quiser)</small></label><textarea class="field short" id="qAnswer" maxlength="${A_MAX}" placeholder="Com as palavras da família">${esc(S.answer)}</textarea></div>`;
  }
  if (S.err) h += `<div class="err">${esc(S.err)}</div>`;
  h += '<button class="save" data-act="saveQ">Salvar</button>';
  if (q) h += '<button class="del" data-act="delQ">Apagar dúvida</button>';
  const top = $('sheet').scrollTop; openPanel(h); $('sheet').scrollTop = top;
}
function questionInput(el) {
  if (el.id === 'qBody') { S.body = el.value; $('qCount').textContent = S.body.length + ' de ' + Q_MAX; }
  else if (el.id === 'qAnswer') S.answer = el.value;
  if (S.err) { S.err = ''; $('sheetIn').querySelector('.err')?.remove(); }
}
async function saveQuestion(btn) {
  const body = S.body.trim();
  if (!body) { S.err = 'Escreva a dúvida.'; return drawQuestion(); }
  busy(btn, true);
  const q = S.edit
    ? sb.from('questions').update({ body, asked_on: S.asked, answer: S.answer.trim() || null }).eq('id', S.edit.id)
    : sb.from('questions').insert({ family_id: st.family.id, baby_id: st.baby.id, body });
  const { data, error } = await q.select().single();
  busy(btn, false);
  if (error) { S.err = 'Não foi possível salvar. Confira a conexão e tente de novo.'; return drawQuestion(); }
  putQuestion(data); closeSheet(); toast('Salvo');
}
async function delQuestion(btn) {
  const id = S.edit.id;
  busy(btn, true);
  const { error } = await sb.from('questions').delete().eq('id', id);
  busy(btn, false);
  if (error) { S.err = 'Não foi possível apagar. Confira a conexão e tente de novo.'; return drawQuestion(); }
  st.questions = st.questions.filter(x => x.id !== id);
  closeSheet(); toast('Apagado');
}
// Respostas do pediatra: as já perguntadas, da mais recente para a mais antiga, para consultar depois.
function answersSheet() {
  S = { mode: 'answers' };
  const asked = askedQuestions();
  openPanel(head('Respostas do pediatra') + `<p class="dsub">${asked.length} ${asked.length === 1 ? 'dúvida perguntada' : 'dúvidas perguntadas'}</p>`
    + (asked.length ? `<div class="recs">${asked.map(q => `<button class="rec" data-act="editQ" data-val="${esc(q.id)}"><span><b>${esc(q.body)}</b><small>Perguntada em ${esc(shortDate(q.asked_on))}</small>${q.answer ? `<small class="nt">${esc(q.answer)}</small>` : '<small>Sem resposta anotada</small>'}</span></button>`).join('')}</div>` : '<div class="soft">Nenhuma dúvida perguntada ainda.</div>')
    + '<p class="dim">O Soneca só guarda o que a família anotou da consulta.</p>');
  $('sheet').scrollTop = 0;
}
function questionAction(a, v, btn) {
  if (a === 'editQ') return questionForm(st.questions.find(q => q.id === v));
  if (a === 'qAsked') { S.asked = S.asked ? null : S.edit.asked_on || localDate(Date.now()); return drawQuestion(); }
  if (a === 'saveQ') return saveQuestion(btn);
  if (a === 'delQ') return askConfirm('Apagar esta dúvida?', 'Não dá para desfazer.', 'Apagar', delQuestion);
}

/* ---------- relatório para pediatra ---------- */
// Escolhe o período e o que entra; o PDF sai pelo imprimir do celular (salvar em PDF ou
// compartilhar). As escolhas valem até fechar o app.
const RP = { n: 14, parts: { routine: true, symptoms: true, meds: true, growth: true, questions: true } };
const RP_PARTS = [['routine', 'Rotina: mamadas, sono e fraldas'], ['symptoms', 'Sintomas e vômitos'], ['meds', 'Remédios e doses'],
                  ['growth', 'Peso e marcos'], ['questions', 'Dúvidas para a consulta']];
// O último peso anotado numa consulta, para "desde a última consulta". Só aparece se o período fica
// maior que 7 dias e cabe no que o app carrega (60 dias).
function lastConsult() {
  const c = st.weights.filter(w => /consulta|pediatr|m[ée]dic/i.test(w.note || '')).at(-1);
  const d0 = c && dayOf(c.measured_on);
  return c && d0 < addDays(startOfDay(Date.now()), -6) && d0 >= firstDay() ? c : null;
}
function reportStart() {
  const c = RP.n === 'since' && lastConsult();
  if (RP.n === 'since' && !c) RP.n = 14;
  return c ? dayOf(c.measured_on) : addDays(startOfDay(Date.now()), -(RP.n - 1));
}
// Como o remédio está programado hoje, para ir junto das doses.
function medPlan(id) {
  const m = st.meds.find(x => x.id === id); if (!m) return null;
  if (m.schedule === 'prn') return 'só quando precisar' + (m.every_hours ? `, de ${m.every_hours} em ${m.every_hours} horas` : '');
  const t = m.schedule === 'every' ? '' : medTimes(m).join(', ');
  return medWhen(m).replace('todo dia', 'todo dia' + (t ? ' às ' + t : '')).replace(' · ', ', ');
}
function reportArgs() {
  const now = Date.now(), a = reportStart(), evs = sortedEntries(), { out, open } = sleepIntervals(evs);
  const sleeps = liveOpen(open, now) === null ? out : [...out, [open, now]];
  return { baby: st.baby, a, now, evs, sleeps, stats: reportStats({ a, now, evs, sleeps, on: isOn }), weights: st.weights, lengths: st.lengths, milestones: st.milestones,
           questions: st.questionsOk ? openQuestions() : [], parts: RP.parts, medPlan };
}
function reportSheet() { S = { mode: 'report' }; drawReport(); $('sheet').scrollTop = 0; }
function drawReport() {
  const R = reportArgs(), today = startOfDay(Date.now()), c = lastConsult(), nq = R.questions.length;
  const per = n => periodShort(addDays(today, -(n - 1)), today);
  const o = (val, txt, sub) => `<button class="opt${RP.n === val ? ' on' : ''}" data-act="rpN" data-val="${val}" aria-pressed="${RP.n === val}">${txt}<small>${esc(sub)}</small></button>`;
  let h = head('Relatório para pediatra') + `<p class="dsub">De ${esc(st.baby.name)}, para levar à consulta</p>`;
  h += `<div><div class="lbl">Período</div><div class="seg rpper">${[7, 14, 30].map(n => o(n, n + ' dias', per(n))).join('')}${c ? o('since', 'Desde ' + shortDate(c.measured_on), 'último peso de consulta') : ''}</div></div>`;
  const n = R.stats.symptoms.length, nm = R.stats.meds.length;
  const subs = { routine: 'média por dia e os dias lado a lado', symptoms: n ? n + ' no período' : 'nenhum no período',
                 meds: nm ? (nm === 1 ? '1 remédio' : nm + ' remédios') + ' com doses no período' : 'nenhuma dose no período',
                 growth: 'desde o nascimento', questions: nq + ' ainda sem perguntar' };
  h += '<div><div class="lbl">O que vai junto</div><div class="tgl">' + RP_PARTS.filter(([k]) => k !== 'questions' || nq).map(([k, t]) =>
    `<button class="li tg" role="switch" aria-checked="${RP.parts[k]}" data-act="rpPart" data-val="${k}"><span>${t}<small class="tsub">${esc(subs[k])}</small></span><span class="sw${RP.parts[k] ? ' on' : ''}" aria-hidden="true"><i></i></span></button>`).join('') + '</div></div>';
  h += '<button class="save" data-act="rpPdf">Emitir PDF</button><div class="row2"><button class="ghost" data-act="rpView">Ver antes</button><button class="ghost" data-act="rpCopy">Copiar texto</button></div>';
  h += '<p class="dim">O PDF sai pelo imprimir do celular: escolha salvar em PDF ou compartilhar. Só junta o que foi registrado no Soneca; não avalia o bebê.</p>';
  const top = $('sheet').scrollTop; openPanel(h); $('sheet').scrollTop = top;
}
// A folha fica pronta em #rpView: aberta em "Ver antes"; escondida, só para imprimir, em "Emitir PDF".
function paintReport() { $('rpPaper').innerHTML = reportHtml(reportArgs()); }
function printReport() {
  paintReport();
  const t = document.title; document.title = pdfName(st.baby, Date.now());
  const back = () => { document.title = t; };
  window.addEventListener('afterprint', back, { once: true }); setTimeout(back, 60000);
  // No app (iPhone e Android), o window.print() não faz nada: a folha de imprimir do celular (com "Salvar
  // em Arquivos"/"Salvar como PDF" e "Compartilhar") vem pelo plugin Printer, com as mesmas regras de
  // impressão da página.
  if (NATIVE) return window.Capacitor.registerPlugin('Printer').printWebView({ name: document.title })
    .catch(() => toast('Não foi possível abrir o PDF. Tente de novo.')).finally(back);
  window.print();
}
function openReportView() { paintReport(); S = null; $('scrim').hidden = true; $('sheet').hidden = true; $('rpView').hidden = false; $('rpView').scrollTop = 0; $('rpBack').focus(); }
function closeReportView() { $('rpView').hidden = true; reportSheet(); }
function reportAction(a, v) {
  if (a === 'rpN') { RP.n = v === 'since' ? v : +v; return drawReport(); }
  if (a === 'rpPart') { RP.parts[v] = !RP.parts[v]; return drawReport(); }
  if (a === 'rpPdf') return printReport();
  if (a === 'rpView') return openReportView();
  if (a === 'rpCopy') return navigator.clipboard.writeText(reportPlain(reportArgs())).then(() => toast('Texto copiado'), () => toast('Não foi possível copiar'));
}

// Anotar ou editar uma medida (peso, comprimento ou os dois) ou um marco.
function logForm(kind, row) {
  const today = localDate(Date.now());
  S = { mode: kind, edit: row || null, date: row?.[LOG[kind].day] || today, note: row?.note || '', err: '',
        kg: row?.grams ? (row.grams / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : '',
        cm: row?.cm != null ? Number(row.cm).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '', title: row?.title || '' };
  drawLog(); $('sheet').scrollTop = 0;
}
function drawLog() {
  const w = S.mode === 'weight', b = st.baby, today = localDate(Date.now());
  let h = head(S.edit ? (w ? 'Editar medida' : 'Editar marco') : (w ? 'Anotar medida' : 'Anotar marco'));
  if (w) h += `<div class="two"><div><label class="lbl" for="lgKg">Peso</label><div class="ml"><input id="lgKg" inputmode="decimal" value="${esc(S.kg)}" placeholder="0,000" autocomplete="off"><em>kg</em></div></div>
    <div><label class="lbl" for="lgCm">Comprimento <small>(opcional)</small></label><div class="ml"><input id="lgCm" inputmode="decimal" value="${esc(S.cm)}" placeholder="0,0" autocomplete="off"><em>cm</em></div></div></div>`;
  else {
    const sugs = MILESTONES.filter(t => t !== S.title && !st.milestones.some(m => m.title === t && m.id !== S.edit?.id));
    h += `<div><label class="lbl" for="lgTitle">O que aconteceu</label><input class="field" id="lgTitle" maxlength="60" placeholder="Ex.: Sorriu pela primeira vez" value="${esc(S.title)}">
      ${sugs.length ? `<div class="sugs">${sugs.map(t => `<button class="small" data-act="sug" data-val="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}</div>`;
  }
  h += `<div><label class="lbl" for="lgDate">${w ? 'Dia da medida' : 'Dia'}</label><input class="field" id="lgDate" type="date" value="${esc(S.date)}" max="${today}"${b.birth_date ? ` min="${esc(b.birth_date)}"` : ''}>
    <div class="hint" id="lgAge" style="margin:6px 0 0">${esc(ageOn(b.birth_date, S.date))}</div></div>`;
  h += w ? `<input class="field" id="lgNote" maxlength="100" placeholder="Onde mediu (opcional). Ex.: pediatra" value="${esc(S.note)}">`
         : `<input class="field" id="lgNote" maxlength="300" placeholder="Observação (opcional)" value="${esc(S.note)}">`;
  if (S.err) h += `<div class="err">${esc(S.err)}</div>`;
  h += '<button class="save" data-act="saveLog">Salvar</button>';
  if (S.edit) h += `<button class="del" data-act="delLog">${w ? 'Apagar esta medida' : 'Apagar este marco'}</button>`;
  openPanel(h);
}
function logInput(el) {
  if (el.id === 'lgKg') S.kg = el.value;
  else if (el.id === 'lgCm') S.cm = el.value;
  else if (el.id === 'lgTitle') S.title = el.value;
  else if (el.id === 'lgNote') S.note = el.value;
  else if (el.id === 'lgDate') { S.date = el.value; $('lgAge').textContent = ageOn(st.baby.birth_date, S.date); }
  if (S.err) { S.err = ''; $('sheetIn').querySelector('.err')?.remove(); }
}
async function saveLog(btn) {
  const kind = S.mode, L = LOG[kind], b = st.baby, today = localDate(Date.now());
  const fail = msg => { S.err = msg; drawLog(); };
  const row = { [L.day]: S.date, note: S.note.trim() || null };
  if (kind === 'weight') {
    const g = parseKg(S.kg), c = parseCm(S.cm);
    if (!S.kg.trim() && !S.cm.trim()) return fail('Escreva o peso, o comprimento ou os dois.');
    if (S.kg.trim() && (!g || g < 500 || g > 30000)) return fail('Confira o peso: de 0,5 a 30 kg. Ex.: 5,2');
    if (S.cm.trim() && (!c || c < 30 || c > 130)) return fail('Confira o comprimento: de 30 a 130 cm. Ex.: 62,5');
    row.grams = S.kg.trim() ? g : null;
    // O comprimento só vai quando há o que salvar: sem o 011, o peso continua salvando.
    if (S.cm.trim() || S.edit?.cm != null) row.cm = S.cm.trim() ? c : null;
  } else {
    if (!S.title.trim()) return fail('Escreva o que aconteceu.');
    row.title = S.title.trim().slice(0, 60);
  }
  const o = kind === 'weight' ? 'O dia da medida' : 'O dia';
  if (!S.date) return fail(kind === 'weight' ? 'Escolha o dia da medida.' : 'Escolha o dia.');
  if (S.date > today) return fail(o + ' não pode ser depois de hoje.');
  if (b.birth_date && S.date < b.birth_date) return fail(o + ' não pode ser antes do nascimento.');
  busy(btn, true);
  const q = S.edit ? sb.from(L.table).update(row).eq('id', S.edit.id)
                   : sb.from(L.table).insert({ family_id: st.family.id, baby_id: b.id, ...row });
  const { data, error } = await q.select().single();
  busy(btn, false);
  if (error) return fail('Não foi possível salvar. Confira a conexão e tente de novo.');
  st[L.list] = L.sort([...st[L.list].filter(x => x.id !== data.id), data]);
  if (kind === 'weight') splitMeasures();
  closeSheet(); toast('Salvo');
}
async function delLog(btn) {
  const L = LOG[S.mode], id = S.edit.id;
  busy(btn, true);
  const { error } = await sb.from(L.table).delete().eq('id', id);
  busy(btn, false);
  if (error) { S.err = 'Não foi possível apagar. Confira a conexão e tente de novo.'; return drawLog(); }
  st[L.list] = st[L.list].filter(x => x.id !== id);
  if (S.mode === 'weight') splitMeasures();
  closeSheet(); toast('Apagado');
}
function growthAction(a, v, btn) {
  if (a === 'sug') { S.title = v; S.err = ''; return drawLog(); }
  if (a === 'saveLog') return saveLog(btn);
  if (a === 'delLog') {
    const e = S.edit, w = S.mode === 'weight';
    // "Peso de 5,4 kg, 12/10" ou "Firmou a cabeça, 23/10".
    const what = !w ? e.title : e.grams && e.cm ? 'Peso de ' + kg(e.grams) + ' e comprimento de ' + cmText(e.cm) : e.grams ? 'Peso de ' + kg(e.grams) : 'Comprimento de ' + cmText(e.cm);
    return askConfirm(w ? 'Apagar esta medida?' : 'Apagar este marco?', what + ', ' + ymdDdmm(e[LOG[S.mode].day]) + '. Não dá para desfazer.', 'Apagar', delLog);
  }
}

/* ---------- bebê e nome ---------- */
const CHECK_BOX = '<span class="box" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5"/></svg></span>';
function babySheet(b) {
  S = { mode: 'baby', b, name: b?.name || '', birth: b?.birth_date || '', sex: b?.sex || '' };
  drawBaby();
}
// Só o criador apaga um bebê (é a regra do banco); a confirmação fica na própria tela.
function drawBaby() {
  const b = S.b, del = b && st.family.creator_id === st.user.id;
  let h = head(b ? 'Editar bebê' : 'Adicionar bebê') +
    `<div><div class="lbl">Nome do bebê</div><input class="field" id="bName" maxlength="40" value="${esc(S.name)}" placeholder="Marina"></div>
     <div><div class="lbl">Nascimento (opcional)</div><input class="field" id="bBirth" type="date" value="${esc(S.birth)}"></div>
     <div><div class="lbl" id="bSexLbl">Menina ou menino (opcional)</div>
       <div class="sexpick" role="radiogroup" aria-labelledby="bSexLbl">${[['F', 'Menina'], ['M', 'Menino']].map(([v, n]) => `<label><input type="radio" name="bSex" value="${v}"${S.sex === v ? ' checked' : ''}><span>${n}</span></label>`).join('')}</div>
       <p class="hint" style="margin:6px 0 0">Para usar a curva certa da OMS no gráfico de peso e comprimento.${b ? ' Mudar aqui muda a curva.' : ''}</p></div>
     ${b ? '' : `<label class="chk"><input type="checkbox" id="bOk">${CHECK_BOX}<span>Sou pai, mãe ou responsável legal por este bebê e autorizo o Soneca a guardar os dados dele, inclusive de saúde e amamentação, para o uso da minha família.</span></label>`}
     <div class="err" id="bErr" hidden></div><button class="save" data-act="saveBaby">Salvar</button>`;
  if (del) h += '<button class="danger-btn" data-act="askDelBaby">Apagar bebê</button>';
  openPanel(h);
}
const askDelBaby = () => askConfirm('Apagar ' + S.b.name + '?', S.b.name + ' e todos os seus registros serão apagados. Não dá para desfazer.', 'Apagar', delBaby);
async function delBaby(btn) {
  const id = S.b.id;
  busy(btn, true);
  // Sem permissão, o banco não dá erro: só não apaga nada. Por isso confere o que voltou.
  const { data, error } = await sb.from('babies').delete().eq('id', id).select('id');
  busy(btn, false);
  if (error || !data?.length) return err('bErr', error ? errMsg(error) : 'Só quem criou a família pode apagar um bebê.');
  st.babies = st.babies.filter(x => x.id !== id);
  if (st.baby?.id === id) {
    if (st.babies.length) await selectBaby(st.babies[0].id);
    else { st.baby = null; st.entries = new Map(); st.meds = []; st.routines = []; st.measures = st.weights = st.lengths = []; st.milestones = []; st.questions = []; }
  }
  closeSheet(); toast('Apagado');
}
const bSex = () => document.querySelector('input[name="bSex"]:checked')?.value || null;
async function saveBaby(btn) {
  const name = $('bName').value.trim(), birth_date = $('bBirth').value || null, sex = bSex();
  if (!name) return err('bErr', 'Escreva o nome do bebê.');
  if (!S.b && !$('bOk').checked) return err('bErr', 'Para adicionar, marque a autorização dos dados do bebê.');
  busy(btn, true);
  // Menina ou menino só vai quando há o que salvar: sem o 011, o resto continua salvando.
  const row = { name, birth_date, ...(sex || S.b?.sex ? { sex } : {}) };
  const q = S.b ? sb.from('babies').update(row).eq('id', S.b.id)
                : sb.from('babies').insert({ family_id: st.family.id, ...row });
  const { data, error } = await q.select('*').single();
  busy(btn, false);
  if (error) return err('bErr', errMsg(error));
  if (!S.b) await addConsent('baby', { family_id: st.family.id, baby_id: data.id });
  const i = st.babies.findIndex(x => x.id === data.id);
  if (i >= 0) st.babies[i] = data; else st.babies.push(data);
  if (!S.b || st.baby?.id === data.id) await selectBaby(data.id);
  closeSheet(); toast('Salvo');
}
async function selectBaby(id) {
  st.baby = st.babies.find(b => b.id === id); lsSet('cad-baby-' + st.family.id, id);
  st.trend.off = 0; st.trend.sel = null;
  // Outro bebê: nada do anterior pode aparecer com o nome deste.
  st.entries = new Map(); st.meds = []; st.routines = []; st.measures = st.weights = st.lengths = []; st.milestones = []; st.questions = [];
  await Promise.all([loadEntries(), loadMeds(), loadGrowth(), loadQuestions()]); render();
}
function renameSheet() {
  S = { mode: 'rename' };
  openPanel(head('Seu nome') + `<div><div class="lbl">Como você quer aparecer para a família?</div><input class="field" id="rName" maxlength="40" value="${esc(st.profile.display_name)}"></div>
    <div class="err" id="rErr" hidden></div><button class="save" data-act="saveName">Salvar</button>`);
}
async function saveName(btn) {
  const display_name = $('rName').value.trim();
  if (!display_name) return err('rErr', 'Escreva como você quer aparecer.');
  busy(btn, true);
  const { error } = await sb.from('profiles').update({ display_name }).eq('id', st.user.id);
  busy(btn, false);
  if (error) return err('rErr', errMsg(error));
  st.profile.display_name = display_name; st.names[st.user.id] = display_name;
  closeSheet(); toast('Salvo');
}

/* ---------- Família ---------- */
// O que vale para todos: nome da família, membros e convite, bebês, botões da tela inicial e sair.
const FP = { invite: null };   // o link de convite gerado
function drawFamilyPane() {
  const f = st.family, creator = f.creator_id === st.user.id, n = st.members.length, nb = st.babies.length;
  let h = `<div class="ptitle"><h2>${esc(f.name)}</h2><small>${n} ${n === 1 ? 'membro' : 'membros'} · ${nb} ${nb === 1 ? 'bebê' : 'bebês'}</small></div>`;
  h += `<div class="sec"><h4>Nome da família</h4><div class="li"><span>${esc(f.name)}</span>${creator ? '<button data-act="famName">Mudar</button>' : ''}</div>`
    + (creator ? '' : '<p class="dim">Só quem criou a família muda o nome.</p>') + '</div>';
  h += '<div class="sec" id="famMembers"><h4>Membros</h4>' + st.members.map(m => {
    const tags = (m.user_id === f.creator_id ? ' <small>criador</small>' : '') + (m.user_id === st.user.id ? ' <small>você</small>' : '');
    const rm = creator && m.user_id !== st.user.id
      ? `<button class="danger" data-act="rm" data-val="${esc(m.user_id)}">Remover</button>` : '';
    return `<div class="li"><span>${esc(st.names[m.user_id] || 'Alguém')}${tags}</span>${rm}</div>`;
  }).join('');
  if (creator) h += FP.invite
    ? `<div class="invite">${esc(FP.invite)}</div><div class="row2"><button class="ghost" data-act="copyInv">Copiar link</button>${navigator.share ? '<button class="ghost" data-act="shareInv">Compartilhar</button>' : ''}</div><div class="lbl">O link serve para uma pessoa e vale 7 dias.</div>`
    : '<button class="ghost" data-act="invite">Convidar para esta família</button>';
  h += '</div><div class="sec"><h4>Bebês</h4>' +
    st.babies.map(b => `<button class="li tg" data-act="openBaby" data-val="${esc(b.id)}"><span>${esc(b.name)}${b.birth_date ? ' <small>' + esc(ageText(b.birth_date)) + '</small>' : ''}</span><span class="go">Abrir</span></button>`).join('') +
    '<button class="ghost" data-act="addBaby">+ Adicionar bebê</button></div>';
  // Sono (item 65): "Acompanhar o sono" liga e desliga a janela de sono; a noite de cada bebê fica sempre.
  const on = st.track !== false;
  h += `<div class="sec" id="famSleep"><h4>Sono</h4><button class="li tg" role="switch" aria-checked="${on}" data-act="sleepTrack"><span>Acompanhar o sono<small class="tsub">Para todos da família</small></span><span class="sw${on ? ' on' : ''}" aria-hidden="true"><i></i></span></button>`
    + st.babies.map(b => { const c = nightNow(b);
      return `<div class="li"><span>${esc(nightTitle(b))}<small class="tsub">${nightText(c)}${isDefault(c) ? ' · padrão' : ''}</small></span><button data-act="editNight" data-val="${esc(b.id)}">Mudar</button></div>`; }).join('')
    + '</div>';
  h += creator
    ? '<button class="danger-btn" data-act="delFam">Apagar família</button>'
    : '<button class="danger-btn" data-act="leave">Sair da família</button>';
  $('paneFamily').innerHTML = h;
}
// Mudar o nome da família: só quem criou (é a regra do banco).
function famNameSheet() {
  S = { mode: 'famname' };
  openPanel(head('Nome da família') + `<div><label class="lbl" for="famName">Como a família aparece para todos os membros</label><input class="field" id="famName" maxlength="60" value="${esc(st.family.name)}"></div>
    <div class="err" id="fnErr" hidden></div><button class="save" data-act="saveFamName">Salvar</button>`);
}
async function saveFamName(btn) {
  const name = $('famName').value.trim();
  if (!name) return err('fnErr', 'Escreva o nome da família.');
  busy(btn, true);
  // Sem permissão, o banco não dá erro: só não muda nada. Por isso confere o que voltou.
  const { data, error } = await sb.from('families').update({ name }).eq('id', st.family.id).select('id');
  busy(btn, false);
  if (error || !data?.length) return err('fnErr', error ? errMsg(error) : 'Só quem criou a família muda o nome.');
  st.family.name = name;
  closeSheet(); toast('Salvo');
}

/* ---------- Perfil ---------- */
// O que é só da pessoa: o nome, a aparência neste celular, as famílias de que participa, indicar o
// Soneca, falar com quem cuida dele e desconectar.
const THEMES = [['light', 'Claro'], ['dark', 'Escuro'], ['', 'Do celular']];
function drawProfilePane() {
  const theme = lsGet('cad-theme') || '';
  let h = `<div class="ptitle"><h2>${esc(st.profile.display_name)}</h2><small>Seu nome e os ajustes que valem só para você</small></div>`;
  h += `<div class="sec"><h4>Seu nome</h4><div class="li"><span>${esc(st.profile.display_name)}</span><button data-act="rename">Mudar</button></div></div>`;
  h += `<div class="sec"><h4>Aparência</h4><div class="seg3" role="group" aria-label="Aparência">${THEMES.map(([v, t]) => `<button data-act="theme" data-val="${v}" aria-pressed="${theme === v}">${t}</button>`).join('')}</div>`
    + '<p class="dim">"Do celular" segue o modo noturno do celular. Vale só neste aparelho.</p></div>';
  if (medNotif) {
    remCheck();
    const on = remOn();
    h += `<div class="sec"><h4>Lembrete</h4><button class="li tg" role="switch" aria-checked="${on}" data-act="reminder"><span>Lembrete para anotar</span><span class="sw${on ? ' on' : ''}" aria-hidden="true"><i></i></span></button>`
      + `<p class="dim">${!on && lsGet('cad-lembrete-auto') ? 'Desligado depois de 3 lembretes seguidos sem registro. Ligue de novo quando quiser.'
          : 'Avisa depois de 3 horas sem registro feito neste celular. Entre 18h e 7h, não avisa. Vale só neste aparelho.'}</p></div>`;
  }
  h += '<div class="sec"><h4>Suas famílias</h4>' + st.families.map(x => x.id === st.family.id
      ? `<div class="li"><span>${esc(x.name)} <small>aberta</small></span></div>`
      : `<div class="li"><span>${esc(x.name)}</span><button data-act="switchFam" data-val="${esc(x.id)}">Abrir</button></div>`).join('')
    + '<button class="ghost" data-act="newFam">Criar outra família</button></div>';
  h += '<div class="sec"><h4>Indicar o Soneca</h4>' +
    `<div class="invite">${esc(new URL(LINK_BASE).host)}</div>` +
    `<div class="row2">${navigator.share ? '<button class="ghost" data-act="shareApp">Compartilhar</button>' : ''}<button class="ghost" data-act="copyApp">Copiar texto</button></div>` +
    '<div class="lbl">Para outra família com bebê. Quem abrir cria a própria família e não vê os registros desta.</div></div>';
  h += '<div class="sec"><h4>Fale com quem cuida do Soneca</h4><button class="li tg" data-act="feedback"><span>Sugestões e problemas</span><span class="go">Escrever</span></button>'
    // Item 23: a linha fica sempre aqui, só no app. O link abre a loja (o celular tira do app).
    + (NATIVE ? `<a class="li" href="${STORE_URL}"><span>Avaliar o Soneca na ${STORE_NAME}</span><span class="go">Avaliar</span></a><p class="dim">${esc(RATE_TEXT)}</p>` : '')
    + '</div>';
  const mail = subject => `mailto:${PRIVACY_EMAIL}?subject=${encodeURIComponent(subject)}`;
  const ok = st.consents.filter(c => c.kind === 'terms').pop();
  h += '<div class="sec"><h4>Privacidade</h4>' +
    '<a class="li" href="/privacidade" target="_blank" rel="noopener"><span>Política de Privacidade</span><span class="go">Ler</span></a>' +
    '<a class="li" href="/termos" target="_blank" rel="noopener"><span>Termos de Uso</span><span class="go">Ler</span></a>' +
    `<a class="li" href="${mail('Cópia dos meus dados no Soneca')}"><span>Cópia dos seus dados</span><span class="go">Pedir</span></a>` +
    `<a class="li" href="${mail('Privacidade no Soneca')}"><span>Falar com o encarregado</span><span class="go">Escrever</span></a>` +
    `<p class="dim">Pedidos sobre seus dados: ${esc(PRIVACY_EMAIL)}. Respondemos em até 15 dias.` +
    (ok ? ` Você aceitou a versão ${esc(ok.version)} em ${new Date(ok.created_at).toLocaleDateString('pt-BR')}.` : '') + '</p></div>';
  h += '<button class="ghost" data-act="logout">Desconectar deste celular</button>';
  h += '<button class="danger-btn" data-act="delAccount">Apagar minha conta</button>';
  $('paneProfile').innerHTML = h;
}
// "Do celular" apaga a escolha: o app volta a seguir o modo noturno do aparelho.
function setTheme(v) {
  if (v) document.documentElement.dataset.theme = v; else delete document.documentElement.dataset.theme;
  lsSet('cad-theme', v || null); render();
}

/* ---------- apagar a conta ---------- */
// Mostra antes o que acontece com cada família. Quem criou uma família com outras pessoas passa a
// família para o membro mais antigo depois dela; o resto é a função delete_my_account (012).
async function accountSheet() {
  S = { mode: 'account', rows: null, err: '' }; drawAccount();
  const ids = st.families.map(f => f.id);
  const [{ data: mem, error: e1 }, { data: bab, error: e2 }] = await Promise.all([
    sb.from('family_members').select('family_id,user_id,joined_at').in('family_id', ids),
    sb.from('babies').select('family_id,name').in('family_id', ids).order('created_at')]);
  if (S?.mode !== 'account') return;
  if (e1 || e2) { S.err = 'Não foi possível carregar suas famílias. Confira a conexão e tente de novo.'; return drawAccount(); }
  const me = st.user.id, older = (a, b) => Date.parse(a.joined_at) - Date.parse(b.joined_at) || (a.user_id < b.user_id ? -1 : 1);
  const heirs = {};
  for (const f of st.families) if (f.creator_id === me) {
    const others = mem.filter(m => m.family_id === f.id && m.user_id !== me).sort(older);
    if (others.length) heirs[f.id] = others;
  }
  await loadNames(Object.values(heirs).map(o => o[0].user_id));
  if (S?.mode !== 'account') return;
  S.rows = st.families.map(f => {
    if (f.creator_id !== me) return [f.name, 'Você entrou por convite. Você sai, e o que anotou fica, sem o seu nome.'];
    const o = heirs[f.id];
    if (!o) {
      const names = bab.filter(b => b.family_id === f.id).map(b => b.name);
      return [f.name, 'Só você está nela. É apagada, com ' + (names.length ? names.join(', ') + ' e ' : '') + 'todos os registros.'];
    }
    const heir = st.names[o[0].user_id] || 'outra pessoa';
    return [f.name, (o.length === 1 ? 'Você criou, e ' + heir + ' também está.' : 'Você criou, e mais ' + o.length + ' pessoas também estão.')
      + ' A família continua, e ' + heir + ' passa a cuidar dela.'];
  });
  drawAccount();
}
function drawAccount() {
  const mail = st.user.email ? ' (' + esc(st.user.email) + ')' : '';
  let h = head('Apagar sua conta') + `<p class="lead">Seu login${mail} e seu nome são apagados. Não dá para desfazer.</p>`;
  h += '<div class="sec"><h4>Suas famílias</h4>' + (S.rows
    ? S.rows.map(([n, t]) => `<div class="fate"><b>${esc(n)}</b><span>${esc(t)}</span></div>`).join('')
    : S.err ? '' : '<p class="dim">Carregando…</p>') + '</div>';
  h += '<p class="dim">As sugestões que você mandou também são apagadas.</p>';
  if (S.err) h += `<div class="err">${esc(S.err)}</div>`;
  if (S.rows) h += '<button class="danger-btn" data-act="accDel">Apagar minha conta</button>';
  openPanel(h);
}
function accountAction(a) {
  if (a === 'accDel') askConfirm('Apagar sua conta?', 'Seu login e seu nome são apagados. Não dá para desfazer.', 'Apagar conta', deleteAccount);
}
async function deleteAccount() {
  // Quem entrou com a Apple: cancela o acesso do Soneca na Apple antes de apagar (para os outros, não faz nada).
  await sb.functions.invoke('apple-login', { body: { action: 'revoke' } }).catch(() => {});
  const { error } = await sb.rpc('delete_my_account');
  if (error) { S.err = 'Não foi possível apagar a conta. Confira a conexão e tente de novo.'; return drawAccount(); }
  // O login já não existe no banco: basta esquecer a sessão neste celular.
  await sb.auth.signOut({ scope: 'local' }).catch(() => {});
  lsSet('cad-family', null); lsSet('cad-invite', null);
  location.href = '/?conta=apagada';
}

/* ---------- sugestões e problemas ---------- */
// O rascunho sobrevive a fechar a tela sem querer. Pelo app, só dá para enviar: ninguém lê.
const FB = { type: '', text: '', sent: false, err: '' }, FB_MAX = 1000;
const FB_TYPES = [['idea', 'Sugestão'], ['bug', 'Algo deu errado']];
function feedbackSheet() { S = { mode: 'feedback' }; FB.sent = false; FB.err = ''; drawFeedback(); $('sheet').scrollTop = 0; }
function drawFeedback() {
  const h = head('Sugestões e problemas') + (FB.sent
    ? '<div class="thanks" role="status"><b>Recebido, obrigado!</b><span>Sua mensagem chegou para quem cuida do Soneca.</span></div><button class="ghost" data-act="fbAgain">Enviar outra</button>'
    : `<div><div class="lbl">Sobre o quê? <small>(opcional)</small></div><div class="seg">${FB_TYPES.map(([k, t]) => `<button class="opt${FB.type === k ? ' on' : ''}" data-act="fbType" data-val="${k}" aria-pressed="${FB.type === k}">${t}</button>`).join('')}</div></div>
       <div><label class="lbl" for="fbText">Sua mensagem</label><textarea class="field" id="fbText" maxlength="${FB_MAX}" placeholder="Ex.: queria ver as mamadas da madrugada separadas">${esc(FB.text)}</textarea>
       <div class="fbmeta"><span>Quem cuida do Soneca lê todas.</span><span id="fbCount">${FB.text.length} de ${FB_MAX}</span></div></div>
       ${FB.err ? `<div class="err" id="fbErr">${esc(FB.err)}</div>` : ''}
       <div class="lbl">Vai junto: seu nome, a família aberta e o tipo de celular.</div>
       <button class="save" data-act="fbSend">Enviar</button>`);
  const top = $('sheet').scrollTop; openPanel(h); $('sheet').scrollTop = top;
}
async function sendFeedback(btn) {
  const message = FB.text.trim();
  if (!message) { FB.err = 'Escreva sua mensagem antes de enviar.'; return drawFeedback(); }
  busy(btn, true);
  const { error } = await sb.from('feedback').insert({ family_id: st.family.id, kind: FB.type || null, message, device: deviceText() });
  if (error) FB.err = error.message?.includes('feedback_limit') ? 'Você já mandou muitas mensagens hoje. Tente de novo amanhã.'
                                                                 : 'Não foi possível enviar. Confira a conexão e tente de novo.';
  else Object.assign(FB, { type: '', text: '', sent: true, err: '' });
  // Se a tela foi fechada enquanto enviava, avisa pelo toast.
  if (S?.mode === 'feedback') drawFeedback(); else toast(error ? FB.err : 'Mensagem enviada. Obrigado!');
}
function feedbackAction(a, v, btn) {
  if (a === 'fbType') { FB.type = FB.type === v ? '' : v; return drawFeedback(); }
  if (a === 'fbSend') return sendFeedback(btn);
  if (a === 'fbAgain') { FB.sent = false; return drawFeedback(); }
}
// O tipo de celular que vai junto: aparelho, sistema, navegador e se é o app (iPhone ou Android) ou o site.
function deviceText() {
  const u = navigator.userAgent, ios = u.match(/OS (\d+)[_.](\d+)/), and = u.match(/Android (\d+(?:\.\d+)?)/);
  const dev = /iPad/.test(u) || (isIOS && !/iPhone|iPod/.test(u)) ? 'iPad' : isIOS ? 'iPhone'
    : /Android/.test(u) ? 'Android' + (and ? ' ' + and[1] : '') : 'Computador';
  const sys = /iPhone|iPad|iPod/.test(u) && ios ? 'iOS ' + ios[1] + '.' + ios[2] : '';
  const nav = /SamsungBrowser/.test(u) ? 'Samsung Internet' : /Edg(A|iOS)?\//.test(u) ? 'Edge' : /CriOS|Chrome\//.test(u) ? 'Chrome'
    : /FxiOS|Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : 'outro navegador';
  return [dev, sys, nav, ANDROID ? 'app do Android' : NATIVE ? 'app do iPhone' : 'no navegador'].filter(Boolean).join(' · ');
}

async function afterLeavingFamily() {
  S = null; $('scrim').hidden = true; $('sheet').hidden = true;
  await loadFamilies();
  if (st.families.length) openFamily(st.families[0].id);
  else show('scrStart');
}
// Os toques nas abas do bebê, Família e Perfil.
async function paneAction(a, v, btn) {
  const f = st.family;
  // Aba do bebê
  if (a === 'jump') return spotlight(v);
  if (a === 'gKind') { G.kind = v; G.win = null; return render(); }
  if (a === 'gWin') { G.win = [0, +v]; return render(); }
  if (a === 'newWeight') return logForm('weight');
  if (a === 'newMilestone') return logForm('milestone');
  if (a === 'editWeight') return logForm('weight', st.measures.find(w => w.id === v));
  if (a === 'editMilestone') return logForm('milestone', st.milestones.find(m => m.id === v));
  if (a === 'allMeds') return medsSheet();
  if (a === 'report') return reportSheet();
  if (a === 'newQ') return questionForm(null);
  if (a === 'editQ') return questionForm(st.questions.find(q => q.id === v));
  if (a === 'askQ') return askQuestion(v);
  if (a === 'answers') return answersSheet();
  if (a === 'newMed') return medForm(null, 'pane');
  if (a === 'editMed') return medForm(st.meds.find(m => m.id === v), 'pane');
  if (a === 'editBaby') return babySheet(st.babies.find(b => b.id === v));
  if (a === 'addBaby') return babySheet(null);
  if (a === 'delBabyAsk') { babySheet(st.babies.find(b => b.id === v)); return askDelBaby(); }
  // Família
  if (a === 'openBaby') { if (v !== st.baby?.id) await selectBaby(v); return goTab('baby'); }
  if (a === 'famName') return famNameSheet();
  if (a === 'sleepTrack') return setTrack(st.track === false);
  if (a === 'editNight') return nightSheet(st.babies.find(b => b.id === v));
  if (a === 'invite') {
    busy(btn, true);
    const { data, error } = await sb.from('invites').insert({ family_id: f.id }).select('token').single();
    busy(btn, false);
    if (error) return toast('Não foi possível criar o convite.');
    FP.invite = LINK_BASE + '/?convite=' + data.token; return render();
  }
  if (a === 'copyInv') return navigator.clipboard.writeText(FP.invite).then(() => toast('Link copiado'), () => toast('Selecione o link e copie'));
  if (a === 'shareInv') return navigator.share({ title: 'Soneca', text: 'Entre na família ' + f.name + ' no Soneca:', url: FP.invite }).catch(() => {});
  if (a === 'rm') {
    const n = st.names[v] || 'Alguém';
    return askConfirm('Remover ' + n + ' da família?', n + ' deixa de ver a família. O que anotou fica na família, sem o nome.', 'Remover', async () => {
      const { error } = await sb.from('family_members').delete().eq('family_id', f.id).eq('user_id', v);
      if (error) return toast('Não foi possível remover.');
      st.members = st.members.filter(m => m.user_id !== v); render();
    });
  }
  if (a === 'delFam' || a === 'leave') {
    const [t, p, yes] = a === 'delFam'
      ? ['Apagar a família?', 'Apaga a família, os bebês e todos os registros, para todos os membros. Não dá para desfazer.', 'Apagar']
      : ['Sair da família?', 'O que você anotou fica na família, sem seu nome.', 'Sair'];
    return askConfirm(t, p, yes, async () => {
      const q = a === 'delFam' ? sb.from('families').delete().eq('id', f.id)
                               : sb.from('family_members').delete().eq('family_id', f.id).eq('user_id', st.user.id);
      const { error } = await q;
      if (error) return toast('Não foi possível concluir.');
      return afterLeavingFamily();
    });
  }
  // Perfil
  if (a === 'rename') return renameSheet();
  if (a === 'theme') return setTheme(v);
  if (a === 'switchFam') return openFamily(v);
  if (a === 'newFam') return onbStart('profile');
  if (a === 'shareApp') return navigator.share({ title: 'Soneca', text: REFER_TEXT, url: LINK_BASE + '/' }).catch(() => {});
  if (a === 'copyApp') return navigator.clipboard.writeText(REFER_TEXT + ' ' + LINK_BASE + '/').then(() => toast('Texto copiado'), () => toast('Selecione o endereço e copie'));
  if (a === 'feedback') return feedbackSheet();
  if (a === 'reminder') return setReminder(!remOn());
  // Fora da conta, nenhum lembrete com o nome do bebê.
  if (a === 'logout') { await remCancel().catch(() => {}); await sb.auth.signOut(); location.href = '/'; }
  if (a === 'delAccount') return accountSheet();
}

/* ---------- eventos ---------- */
$('sheetIn').addEventListener('input', e => {
  if (e.target.id === 'fbText') {
    FB.text = e.target.value; $('fbCount').textContent = FB.text.length + ' de ' + FB_MAX;
    if (FB.err) { FB.err = ''; $('fbErr')?.remove(); }
    return;
  }
  if (S?.mode === 'medform' || S?.mode === 'dose') return medInput(e.target);
  if (S?.mode === 'task') return taskInput(e.target);
  if (S?.mode === 'weight' || S?.mode === 'milestone') return logInput(e.target);
  if (S?.mode === 'question') return questionInput(e.target);
  if (S?.mode !== 'entry') return;
  const id = e.target.id;
  if (id === 'noteIn') { S.note = e.target.value; if (S.err) { S.err = ''; $('sheetIn').querySelector('.err')?.remove(); } }
  if (id === 'timeIn') { S.time = e.target.value; $('daySeg')?.insertAdjacentHTML('afterend', daySeg()); $('daySeg')?.remove(); }
  if (id === 'dayIn' && e.target.value) { const [y, m, d] = e.target.value.split('-').map(Number); S.base = new Date(y, m - 1, d).getTime(); }
  if (id === 'tempIn') S.temp = e.target.value.replace(/[^\d,.]/g, '').slice(0, 4);
  if (id === 'durIn') S.dmin = e.target.value.replace(/\D/g, '').slice(0, 3);
  if ((id === 'tempIn' || id === 'durIn') && S.err) { S.err = ''; $('sheetIn').querySelector('.err')?.remove(); }
  if (id === 'mlIn') S.ml = e.target.value.replace(/\D/g, '').slice(0, 4);
  if (id === 'min-l' || id === 'min-r') {
    const key = id.slice(4); S[key + 'min'] = e.target.value.replace(/\D/g, '').slice(0, 3);
    if (S[key + 'min']) { S[key] = true; markSide(key); }
    $('total').textContent = totalText();
  }
});
$('sheetIn').addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b || !S) return;
  const a = b.dataset.act, v = b.dataset.val;
  if (a === 'close') return closeSheet();
  if (a === 'saveBaby') return saveBaby(b);
  if (a === 'askDelBaby') return askDelBaby();
  if (a === 'saveName') return saveName(b);
  if (S.mode === 'feedback') return feedbackAction(a, v, b);
  if (S.mode === 'account') return accountAction(a);
  if (S.mode === 'famname') { if (a === 'saveFamName') return saveFamName(b); return; }
  if (S.mode === 'night') return nightAction(a, b);
  if (S.mode === 'cal') return calAction(a, v);
  if (S.mode === 'meds' || S.mode === 'medform' || S.mode === 'dose') return medAction(a, v, b);
  if (S.mode === 'tasks' || S.mode === 'taskpick' || S.mode === 'task') return taskAction(a, v, b);
  if (S.mode === 'weight' || S.mode === 'milestone') return growthAction(a, v, b);
  if (S.mode === 'question' || S.mode === 'answers') return questionAction(a, v, b);
  if (S.mode === 'report') return reportAction(a, v);
  if (S.mode === 'hist') return histAction(a, v);
  if (S.mode !== 'entry') return;
  if (a === 'src') S.src = v;
  else if (a === 'ml') S.ml = +v;
  else if (a === 'mlstep') S.ml = Math.max(0, (+S.ml || 0) + (+v)) || '';
  else if (a === 'pick') { S[v] = !S[v]; if (!S[v]) S[v + 'min'] = ''; }
  else if (a === 'minstep') { const [key, d] = v.split(':'); S[key + 'min'] = Math.min(180, Math.max(0, (+S[key + 'min'] || 0) + (+d))) || ''; if (S[key + 'min']) S[key] = true; }
  else if (a === 'sk') S.sk = v;
  else if (a === 'sym') { S.sym = v; if (v !== 'febre') S.temp = ''; if (!withDuration(v)) S.dmin = ''; }
  else if (a === 'ck') { S.ck = v; if (!CARE_MIN.includes(v)) S.dmin = ''; }
  else if (a === 'dchip') S.dmin = +S.dmin === +v ? '' : v;
  else if (a === 'bput' || a === 'bdone') S[a] = !S[a];
  else if (a === 'oint') { if (S.oint.has(v)) S.oint.delete(v); else S.oint.add(v); }
  // O aviso abre a tela da Pomada; a Fralda espera, com o que já foi marcado, e volta depois.
  else if (a === 'ointCfg') return taskScreen(null, 'diaper', 'ointment', S);
  else if (a === 'by') S.by = S.by === v ? null : v;
  else if (a === 'alone') { S.alone = !S.alone; if (S.alone) { S.dmin = ''; S.by = null; } }
  else if (a === 'pee' || a === 'poo') { S[a] = !S[a]; if (!S.poo) { S.psize = null; S.palert = false; } }
  else if (a === 'psize') S.psize = S.psize === v ? null : v;
  else if (a === 'palert') { S.palert = !S.palert; S.wig = S.palert; }
  else if (a === 'now') { S.base = startOfDay(Date.now()); S.time = hm(Date.now()); S.other = false; }
  else if (a === 'back') { const t = computeT() - (+v) * MIN; S.base = startOfDay(t); S.time = hm(t); }
  else if (a === 'day') {
    const t0 = startOfDay(Date.now());
    S.other = v === 'other';
    if (!S.other) S.base = v === 'today' ? t0 : addDays(t0, -1);
    else if (S.base >= addDays(t0, -1)) S.base = addDays(t0, -2);
  }
  else if (a === 'del') {
    const e = S.edit;
    return askConfirm('Apagar este registro?', label(e, sortedEntries(), st.baby.sex) + ', ' + askWhen(e.t) + '. Não dá para desfazer.', 'Apagar',
      async () => { if (await deleteEntry(e.id)) { closeSheet(); toast('Registro apagado'); } });
  }
  else if (a === 'save') return saveEntry(b);
  else if (a === 'openO') S.openO = !S.openO;
  else if (a === 'openT') S.openT = !S.openT;
  else if (a === 'ftTap' && S.compact && !ftGet()) { ftTap(v); return closeSheet(); }
  else if (a === 'ftTap') ftTap(v);
  else if (a === 'ftEnd') return ftFinish();
  else if (a === 'ftDrop') return ftDiscard();
  else if (a === 'ftManual') {
    // Os minutos digitados já vêm com o que o cronômetro contou, na hora em que começou.
    const t = ftPause(); S.manual = true;
    if (t) {
      const lm = ftMin(t.l), rm = ftMin(t.r);
      S.l = !!lm; S.r = !!rm; S.lmin = lm || ''; S.rmin = rm || '';
      S.base = startOfDay(t.start); S.time = hm(t.start); S.other = S.base < addDays(startOfDay(Date.now()), -1); S.fromTimer = true;
    }
  }
  S.err = ''; drawEntry();
});

document.querySelectorAll('[data-i]').forEach(el => el.outerHTML = ICON[el.dataset.i]);
let holdT = 0, held = false;
for (const box of [$('grid'), $('popIn')]) {
  box.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-k]'); held = false; clearTimeout(holdT);
    if (!b || b.dataset.k === 'more' || b.dataset.k === 'other' || !HIST[b.dataset.k]) return;
    holdT = setTimeout(() => { held = true; closePop(); histSheet(b.dataset.k); }, 500);
  });
  for (const t of ['pointerup', 'pointerleave', 'pointercancel']) box.addEventListener(t, () => clearTimeout(holdT));
  box.addEventListener('contextmenu', e => { if (e.target.closest('[data-k]')) e.preventDefault(); });
}
$('grid').addEventListener('click', e => {
  const b = e.target.closest('[data-k]'); if (!b || held) return;
  if (closePop()) return;
  if (b.dataset.k === 'more') return openPop();
  if (b.dataset.k === 'food') return foodSoon();
  sheetFrom = fromBtn(b, b.dataset.k); openEntry(b.dataset.k); sheetFrom = null;
});
$('popIn').addEventListener('click', e => {
  const b = e.target.closest('[data-k]'); if (!b || held) return;
  // Os de Outros crescem do próprio botão e voltam para o Outros.
  const from = fromBtn(b, 'more');
  closePop(); sheetFrom = from; openEntry(b.dataset.k); sheetFrom = null;
});
$('popScrim').addEventListener('click', closePop);
// A faixa: Acordou salva na hora, como antes; na da mamada, Terminar salva e o resto abre o cronômetro.
$('strip').addEventListener('click', async e => {
  if (stripBusy) return;
  const a = e.target.closest('[data-strip]')?.dataset.strip; if (!a) return;
  if (a === 'end') return ftFinish();
  if (a === 'open') return openEntry('feed');
  if (a === 'wake') {
    const row = await addEntry({ kind: 'wake', t: Date.now() });
    if (row) toast('Acordou às ' + hm(Date.parse(row.at)) + cheer({ kind: 'wake' }), () => deleteEntry(row.id));
  }
});
$('strip').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.strip === 'open') { e.preventDefault(); openEntry('feed'); } });
new ResizeObserver(dockSize).observe($('dock'));
window.addEventListener('resize', dockSize);
// "Ainda dormindo?": abre o Sono em "Acordou", já no dia do "Dormiu", ou apaga esse "Dormiu".
const oldSleep = () => { const { open } = sleepIntervals(sortedEntries()); return open === null ? null : sortedEntries().find(e => e.kind === 'sleep' && e.t === open); };
$('oldWake').onclick = () => {
  const e = oldSleep(); if (!e) return;
  openEntry('wake'); S.sk = 'wake'; S.base = startOfDay(e.t); S.time = hm(e.t);
  S.other = S.base < addDays(startOfDay(Date.now()), -1); drawEntry();
};
$('oldDel').onclick = async () => {
  const e = oldSleep(); if (!e || !await deleteEntry(e.id)) return;
  // Desfazer devolve o "Dormiu" inteiro: colo, sozinho e quem fez (só os que tinha, para salvar sem o 020/022).
  const back = { kind: 'sleep', t: e.t, note: e.note };
  for (const k of ['lap_min', 'self_settled', 'done_by']) if (e[k] != null) back[k] = e[k];
  toast('Registro apagado', () => addEntry(back));
};
$('meds').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'check') return markHome(b);
  if (b.dataset.act === 'skipDose') return markHome(b, true);
  if (b.dataset.act === 'dose') return doseSheet(b.dataset.val);
  if (b.dataset.act === 'allMeds') return medsSheet();
});
$('tasks').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, v = b.dataset.val;
  if (a === 'tcheck') return markTaskHome(b);
  if (a === 'tskip') return markTaskHome(b, true);
  if (a === 'allTasks') return tasksSheet();
  if (a === 'topen') { const r = st.routines.find(x => x.id === v); if (r) taskScreen(r, 'home'); }
});
$('babyBtn').onclick = () => st.baby ? goTab('baby') : babySheet(null);
$('babyTabs').addEventListener('click', e => { const b = e.target.closest('[data-baby]'); if (b) selectBaby(b.dataset.baby); });
$('tabbar').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) goTab(b.dataset.tab); });
// Tendências (tendencias.js): guias, visão, setas, toque numa barra e botão i. Redesenha só a aba e
// devolve o foco ao botão tocado.
function redrawTrends(sel) { drawTrendsPane(); if (sel) $('paneTrends').querySelector(sel)?.focus(); }
$('paneTrends').addEventListener('click', e => {
  const t = st.trend, g = s => e.target.closest(s); let x;
  if ((x = g('[data-baby]'))) return selectBaby(x.dataset.baby);
  if ((x = g('[data-tinfo]'))) { const k = x.dataset.tinfo; t.info = t.info === k ? null : k; return redrawTrends(`[data-tinfo="${k}"]`); }
  if ((x = g('[data-ttab]'))) { t.tab = x.dataset.ttab; t.info = null; return redrawTrends(`[data-ttab="${t.tab}"]`); }
  if ((x = g('[data-tmode]'))) { if (t.mode !== x.dataset.tmode) { t.mode = x.dataset.tmode; t.off = 0; t.sel = null; } return redrawTrends(`[data-tmode="${t.mode}"]`); }
  if ((x = g('[data-tnav]'))) { if (x.disabled) return; t.off = Math.max(0, t.off - +x.dataset.tnav); t.sel = null; return redrawTrends(`[data-tnav="${x.dataset.tnav}"]`); }
  if ((x = g('[data-ti]'))) { t.sel = +x.dataset.ti; return redrawTrends(); }
});
for (const id of ['paneBaby', 'paneFamily', 'paneProfile']) $(id).addEventListener('click', e => {
  const c = e.target.closest('[data-baby]'); if (c) return selectBaby(c.dataset.baby);
  const b = e.target.closest('[data-act]'); if (b) paneAction(b.dataset.act, b.dataset.val, b);
});
// Zoom nos gráficos (30/10): dois toques seguidos aproximam as 6 horas em volta do toque, ou voltam ao
// dia inteiro. O toque simples (abrir o registro ou o dia) espera um instante para não brigar com o duplo.
const TAP2 = 300;
let tap1 = null;
function chartTap(e, single) {
  const svg = e.target.closest('svg[data-zchart]');
  if (tap1 && tap1.svg === svg && Date.now() - tap1.t < TAP2) { clearTimeout(tap1.timer); tap1 = null; return toggleZoom(svg, e); }
  if (tap1) clearTimeout(tap1.timer);
  tap1 = { svg, t: Date.now(), timer: setTimeout(() => { tap1 = null; single?.(); }, TAP2) };
}
function toggleZoom(svg, e) {
  const k = svg.closest('#weekView') ? 'week' : 'day';
  if (st.zoom[k] != null) st.zoom[k] = null;
  else {
    const r = svg.getBoundingClientRect(), vx = (e.clientX - r.left) / r.width * +svg.dataset.w;
    const h = (vx - +svg.dataset.lw) / +svg.dataset.cw * 24;
    st.zoom[k] = Math.min(24 - ZOOM_H, Math.max(0, Math.floor(h / ZOOM_H) * ZOOM_H));
  }
  render();
}
// Setas e "Dia inteiro", no alto do gráfico aproximado.
function zoomStep(k, a) {
  st.zoom[k] = a === 'full' ? null : Math.min(24 - ZOOM_H, Math.max(0, st.zoom[k] + (a === 'next' ? ZOOM_H : -ZOOM_H)));
  render();
}
// Tocar numa marca do gráfico do dia abre o registro, como na linha do tempo.
$('summary').addEventListener('click', e => {
  const z = e.target.closest('[data-zoom]'); if (z) return zoomStep('day', z.dataset.zoom);
  if (!e.target.closest('svg[data-zchart]')) return;
  const m = e.target.closest('[data-id]'), ev = m && st.entries.get(m.dataset.id);
  chartTap(e, ev ? () => openEntry(ev.kind, ev) : null);
});
$('timeline').addEventListener('click', e => {
  const r = e.target.closest('.row'); if (!r) return;
  const ev = st.entries.get(r.dataset.id); if (ev) openEntry(ev.kind, ev);
});
// Setas: um dia na linha do tempo, 7 dias no painel, um mês no resumo.
function step(n) {
  if (st.view === 'week') st.weekEnd = addDays(st.weekEnd, 7 * n);
  else if (st.view === 'month') st.month = clampMonth(monthStart(st.month || Date.now(), n));
  else st.viewDay = addDays(st.viewDay, n);
  render();
}
$('prevDay').onclick = () => step(-1);
$('nextDay').onclick = () => step(1);
$('dayTitle').onclick = calSheet;
// Hoje: volta para hoje, para os 7 dias que terminam hoje ou para o mês atual.
$('toToday').onclick = () => {
  const today = startOfDay(Date.now());
  if (st.view === 'week') st.weekEnd = today; else if (st.view === 'month') st.month = curMonth(); else st.viewDay = today;
  render();
};
// Trocar de aba mantém o dia escolhido se ele estiver nos 7 dias do painel; senão, alinha os dois.
const inWeek = d0 => d0 <= st.weekEnd && d0 > addDays(st.weekEnd, -7);
// O Mês abre no mês do dia escolhido; voltar do Mês mantém o dia e a semana de antes.
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => {
  const to = b.dataset.view; if (to === st.view) return;
  if (to === 'month') st.month = clampMonth(chosenDay());
  else if (st.view !== 'month' && !inWeek(st.viewDay)) { if (to === 'week') st.weekEnd = st.viewDay; else st.viewDay = st.weekEnd; }
  st.view = to; render();
});
// Compartilhar o resumo da semana ou do mês: pelo celular (WhatsApp, mensagem) ou copiando o texto.
function shareReport(how) {
  const text = st.shareText; if (!text) return;
  if (how === 'share') return navigator.share({ text }).catch(() => {});
  navigator.clipboard.writeText(text).then(() => toast('Texto copiado'), () => toast('Não foi possível copiar'));
}
$('monthView').addEventListener('click', e => {
  const sh = e.target.closest('[data-share]'); if (sh) return shareReport(sh.dataset.share);
  // As noites com mais despertares (noites.js): tocar abre o dia em que a noite começou.
  const o = e.target.closest('[data-open]'); if (o) openDay(+o.dataset.open);
});
// Painel da semana: filtro, métrica e tocar num dia para abrir a linha do tempo dele.
function openDay(d0) {
  st.viewDay = d0; st.view = 'day'; render();
  $('dayTitle').closest('.daynav').scrollIntoView({ block: 'start', behavior: smooth() });
}
$('weekView').addEventListener('click', e => {
  const sh = e.target.closest('[data-share]'); if (sh) return shareReport(sh.dataset.share);
  const f = e.target.closest('[data-flt]'); if (f) { st.show[f.dataset.flt] = st.show[f.dataset.flt] === false; return render(); }
  const m = e.target.closest('[data-met]'); if (m) { st.metric = m.dataset.met; return render(); }
  const z = e.target.closest('[data-zoom]'); if (z) return zoomStep('week', z.dataset.zoom);
  const r = e.target.closest('.dayrow');
  if (e.target.closest('svg[data-zchart]')) return chartTap(e, r ? () => openDay(+r.dataset.day) : null);
  const o = e.target.closest('[data-open]'); if (o) openDay(+o.dataset.open);
});
$('weekView').addEventListener('keydown', e => {
  const r = e.target.closest('.dayrow');
  if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDay(+r.dataset.day); }
});
$('scrim').onclick = closeSheet;
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!$('ask').hidden) closeAsk(); else if (!$('rpView').hidden) closeReportView(); else if (S) closeSheet(); });
// Botão "voltar" do Android: fecha o relatório ou a janela aberta, depois volta para a aba Hoje; só então
// deixa o app (sem fechar, como os outros apps do Android).
if (ANDROID) window.Capacitor.registerPlugin('App').addListener('backButton', () => {
  if (!$('ask').hidden) closeAsk();
  else if (!$('rpView').hidden) closeReportView();
  else if (S) closeSheet();
  else if (!$('scrMain').hidden && st.tab !== 'home') goTab('home');
  else window.Capacitor.registerPlugin('App').minimizeApp();
});
$('rpBack').onclick = closeReportView;
$('rpPrint').onclick = printReport;

// Ao voltar para o app depois de um tempo, recarrega os registros (a conexão ao vivo pode ter caído).
// Uma olhada rápida em outro app (menos de 1 minuto) não recarrega: o canal ao vivo segue valendo.
const RELOAD_AFTER = MIN;
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  ftSync();
  if (Date.now() - hiddenAt < RELOAD_AFTER) return render();
  if (st.baby && !$('scrMain').hidden && !S && $('rpView').hidden) Promise.all([loadEntries(), loadMeds(), loadGrowth(), loadQuestions()]).then(render);
});
// A cada 30 segundos, a tela Hoje atualiza o "há quanto tempo" e as doses. As outras abas não: redesenhar
// a aba do bebê no meio de um arrasto no gráfico de peso cortava o gesto.
setInterval(() => { if (st.tab === 'home') refresh(); }, 30000);

// Puxar para atualizar (Patrick, 07/11): no alto da aba Hoje, puxar para baixo e soltar depois de 80 px.
// A tela desce com o dedo e, enquanto busca, fica 76 px abaixo; no vão, a capivara (só as bordas) se
// desenha conforme puxa e, ao soltar, um traço corre pela borda dela até terminar.
const PULL = 80, HOLD = 76;
$('ptr').innerHTML = '<svg viewBox="0 0 120 70">' + ['bg', 'fg'].map(c => `<g class="${c}">${[...CAPI.matchAll(/ d="([^"]+)"/g)].map(m => `<path pathLength="100" d="${m[1]}"/>`).join('')}</g>`).join('') + '</svg>';
let pull = null, pulling = false;
const canPull = () => st.tab === 'home' && st.baby && !$('scrMain').hidden && !S && $('rpView').hidden && $('pop').hidden && window.scrollY <= 0;
function pullShow(d) {
  const p = $('ptr'), r = document.documentElement.style;
  p.hidden = false; r.setProperty('--pk', Math.min(1, d / PULL)); r.setProperty('--pd', Math.min(d, 130) + 'px');
  document.body.classList.add('pulling');
}
async function pullHide() {
  const r = document.documentElement.style;
  document.body.classList.add('pull-back'); r.setProperty('--pd', '0px'); r.setProperty('--pk', 0);
  await wait(250);
  document.body.classList.remove('pulling', 'pull-back'); $('ptr').classList.remove('spin'); $('ptr').hidden = true;
}
addEventListener('touchstart', e => {
  if (pulling || e.touches.length !== 1 || !canPull() || e.target.closest('#dock,#pop,#tabbar,.sheet')) return (pull = null);
  pull = { x: e.touches[0].clientX, y: e.touches[0].clientY, d: 0 };
}, { passive: true });
addEventListener('touchmove', e => {
  if (!pull) return;
  const dx = e.touches[0].clientX - pull.x, dy = e.touches[0].clientY - pull.y;
  // Puxou para o lado (gráfico ampliado) ou a tela já rolou: não é atualizar.
  if (pull.d === 0 && (Math.abs(dx) > Math.abs(dy) || dy < 0 || window.scrollY > 0)) { pull = null; return; }
  pull.d = Math.max(0, dy * .65); if (pull.d > 4) { document.body.classList.remove('pull-back'); pullShow(pull.d); }
}, { passive: true });
addEventListener('touchend', async () => {
  if (!pull) return; const d = pull.d; pull = null;
  if (d < PULL) return pullHide();
  pulling = true; document.body.classList.add('pull-back'); $('ptr').classList.add('spin'); pullShow(HOLD);
  document.documentElement.style.setProperty('--pk', 1);
  const t0 = Date.now();
  try { await Promise.all([loadEntries(), loadMeds(), loadGrowth(), loadQuestions()]); render(); } catch {}
  await wait(Math.max(0, 2400 - (Date.now() - t0)));   // o bastante para ver a capivara dar uma volta
  await pullHide(); pulling = false;
});
addEventListener('touchcancel', () => { if (pull) { pull = null; pullHide(); } });

// Aparência escolhida em Perfil (claro ou escuro); sem escolha, segue o celular.
const savedTheme = lsGet('cad-theme'); if (savedTheme) document.documentElement.dataset.theme = savedTheme;

boot().catch(() => { show('scrLogin'); err('errEmail', 'Não foi possível abrir o Soneca. Confira a conexão e recarregue.'); });

// iPhone ou iPad (o iPad se apresenta como Mac): vai junto das sugestões.
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
