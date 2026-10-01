import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm';
import { SUPABASE_URL, SUPABASE_KEY, GOOGLE_LOGIN } from './config.js';
import { ICON, MIN, HOUR, DAY, pad, startOfDay, addDays, hm, dur, ago, esc, dayTitle, shortDay, rangeTitle, ageText, fullDate, shortDate,
         sleepIntervals, label, detail, SIDE_SHORT, MESES_L, lsGet, lsSet, SYMPTOM, CARE, POO_SIZE } from './util.js';
import { weekHtml, dayLine } from './week.js';
import { clockHtml } from './clock.js';
import { MILESTONES, kg, parseKg, ageOn, sortWeights, sortMilestones, weightChart } from './growth.js';
import { periodStats, reportText, monthHtml, shareHtml } from './report.js';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = id => document.getElementById(id);
const SCREENS = ['scrLoading','scrLogin','scrName','scrInvite','scrCreate','scrMain'];
const KEEP_DAYS = 60;

const st = {
  user: null, profile: null,
  families: [], family: null,
  babies: [], baby: null,
  members: [], names: {},
  entries: new Map(),          // id -> registro (com t = ms)
  meds: [],                    // remédios programados do bebê aberto (sem os parados)
  weights: [], milestones: [], // peso e marcos do bebê aberto, do mais antigo ao mais recente
  growthOk: true,              // falso se não deu para carregar (por exemplo, antes do 007)
  settings: { hidden: [] },    // botões que a família desligou (vale para todos da família)
  settingsOk: true,            // falso se não deu para carregar (por exemplo, antes do 008)
  settingsCh: null,
  tab: 'home',                 // aba aberta na barra de baixo: 'home' (Hoje), 'baby', 'family' ou 'profile'
  view: 'day',                 // 'day' (linha do tempo), 'week' (painel da semana) ou 'month' (resumo do mês)
  viewDay: startOfDay(Date.now()),
  weekEnd: startOfDay(Date.now()),   // último dos 7 dias do painel
  month: 0,                    // primeiro dia do mês do resumo (0 = o mês atual)
  shareText: '',               // o resumo da semana ou do mês aberto, pronto para compartilhar
  show: { sleep: true, feed: true, diaper: true, pump: true },   // filtro de "Como foram os dias"
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
const REFER_TEXT = 'Conhece o Caderninho? É um app para anotar a rotina do bebê (mamadas, sono, fraldas) numa linha do tempo que toda a família vê junto. Não precisa baixar na loja: abra o link, entre com seu e-mail e crie a sua família.';

/* ---------- início ---------- */
async function boot() {
  const tok = new URLSearchParams(location.search).get('convite');
  if (tok) { lsSet('cad-invite', tok); history.replaceState(null, '', '/'); }

  // Voltou do Google sem entrar (cancelou ou deu erro): o endereço traz "#error=...".
  const googleFailed = /[#&]error/.test(location.hash);
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    if (googleFailed) { history.replaceState(null, '', location.pathname + location.search); err('errGoogle', 'Não foi possível entrar com o Google. Tente de novo ou use o código por e-mail.'); }
    show('scrLogin'); return;
  }
  st.user = session.user;

  const { data: prof } = await sb.from('profiles').select('id,display_name').eq('id', st.user.id).maybeSingle();
  if (!prof) {
    // Quem entrou pelo Google já vem com o nome; dá para trocar antes de continuar.
    const meta = st.user.user_metadata || {};
    if (!$('nameIn').value) $('nameIn').value = String(meta.full_name || meta.name || '').trim().slice(0, 40);
    show('scrName'); $('nameIn').focus(); return;
  }
  st.profile = prof; st.names[prof.id] = prof.display_name;

  const inv = lsGet('cad-invite');
  if (inv) return showInvite(inv);

  await loadFamilies();
  if (!st.families.length) { $('cancelCreate').hidden = true; show('scrCreate'); return; }
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
// Entrar com Google: sai do app para o Google e volta para cá já com a sessão (o convite, se houver,
// ficou guardado no celular). A mesma pessoa, com o mesmo e-mail, cai na mesma conta do código.
$('sso').hidden = !GOOGLE_LOGIN;
$('googleBtn').onclick = async () => {
  err('errGoogle'); busy($('googleBtn'), true);
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/' } });
  if (error) { busy($('googleBtn'), false); err('errGoogle', 'Não foi possível abrir o Google. Confira a conexão e tente de novo.'); }
};

/* ---------- nome de exibição ---------- */
$('fName').addEventListener('submit', async e => {
  e.preventDefault(); err('errName');
  const name = $('nameIn').value.trim();
  if (!name) return err('errName', 'Escreva como você quer aparecer.');
  const btn = e.submitter; busy(btn, true);
  const { error } = await sb.from('profiles').insert({ id: st.user.id, display_name: name });
  busy(btn, false);
  if (error) return err('errName', errMsg(error));
  show('scrLoading'); boot();
});

/* ---------- convite ---------- */
async function showInvite(tok) {
  show('scrInvite'); err('errInvite'); $('acceptInvite').hidden = false;
  const { data, error } = await sb.rpc('invite_info', { tok });
  const row = data && data[0];
  if (error || !row || !row.is_valid) {
    $('inviteText').textContent = '';
    err('errInvite', row && !row.is_valid ? 'Este convite não vale mais. Peça um novo a quem te convidou.' : ERR.invite_not_found);
    $('acceptInvite').hidden = true; return;
  }
  $('inviteText').textContent = row.creator_name + ' convidou você para a família ' + row.family_name + '.';
  $('acceptInvite').onclick = async () => {
    busy($('acceptInvite'), true);
    const { data: fid, error } = await sb.rpc('accept_invite', { tok });
    busy($('acceptInvite'), false);
    if (error) return err('errInvite', errMsg(error));
    lsSet('cad-invite', null); await loadFamilies(); openFamily(fid);
  };
}
$('skipInvite').onclick = () => { lsSet('cad-invite', null); show('scrLoading'); boot(); };

/* ---------- criar família ---------- */
$('fCreate').addEventListener('submit', async e => {
  e.preventDefault(); err('errCreate');
  const btn = e.submitter; busy(btn, true);
  const { data: fid, error } = await sb.rpc('create_family', {
    family_name: $('famIn').value.trim(), baby_name: $('babyIn').value.trim(), baby_birth: $('birthIn').value || null,
  });
  busy(btn, false);
  if (error) return err('errCreate', errMsg(error));
  $('fCreate').reset(); await loadFamilies(); openFamily(fid);
});
$('cancelCreate').onclick = () => { show('scrMain'); };

/* ---------- abrir família ---------- */
async function openFamily(fid) {
  show('scrLoading');
  st.family = st.families.find(f => f.id === fid);
  lsSet('cad-family', fid);
  const [{ data: babies }, { data: mem }] = await Promise.all([
    sb.from('babies').select('id,name,birth_date').eq('family_id', fid).order('created_at'),
    sb.from('family_members').select('user_id,joined_at').eq('family_id', fid).order('joined_at'),
  ]);
  st.babies = babies || []; st.members = mem || [];
  await loadNames(st.members.map(m => m.user_id));
  const savedBaby = lsGet('cad-baby-' + fid);
  st.baby = st.babies.find(b => b.id === savedBaby) || st.babies[0] || null;
  subscribe(fid);
  await Promise.all([loadEntries(), loadMeds(), loadGrowth(), loadSettings(fid)]);
  st.tab = 'home'; FP.confirm = FP.invite = null;
  show('scrMain'); render();
}

async function loadNames(ids) {
  const missing = [...new Set(ids)].filter(id => id && !(id in st.names));
  if (!missing.length) return;
  const { data } = await sb.from('profiles').select('id,display_name').in('id', missing);
  for (const p of data || []) st.names[p.id] = p.display_name;
}

async function loadEntries() {
  st.entries = new Map();
  if (!st.baby) return;
  // Os últimos 60 dias e, para o resumo do mês anterior sair inteiro, desde o dia 1º dele.
  const since = new Date(Math.min(startOfDay(Date.now() - KEEP_DAYS * DAY), prevMonth())).toISOString();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('entries').select('*').eq('baby_id', st.baby.id)
      .gte('at', since).order('at').range(from, from + 999);
    if (error) { toast('Não foi possível carregar os registros.'); break; }
    for (const r of data) st.entries.set(r.id, withT(r));
    if (data.length < 1000) break;
  }
  await loadNames([...st.entries.values()].map(e => e.author_id));
}
const withT = r => ({ ...r, t: Date.parse(r.at) });

async function loadMeds() {
  st.meds = [];
  if (!st.baby) return;
  const { data, error } = await sb.from('medicines').select('*').eq('baby_id', st.baby.id).is('stopped_at', null).order('created_at');
  if (error) return toast('Não foi possível carregar os remédios.');
  st.meds = data;
}
async function loadGrowth() {
  st.weights = []; st.milestones = [];
  if (!st.baby) return;
  const [w, m] = await Promise.all([sb.from('weights').select('*').eq('baby_id', st.baby.id),
                                    sb.from('milestones').select('*').eq('baby_id', st.baby.id)]);
  st.growthOk = !w.error && !m.error;
  st.weights = sortWeights(w.data || []); st.milestones = sortMilestones(m.data || []);
}
// Botões da família. Canal ao vivo à parte: antes do 008 a tabela não existe, e ela no mesmo canal
// dos registros poderia derrubar a sincronização de tudo.
async function loadSettings(fid) {
  const { data, error } = await sb.from('family_settings').select('hidden_kinds').eq('family_id', fid).maybeSingle();
  st.settingsOk = !error;
  st.settings = { hidden: data?.hidden_kinds || [] };
  if (st.settingsCh) { sb.removeChannel(st.settingsCh); st.settingsCh = null; }
  if (error) return;
  st.settingsCh = sb.channel('botoes-' + fid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'family_settings', filter: 'family_id=eq.' + fid }, p => {
      if (p.new?.family_id !== st.family?.id) return;
      st.settings = { hidden: p.new.hidden_kinds || [] }; refresh();
    })
    .subscribe();
}
// Mudou algo vindo de outro celular: redesenha a tela e, se estiver aberta, a lista de remédios.
function refresh() { if (!S) render(); else if (S.mode === 'meds') { render(); drawMeds(); } }

function subscribe(fid) {
  if (st.channel) sb.removeChannel(st.channel);
  st.channel = sb.channel('familia-' + fid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: 'family_id=eq.' + fid }, async p => {
      if (p.eventType === 'DELETE') st.entries.delete(p.old.id);
      else if (st.baby && p.new.baby_id === st.baby.id) { st.entries.set(p.new.id, withT(p.new)); await loadNames([p.new.author_id]); }
      refresh();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'medicines', filter: 'family_id=eq.' + fid }, p => {
      const m = p.new; if (!m?.id || !st.baby || m.baby_id !== st.baby.id) return;
      st.meds = st.meds.filter(x => x.id !== m.id);
      if (!m.stopped_at) st.meds = [...st.meds, m].sort((a, b) => a.created_at < b.created_at ? -1 : 1);
      refresh();
    })
    .subscribe();
}

/* ---------- tela do dia ---------- */
const sortedEntries = () => [...st.entries.values()].sort((a, b) => a.t - b.t);
// Primeiro dia que dá para ver: o app carrega os últimos 60 dias.
const firstDay = () => addDays(startOfDay(Date.now()), -(KEEP_DAYS - 1));
// Resumo do mês: o mês atual e o anterior.
const monthStart = (t, n = 0) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime(); };
const curMonth = () => monthStart(Date.now()), prevMonth = () => monthStart(Date.now(), -1);
const clampMonth = t => Math.min(curMonth(), Math.max(monthStart(t), prevMonth()));
// Última mamada em que marcaram o peito (no banco, só a mamada no peito tem peito marcado).
const lastBreast = evs => evs.findLast(e => e.kind === 'feed' && e.side);

// Redesenha a aba aberta e a barra de baixo. Hoje é redesenhada sempre, mesmo escondida: é leve e
// fica pronta para quando a pessoa voltar.
const PANES = { home: 'paneHome', baby: 'paneBaby', family: 'paneFamily', profile: 'paneProfile' };
function render() {
  if ($('scrMain').hidden) return;
  for (const k in PANES) $(PANES[k]).hidden = k !== st.tab;
  document.querySelectorAll('#tabbar [data-tab]').forEach(x => x.dataset.tab === st.tab ? x.setAttribute('aria-current', 'page') : x.removeAttribute('aria-current'));
  $('tabBabyName').textContent = st.baby ? st.baby.name : 'Bebê';
  $('tabBabyInitial').textContent = (st.baby ? st.baby.name : '?').charAt(0).toUpperCase();
  if (st.tab === 'baby') drawBabyPane(); else if (st.tab === 'family') drawFamilyPane(); else if (st.tab === 'profile') drawProfilePane();
  renderHome();
}
// Trocar de aba: começa do alto. Tocar na aba aberta volta para o alto dela. "anchor" leva até uma seção.
function goTab(t, anchor) {
  if (t === st.tab && !anchor) return window.scrollTo({ top: 0, behavior: smooth() });
  if (t !== st.tab) { if (st.tab === 'family') FP.confirm = FP.invite = null; st.tab = t; window.scrollTo(0, 0); }
  render();
  if (anchor) spotlight(anchor);
}
const smooth = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
// Rola até a seção e deixa ela em destaque por um instante.
function spotlight(id) {
  const el = $(id); if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: smooth() });
  el.classList.remove('spot'); void el.offsetWidth; el.classList.add('spot');
  clearTimeout(spotlight.t); spotlight.t = setTimeout(() => el.classList.remove('spot'), 2200);
}
const babyChips = () => st.babies.map(x => `<button data-baby="${esc(x.id)}" class="${x.id === st.baby?.id ? 'on' : ''}">${esc(x.name)}</button>`).join('');

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
  const { out: intervals, open } = sleepIntervals(evs);
  $('sleepBanner').hidden = open === null;
  if (open !== null) $('sleepFor').textContent = dur(now - open);
  renderGrid(last, open, now);
  renderMeds();

  const today = startOfDay(now), week = st.view === 'week', month = st.view === 'month';
  $('tabDay').setAttribute('aria-selected', st.view === 'day'); $('tabWeek').setAttribute('aria-selected', week); $('tabMonth').setAttribute('aria-selected', month);
  $('dayView').hidden = st.view !== 'day'; $('weekView').hidden = !week; $('monthView').hidden = !month;
  $('prevDay').setAttribute('aria-label', week ? 'Semana anterior' : month ? 'Mês anterior' : 'Dia anterior');
  $('nextDay').setAttribute('aria-label', week ? 'Próxima semana' : month ? 'Próximo mês' : 'Próximo dia');
  // O resumo segue os botões da família (sem Ordenha ligada, não fala de ordenha).
  const sleep = { out: intervals, open }, logs = { weights: st.weights, milestones: st.milestones, on: isOn };
  if (month) {
    st.month = clampMonth(st.month || now);
    const d = new Date(st.month), end = monthStart(st.month, 1), partial = end > now;
    const title = MESES_L[d.getMonth()] + ' ' + d.getFullYear();
    $('dayText').textContent = title; $('dayTitle').setAttribute('aria-label', title + '. Escolher no calendário');
    $('nextDay').disabled = st.month >= curMonth(); $('toToday').hidden = st.month >= curMonth(); $('prevDay').disabled = st.month <= prevMonth();
    if (!b) { st.shareText = ''; $('monthView').innerHTML = '<div class="empty">Cadastre um bebê para começar.</div>'; return; }
    const s = periodStats({ a: st.month, z: end, evs, sleep, now, ...logs });
    const heading = MESES_L[d.getMonth()] + ' de ' + b.name + (partial ? ', até ' + shortDate(localDate(now)) : '');
    st.shareText = s.any ? reportText(s, { title: heading, name: b.name, span: 'mês' }) : '';
    $('monthView').innerHTML = monthHtml(s, { heading })
      + (s.any ? shareHtml(st.shareText) : '');
    return;
  }
  if (week) {
    // Os 7 dias ficam dentro do que o app carrega.
    st.weekEnd = Math.min(today, Math.max(st.weekEnd, addDays(firstDay(), 6)));
    const title = rangeTitle(addDays(st.weekEnd, -6), st.weekEnd);
    $('dayText').textContent = title; $('dayTitle').setAttribute('aria-label', title + '. Escolher no calendário');
    $('nextDay').disabled = $('toToday').hidden = st.weekEnd >= today;
    $('prevDay').disabled = st.weekEnd <= addDays(firstDay(), 6);
    // No fim do painel, o resumo destes 7 dias pronto para mandar.
    const s = b && periodStats({ a: addDays(st.weekEnd, -6), z: addDays(st.weekEnd, 1), evs, sleep, now, ...logs });
    st.shareText = s?.any ? reportText(s, { title: 'Semana de ' + b.name + ', ' + title, name: b.name, span: 'semana' }) : '';
    $('weekView').innerHTML = !b ? '<div class="empty">Cadastre um bebê para começar.</div>'
      : weekHtml({ end: st.weekEnd, evs, sleep, now, show: st.show, metric: st.metric, on: isOn })
        + (st.shareText ? shareHtml(st.shareText, { heading: 'Mandar a semana para a família', note: 'Os totais destes 7 dias, para mandar no WhatsApp ou por mensagem.' }) : '');
    return;
  }

  const d0 = st.viewDay, d1 = addDays(d0, 1);
  $('dayText').textContent = dayTitle(d0); $('dayTitle').setAttribute('aria-label', dayTitle(d0) + '. Escolher no calendário');
  $('nextDay').disabled = $('toToday').hidden = d0 >= today;
  $('prevDay').disabled = d0 <= firstDay();

  const day = evs.filter(e => e.t >= d0 && e.t < d1);
  // Como foi o dia: numa linha só, como no painel da semana, com a contagem embaixo.
  const sleeps = open === null ? intervals : [...intervals, [open, now]];
  const slept = sleeps.some(([a, z]) => z > d0 && a < d1);
  $('summary').innerHTML = !b || (!day.length && !slept) ? ''
    : `<div class="card daycard"><h3>Como foi o dia</h3>${dayLine({ d0, evs, sleeps, now, on: isOn })}</div>`;

  // Dose pulada não entra na linha do tempo; continua em "Remédios e horários", com Desfazer.
  const rows = day.filter(e => !(e.kind === 'med' && e.skipped));
  $('timeline').innerHTML = !b ? '<div class="empty">Cadastre um bebê para começar.</div>'
    : !rows.length ? '<div class="empty">Nada registrado neste dia.</div>'
    : rows.slice().reverse().map(e => {
        const who = e.author_id ? st.names[e.author_id] : '';
        const noteIsName = e.kind === 'other' || (e.kind === 'symptom' && e.symptom === 'outro');
        const sub = [esc(detail(e)), !noteIsName && e.note ? esc(e.note) : '', who ? 'por ' + esc(who.split(' ')[0]) : ''].filter(Boolean).join(' · ');
        return `<button class="row" data-id="${esc(e.id)}"><span class="h">${hm(e.t)}</span><span class="d k-${e.kind}">${ICON[e.kind]}</span><span><span class="l">${esc(label(e, evs))}${e.poo_alert ? '<span class="brownpill">alerta marrom</span>' : ''}</span>${sub ? `<span class="s">${sub}</span>` : ''}</span></button>`;
      }).join('');
}

/* ---------- botões da tela inicial ---------- */
// Mamada, Sono e Fralda sempre; os outros a família liga ou desliga em Editar, e vale para todos da
// família. Três por linha; na última, Outros de um lado e Editar do outro. Sem nada salvo, todos aparecem.
const BTN = {
  feed: ['Mamada', 'k-feed'], sleep: ['Sono', 'k-sleep'], diaper: ['Fralda', 'k-diaper'],
  med: ['Remédio', 'k-med'], symptom: ['Sintomas', 'k-symptom'], pump: ['Ordenha', 'k-pump'],
  massage: ['Massagem', 'k-care'], bath: ['Banho', 'k-care'], nasal: ['Lavagem nasal', 'k-care'],
};
const FIXED = ['feed', 'sleep', 'diaper'], OPTIONAL = ['med', 'symptom', 'pump', 'massage', 'bath', 'nasal'];
const isOn = k => !st.settings.hidden.includes(k);
// O último sintoma de hoje, para o botão: "febre há 2h". Vômito conta como sintoma.
function symptomSub(last, now) {
  const e = last(['symptom', 'vomit']);
  if (!e || e.t < startOfDay(now)) return 'nada hoje';
  return (e.kind === 'vomit' ? 'vômito' : e.symptom === 'outro' ? 'outro' : (SYMPTOM[e.symptom] || 'sintoma').toLowerCase()) + ' ' + ago(e.t);
}
function renderGrid(last, open, now) {
  const sub = k => {
    const e = last([k === 'sleep' ? 'wake' : k]);
    if (k === 'sleep') return open !== null ? 'dormindo' : e ? 'acordou ' + ago(e.t) : 'sem registro';
    if (k === 'diaper') return e ? 'troca ' + ago(e.t) : 'sem registro';
    if (k === 'med') return medSub();
    if (k === 'symptom') return symptomSub(last, now);
    return e ? ago(e.t) : 'sem registro';
  };
  // Sobra no fim: o último ocupa o espaço que falta na linha.
  const ks = [...FIXED, ...OPTIONAL.filter(isOn)], r = ks.length % 3;
  $('grid').innerHTML = ks.map((k, i) => {
    const span = r && i === ks.length - 1 ? (r === 1 ? ' span3 row' : ' span2') : '';
    return `<button class="act ${BTN[k][1]}${span}" data-k="${k}">${ICON[k]}<b>${BTN[k][0]}</b><span>${esc(sub(k))}</span></button>`;
  }).join('')
    + `<button class="act k-other span2 row" data-k="other">${ICON.other}<b>Outros</b><span>anotação livre</span></button>`
    + `<button class="act k-edit" data-k="edit" aria-label="Editar os botões da tela inicial">${ICON.edit}<b>Editar</b><span>botões</span></button>`;
}

// Família › Botões da tela inicial: liga ou desliga os botões. Cada toque salva na hora, um de cada vez.
function buttonsHtml() {
  let h = '<div class="sec" id="famButtons"><h4>Botões da tela inicial</h4><p class="dim">Mamada, Sono, Fralda e Outros aparecem sempre. Os outros valem para toda a família.</p>';
  if (!st.settingsOk) h += '<div class="soft">Não foi possível carregar os botões da família. Confira a conexão e abra de novo.</div>';
  h += OPTIONAL.map(k => { const on = isOn(k);
    return `<button class="li tg" role="switch" aria-checked="${on}" data-act="tgBtn" data-val="${k}"${st.settingsOk ? '' : ' disabled'}><span>${BTN[k][0]}</span><span class="sw${on ? ' on' : ''}" aria-hidden="true"><i></i></span></button>`; }).join('');
  if (!isOn('med') && st.meds.length) h += '<p class="dim">Os remédios programados continuam: o cartão aparece na hora da dose, e a lista fica na aba do bebê.</p>';
  if (!isOn('symptom')) h += '<p class="dim">Sem Sintomas, o vômito também sai da tela inicial; os registros antigos continuam na linha do tempo.</p>';
  return h + '</div>';
}
let btnSave = Promise.resolve();
function toggleBtn(k) {
  const hidden = isOn(k) ? [...st.settings.hidden, k] : st.settings.hidden.filter(x => x !== k);
  st.settings = { hidden }; render();
  btnSave = btnSave.then(async () => {
    const { error } = await sb.from('family_settings').upsert({ family_id: st.family.id, hidden_kinds: st.settings.hidden }, { onConflict: 'family_id' });
    if (!error) return;
    toast('Não foi possível salvar. Confira a conexão.');
    await loadSettings(st.family.id); render();
  });
}

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
  return f;
}
async function addEntry(ev) {
  const { data, error } = await sb.from('entries')
    .insert({ family_id: st.family.id, baby_id: st.baby.id, ...fields(ev) }).select().single();
  // 23505: a dose já foi marcada (duas pessoas marcaram juntas). Recarrega para mostrar quem marcou.
  if (error?.code === '23505') { toast('Alguém já marcou esta dose.'); await loadEntries(); refresh(); return null; }
  if (error) { toast('Não foi possível salvar. Confira a conexão.'); return null; }
  st.entries.set(data.id, withT(data)); render(); return data;
}
async function updateEntry(id, ev) {
  const { data, error } = await sb.from('entries').update(fields(ev)).eq('id', id).select().single();
  if (error) { toast('Não foi possível salvar. Confira a conexão.'); return false; }
  st.entries.set(data.id, withT(data)); render(); return true;
}
async function deleteEntry(id) {
  const { error } = await sb.from('entries').delete().eq('id', id);
  if (error) { toast('Não foi possível apagar. Confira a conexão.'); return false; }
  st.entries.delete(id); render(); return true;
}

/* ---------- painel de registro ---------- */
let S = null;   // estado do painel aberto (null = fechado)
const TITLE = { feed:'Mamada', pump:'Ordenha', sleep:'Sono', wake:'Sono', diaper:'Fralda', vomit:'Vômito', other:'Outros', med:'Remédio',
                symptom:'Sintomas', massage:'Massagem', bath:'Banho', nasal:'Lavagem nasal' };
// As opções do botão Sintomas, na ordem da tela. Vômito grava o registro de vômito de sempre.
const SYMPTOM_OPTS = [['febre', 'Febre'], ['colica', 'Cólica'], ['choro', 'Choro inconsolável'], ['vomito', 'Vômito'], ['tosse', 'Tosse'],
                      ['assadura', 'Assadura'], ['vacina', 'Reação à vacina'], ['dentes', 'Incômodo dos dentes'], ['outro', 'Outro']];
const withDuration = sym => sym === 'colica' || sym === 'choro';
// Atalhos embaixo do relógio: agora ou tantos minutos antes do horário que está nele.
const QUICK_TIME = '<div class="time quick"><button class="small" data-act="now">Agora</button>'
  + [5, 10, 30].map(m => `<button class="small" data-act="back" data-val="${m}">−${m} min</button>`).join('') + '</div>';
function openPanel(html) { $('scrim').hidden = false; $('sheet').hidden = false; $('sheetIn').innerHTML = html; }
function closeSheet() { S = null; $('scrim').hidden = true; $('sheet').hidden = true; render(); }
const head = t => `<div class="grab"></div><div class="shead"><h3>${esc(t)}</h3><button class="x" data-act="close" aria-label="Fechar">×</button></div>`;
const opt = (txt, on, act, val, big) => `<button class="opt${big ? ' big' : ''}${on ? ' on' : ''}" data-act="${act}" data-val="${val}">${txt}</button>`;
const mlBlock = k => `<div><div class="lbl">Quantidade</div><div class="seg k-${k}" style="background:none;margin-bottom:10px">${[30,60,90,120,150,180].map(v => opt(v + ' ml', +S.ml === v, 'ml', v)).join('')}</div>
  <div class="ml"><button data-act="mlstep" data-val="-10" aria-label="Menos 10 ml">−</button><input id="mlIn" inputmode="numeric" value="${esc(S.ml)}" placeholder="0" aria-label="Mililitros"><em>ml</em><button data-act="mlstep" data-val="10" aria-label="Mais 10 ml">+</button></div></div>`;
// Peito na mamada: um toque marca o peito; mexer nos minutos também marca, desmarcar apaga os minutos.
const CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`;
const sideRow = (key, name) => `<div class="side${S[key] ? ' on' : ''}" id="row-${key}">
  <button class="pick" data-act="pick" data-val="${key}" aria-pressed="${S[key]}"><span class="ck">${CHECK}</span><b>${name}</b></button>
  <div class="step"><button data-act="minstep" data-val="${key}:-1" aria-label="Menos 1 minuto no peito ${name.toLowerCase()}">−</button>
  <input id="min-${key}" inputmode="numeric" value="${esc(S[key + 'min'])}" placeholder="–" aria-label="Minutos no peito ${name.toLowerCase()} (opcional)"><em>min</em>
  <button data-act="minstep" data-val="${key}:1" aria-label="Mais 1 minuto no peito ${name.toLowerCase()}">+</button></div></div>`;
const totalText = () => { const t = (+S.lmin || 0) + (+S.rmin || 0); return t ? 'Total: ' + dur(t * MIN) : ''; };
function markSide(key) { const r = $('row-' + key); if (!r) return; r.classList.toggle('on', S[key]); r.querySelector('.pick').setAttribute('aria-pressed', S[key]); }

function openEntry(k, edit) {
  if (!st.baby) return babySheet(null);
  if (k === 'med' && !edit) return medsSheet();
  const { open } = sleepIntervals(sortedEntries());
  const t = edit ? edit.t : Date.now(), side = edit?.side;
  S = { mode: 'entry', k: k === 'wake' ? 'sleep' : k, edit, base: startOfDay(t), time: hm(t),
        src: edit ? (edit.src || '') : 'breast', ml: edit ? (edit.ml || '') : k === 'pump' ? '' : 90,
        l: side === 'left' || side === 'both', r: side === 'right' || side === 'both',
        lmin: edit?.left_min || '', rmin: edit?.right_min || '',
        pee: edit ? !!edit.pee : false, poo: edit ? !!edit.poo : false, psize: edit?.poo_size || null, palert: !!edit?.poo_alert,
        sk: edit ? edit.kind : (open !== null ? 'wake' : 'sleep'), note: edit?.note || '', confirmDel: false, err: '',
        sym: edit?.symptom || null, temp: edit?.temp_c != null ? String(edit.temp_c).replace('.', ',') : '', dmin: edit?.duration_min || '' };
  drawEntry();
}
// Cor do ajuste de horário para cada tipo de registro.
const INK = { wake: 'sleep', vomit: 'vomit', symptom: 'vomit', massage: 'care', bath: 'care', nasal: 'care' };
function drawEntry() {
  const k = S.k, c = 'k-' + k;
  let h = head(S.edit ? (k === 'symptom' ? 'Editar sintoma' : 'Editar ' + TITLE[k].toLowerCase()) : TITLE[k]);
  if (k === 'feed') {
    h += `<div><div class="lbl">Como foi</div><div class="seg ${c}" style="background:none">${opt('Peito', S.src === 'breast', 'src', 'breast', 1)}${opt('Mamadeira', S.src === 'bottle', 'src', 'bottle', 1)}</div></div>`;
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
  if (k === 'diaper' && S.poo) h += `<div><div class="lbl">Tamanho do cocô <small>(opcional)</small></div><div class="psize">${Object.entries(POO_SIZE).map(([id, n]) => opt(n[0].toUpperCase() + n.slice(1), S.psize === id, 'psize', id)).join('')}</div>
    <button class="brown${S.palert ? ' on' : ''}${S.wig ? ' wig' : ''}" data-act="palert" aria-pressed="${S.palert}">${ICON.siren}<span><b>Alerta marrom</b><small>vazou da fralda</small></span></button></div>`;
  S.wig = false;   // a sirene balança só no toque que liga o alerta, não a cada redesenho
  if (k === 'other') h += `<div><div class="lbl">O que aconteceu</div><input class="field" id="noteIn" placeholder="Consulta com o pediatra" value="${esc(S.note)}"></div>`;
  if (k === 'med') h += `<div class="soft"><b>${esc(label(S.edit))}</b> · ${esc(detail(S.edit))}</div>`;
  // Sintomas: o que aconteceu; a febre pode ter a temperatura, a cólica e o choro a duração.
  if (k === 'symptom') {
    const opts = S.edit ? SYMPTOM_OPTS.filter(([id]) => id !== 'vomito') : SYMPTOM_OPTS;
    h += `<div><div class="lbl">O que aconteceu</div><div class="seg ${c}" style="background:none">${opts.map(([id, n]) => opt(n, S.sym === id, 'sym', id)).join('')}</div></div>`;
    if (S.sym === 'febre') h += `<div><div class="lbl">Temperatura <small>(opcional)</small></div><div class="ml"><input id="tempIn" inputmode="decimal" value="${esc(S.temp)}" placeholder="37,8" aria-label="Temperatura em graus Celsius"><em>°C</em></div></div>`;
    if (withDuration(S.sym)) h += `<div><div class="lbl">Quanto tempo durou <small>(opcional)</small></div><div class="ml"><input id="durIn" inputmode="numeric" value="${esc(S.dmin)}" placeholder="30" aria-label="Minutos"><em>min</em></div></div>`;
  }
  h += `<div><div class="lbl">Horário</div>${clockHtml('timeIn', S.time, INK[k] || k)}${QUICK_TIME}</div>`;
  if (k !== 'other') h += `<input class="field" id="noteIn" maxlength="300" placeholder="${k === 'symptom' && S.sym === 'outro' ? 'O que aconteceu' : 'Observação (opcional)'}" value="${esc(S.note)}">`;
  if (S.err) h += `<div class="err">${esc(S.err)}</div>`;
  h += `<button class="save" data-act="save">Salvar</button>`;
  if (k === 'symptom') h += '<p class="dim">O Caderninho só anota o que a família marcar; não avalia nem orienta.</p>';
  if (S.edit) h += `<button class="del" data-act="del">${S.confirmDel ? 'Toque de novo para apagar' : 'Apagar registro'}</button>`;
  openPanel(h);
}
// Um pouco de humor só na fralda: o cocô gigante e o alerta marrom ganham mensagem própria.
const savedText = ev => ev.poo_alert ? 'Alerta marrom às ' + hm(ev.t) + '. Coragem!'
  : ev.poo_size === 'gigante' ? 'Salvo às ' + hm(ev.t) + '. Que fralda!' : 'Salvo às ' + hm(ev.t);
function computeT() {
  const [H, M] = (S.time || hm(Date.now())).split(':').map(Number);
  let t = S.base + H * HOUR + M * MIN;
  if (!S.edit && t > Date.now() + 5 * MIN) t -= DAY;
  return t;
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
  // Vômito, escolhido em Sintomas, grava o registro de vômito de sempre.
  const ev = { kind: k === 'sleep' ? S.sk : k === 'symptom' && S.sym === 'vomito' ? 'vomit' : k, t: computeT() };
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
  if (S.edit) { if (await updateEntry(S.edit.id, ev)) { closeSheet(); toast(savedText(ev)); } else busy(btn, false); return; }
  const row = await addEntry(ev);
  if (!row) return busy(btn, false);
  closeSheet(); toast(savedText(ev), () => deleteEntry(row.id));
}

/* ---------- calendário ---------- */
// No modo Semana, o dia escolhido é o último dos 7; no Mês, o último dia do mês que já chegou.
const chosenDay = () => st.view === 'week' ? st.weekEnd
  : st.view === 'month' ? Math.min(startOfDay(Date.now()), addDays(monthStart(st.month || Date.now(), 1), -1)) : st.viewDay;
function calSheet() { const d = new Date(chosenDay()); S = { mode: 'cal', y: d.getFullYear(), m: d.getMonth() }; drawCal(); }
function drawCal() {
  const today = startOfDay(Date.now()), week = st.view === 'week', month = st.view === 'month', sel = chosenDay();
  const min = month ? Math.min(firstDay(), prevMonth()) : firstDay(), from = week ? addDays(sel, -6) : month ? monthStart(sel) : sel;
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
    <div class="calkey"><i></i>dia com registros · o Caderninho mostra os últimos ${KEEP_DAYS} dias</div>
    ${week ? '<p class="dim">O painel mostra os 7 dias que terminam no dia escolhido.</p>' : month ? '<p class="dim">O resumo mostra o mês atual e o anterior.</p>' : ''}
    <button class="ghost" data-act="pickDay" data-val="${today}">Ir para hoje</button>`);
}
function calAction(a, v) {
  if (a === 'mon') { const d = new Date(S.y, S.m + (+v), 1); S.y = d.getFullYear(); S.m = d.getMonth(); return drawCal(); }
  if (a === 'pickDay') { if (st.view === 'week') st.weekEnd = +v; else if (st.view === 'month') st.month = clampMonth(+v); else st.viewDay = +v; closeSheet(); }
}

/* ---------- remédios ---------- */
// A família programa o remédio e os horários; o Caderninho só lembra. Cada horário do dia é uma dose,
// identificada por "remédio@horário" (ms). Marcar ou pular a dose grava um registro de remédio.
const SOON = HOUR;   // uma hora antes, a dose aparece na tela inicial com a caixinha
const DASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M7 12h10"/></svg>`;
const EVERY = [4, 6, 8, 12];
const MED_RULE = '<p class="dim">Só a família programa. O Caderninho lembra os horários; não sugere remédio nem dose.</p>';
const localDate = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
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
const whoGave = e => e.author_id === st.user.id ? 'você' : (st.names[e.author_id] || 'alguém').split(' ')[0];
const whenText = t => { const d0 = startOfDay(t), t0 = startOfDay(Date.now()); return (d0 === t0 ? 'hoje' : d0 === addDays(t0, -1) ? 'ontem' : shortDay(d0)) + ' às ' + hm(t); };
const dayWord = t => { const d0 = startOfDay(t), t0 = startOfDay(Date.now()); return d0 === t0 ? '' : d0 < t0 ? 'ontem' : 'amanhã'; };

// As doses com horário entre a e z, com o estado de cada uma. Horário de antes de o remédio ser
// programado não conta: quem programa às 8h40 um remédio de 6 em 6 horas não tem a dose das 7h.
function dosesFrom(a, z) {
  const marked = new Map();
  for (const e of st.entries.values()) if (e.kind === 'med' && e.dose_at) marked.set(e.medicine_id + '@' + Date.parse(e.dose_at), e);
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
function renderMeds() {
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
  if (ds.length) h += `<div class="sec"><h4>Doses de hoje</h4><div class="doses">${ds.map(d => doseRow(d, { all: true })).join('')}</div></div>`;
  h += meds.length
    ? `<div class="sec"><h4>Remédios programados</h4><div class="mlist">${meds.map(medCard).join('')}</div></div><button class="ghost" data-act="newMed">+ Programar outro remédio</button>`
    : `<div class="soft">Anote aqui quais são os remédios de ${esc(st.baby.name)} e os horários de cada um. Depois de salvar, as doses do dia começam a aparecer no alto da tela inicial.</div><button class="save" data-act="newMed">Programar um remédio</button>`;
  const top = $('sheet').scrollTop; openPanel(h + MED_RULE); $('sheet').scrollTop = top;
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

// Marcar (ou pular) uma dose. Se outra pessoa marcou antes, addEntry avisa e recarrega.
async function giveDose(id, t, note, skipped) {
  const d = doseById(id); if (!d) return;
  const row = await addEntry({ kind: 'med', t, medicine_id: d.m.id, med_name: d.m.name, med_amount: d.m.amount,
                               dose_at: new Date(d.due).toISOString(), skipped: skipped || null, note: note || null });
  if (!row) return;
  if (S?.mode === 'meds') drawMeds();
  const msg = skipped ? 'Dose de ' + d.m.name + ' pulada'
    : d.due - t > SOON ? 'Dose das ' + d.hhmm + ' marcada às ' + hm(t) : 'Dose de ' + d.m.name + ' marcada às ' + hm(t);
  toast(msg, async () => { if (await deleteEntry(row.id) && S?.mode === 'meds') drawMeds(); });
}
async function prnNow(mid) {
  const m = st.meds.find(x => x.id === mid); if (!m) return;
  const row = await addEntry({ kind: 'med', t: Date.now(), medicine_id: m.id, med_name: m.name, med_amount: m.amount });
  if (!row) return;
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
  h += '<p class="dim">O Caderninho só lembra o que vocês programarem. Nome, quanto e horários vêm da receita.</p>';
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
  const back = S.back;
  busy(btn, true);
  const q = S.edit ? sb.from('medicines').update(row).eq('id', S.edit.id)
                   : sb.from('medicines').insert({ family_id: st.family.id, baby_id: st.baby.id, start_date: localDate(Date.now()), ...row });
  const { data, error } = await q.select().single();
  busy(btn, false);
  if (error) { S.err = 'Não foi possível salvar. Confira a conexão e tente de novo.'; return drawMedForm(); }
  st.meds = [...st.meds.filter(x => x.id !== data.id), data].sort((a, b) => a.created_at < b.created_at ? -1 : 1);
  leaveMedForm(back); toast('Salvo');
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
    else if (a === 'give' || a === 'skip') {
      const { id, note } = S, t = a === 'give' ? computeT() : Date.now();
      leaveDose(); return giveDose(id, t, note.trim().slice(0, 300), a === 'skip');
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

/* ---------- aba do bebê ---------- */
// Peso, remédios programados, marcos e, no fim, nome e nascimento. Só guarda o que a família anota;
// não compara com curva de crescimento nem com a idade de outros bebês.
const LOG = {
  weight:    { table: 'weights',    list: 'weights',    day: 'measured_on', sort: sortWeights },
  milestone: { table: 'milestones', list: 'milestones', day: 'happened_on', sort: sortMilestones },
};
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
  if (!st.growthOk) h += '<div class="soft">Não foi possível carregar o peso e os marcos. Confira a conexão e abra de novo.</div>';
  else {
    h += '<div class="sec" id="babyWeight"><h4>Peso</h4>';
    if (ws.length >= 2) h += `<div class="svgbox">${weightChart(ws)}</div>`;
    h += ws.length
      ? `<div class="recs">${ws.slice().reverse().map(w => `<button class="rec" data-act="editWeight" data-val="${esc(w.id)}"><span><b>${esc(fullDate(w.measured_on))}</b><small>${esc([ageOn(b.birth_date, w.measured_on), w.note].filter(Boolean).join(' · '))}</small></span><span class="v">${esc(kg(w.grams))}</span></button>`).join('')}</div>`
      : '<div class="soft">Anote o peso de cada consulta ou pesagem. Com dois ou mais, aparece o gráfico.</div>';
    h += '<button class="ghost" data-act="newWeight">+ Anotar peso</button></div>';
  }
  h += '<div class="sec" id="babyMeds"><h4>Remédios programados</h4>';
  h += meds.length
    ? meds.map(m => {
        const when = m.schedule === 'prn' ? 'só quando precisar' + (m.every_hours ? ` · de ${m.every_hours} em ${m.every_hours} horas` : '') : medWhen(m);
        const times = m.schedule !== 'prn' && medTimes(m).length <= 4 ? `<span class="mtimes">${medTimes(m).map(t => `<span class="tpill">${t}</span>`).join('')}</span>` : '';
        return `<button class="mrow" data-act="editMed" data-val="${esc(m.id)}" aria-label="Editar ${esc(m.name)}"><span><b>${esc(m.name)}</b><small>${esc([m.amount, when].filter(Boolean).join(' · '))}</small></span>${times}</button>`;
      }).join('') + '<div class="row2"><button class="ghost" data-act="allMeds">Ver doses</button><button class="ghost" data-act="newMed">+ Programar</button></div>'
    : `<div class="soft">Nenhum remédio programado. Programe os remédios de ${esc(b.name)} para as doses aparecerem na hora, no alto da tela Hoje.</div><button class="ghost" data-act="newMed">+ Programar remédio</button>`;
  h += '</div>';
  if (st.growthOk) {
    h += '<div class="sec" id="babyMilestones"><h4>Marcos</h4>';
    h += ms.length
      ? `<div class="recs">${ms.slice().reverse().map(m => `<button class="rec" data-act="editMilestone" data-val="${esc(m.id)}"><span><b>${esc(m.title)}</b><small>${esc([fullDate(m.happened_on), ageOn(b.birth_date, m.happened_on)].filter(Boolean).join(' · '))}</small>${m.note ? `<small class="nt">${esc(m.note)}</small>` : ''}</span></button>`).join('')}</div>`
      : `<div class="soft">Anote as primeiras vezes de ${esc(b.name)}, com o dia: o primeiro sorriso, o primeiro dente…</div>`;
    h += '<button class="ghost" data-act="newMilestone">+ Anotar marco</button></div>';
  }
  h += `<div class="sec" id="babyData"><h4>Nome e nascimento</h4><div class="li"><span>${esc(b.name)}${b.birth_date ? ' <small>' + esc(fullDate(b.birth_date)) + '</small>' : ''}</span><button data-act="editBaby" data-val="${esc(b.id)}">Editar</button></div></div>`;
  h += '<p class="dim">O Caderninho só guarda o que a família anota. Não compara com curvas de crescimento nem com a idade de outros bebês.</p>';
  el.innerHTML = h;
}

// Anotar ou editar um peso ou um marco.
function logForm(kind, row) {
  const today = localDate(Date.now());
  S = { mode: kind, edit: row || null, date: row?.[LOG[kind].day] || today, note: row?.note || '', err: '', confirmDel: false,
        kg: row?.grams ? (row.grams / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : '', title: row?.title || '' };
  drawLog(); $('sheet').scrollTop = 0;
}
function drawLog() {
  const w = S.mode === 'weight', b = st.baby, today = localDate(Date.now());
  let h = head(S.edit ? (w ? 'Editar peso' : 'Editar marco') : (w ? 'Anotar peso' : 'Anotar marco'));
  if (w) h += `<div><label class="lbl" for="lgKg">Peso</label><div class="ml"><input id="lgKg" inputmode="decimal" value="${esc(S.kg)}" placeholder="0,000" autocomplete="off"><em>kg</em></div></div>`;
  else {
    const sugs = MILESTONES.filter(t => t !== S.title && !st.milestones.some(m => m.title === t && m.id !== S.edit?.id));
    h += `<div><label class="lbl" for="lgTitle">O que aconteceu</label><input class="field" id="lgTitle" maxlength="60" placeholder="Ex.: Sorriu pela primeira vez" value="${esc(S.title)}">
      ${sugs.length ? `<div class="sugs">${sugs.map(t => `<button class="small" data-act="sug" data-val="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}</div>`;
  }
  h += `<div><label class="lbl" for="lgDate">${w ? 'Dia da pesagem' : 'Dia'}</label><input class="field" id="lgDate" type="date" value="${esc(S.date)}" max="${today}"${b.birth_date ? ` min="${esc(b.birth_date)}"` : ''}>
    <div class="hint" id="lgAge" style="margin:6px 0 0">${esc(ageOn(b.birth_date, S.date))}</div></div>`;
  h += w ? `<input class="field" id="lgNote" maxlength="100" placeholder="Onde pesou (opcional). Ex.: pediatra" value="${esc(S.note)}">`
         : `<input class="field" id="lgNote" maxlength="300" placeholder="Observação (opcional)" value="${esc(S.note)}">`;
  if (S.err) h += `<div class="err">${esc(S.err)}</div>`;
  h += '<button class="save" data-act="saveLog">Salvar</button>';
  if (S.edit) h += `<button class="del" data-act="delLog">${S.confirmDel ? 'Toque de novo para apagar' : w ? 'Apagar este peso' : 'Apagar este marco'}</button>`;
  openPanel(h);
}
function logInput(el) {
  if (el.id === 'lgKg') S.kg = el.value;
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
    const g = parseKg(S.kg);
    if (!S.kg.trim()) return fail('Escreva o peso.');
    if (!g || g < 500 || g > 30000) return fail('Confira o peso: de 0,5 a 30 kg. Ex.: 5,2');
    row.grams = g;
  } else {
    if (!S.title.trim()) return fail('Escreva o que aconteceu.');
    row.title = S.title.trim().slice(0, 60);
  }
  const o = kind === 'weight' ? 'O dia da pesagem' : 'O dia';
  if (!S.date) return fail(kind === 'weight' ? 'Escolha o dia da pesagem.' : 'Escolha o dia.');
  if (S.date > today) return fail(o + ' não pode ser depois de hoje.');
  if (b.birth_date && S.date < b.birth_date) return fail(o + ' não pode ser antes do nascimento.');
  busy(btn, true);
  const q = S.edit ? sb.from(L.table).update(row).eq('id', S.edit.id)
                   : sb.from(L.table).insert({ family_id: st.family.id, baby_id: b.id, ...row });
  const { data, error } = await q.select().single();
  busy(btn, false);
  if (error) return fail('Não foi possível salvar. Confira a conexão e tente de novo.');
  st[L.list] = L.sort([...st[L.list].filter(x => x.id !== data.id), data]);
  closeSheet(); toast('Salvo');
}
async function delLog(btn) {
  const L = LOG[S.mode], id = S.edit.id;
  busy(btn, true);
  const { error } = await sb.from(L.table).delete().eq('id', id);
  busy(btn, false);
  if (error) { S.err = 'Não foi possível apagar. Confira a conexão e tente de novo.'; return drawLog(); }
  st[L.list] = st[L.list].filter(x => x.id !== id);
  closeSheet(); toast('Apagado');
}
function growthAction(a, v, btn) {
  if (a === 'sug') { S.title = v; S.err = ''; return drawLog(); }
  if (a === 'saveLog') return saveLog(btn);
  if (a === 'delLog') { if (S.confirmDel) return delLog(btn); S.confirmDel = true; return drawLog(); }
}

/* ---------- bebê e nome ---------- */
function babySheet(b) {
  S = { mode: 'baby', b, name: b?.name || '', birth: b?.birth_date || '', confirmDel: false };
  drawBaby();
}
// Só o criador apaga um bebê (é a regra do banco); a confirmação fica na própria tela.
function drawBaby() {
  const b = S.b, del = b && st.family.creator_id === st.user.id;
  let h = head(b ? 'Editar bebê' : 'Adicionar bebê') +
    `<div><div class="lbl">Nome do bebê</div><input class="field" id="bName" maxlength="40" value="${esc(S.name)}" placeholder="Marina"></div>
     <div><div class="lbl">Nascimento (opcional)</div><input class="field" id="bBirth" type="date" value="${esc(S.birth)}"></div>
     <div class="err" id="bErr" hidden></div><button class="save" data-act="saveBaby">Salvar</button>`;
  if (del) h += S.confirmDel
    ? `<div class="warn" role="alert"><b>Tem certeza?</b><span>Essa ação não poderá ser desfeita. ${esc(b.name)} e todos os seus registros serão apagados.</span></div>
       <div class="row2"><button class="ghost" data-act="keepBaby">Cancelar</button><button class="danger-btn" data-act="delBaby">Apagar</button></div>`
    : '<button class="danger-btn" data-act="askDelBaby">Apagar bebê</button>';
  openPanel(h);
}
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
    else { st.baby = null; st.entries = new Map(); st.meds = []; st.weights = []; st.milestones = []; }
  }
  closeSheet(); toast('Apagado');
}
async function saveBaby(btn) {
  const name = $('bName').value.trim(), birth_date = $('bBirth').value || null;
  if (!name) return err('bErr', 'Escreva o nome do bebê.');
  busy(btn, true);
  const q = S.b ? sb.from('babies').update({ name, birth_date }).eq('id', S.b.id)
                : sb.from('babies').insert({ family_id: st.family.id, name, birth_date });
  const { data, error } = await q.select('id,name,birth_date').single();
  busy(btn, false);
  if (error) return err('bErr', errMsg(error));
  const i = st.babies.findIndex(x => x.id === data.id);
  if (i >= 0) st.babies[i] = data; else st.babies.push(data);
  if (!S.b || st.baby?.id === data.id) await selectBaby(data.id);
  closeSheet(); toast('Salvo');
}
async function selectBaby(id) {
  st.baby = st.babies.find(b => b.id === id); lsSet('cad-baby-' + st.family.id, id);
  await Promise.all([loadEntries(), loadMeds(), loadGrowth()]); render();
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
const FP = { confirm: null, invite: null };   // a confirmação aberta e o link de convite gerado
function drawFamilyPane() {
  const f = st.family, creator = f.creator_id === st.user.id, n = st.members.length, nb = st.babies.length;
  let h = `<div class="ptitle"><h2>${esc(f.name)}</h2><small>${n} ${n === 1 ? 'membro' : 'membros'} · ${nb} ${nb === 1 ? 'bebê' : 'bebês'}</small></div>`;
  h += `<div class="sec"><h4>Nome da família</h4><div class="li"><span>${esc(f.name)}</span>${creator ? '<button data-act="famName">Mudar</button>' : ''}</div>`
    + (creator ? '' : '<p class="dim">Só quem criou a família muda o nome.</p>') + '</div>';
  h += '<div class="sec"><h4>Membros</h4>' + st.members.map(m => {
    const tags = (m.user_id === f.creator_id ? ' <small>criador</small>' : '') + (m.user_id === st.user.id ? ' <small>você</small>' : '');
    const rm = creator && m.user_id !== st.user.id
      ? `<button class="danger" data-act="rm" data-val="${esc(m.user_id)}">${FP.confirm === 'rm:' + m.user_id ? 'Confirmar' : 'Remover'}</button>` : '';
    return `<div class="li"><span>${esc(st.names[m.user_id] || 'Alguém')}${tags}</span>${rm}</div>`;
  }).join('');
  if (creator) h += FP.invite
    ? `<div class="invite">${esc(FP.invite)}</div><div class="row2"><button class="ghost" data-act="copyInv">Copiar link</button>${navigator.share ? '<button class="ghost" data-act="shareInv">Compartilhar</button>' : ''}</div><div class="lbl">O link serve para uma pessoa e vale 7 dias.</div>`
    : '<button class="ghost" data-act="invite">Convidar para esta família</button>';
  h += '</div><div class="sec"><h4>Bebês</h4>' +
    st.babies.map(b => `<button class="li tg" data-act="openBaby" data-val="${esc(b.id)}"><span>${esc(b.name)}${b.birth_date ? ' <small>' + esc(ageText(b.birth_date)) + '</small>' : ''}</span><span class="go">Abrir</span></button>`).join('') +
    '<button class="ghost" data-act="addBaby">+ Adicionar bebê</button></div>';
  h += buttonsHtml();
  h += creator
    ? `<button class="danger-btn" data-act="delFam">${FP.confirm === 'delFam' ? 'Toque de novo: apaga a família, os bebês e todos os registros' : 'Apagar família'}</button>`
    : `<button class="danger-btn" data-act="leave">${FP.confirm === 'leave' ? 'Toque de novo para sair da família' : 'Sair da família'}</button>`;
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
// Caderninho, falar com quem cuida dele e desconectar.
const THEMES = [['light', 'Claro'], ['dark', 'Escuro'], ['', 'Do celular']];
function drawProfilePane() {
  const theme = lsGet('cad-theme') || '';
  let h = `<div class="ptitle"><h2>${esc(st.profile.display_name)}</h2><small>Seu nome e os ajustes que valem só para você</small></div>`;
  h += `<div class="sec"><h4>Seu nome</h4><div class="li"><span>${esc(st.profile.display_name)}</span><button data-act="rename">Mudar</button></div></div>`;
  h += `<div class="sec"><h4>Aparência</h4><div class="seg3" role="group" aria-label="Aparência">${THEMES.map(([v, t]) => `<button data-act="theme" data-val="${v}" aria-pressed="${theme === v}">${t}</button>`).join('')}</div>`
    + '<p class="dim">"Do celular" segue o modo noturno do celular. Vale só neste aparelho.</p></div>';
  h += '<div class="sec"><h4>Suas famílias</h4>' + st.families.map(x => x.id === st.family.id
      ? `<div class="li"><span>${esc(x.name)} <small>aberta</small></span></div>`
      : `<div class="li"><span>${esc(x.name)}</span><button data-act="switchFam" data-val="${esc(x.id)}">Abrir</button></div>`).join('')
    + '<button class="ghost" data-act="newFam">Criar outra família</button></div>';
  h += '<div class="sec"><h4>Indicar o Caderninho</h4>' +
    `<div class="invite">${esc(location.host)}</div>` +
    `<div class="row2">${navigator.share ? '<button class="ghost" data-act="shareApp">Compartilhar</button>' : ''}<button class="ghost" data-act="copyApp">Copiar texto</button></div>` +
    '<div class="lbl">Para outra família com bebê. Quem abrir cria a própria família e não vê os registros desta.</div></div>';
  h += '<div class="sec"><h4>Fale com quem cuida do Caderninho</h4><button class="li tg" data-act="feedback"><span>Sugestões e problemas</span><span class="go">Escrever</span></button></div>';
  h += '<button class="ghost" data-act="logout">Desconectar deste celular</button>';
  $('paneProfile').innerHTML = h;
}
// "Do celular" apaga a escolha: o app volta a seguir o modo noturno do aparelho.
function setTheme(v) {
  if (v) document.documentElement.dataset.theme = v; else delete document.documentElement.dataset.theme;
  lsSet('cad-theme', v || null); render();
}

/* ---------- sugestões e problemas ---------- */
// O rascunho sobrevive a fechar a tela sem querer. Pelo app, só dá para enviar: ninguém lê.
const FB = { type: '', text: '', sent: false, err: '' }, FB_MAX = 1000;
const FB_TYPES = [['idea', 'Sugestão'], ['bug', 'Algo deu errado']];
function feedbackSheet() { S = { mode: 'feedback' }; FB.sent = false; FB.err = ''; drawFeedback(); $('sheet').scrollTop = 0; }
function drawFeedback() {
  const h = head('Sugestões e problemas') + (FB.sent
    ? '<div class="thanks" role="status"><b>Recebido, obrigado!</b><span>Sua mensagem chegou para quem cuida do Caderninho.</span></div><button class="ghost" data-act="fbAgain">Enviar outra</button>'
    : `<div><div class="lbl">Sobre o quê? <small>(opcional)</small></div><div class="seg">${FB_TYPES.map(([k, t]) => `<button class="opt${FB.type === k ? ' on' : ''}" data-act="fbType" data-val="${k}" aria-pressed="${FB.type === k}">${t}</button>`).join('')}</div></div>
       <div><label class="lbl" for="fbText">Sua mensagem</label><textarea class="field" id="fbText" maxlength="${FB_MAX}" placeholder="Ex.: queria ver as mamadas da madrugada separadas">${esc(FB.text)}</textarea>
       <div class="fbmeta"><span>Quem cuida do Caderninho lê todas.</span><span id="fbCount">${FB.text.length} de ${FB_MAX}</span></div></div>
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
// O tipo de celular que vai junto: aparelho, sistema, navegador e se o app está instalado.
function deviceText() {
  const u = navigator.userAgent, ios = u.match(/OS (\d+)[_.](\d+)/), and = u.match(/Android (\d+(?:\.\d+)?)/);
  const dev = /iPad/.test(u) || (isIOS && !/iPhone|iPod/.test(u)) ? 'iPad' : isIOS ? 'iPhone'
    : /Android/.test(u) ? 'Android' + (and ? ' ' + and[1] : '') : 'Computador';
  const sys = /iPhone|iPad|iPod/.test(u) && ios ? 'iOS ' + ios[1] + '.' + ios[2] : '';
  const nav = /SamsungBrowser/.test(u) ? 'Samsung Internet' : /Edg(A|iOS)?\//.test(u) ? 'Edge' : /CriOS|Chrome\//.test(u) ? 'Chrome'
    : /FxiOS|Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : 'outro navegador';
  return [dev, sys, nav, standalone ? 'app instalado' : 'no navegador'].filter(Boolean).join(' · ');
}

async function afterLeavingFamily() {
  S = null; $('scrim').hidden = true; $('sheet').hidden = true;
  await loadFamilies();
  if (st.families.length) openFamily(st.families[0].id);
  else { $('cancelCreate').hidden = true; show('scrCreate'); }
}
// Os toques nas abas do bebê, Família e Perfil.
async function paneAction(a, v, btn) {
  const f = st.family;
  // Aba do bebê
  if (a === 'jump') return spotlight(v);
  if (a === 'newWeight') return logForm('weight');
  if (a === 'newMilestone') return logForm('milestone');
  if (a === 'editWeight') return logForm('weight', st.weights.find(w => w.id === v));
  if (a === 'editMilestone') return logForm('milestone', st.milestones.find(m => m.id === v));
  if (a === 'allMeds') return medsSheet();
  if (a === 'newMed') return medForm(null, 'pane');
  if (a === 'editMed') return medForm(st.meds.find(m => m.id === v), 'pane');
  if (a === 'editBaby') return babySheet(st.babies.find(b => b.id === v));
  if (a === 'addBaby') return babySheet(null);
  // Família
  if (a === 'openBaby') { if (v !== st.baby?.id) await selectBaby(v); return goTab('baby'); }
  if (a === 'famName') return famNameSheet();
  if (a === 'tgBtn') return toggleBtn(v);
  if (a === 'invite') {
    busy(btn, true);
    const { data, error } = await sb.from('invites').insert({ family_id: f.id }).select('token').single();
    busy(btn, false);
    if (error) return toast('Não foi possível criar o convite.');
    FP.invite = location.origin + '/?convite=' + data.token; return render();
  }
  if (a === 'copyInv') return navigator.clipboard.writeText(FP.invite).then(() => toast('Link copiado'), () => toast('Selecione o link e copie'));
  if (a === 'shareInv') return navigator.share({ title: 'Caderninho', text: 'Entre na família ' + f.name + ' no Caderninho:', url: FP.invite }).catch(() => {});
  if (a === 'rm') {
    if (FP.confirm !== 'rm:' + v) { FP.confirm = 'rm:' + v; return render(); }
    const { error } = await sb.from('family_members').delete().eq('family_id', f.id).eq('user_id', v);
    if (error) return toast('Não foi possível remover.');
    st.members = st.members.filter(m => m.user_id !== v); FP.confirm = null; return render();
  }
  if (a === 'delFam' || a === 'leave') {
    if (FP.confirm !== a) { FP.confirm = a; return render(); }
    const q = a === 'delFam' ? sb.from('families').delete().eq('id', f.id)
                             : sb.from('family_members').delete().eq('family_id', f.id).eq('user_id', st.user.id);
    const { error } = await q;
    if (error) return toast('Não foi possível concluir.');
    return afterLeavingFamily();
  }
  // Perfil
  if (a === 'rename') return renameSheet();
  if (a === 'theme') return setTheme(v);
  if (a === 'switchFam') return openFamily(v);
  if (a === 'newFam') { $('cancelCreate').hidden = false; return show('scrCreate'); }
  if (a === 'shareApp') return navigator.share({ title: 'Caderninho', text: REFER_TEXT, url: location.origin + '/' }).catch(() => {});
  if (a === 'copyApp') return navigator.clipboard.writeText(REFER_TEXT + ' ' + location.origin + '/').then(() => toast('Texto copiado'), () => toast('Selecione o endereço e copie'));
  if (a === 'feedback') return feedbackSheet();
  if (a === 'logout') { await sb.auth.signOut(); location.href = '/'; }
}

/* ---------- eventos ---------- */
$('sheetIn').addEventListener('input', e => {
  if (e.target.id === 'fbText') {
    FB.text = e.target.value; $('fbCount').textContent = FB.text.length + ' de ' + FB_MAX;
    if (FB.err) { FB.err = ''; $('fbErr')?.remove(); }
    return;
  }
  if (S?.mode === 'medform' || S?.mode === 'dose') return medInput(e.target);
  if (S?.mode === 'weight' || S?.mode === 'milestone') return logInput(e.target);
  if (S?.mode !== 'entry') return;
  const id = e.target.id;
  if (id === 'noteIn') { S.note = e.target.value; if (S.err) { S.err = ''; $('sheetIn').querySelector('.err')?.remove(); } }
  if (id === 'timeIn') S.time = e.target.value;
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
  if (a === 'askDelBaby' || a === 'keepBaby') {
    S.name = $('bName').value; S.birth = $('bBirth').value; S.confirmDel = a === 'askDelBaby'; return drawBaby();
  }
  if (a === 'delBaby') return delBaby(b);
  if (a === 'saveName') return saveName(b);
  if (S.mode === 'feedback') return feedbackAction(a, v, b);
  if (S.mode === 'famname') { if (a === 'saveFamName') return saveFamName(b); return; }
  if (S.mode === 'cal') return calAction(a, v);
  if (S.mode === 'meds' || S.mode === 'medform' || S.mode === 'dose') return medAction(a, v, b);
  if (S.mode === 'weight' || S.mode === 'milestone') return growthAction(a, v, b);
  if (S.mode !== 'entry') return;
  if (a === 'src') S.src = v;
  else if (a === 'ml') S.ml = +v;
  else if (a === 'mlstep') S.ml = Math.max(0, (+S.ml || 0) + (+v)) || '';
  else if (a === 'pick') { S[v] = !S[v]; if (!S[v]) S[v + 'min'] = ''; }
  else if (a === 'minstep') { const [key, d] = v.split(':'); S[key + 'min'] = Math.min(180, Math.max(0, (+S[key + 'min'] || 0) + (+d))) || ''; if (S[key + 'min']) S[key] = true; }
  else if (a === 'sk') S.sk = v;
  else if (a === 'sym') { S.sym = v; if (v !== 'febre') S.temp = ''; if (!withDuration(v)) S.dmin = ''; }
  else if (a === 'pee' || a === 'poo') { S[a] = !S[a]; if (!S.poo) { S.psize = null; S.palert = false; } }
  else if (a === 'psize') S.psize = S.psize === v ? null : v;
  else if (a === 'palert') { S.palert = !S.palert; S.wig = S.palert; }
  else if (a === 'now') { S.base = startOfDay(Date.now()); S.time = hm(Date.now()); }
  else if (a === 'back') { const t = computeT() - (+v) * MIN; S.base = startOfDay(t); S.time = hm(t); }
  else if (a === 'del') {
    if (!S.confirmDel) S.confirmDel = true;
    else { const id = S.edit.id; if (await deleteEntry(id)) { closeSheet(); toast('Registro apagado'); } return; }
  }
  else if (a === 'save') return saveEntry(b);
  S.err = ''; drawEntry();
});

document.querySelectorAll('[data-i]').forEach(el => el.outerHTML = ICON[el.dataset.i]);
$('grid').addEventListener('click', e => {
  const b = e.target.closest('[data-k]'); if (!b) return;
  if (b.dataset.k === 'edit') return goTab('family', 'famButtons');
  openEntry(b.dataset.k);
});
$('wakeBtn').onclick = async () => {
  const row = await addEntry({ kind: 'wake', t: Date.now() });
  if (row) toast('Acordou às ' + hm(Date.parse(row.at)), () => deleteEntry(row.id));
};
$('meds').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'check') return giveDose(b.dataset.val, Date.now());
  if (b.dataset.act === 'skipDose') return giveDose(b.dataset.val, Date.now(), null, true);
  if (b.dataset.act === 'dose') return doseSheet(b.dataset.val);
  if (b.dataset.act === 'allMeds') return medsSheet();
});
$('babyBtn').onclick = () => st.baby ? goTab('baby') : babySheet(null);
$('babyTabs').addEventListener('click', e => { const b = e.target.closest('[data-baby]'); if (b) selectBaby(b.dataset.baby); });
$('tabbar').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) goTab(b.dataset.tab); });
for (const id of ['paneBaby', 'paneFamily', 'paneProfile']) $(id).addEventListener('click', e => {
  const c = e.target.closest('[data-baby]'); if (c) return selectBaby(c.dataset.baby);
  const b = e.target.closest('[data-act]'); if (b) paneAction(b.dataset.act, b.dataset.val, b);
});
// Tocar numa marca do gráfico do dia abre o registro, como na linha do tempo.
$('summary').addEventListener('click', e => {
  const m = e.target.closest('[data-id]'); if (!m) return;
  const ev = st.entries.get(m.dataset.id); if (ev) openEntry(ev.kind, ev);
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
$('monthView').addEventListener('click', e => { const sh = e.target.closest('[data-share]'); if (sh) shareReport(sh.dataset.share); });
// Painel da semana: filtro, métrica e tocar num dia para abrir a linha do tempo dele.
function openDay(d0) {
  st.viewDay = d0; st.view = 'day'; render();
  $('dayTitle').closest('.daynav').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
$('weekView').addEventListener('click', e => {
  const sh = e.target.closest('[data-share]'); if (sh) return shareReport(sh.dataset.share);
  const f = e.target.closest('[data-flt]'); if (f) { st.show[f.dataset.flt] = st.show[f.dataset.flt] === false; return render(); }
  const m = e.target.closest('[data-met]'); if (m) { st.metric = m.dataset.met; return render(); }
  const r = e.target.closest('.dayrow'); if (r) openDay(+r.dataset.day);
  const o = e.target.closest('[data-open]'); if (o) openDay(+o.dataset.open);
});
$('weekView').addEventListener('keydown', e => {
  const r = e.target.closest('.dayrow');
  if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDay(+r.dataset.day); }
});
$('scrim').onclick = closeSheet;
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S) closeSheet(); });

// Ao voltar para o app depois de um tempo, recarrega os registros (a conexão ao vivo pode ter caído).
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && st.baby && !$('scrMain').hidden && !S) Promise.all([loadEntries(), loadMeds(), loadGrowth()]).then(render);
});
setInterval(refresh, 30000);

// Aparência escolhida em Perfil (claro ou escuro); sem escolha, segue o celular.
const savedTheme = lsGet('cad-theme'); if (savedTheme) document.documentElement.dataset.theme = savedTheme;

boot().catch(() => { show('scrLogin'); err('errEmail', 'Não foi possível abrir o Caderninho. Confira a conexão e recarregue.'); });

/* ---------- dica de instalação ---------- */
// O iPhone nunca oferece instalar sozinho; o Android às vezes oferece (beforeinstallprompt).
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMobile = isIOS || /Android/.test(navigator.userAgent);
let installEvent = null;
function paintInstallTip() {
  const on = !standalone && isMobile && lsGet('cad-tip-off') !== '1';
  document.querySelectorAll('.installTip').forEach(el => {
    el.hidden = !on;
    el.querySelector('.tipText').textContent = isIOS
      ? 'Para usar como app: toque em Compartilhar (o quadrado com a seta) e depois em "Adicionar à Tela de Início".'
      : installEvent ? 'Instale o Caderninho para abrir direto pelo ícone, como um app.'
      : 'Para usar como app: no menu do navegador (⋮), toque em "Instalar app" ou "Adicionar à tela inicial".';
    el.querySelector('.tipInstall').hidden = !installEvent;
  });
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; paintInstallTip(); });
document.querySelectorAll('.tipInstall').forEach(b => b.onclick = async () => { if (!installEvent) return; installEvent.prompt(); await installEvent.userChoice; installEvent = null; paintInstallTip(); });
document.querySelectorAll('.tipClose').forEach(b => b.onclick = () => { lsSet('cad-tip-off', '1'); paintInstallTip(); });
paintInstallTip();
