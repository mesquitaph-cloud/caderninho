// Tendências (item 58; decidido com o Patrick em 13/11; prévia aprovada:
// https://claude.ai/artifact/R84pJ6Ke6egHFtYVpfHxBv). A 5ª aba: como o sono muda de um período para
// outro, dia a dia (14 dias, provisório) ou semana a semana (12 semanas, cada uma com os 7 dias que
// terminam ontem, como no painel da semana). Só junta o que foi anotado: sem "normal", meta, faixa de
// referência, seta de melhora ou piora, nem comparação com outros bebês (CONTEXT.md).
//   Hoje não entra na conta (a regra da média por dia), mas a frase não aparece na tela (Patrick, 13/11).
//   Cada dia d junta o sono de dia de d (os sonos que começam entre 6h e 18h, inteiros, como o napDay de
//   report.js) e a noite que começa em d (os sonos que começam entre 18h e 6h, inteiros). A noite, a hora
//   de dormir e os despertares saem de nights(), de noites.js, os mesmos de "Como foram as noites".
//   Maior sono seguido: o sono mais longo que começou no dia, como no painel da semana.
//   Barra mais clara: falta registro, nunca número baixo. Sono e sonecas: dia com menos de FEW_DAY
//   registros de dormiu e acordou; semana com menos de FEW_WEEK dias anotados. Despertares, a noite e
//   maior sono: noite não anotada do começo ao fim (sem hora de dormir, sem o acordou de manhã ou com um
//   buraco de mais de GAP sem sono anotado entre a hora de dormir e as 6h); semana com menos de FEW_WEEK
//   noites assim. Os cortes são provisórios.
// Nesta versão só a guia Sono tem gráficos; Mamadas, Fraldas, Ordenha e Peso mostram "Em construção".
import { HOUR, addDays, startOfDay, dur, esc, MESES, DIAS, CAPI, rangeTitle, sleepIntervals } from './util.js';
import { nights, nightName } from './noites.js';

export const DAY_SPAN = 14, WEEKS = 12;
const FEW_DAY = 4, FEW_WEEK = 4, GAP = 3 * HOUR, MAX_SLEEP = 14 * HOUR, EMPTY_DAYS = 3;
const at = (d0, h) => d0 + h * HOUR;   // como em noites.js: ok para 6h e 18h
const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0);
const mean = (xs, f) => xs.length ? sum(xs, f) / xs.length : null;

// A capivara de sempre (util.js), com os "zz" do sono ou com o capacete de obra só no traço (no lugar
// da orelha; exceção à regra "nada na cabeça" da Marca, decidida pelo Patrick em 13/11).
const P = d => `<path vector-effect="non-scaling-stroke" d="${d}"/>`;
const EAR = /<path[^>]*d="M80 15\.8C80 9\.5 86\.5 8\.5 87\.5 14\.6"\/>/;
const CAPI_ZZ = CAPI.replace('viewBox="0 0 120 70"', 'viewBox="0 -16 120 86"')
  .replace('</svg>', P('M93 4H99L93 10H99') + P('M103 -14H112L103 -5H112') + '</svg>');
const CAPI_HAT = CAPI.replace(EAR, '').replace('viewBox="0 0 120 70"', 'viewBox="0 -8 120 78"')
  .replace('</svg>', P('M82.5 14.8C82.5 6.5 87.5 2.5 92.5 2.5S102.5 6.5 102.5 14.8Z') + P('M78 14.8H107') + P('M92.5 2.5V8.5') + '</svg>');

// Os dias e as semanas da janela aberta. first: o primeiro dia que dá para ver (nascimento ou cadastro).
// off: quantas janelas para trás (as setas).
export function trendWindow(mode, off, now, first) {
  const Y = addDays(startOfDay(now), -1);
  if (mode === 'd') {
    const end = addDays(Y, -DAY_SPAN * off), a0 = addDays(end, -(DAY_SPAN - 1)), a = Math.max(a0, first);
    const days = []; for (let d = a; d <= end; d = addDays(d, 1)) days.push(d);
    return { a, z: end, days, weeks: null, canBack: a0 > first, canFwd: off > 0 };
  }
  const weeks = [];
  let a0 = null;
  for (let k = WEEKS - 1; k >= 0; k--) {
    const e = addDays(Y, -7 * (WEEKS * off + k)), s = addDays(e, -6);
    if (k === WEEKS - 1) a0 = s;
    if (e < first) continue;
    weeks.push({ a: Math.max(s, first), e });
  }
  const a = weeks.length ? weeks[0].a : Y;
  const days = []; for (let d = a; weeks.length && d <= weeks.at(-1).e; d = addDays(d, 1)) days.push(d);
  return { a, z: weeks.length ? weeks.at(-1).e : Y, days, weeks, canBack: a0 > first, canFwd: off > 0 };
}

// Números de cada dia d, da manhã de d até a manhã seguinte.
function dayRows(days, evs, now) {
  if (!days.length) return [];
  const { out, open } = sleepIntervals(evs), ivs = out.filter(([x, y]) => y - x <= MAX_SLEEP);
  const nmap = new Map(nights(days[0], addDays(days.at(-1), 1), evs, out, now).map(n => [n.d, n]));
  const marks = evs.filter(e => e.kind === 'sleep' || e.kind === 'wake');
  return days.map(d => {
    const d1 = addDays(d, 1), w0 = at(d, 18), w1 = at(d1, 6);
    const naps = ivs.filter(([x]) => x >= at(d, 6) && x < w0);
    const n = nmap.get(d) || null, ns = n ? n.ns : [];
    const started = ivs.filter(([x]) => x >= d && x < d1);
    // A noite foi anotada do começo ao fim?
    let whole = !!(n && n.hasBed);
    if (whole && open !== null && open >= w0 && open < w1) whole = false;        // falta o acordou
    if (whole && out.some(([x, y]) => x >= w0 && x < w1 && y - x > MAX_SLEEP)) whole = false;
    if (whole) {
      let cur = n.t0;
      for (const [x, y] of ns) { if (x < n.t0) continue; if (x - cur > GAP) { whole = false; break; } cur = Math.max(cur, y); }
      if (whole && w1 - cur > GAP) whole = false;
    }
    const last = ns.length ? ns.at(-1)[1] : null;
    return {
      d, any: evs.some(e => e.t >= d && e.t < d1),
      few: marks.filter(e => e.t >= d && e.t < d1).length < FEW_DAY,
      nap: sum(naps, ([x, y]) => y - x), naps: naps.length,
      night: sum(ns, ([x, y]) => y - x), hasNight: ns.length > 0, whole,
      desp: n ? n.wakes.length : 0,
      bed: n && n.hasBed ? n.t0 - d : null,                     // desde 0h de d
      wake: n && n.hasBed && last > n.t0 ? last - d1 : null,     // desde 0h do dia seguinte
      longest: started.length ? Math.max(...started.map(([x, y]) => y - x)) : 0,
    };
  });
}

// Cada barra: um dia ou a média de uma semana.
function items(win, evs, now) {
  const rows = dayRows(win.days, evs, now);
  const item = (r, few, nfew) => ({ ...r, total: r.night + r.nap, napEach: r.naps ? r.nap / r.naps : 0, sFew: few, nFew: nfew });
  if (!win.weeks) return rows.map(r => item(r, r.few, !r.whole));
  return win.weeks.map(w => {
    const ds = rows.filter(r => r.d >= w.a && r.d <= w.e), rec = ds.filter(r => r.any), nl = ds.filter(r => r.hasNight);
    const beds = nl.filter(r => r.bed !== null), wakes = nl.filter(r => r.wake !== null), long = ds.filter(r => r.longest);
    const ok = ds.filter(r => !r.few).length, okN = ds.filter(r => r.whole).length, naps = sum(rec, r => r.naps);
    return {
      d: w.a, e: w.e, n: ds.length, ok, okN,
      night: mean(rec, r => r.night) || 0, nap: mean(rec, r => r.nap) || 0, total: mean(rec, r => r.night + r.nap) || 0,
      naps: mean(rec, r => r.naps) || 0, napEach: naps ? sum(rec, r => r.nap) / naps : 0,
      desp: mean(nl, r => r.desp) || 0, hasNight: nl.length > 0,
      bed: mean(beds, r => r.bed), wake: mean(wakes, r => r.wake),
      longest: mean(long, r => r.longest) || 0,
      sFew: ok < FEW_WEEK, nFew: okN < FEW_WEEK,
    };
  });
}

/* ---------- formatos ---------- */
const clock = ms => { const m = ((Math.round(ms / 60000) % 1440) + 1440) % 1440; return Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0'); };
const dec = x => (Math.round(x * 10) / 10).toLocaleString('pt-BR');
const dLong = d0 => { const d = new Date(d0); return DIAS[d.getDay()].toLowerCase() + ', ' + d.getDate() + ' ' + MESES[d.getMonth()]; };
const tick = (it, w) => { const d = new Date(w ? it.e : it.d); return w ? d.getDate() + '/' + (d.getMonth() + 1) : String(d.getDate()); };
const f1 = v => v.toFixed(1);
const niceMax = (v, step) => Math.max(step, Math.ceil(v / step) * step);

/* ---------- gráficos ---------- */
const VW = 300, L = 28, R = 4, T = 8, B = 18;
const selBox = (x, bw, ch) => `<rect class="trsel" x="${f1(x - 2)}" y="${T - 2}" width="${f1(bw + 4)}" height="${ch + 4}" rx="4"/>`;
const label = (x, H, txt, on) => `<text x="${f1(x)}" y="${H - 4}" text-anchor="middle"${on ? ' class="on"' : ''}>${txt}</text>`;
const hit = (i, x, w, H) => `<rect class="hit" data-ti="${i}" x="${f1(x)}" y="0" width="${f1(w)}" height="${H}"/>`;
// Barras, empilhadas quando há mais de uma série (a primeira embaixo).
function bars({ its, series, max, step, fmt, sel, week, h = 96, name, few }) {
  const H = h, cw = VW - L - R, ch = H - T - B, n = its.length, slot = cw / n, bw = Math.max(2, Math.min(22, slot * .66));
  let s = `<svg class="trc" viewBox="0 0 ${VW} ${H}" role="img" aria-label="${esc(name)}">`;
  for (let g = 0; g <= max; g += step) { const y = T + ch - ch * g / max; s += `<line class="gl" x1="${L}" x2="${VW - R}" y1="${f1(y)}" y2="${f1(y)}"/><text x="${L - 5}" y="${f1(y + 3)}" text-anchor="end">${fmt(g)}</text>`; }
  its.forEach((it, i) => {
    const x = L + slot * i + (slot - bw) / 2; let acc = 0;
    s += `<g${few(it) ? ' class="few"' : ''}>`;
    for (const [k, cls] of series) {
      const v = it[k] || 0, y = T + ch - ch * (acc + v) / max; acc += v;
      if (v > 0) s += `<rect class="${cls}" x="${f1(x)}" y="${f1(y)}" width="${f1(bw)}" height="${f1(ch * v / max)}" rx="${f1(Math.min(3, bw / 3))}"/>`;
    }
    s += '</g>';
    if (i === sel) s += selBox(x, bw, ch);
    if ((n - 1 - i) % (week ? 3 : 2) === 0) s += label(x + bw / 2, H, tick(it, week), i === sel);
    s += hit(i, L + slot * i, slot, H);
  });
  return s + '</svg>';
}
// A noite: uma faixa da hora de dormir até a de acordar, com os despertares marcados (no dia a dia).
function band({ its, sel, week }) {
  const H = 160, cw = VW - L - R, ch = H - T - B, n = its.length, slot = cw / n, bw = Math.max(3, Math.min(14, slot * .55));
  const vals = its.flatMap(it => it.bed !== null && it.wake !== null ? [it.bed / HOUR, 24 + it.wake / HOUR] : []);
  const y0 = vals.length ? Math.min(18, Math.floor(Math.min(...vals) / 3) * 3) : 18;
  const y1 = vals.length ? Math.max(33, Math.ceil(Math.max(...vals) / 3) * 3) : 33;
  const Y = hh => T + ch * (hh - y0) / (y1 - y0);
  let s = `<svg class="trc" viewBox="0 0 ${VW} ${H}" role="img" aria-label="Da hora de dormir até a de acordar">`;
  for (let hh = y0; hh <= y1; hh += 3) s += `<line class="gl" x1="${L}" x2="${VW - R}" y1="${f1(Y(hh))}" y2="${f1(Y(hh))}"/><text x="${L - 5}" y="${f1(Y(hh) + 3)}" text-anchor="end">${hh % 24}h</text>`;
  its.forEach((it, i) => {
    const x = L + slot * i + (slot - bw) / 2;
    if (it.bed !== null && it.wake !== null) {
      const a = Y(it.bed / HOUR), b = Y(24 + it.wake / HOUR), k = week ? 0 : it.desp;
      s += `<g${it.nFew ? ' class="few"' : ''}><rect class="tb-night" x="${f1(x)}" y="${f1(a)}" width="${f1(bw)}" height="${f1(Math.max(1, b - a))}" rx="${f1(bw / 2)}"/>`;
      if (bw >= 6) for (let q = 1; q <= k; q++) s += `<circle class="tb-dot" cx="${f1(x + bw / 2)}" cy="${f1(a + (b - a) * q / (k + 1))}" r="1.8"/>`;
      s += '</g>';
    }
    if (i === sel) s += selBox(x, bw, ch);
    if ((n - 1 - i) % (week ? 3 : 2) === 0) s += label(x + bw / 2, H, tick(it, week), i === sel);
    s += hit(i, L + slot * i, slot, H);
  });
  return s + '</svg>';
}

/* ---------- textos (provisórios, esperam a aprovação do Patrick palavra por palavra) ---------- */
const DEFS = {
  sono: '<b>Noite e dia.</b> À noite é o sono que começa entre 18h e 6h. De dia são as sonecas, os sonos que começam entre 6h e 18h. Cada sono conta inteiro no horário em que começou.',
  desp: '<b>Despertar</b> é acordar e voltar a dormir entre a hora de dormir e as 6h. Acordar de uma soneca não conta.',
  // "até o bebê acordar de manhã" da prévia, ajustado ao código: a noite termina no acordou do último
  // sono que começou antes das 6h (noites.js).
  faixa: '<b>A noite</b> começa na hora de dormir, o primeiro sono de mais de 3h que começa entre 18h e 6h, e vai até o acordou do último sono que começa antes das 6h. Um cochilo curto no começo da noite não muda a hora de dormir.',
  long: '<b>Vale qualquer sono</b>, da noite ou soneca. Quase sempre é o da noite. Conta no dia em que o sono começou.',
  naps: '<b>Soneca</b> é cada sono que começa entre 6h e 18h. Um cochilo depois das 18h conta como sono da noite, mas não muda a hora de dormir.',
};
const NIGHT_KEYS = ['desp', 'faixa', 'long'];
function lightText(k, week) {
  if (NIGHT_KEYS.includes(k)) {
    const what = week ? 'uma semana com menos de 4 noites anotadas do começo ao fim' : 'uma noite em que o sono não foi anotado do começo ao fim';
    return 'A barra mais clara é ' + what + '. ' + (k === 'desp' ? 'Pode ter havido outros despertares que não aparecem aqui.' : 'O número pode não mostrar a noite inteira.');
  }
  return 'A barra mais clara é ' + (week ? 'uma semana com menos de 4 dias anotados' : 'um dia com poucos registros') + '. O número pode ser menor do que o que aconteceu, porque nem tudo foi anotado.';
}
const infoBtn = (k, open) => `<button class="tri" data-tinfo="${k}" aria-expanded="${open}" aria-label="O que este gráfico mostra">i</button>`;
const infoBox = (k, cls, week) => `<div class="trib" role="note"><svg viewBox="0 0 44 36" aria-hidden="true"><rect class="${cls}" x="6" y="6" width="12" height="28" rx="3"/><rect class="${cls} fewr" x="26" y="18" width="12" height="16" rx="3"/></svg>`
  + `<div><p>${DEFS[k]}</p><p>${lightText(k, week)}</p></div></div>`;
const read = (d, n, x = '', few = '') => `<div class="trd" aria-live="polite"><span class="td">${d}</span><b>${n}</b>${x ? `<span class="tx">${x}</span>` : ''}${few ? `<span class="tf">${few}</span>` : ''}</div>`;
const fewDay = (it, week) => it.sFew ? 'Poucos registros' + (week ? ` (${it.ok} de ${it.n} ${it.n === 1 ? 'dia' : 'dias'})` : '') + ': o número pode não ser fiel.' : '';
const fewNight = (it, week) => it.nFew ? (week ? `Poucas noites anotadas do começo ao fim (${it.okN} de ${it.n})` : 'Noite não anotada do começo ao fim') + ': o número pode não ser fiel.' : '';

const TABS = [['sono', 'Sono', '--c-sleep'], ['mam', 'Mamadas', '--c-feed'], ['fr', 'Fraldas', '--c-diaper'], ['ord', 'Ordenha', '--c-pump'], ['peso', 'Peso', '--c-weight']];
const SUBJ = { mam: 'mamadas', fr: 'fraldas', ord: 'ordenha', peso: 'peso' };

// t: o estado da tela ({ tab, mode, off, sel, info }); o app guarda e troca.
// who: "Helena · 3 meses"; chips: os bebês da família, quando há mais de um.
export function trendsHtml({ t, evs, now, first, pump, who, chips = '', loading = '' }) {
  const tabs = TABS.filter(([k]) => k !== 'ord' || pump);
  if (!tabs.some(([k]) => k === t.tab)) t.tab = 'sono';
  let h = `<header class="trh"><h2>${CAPI}Tendências</h2>${who ? `<span>${esc(who)}</span>` : ''}</header>${chips}`;
  h += `<div class="trt" role="tablist" aria-label="Assunto">${tabs.map(([k, name, c]) => `<button role="tab" data-ttab="${k}" aria-selected="${t.tab === k}"><i style="background:var(${c})"></i>${name}</button>`).join('')}</div>`;
  if (t.tab !== 'sono')
    return h + `<section class="card trb">${CAPI_HAT}<h3>Em construção</h3><p>Os gráficos de ${SUBJ[t.tab]} chegam numa próxima versão. Por enquanto, Tendências mostra o sono.</p></section>`;
  const week = t.mode === 'w';
  h += `<div class="seg2" role="group" aria-label="Visão"><button data-tmode="d" class="${week ? '' : 'on'}" aria-pressed="${!week}">Dia a dia</button><button data-tmode="w" class="${week ? 'on' : ''}" aria-pressed="${week}">Semana a semana</button></div>`;
  // Ainda sem dias anotados que bastem para ver alguma mudança.
  const today = startOfDay(now), done = new Set(evs.filter(e => e.t < today).map(e => startOfDay(e.t)));
  if (done.size < EMPTY_DAYS || addDays(today, -1) < first)
    return h + `<section class="card tre">${CAPI_ZZ}<h3>Os gráficos aparecem aqui</h3><p>Depois de alguns dias com sono, mamadas e fraldas anotados, dá para ver como a rotina vai mudando, dia a dia e semana a semana.</p></section>`;
  const win = trendWindow(t.mode, t.off, now, first);
  h += `<div class="trr"><button class="arr" data-tnav="-1" aria-label="${week ? 'Semanas anteriores' : 'Dias anteriores'}"${win.canBack ? '' : ' disabled'}>‹</button>`
    + `<span>${rangeTitle(win.a, win.z)}</span><button class="arr" data-tnav="1" aria-label="${week ? 'Semanas seguintes' : 'Dias seguintes'}"${win.canFwd ? '' : ' disabled'}>›</button></div>`;
  if (loading) return h + `<div class="empty">${loading}</div>`;
  const its = items(win, evs, now);
  if (!its.length) return h + '<div class="empty">Nada anotado nestes dias.</div>';
  if (t.sel == null || t.sel >= its.length) t.sel = its.length - 1;
  const cur = its[t.sel], sel = t.sel;
  const lab = week ? rangeTitle(cur.d, cur.e) : dLong(cur.d), per = week ? ' · média por dia' : '';
  const nlab = week ? rangeTitle(cur.d, cur.e) + ' · média por noite' : nightName(cur.d);
  const card = (k, title, cls, body, capi = '') => `<section class="card trk"><h3>${capi}${title}${infoBtn(k, t.info === k)}</h3>${t.info === k ? infoBox(k, cls, week) : ''}${body}</section>`;
  const sF = it => it.sFew, nF = it => it.nFew;
  const maxT = niceMax(Math.max(...its.map(x => x.total / HOUR)), 6), maxD = niceMax(Math.max(...its.map(x => x.desp)), 2);
  const maxL = niceMax(Math.max(...its.map(x => x.longest / HOUR)), 2), maxN = niceMax(Math.max(...its.map(x => x.naps)), 2);
  const hrs = k => its.map(x => ({ ...x, [k]: x[k] / HOUR }));

  h += card('sono', 'Sono', 'tb-night', read(lab + per, dur(cur.total), dur(cur.night) + ' à noite · ' + dur(cur.nap) + ' de dia', fewDay(cur, week))
    + bars({ its: hrs('night').map((x, i) => ({ ...x, nap: its[i].nap / HOUR })), series: [['night', 'tb-night'], ['nap', 'tb-nap']], max: maxT, step: 6, fmt: v => v + 'h', sel, week, h: 120, name: 'Horas de sono, à noite e de dia', few: sF })
    + '<div class="trl"><span><i class="tb-night"></i>à noite</span><span><i class="tb-nap"></i>de dia</span><span>a altura é o total</span></div>', CAPI_ZZ);
  h += card('desp', 'Despertares à noite', 'tb-wake', read(nlab, week ? dec(cur.desp) : String(cur.desp), '', fewNight(cur, week))
    + bars({ its, series: [['desp', 'tb-wake']], max: maxD, step: maxD > 4 ? 2 : 1, fmt: String, sel, week, name: 'Despertares à noite', few: nF }));
  h += card('faixa', 'A noite', 'tb-night', read(nlab.replace('média por noite', 'em média'),
      cur.bed !== null && cur.wake !== null ? clock(cur.bed) + ' a ' + clock(cur.wake) : '—', 'da hora de dormir até a de acordar', fewNight(cur, week))
    + band({ its, sel, week }) + `<div class="trl"><span><i class="tb-night"></i>dormindo</span>${week ? '' : '<span><i class="tb-dot"></i>despertar</span>'}</div>`);
  h += card('long', 'Maior sono seguido', 'tb-night', read(lab + per, cur.longest ? dur(cur.longest) : '—', 'o sono mais longo sem acordar', fewNight(cur, week))
    + bars({ its: hrs('longest'), series: [['longest', 'tb-night']], max: maxL, step: 2, fmt: v => v + 'h', sel, week, name: 'Maior sono seguido', few: nF }));
  const nn = week ? dec(cur.naps) : String(cur.naps);
  h += card('naps', 'Sonecas', 'tb-nap', read(lab + per, nn + (nn === '1' ? ' soneca' : ' sonecas'), cur.napEach ? dur(cur.napEach) + ' cada, em média' : '', fewDay(cur, week))
    + bars({ its, series: [['naps', 'tb-nap']], max: maxN, step: 2, fmt: String, sel, week, name: 'Sonecas por dia', few: sF }));
  return h;
}
