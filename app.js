import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { ICON, MIN, HOUR, DAY, startOfDay, addDays, hm, dur, ago, esc, dayTitle, rangeTitle, ageText,
         sleepIntervals, label, detail, SIDE_SHORT, MESES_L, lsGet, lsSet } from './util.js';
import { weekHtml } from './week.js';

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
  view: 'day',                 // 'day' (linha do tempo) ou 'week' (painel da semana)
  viewDay: startOfDay(Date.now()),
  weekEnd: startOfDay(Date.now()),   // último dos 7 dias do painel
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

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { show('scrLogin'); return; }
  st.user = session.user;

  const { data: prof } = await sb.from('profiles').select('id,display_name').eq('id', st.user.id).maybeSingle();
  if (!prof) { show('scrName'); $('nameIn').focus(); return; }
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
  await loadEntries();
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
  const since = new Date(startOfDay(Date.now() - KEEP_DAYS * DAY)).toISOString();
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

function subscribe(fid) {
  if (st.channel) sb.removeChannel(st.channel);
  st.channel = sb.channel('familia-' + fid)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: 'family_id=eq.' + fid }, async p => {
      if (p.eventType === 'DELETE') st.entries.delete(p.old.id);
      else if (st.baby && p.new.baby_id === st.baby.id) { st.entries.set(p.new.id, withT(p.new)); await loadNames([p.new.author_id]); }
      if (!S) render();
    })
    .subscribe();
}

/* ---------- tela do dia ---------- */
const sortedEntries = () => [...st.entries.values()].sort((a, b) => a.t - b.t);
// Primeiro dia que dá para ver: o app carrega os últimos 60 dias.
const firstDay = () => addDays(startOfDay(Date.now()), -(KEEP_DAYS - 1));
// Última mamada em que marcaram o peito (no banco, só a mamada no peito tem peito marcado).
const lastBreast = evs => evs.findLast(e => e.kind === 'feed' && e.side);

function render() {
  if ($('scrMain').hidden) return;
  const evs = sortedEntries(), now = Date.now(), b = st.baby;
  $('babyName').textContent = b ? b.name : 'Sem bebê';
  $('babyInitial').textContent = (b ? b.name : '?').charAt(0).toUpperCase();
  $('babyAge').textContent = b ? ageText(b.birth_date) : 'toque para cadastrar';

  const tabs = $('babyTabs');
  tabs.hidden = st.babies.length < 2;
  tabs.innerHTML = st.babies.map(x => `<button data-baby="${esc(x.id)}" class="${x.id === b?.id ? 'on' : ''}">${esc(x.name)}</button>`).join('');

  const last = kinds => { for (let i = evs.length - 1; i >= 0; i--) if (kinds.includes(evs[i].kind)) return evs[i]; return null; };
  const { out: intervals, open } = sleepIntervals(evs);
  $('sleepBanner').hidden = open === null;
  if (open !== null) $('sleepFor').textContent = dur(now - open);
  const lf = last(['feed']), lw = last(['wake']), ld = last(['diaper']), lp = last(['pump']);
  $('subFeed').textContent = lf ? ago(lf.t) : 'sem registro';
  $('subPump').textContent = lp ? ago(lp.t) : 'sem registro';
  $('subSleep').textContent = open !== null ? 'dormindo' : lw ? 'acordou ' + ago(lw.t) : 'sem registro';
  $('subDiaper').textContent = ld ? 'troca ' + ago(ld.t) : 'sem registro';
  const vToday = evs.filter(e => e.kind === 'vomit' && e.t >= startOfDay(now)).length;
  $('subVomit').textContent = vToday ? vToday + ' hoje' : 'nenhum hoje';

  const today = startOfDay(now), week = st.view === 'week';
  $('tabDay').setAttribute('aria-selected', !week); $('tabWeek').setAttribute('aria-selected', week);
  $('dayView').hidden = week; $('weekView').hidden = !week;
  $('prevDay').setAttribute('aria-label', week ? 'Semana anterior' : 'Dia anterior');
  $('nextDay').setAttribute('aria-label', week ? 'Próxima semana' : 'Próximo dia');
  if (week) {
    // Os 7 dias ficam dentro do que o app carrega.
    st.weekEnd = Math.min(today, Math.max(st.weekEnd, addDays(firstDay(), 6)));
    const title = rangeTitle(addDays(st.weekEnd, -6), st.weekEnd);
    $('dayText').textContent = title; $('dayTitle').setAttribute('aria-label', title + '. Escolher no calendário');
    $('nextDay').disabled = st.weekEnd >= today;
    $('prevDay').disabled = st.weekEnd <= addDays(firstDay(), 6);
    $('weekView').innerHTML = !b ? '<div class="empty">Cadastre um bebê para começar.</div>'
      : weekHtml({ end: st.weekEnd, evs, sleep: { out: intervals, open }, now, show: st.show, metric: st.metric });
    return;
  }

  const d0 = st.viewDay, d1 = addDays(d0, 1);
  $('dayText').textContent = dayTitle(d0); $('dayTitle').setAttribute('aria-label', dayTitle(d0) + '. Escolher no calendário');
  $('nextDay').disabled = d0 >= today;
  $('prevDay').disabled = d0 <= firstDay();

  const day = evs.filter(e => e.t >= d0 && e.t < d1);
  const feeds = day.filter(e => e.kind === 'feed'), ml = feeds.reduce((s, e) => s + (e.ml || 0), 0);
  const breastMin = feeds.reduce((s, e) => s + (e.left_min || 0) + (e.right_min || 0), 0);
  const pumps = day.filter(e => e.kind === 'pump'), pumped = pumps.reduce((s, e) => s + e.ml, 0);
  const all = intervals.slice(); if (open !== null) all.push([open, now]);
  const slept = all.reduce((s, [a, z]) => s + Math.max(0, Math.min(z, d1) - Math.max(a, d0)), 0);
  const dia = day.filter(e => e.kind === 'diaper'), vom = day.filter(e => e.kind === 'vomit').length;
  const chips = [['feed', feeds.length + (feeds.length === 1 ? ' mamada' : ' mamadas') + (ml ? ' · ' + ml + ' ml' : '') + (breastMin ? ' · ' + dur(breastMin * MIN) + ' no peito' : '')]];
  const lb = lastBreast(evs);
  if (lb && d0 === startOfDay(now)) chips.push(['feed', 'último peito: ' + SIDE_SHORT[lb.side] + ' · ' + ago(lb.t)]);
  if (pumps.length) chips.push(['pump', pumps.length + (pumps.length === 1 ? ' ordenha' : ' ordenhas') + ' · ' + pumped + ' ml']);
  chips.push(['sleep', dur(slept) + ' de sono'],
    ['diaper', dia.length + (dia.length === 1 ? ' fralda' : ' fraldas') + ' · ' + dia.filter(e => e.pee).length + ' xixi · ' + dia.filter(e => e.poo).length + ' cocô']);
  if (vom) chips.push(['vomit', vom + (vom === 1 ? ' vômito' : ' vômitos')]);
  $('summary').innerHTML = chips.map(([k, t]) => `<span class="chip k-${k}">${esc(t)}</span>`).join('');

  $('timeline').innerHTML = !b ? '<div class="empty">Cadastre um bebê para começar.</div>'
    : !day.length ? '<div class="empty">Nada registrado neste dia.</div>'
    : day.slice().reverse().map(e => {
        const who = e.author_id ? st.names[e.author_id] : '';
        const sub = [esc(detail(e)), e.kind !== 'other' && e.note ? esc(e.note) : '', who ? 'por ' + esc(who.split(' ')[0]) : ''].filter(Boolean).join(' · ');
        return `<button class="row" data-id="${esc(e.id)}"><span class="h">${hm(e.t)}</span><span class="d k-${e.kind}">${ICON[e.kind]}</span><span><span class="l">${esc(label(e, evs))}</span>${sub ? `<span class="s">${sub}</span>` : ''}</span></button>`;
      }).join('');
}

/* ---------- gravar registros ---------- */
function fields(ev) {
  return { kind: ev.kind, at: new Date(ev.t).toISOString(), src: ev.src ?? null, ml: ev.ml ?? null,
           side: ev.side ?? null, left_min: ev.left_min ?? null, right_min: ev.right_min ?? null,
           pee: ev.pee ?? null, poo: ev.poo ?? null, note: ev.note ?? null };
}
async function addEntry(ev) {
  const { data, error } = await sb.from('entries')
    .insert({ family_id: st.family.id, baby_id: st.baby.id, ...fields(ev) }).select().single();
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
const TITLE = { feed:'Mamada', pump:'Ordenha', sleep:'Sono', wake:'Sono', diaper:'Fralda', vomit:'Vômito', other:'Outros' };
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
  const { open } = sleepIntervals(sortedEntries());
  const t = edit ? edit.t : Date.now(), side = edit?.side;
  S = { mode: 'entry', k: k === 'wake' ? 'sleep' : k, edit, base: startOfDay(t), time: hm(t),
        src: edit ? (edit.src || '') : 'breast', ml: edit ? (edit.ml || '') : k === 'pump' ? '' : 90,
        l: side === 'left' || side === 'both', r: side === 'right' || side === 'both',
        lmin: edit?.left_min || '', rmin: edit?.right_min || '',
        pee: edit ? !!edit.pee : false, poo: edit ? !!edit.poo : false,
        sk: edit ? edit.kind : (open !== null ? 'wake' : 'sleep'), note: edit?.note || '', confirmDel: false, err: '' };
  drawEntry();
}
function drawEntry() {
  const k = S.k, c = 'k-' + k;
  let h = head(S.edit ? 'Editar ' + TITLE[k].toLowerCase() : TITLE[k]);
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
  if (k === 'other') h += `<div><div class="lbl">O que aconteceu</div><input class="field" id="noteIn" placeholder="Tomou vitamina D" value="${esc(S.note)}"></div>`;
  h += `<div><div class="lbl">Horário</div><div class="time"><input type="time" id="timeIn" value="${S.time}"><button class="small" data-act="now">Agora</button><button class="small" data-act="back" data-val="10">−10 min</button><button class="small" data-act="back" data-val="30">−30 min</button></div></div>`;
  if (k !== 'other') h += `<input class="field" id="noteIn" placeholder="Observação (opcional)" value="${esc(S.note)}">`;
  if (S.err) h += `<div class="err">${esc(S.err)}</div>`;
  h += `<button class="save" data-act="save">Salvar</button>`;
  if (S.edit) h += `<button class="del" data-act="del">${S.confirmDel ? 'Toque de novo para apagar' : 'Apagar registro'}</button>`;
  openPanel(h);
}
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
  const ev = { kind: k === 'sleep' ? S.sk : k, t: computeT() };
  const side = S.l && S.r ? 'both' : S.l ? 'left' : S.r ? 'right' : null;
  if (k === 'feed') {
    ev.src = S.src;
    if (S.src === 'bottle' && +S.ml > 0) ev.ml = +S.ml;
    if (S.src === 'breast') { ev.side = side; if (S.l && +S.lmin) ev.left_min = +S.lmin; if (S.r && +S.rmin) ev.right_min = +S.rmin; }
  }
  if (k === 'pump') { ev.side = side; ev.ml = +S.ml; }
  if (k === 'diaper') { ev.pee = !!S.pee; ev.poo = !!S.poo; }
  if (S.note.trim()) ev.note = S.note.trim().slice(0, 300);
  busy(btn, true);
  if (S.edit) { if (await updateEntry(S.edit.id, ev)) { closeSheet(); toast('Salvo às ' + hm(ev.t)); } else busy(btn, false); return; }
  const row = await addEntry(ev);
  if (!row) return busy(btn, false);
  closeSheet(); toast('Salvo às ' + hm(ev.t), () => deleteEntry(row.id));
}

/* ---------- calendário ---------- */
// No modo Semana, o dia escolhido é o último dos 7.
const chosenDay = () => st.view === 'week' ? st.weekEnd : st.viewDay;
function calSheet() { const d = new Date(chosenDay()); S = { mode: 'cal', y: d.getFullYear(), m: d.getMonth() }; drawCal(); }
function drawCal() {
  const today = startOfDay(Date.now()), min = firstDay(), week = st.view === 'week', sel = chosenDay(), from = week ? addDays(sel, -6) : sel;
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
  openPanel(head(week ? 'Escolher semana' : 'Escolher dia') +
    `<div class="mhead">${arrow(-1, cur > ym(min), 'Mês anterior', 'M15 5l-7 7 7 7')}<b>${MESES_L[S.m]} ${S.y}</b>${arrow(1, cur < ym(today), 'Próximo mês', 'M9 5l7 7-7 7')}</div>
    <div class="wdays" aria-hidden="true">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(w => `<span>${w}</span>`).join('')}</div>
    <div class="cal">${cells}</div>
    <div class="calkey"><i></i>dia com registros · o Caderninho mostra os últimos ${KEEP_DAYS} dias</div>
    ${week ? '<p class="dim">O painel mostra os 7 dias que terminam no dia escolhido.</p>' : ''}
    <button class="ghost" data-act="pickDay" data-val="${today}">Ir para hoje</button>`);
}
function calAction(a, v) {
  if (a === 'mon') { const d = new Date(S.y, S.m + (+v), 1); S.y = d.getFullYear(); S.m = d.getMonth(); return drawCal(); }
  if (a === 'pickDay') { if (st.view === 'week') st.weekEnd = +v; else st.viewDay = +v; closeSheet(); }
}

/* ---------- bebê e nome ---------- */
function babySheet(b) {
  S = { mode: 'baby', b };
  openPanel(head(b ? 'Editar bebê' : 'Adicionar bebê') +
    `<div><div class="lbl">Nome do bebê</div><input class="field" id="bName" maxlength="40" value="${esc(b?.name || '')}" placeholder="Marina"></div>
     <div><div class="lbl">Nascimento (opcional)</div><input class="field" id="bBirth" type="date" value="${esc(b?.birth_date || '')}"></div>
     <div class="err" id="bErr" hidden></div><button class="save" data-act="saveBaby">Salvar</button>`);
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
  await loadEntries(); render();
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

/* ---------- família e configurações ---------- */
function menuSheet() { S = { mode: 'menu', confirm: null, invite: null }; FB.sent = false; FB.err = ''; drawMenu(); $('sheet').scrollTop = 0; }
function drawMenu() {
  const f = st.family, creator = f.creator_id === st.user.id;
  let h = head(f.name) + '<div class="sec"><h4>Membros</h4>';
  h += st.members.map(m => {
    const tags = (m.user_id === f.creator_id ? ' <small>criador</small>' : '') + (m.user_id === st.user.id ? ' <small>você</small>' : '');
    const rm = creator && m.user_id !== st.user.id
      ? `<button class="danger" data-act="rm" data-val="${esc(m.user_id)}">${S.confirm === 'rm:' + m.user_id ? 'Confirmar' : 'Remover'}</button>` : '';
    return `<div class="li"><span>${esc(st.names[m.user_id] || 'Alguém')}${tags}</span>${rm}</div>`;
  }).join('');
  if (creator) h += S.invite
    ? `<div class="invite">${esc(S.invite)}</div><div class="row2"><button class="ghost" data-act="copyInv">Copiar link</button>${navigator.share ? '<button class="ghost" data-act="shareInv">Compartilhar</button>' : ''}</div><div class="lbl">O link serve para uma pessoa e vale 7 dias.</div>`
    : '<button class="ghost" data-act="invite">Convidar para esta família</button>';
  h += '</div><div class="sec"><h4>Bebês</h4>' +
    st.babies.map(b => `<div class="li"><span>${esc(b.name)}</span><button data-act="editBaby" data-val="${esc(b.id)}">Editar</button></div>`).join('') +
    '<button class="ghost" data-act="addBaby">Adicionar bebê</button></div>';
  h += `<div class="sec"><h4>Você</h4><div class="li"><span>${esc(st.profile.display_name)}</span><button data-act="rename">Mudar nome</button></div></div>`;
  h += '<div class="sec"><h4>Outras famílias</h4>' +
    st.families.filter(x => x.id !== f.id).map(x => `<div class="li"><span>${esc(x.name)}</span><button data-act="switchFam" data-val="${esc(x.id)}">Abrir</button></div>`).join('') +
    '<button class="ghost" data-act="newFam">Criar outra família</button></div>';
  h += '<div class="sec"><h4>Indicar o Caderninho</h4>' +
    `<div class="invite">${esc(location.host)}</div>` +
    `<div class="row2">${navigator.share ? '<button class="ghost" data-act="shareApp">Compartilhar</button>' : ''}<button class="ghost" data-act="copyApp">Copiar texto</button></div>` +
    '<div class="lbl">Para outra família com bebê. Quem abrir cria a própria família e não vê os registros desta.</div></div>';
  h += '<div class="sec"><h4>Sugestões e problemas</h4>' + (FB.sent
    ? '<div class="thanks" role="status"><b>Recebido, obrigado!</b><span>Sua mensagem chegou para quem cuida do Caderninho.</span></div><button class="ghost" data-act="fbAgain">Enviar outra</button>'
    : `<div><div class="lbl">Sobre o quê? <small>(opcional)</small></div><div class="seg">${FB_TYPES.map(([k, t]) => `<button class="opt${FB.type === k ? ' on' : ''}" data-act="fbType" data-val="${k}" aria-pressed="${FB.type === k}">${t}</button>`).join('')}</div></div>
       <div><label class="lbl" for="fbText">Sua mensagem</label><textarea class="field" id="fbText" maxlength="${FB_MAX}" placeholder="Ex.: queria ver as mamadas da madrugada separadas">${esc(FB.text)}</textarea>
       <div class="fbmeta"><span>Quem cuida do Caderninho lê todas.</span><span id="fbCount">${FB.text.length} de ${FB_MAX}</span></div></div>
       ${FB.err ? `<div class="err" id="fbErr">${esc(FB.err)}</div>` : ''}
       <div class="lbl">Vai junto: seu nome, a família aberta e o tipo de celular.</div>
       <button class="save" data-act="fbSend">Enviar</button>`) + '</div>';
  h += '<button class="ghost" data-act="logout">Desconectar deste celular</button>';
  h += creator
    ? `<button class="danger-btn" data-act="delFam">${S.confirm === 'delFam' ? 'Toque de novo: apaga a família, os bebês e todos os registros' : 'Apagar família'}</button>`
    : `<button class="danger-btn" data-act="leave">${S.confirm === 'leave' ? 'Toque de novo para sair da família' : 'Sair da família'}</button>`;
  const top = $('sheet').scrollTop; openPanel(h); $('sheet').scrollTop = top;
}

/* ---------- sugestões e problemas ---------- */
// O rascunho sobrevive a fechar o menu sem querer. Pelo app, só dá para enviar: ninguém lê.
const FB = { type: '', text: '', sent: false, err: '' }, FB_MAX = 1000;
const FB_TYPES = [['idea', 'Sugestão'], ['bug', 'Algo deu errado']];
async function sendFeedback(btn) {
  const message = FB.text.trim();
  if (!message) { FB.err = 'Escreva sua mensagem antes de enviar.'; return drawMenu(); }
  busy(btn, true);
  const { error } = await sb.from('feedback').insert({ family_id: st.family.id, kind: FB.type || null, message, device: deviceText() });
  if (error) FB.err = error.message?.includes('feedback_limit') ? 'Você já mandou muitas mensagens hoje. Tente de novo amanhã.'
                                                                 : 'Não foi possível enviar. Confira a conexão e tente de novo.';
  else Object.assign(FB, { type: '', text: '', sent: true, err: '' });
  // Se o menu foi fechado enquanto enviava, avisa pelo toast.
  if (S?.mode === 'menu') drawMenu(); else toast(error ? FB.err : 'Mensagem enviada. Obrigado!');
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
async function menuAction(a, v, btn) {
  const f = st.family;
  if (a === 'invite') {
    busy(btn, true);
    const { data, error } = await sb.from('invites').insert({ family_id: f.id }).select('token').single();
    busy(btn, false);
    if (error) return toast('Não foi possível criar o convite.');
    S.invite = location.origin + '/?convite=' + data.token; return drawMenu();
  }
  if (a === 'copyInv') return navigator.clipboard.writeText(S.invite).then(() => toast('Link copiado'), () => toast('Selecione o link e copie'));
  if (a === 'shareInv') return navigator.share({ title: 'Caderninho', text: 'Entre na família ' + f.name + ' no Caderninho:', url: S.invite }).catch(() => {});
  if (a === 'shareApp') return navigator.share({ title: 'Caderninho', text: REFER_TEXT, url: location.origin + '/' }).catch(() => {});
  if (a === 'copyApp') return navigator.clipboard.writeText(REFER_TEXT + ' ' + location.origin + '/').then(() => toast('Texto copiado'), () => toast('Selecione o endereço e copie'));
  if (a === 'rm') {
    if (S.confirm !== 'rm:' + v) { S.confirm = 'rm:' + v; return drawMenu(); }
    const { error } = await sb.from('family_members').delete().eq('family_id', f.id).eq('user_id', v);
    if (error) return toast('Não foi possível remover.');
    st.members = st.members.filter(m => m.user_id !== v); S.confirm = null; return drawMenu();
  }
  if (a === 'delFam' || a === 'leave') {
    if (S.confirm !== a) { S.confirm = a; return drawMenu(); }
    const q = a === 'delFam' ? sb.from('families').delete().eq('id', f.id)
                             : sb.from('family_members').delete().eq('family_id', f.id).eq('user_id', st.user.id);
    const { error } = await q;
    if (error) return toast('Não foi possível concluir.');
    return afterLeavingFamily();
  }
  if (a === 'fbType') { FB.type = FB.type === v ? '' : v; return drawMenu(); }
  if (a === 'fbSend') return sendFeedback(btn);
  if (a === 'fbAgain') { FB.sent = false; return drawMenu(); }
  if (a === 'editBaby') return babySheet(st.babies.find(b => b.id === v));
  if (a === 'addBaby') return babySheet(null);
  if (a === 'rename') return renameSheet();
  if (a === 'switchFam') { closeSheet(); return openFamily(v); }
  if (a === 'newFam') { closeSheet(); $('cancelCreate').hidden = false; return show('scrCreate'); }
  if (a === 'logout') { await sb.auth.signOut(); location.href = '/'; }
}

/* ---------- eventos ---------- */
$('sheetIn').addEventListener('input', e => {
  if (e.target.id === 'fbText') {
    FB.text = e.target.value; $('fbCount').textContent = FB.text.length + ' de ' + FB_MAX;
    if (FB.err) { FB.err = ''; $('fbErr')?.remove(); }
    return;
  }
  if (S?.mode !== 'entry') return;
  const id = e.target.id;
  if (id === 'noteIn') { S.note = e.target.value; if (S.err) { S.err = ''; $('sheetIn').querySelector('.err')?.remove(); } }
  if (id === 'timeIn') S.time = e.target.value;
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
  if (a === 'saveName') return saveName(b);
  if (S.mode === 'menu') return menuAction(a, v, b);
  if (S.mode === 'cal') return calAction(a, v);
  if (S.mode !== 'entry') return;
  if (a === 'src') S.src = v;
  else if (a === 'ml') S.ml = +v;
  else if (a === 'mlstep') S.ml = Math.max(0, (+S.ml || 0) + (+v)) || '';
  else if (a === 'pick') { S[v] = !S[v]; if (!S[v]) S[v + 'min'] = ''; }
  else if (a === 'minstep') { const [key, d] = v.split(':'); S[key + 'min'] = Math.min(180, Math.max(0, (+S[key + 'min'] || 0) + (+d))) || ''; if (S[key + 'min']) S[key] = true; }
  else if (a === 'sk') S.sk = v;
  else if (a === 'pee' || a === 'poo') S[a] = !S[a];
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
$('menuBtn').innerHTML = ICON.menu;
document.querySelectorAll('.act').forEach(b => b.addEventListener('click', () => openEntry(b.dataset.k)));
$('wakeBtn').onclick = async () => {
  const row = await addEntry({ kind: 'wake', t: Date.now() });
  if (row) toast('Acordou às ' + hm(Date.parse(row.at)), () => deleteEntry(row.id));
};
$('babyBtn').onclick = () => babySheet(st.baby);
$('menuBtn').onclick = menuSheet;
$('babyTabs').addEventListener('click', e => { const b = e.target.closest('[data-baby]'); if (b) selectBaby(b.dataset.baby); });
$('timeline').addEventListener('click', e => {
  const r = e.target.closest('.row'); if (!r) return;
  const ev = st.entries.get(r.dataset.id); if (ev) openEntry(ev.kind, ev);
});
// Setas: um dia na linha do tempo, 7 dias no painel.
$('prevDay').onclick = () => { if (st.view === 'week') st.weekEnd = addDays(st.weekEnd, -7); else st.viewDay = addDays(st.viewDay, -1); render(); };
$('nextDay').onclick = () => { if (st.view === 'week') st.weekEnd = addDays(st.weekEnd, 7); else st.viewDay = addDays(st.viewDay, 1); render(); };
$('dayTitle').onclick = calSheet;
// Trocar de aba mantém o dia escolhido se ele estiver nos 7 dias do painel; senão, alinha os dois.
const inWeek = d0 => d0 <= st.weekEnd && d0 > addDays(st.weekEnd, -7);
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => {
  if (b.dataset.view === st.view) return;
  st.view = b.dataset.view;
  if (!inWeek(st.viewDay)) { if (st.view === 'week') st.weekEnd = st.viewDay; else st.viewDay = st.weekEnd; }
  render();
});
// Painel da semana: filtro, métrica e tocar num dia para abrir a linha do tempo dele.
function openDay(d0) {
  st.viewDay = d0; st.view = 'day'; render();
  $('dayTitle').closest('.daynav').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
$('weekView').addEventListener('click', e => {
  const f = e.target.closest('[data-flt]'); if (f) { st.show[f.dataset.flt] = !st.show[f.dataset.flt]; return render(); }
  const m = e.target.closest('[data-met]'); if (m) { st.metric = m.dataset.met; return render(); }
  const r = e.target.closest('.dayrow'); if (r) openDay(+r.dataset.day);
});
$('weekView').addEventListener('keydown', e => {
  const r = e.target.closest('.dayrow');
  if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDay(+r.dataset.day); }
});
$('scrim').onclick = closeSheet;
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S) closeSheet(); });

// Ao voltar para o app depois de um tempo, recarrega os registros (a conexão ao vivo pode ter caído).
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && st.baby && !$('scrMain').hidden && !S) loadEntries().then(render);
});
setInterval(() => { if (!S) render(); }, 30000);

function isDark() { const a = document.documentElement.dataset.theme; return a ? a === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
function paintTheme() { $('themeBtn').innerHTML = isDark() ? ICON.sun : ICON.sleep; }
const savedTheme = lsGet('cad-theme'); if (savedTheme) document.documentElement.dataset.theme = savedTheme;
$('themeBtn').onclick = () => { const th = isDark() ? 'light' : 'dark'; document.documentElement.dataset.theme = th; lsSet('cad-theme', th); paintTheme(); };
paintTheme();

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
