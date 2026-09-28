// Painel da semana: os 7 dias que terminam no dia escolhido.
// Só junta o que foi registrado: não avalia nem compara com outros bebês.
import { MIN, startOfDay, addDays, hm, dur, esc, dayTitle, shortDay, DIAS, label, detail } from './util.js';

// "Dia a dia": uma barra por dia do que estiver escolhido. Em fraldas, a parte de baixo é das com cocô.
export const METRICS = {
  sleep:  { name: 'Sono',     cls: 'm-sleep',  val: s => s.slept,        fmt: v => dur(v) },
  feed:   { name: 'Mamadas',  cls: 'm-feed',   val: s => s.feeds.length, fmt: String },
  diaper: { name: 'Fraldas',  cls: 'm-diaper', val: s => s.dia.length,   fmt: String, sub: s => s.poo, subCls: 'm-poo' },
  pump:   { name: 'Ordenhas', cls: 'm-pump',   val: s => s.pumpMl,       fmt: v => v ? v + ' ml' : '0' },
};
const FILTERS = [['sleep', 'Sono', '--c-sleep'], ['feed', 'Mamada', '--c-feed'], ['diaper', 'Fralda', '--c-diaper'], ['pump', 'Ordenha', '--c-pump'],
                 ['symptom', 'Sintomas', '--c-vomit'], ['med', 'Remédio', '--c-med'], ['care', 'Cuidados', '--c-care']];

// Os gráficos levam só os botões que a família escolheu (Mamada, Sono e Fralda são fixos). Lugar de
// cada marca na linha: fralda embaixo, mamada no meio, todo o resto em cima.
const CARE_KINDS = ['massage', 'bath', 'nasal'];
export const shownKinds = on => ({ sleep: true, feed: true, diaper: true, pump: on('pump'), symptom: on('symptom'),
  med: on('med'), care: CARE_KINDS.some(on), massage: on('massage'), bath: on('bath'), nasal: on('nasal') });
// Grupo da marca de cima (ou null): sintomas levam o vômito junto; dose pulada não vira marca.
function topKind(e, k) {
  if (e.kind === 'pump') return k.pump ? 'pump' : null;
  if (e.kind === 'symptom' || e.kind === 'vomit') return k.symptom ? 'symptom' : null;
  if (e.kind === 'med') return k.med && !e.skipped ? 'med' : null;
  if (CARE_KINDS.includes(e.kind)) return k[e.kind] ? 'care' : null;
  return null;
}
// Marcas de cima, centradas em (x, y), com meia largura r.
const TOP_MARK = {
  pump: (x, y, r) => `<rect class="m-pump" x="${f1(x - r)}" y="${f1(y - r)}" width="${f1(2 * r)}" height="${f1(2 * r)}" rx="1.2"/>`,
  symptom: (x, y, r) => `<path class="m-vomit dot" d="M${x} ${f1(y - r * 1.2)}L${f1(x + r * 1.2)} ${f1(y)}L${x} ${f1(y + r * 1.2)}L${f1(x - r * 1.2)} ${f1(y)}Z"/>`,
  med: (x, y, r) => `<circle class="m-med dot" cx="${x}" cy="${f1(y)}" r="${f1(r)}"/>`,
  care: (x, y, r) => `<path class="m-care dot" d="M${x} ${f1(y - r * 1.2)}L${f1(x + r * 1.2)} ${f1(y + r)}L${f1(x - r * 1.2)} ${f1(y + r)}Z"/>`,
};
const f1 = v => +v.toFixed(1);

// Números de um dia. "sleeps" são os sonos [início, fim]; o sono em andamento termina agora.
function dayStats(d0, evs, sleeps, now) {
  const d1 = addDays(d0, 1), end = Math.min(d1, now);
  const day = evs.filter(e => e.t >= d0 && e.t < d1);
  const feeds = day.filter(e => e.kind === 'feed'), pumps = day.filter(e => e.kind === 'pump'), dia = day.filter(e => e.kind === 'diaper');
  return {
    d0, d1, day, feeds, pumps, dia,
    slept: sleeps.reduce((s, [a, z]) => s + Math.max(0, Math.min(z, end) - Math.max(a, d0)), 0),
    ml: feeds.reduce((s, e) => s + (e.ml || 0), 0),
    breastMin: feeds.reduce((s, e) => s + (e.left_min || 0) + (e.right_min || 0), 0),
    pumpMl: pumps.reduce((s, e) => s + e.ml, 0),
    poo: dia.filter(e => e.poo).length,
  };
}

// "Como foram os dias": uma linha por dia, de 0h a 24h, com hoje no alto.
function routineChart(all, sleeps, now, show, k) {
  const today = startOfDay(now);
  const W = 360, LW = 58, CW = W - LW - 6, RH = 28, TOP = 20, H = TOP + all.length * RH + 2;
  const x = f => +(LW + f * CW).toFixed(1);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="group" aria-label="Como foram os dias, de 0h a 24h">`;
  for (const h of [0, 6, 12, 18, 24])
    s += `<line class="gl" x1="${x(h / 24)}" x2="${x(h / 24)}" y1="${TOP - 4}" y2="${H}"/><text class="ax" x="${x(h / 24)}" y="${TOP - 8}" text-anchor="${h === 0 ? 'start' : h === 24 ? 'end' : 'middle'}">${h}h</text>`;
  all.slice().reverse().forEach((d, i) => {
    const y = TOP + i * RH, mid = y + RH / 2, end = Math.min(d.d1, now);
    const f = t => (t - d.d0) / (d.d1 - d.d0);   // parte do dia, de 0 a 1
    s += `<g class="dayrow" data-day="${d.d0}" tabindex="0" role="button" aria-label="Abrir ${esc(dayTitle(d.d0))}"><rect class="hit" x="0" y="${y}" width="${W}" height="${RH}" rx="6"/>`;
    s += `<text class="dl" x="4" y="${mid + 4}">${d.d0 === today ? 'hoje' : shortDay(d.d0)}</text><line class="base" x1="${LW}" x2="${LW + CW}" y1="${mid}" y2="${mid}"/>`;
    if (show.sleep !== false) for (const [a, z] of sleeps) {
      const A = Math.max(a, d.d0), Z = Math.min(z, end);
      if (Z > A) s += `<rect class="m-sleep" x="${x(f(A))}" y="${y + 7}" width="${Math.max(1.5, (f(Z) - f(A)) * CW).toFixed(1)}" height="${RH - 14}" rx="3"/>`;
    }
    for (const e of d.day) {
      const cx = x(f(e.t));
      if (e.kind === 'feed' && show.feed !== false) s += `<circle class="m-feed" cx="${cx}" cy="${mid}" r="3.6"/>`;
      // Fralda: o mesmo ponto verde. Com cocô, ganha um miolo marrom.
      if (e.kind === 'diaper' && show.diaper !== false) {
        s += `<circle class="m-diaper dot" cx="${cx}" cy="${y + RH - 4.3}" r="4"/>`;
        if (e.poo) s += `<circle class="m-poo dot" cx="${cx}" cy="${y + RH - 4.3}" r="2.4"/>`;
      }
      const t = topKind(e, k);
      if (t && show[t] !== false) s += TOP_MARK[t](cx, y + 3.8, 2.6);
    }
    if (d.d0 === today) s += `<line class="now" x1="${x(f(now))}" x2="${x(f(now))}" y1="${y + 3}" y2="${y + RH - 3}"/>`;
    s += '</g>';
  });
  return s + '</svg>';
}

// "Como foi o dia": o dia aberto numa linha só, com as mesmas marcas do painel da semana, um pouco
// maiores. A contagem vai embaixo. Tocar numa marca abre o registro. on: se a família usa o botão.
export function dayLine({ d0, evs, sleeps, now, on }) {
  const k = shownKinds(on);
  const d1 = addDays(d0, 1), end = Math.min(d1, now), day = evs.filter(e => e.t >= d0 && e.t < d1);
  const K = 1.45, RH = 50, W = 360, LW = 8, CW = W - 2 * LW, TOP = 16, H = TOP + RH + 4, y = TOP, mid = y + RH / 2;
  const x = t => +(LW + (t - d0) / (d1 - d0) * CW).toFixed(1);
  const mark = (e, shape) => `<g class="mk" data-id="${esc(e.id)}"><circle class="hit" cx="${x(e.t)}" cy="${mid}" r="12"/>${shape}<title>${esc(hm(e.t) + ' · ' + [label(e, evs), detail(e)].filter(Boolean).join(' · '))}</title></g>`;
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="group" aria-label="Como foi o dia, de 0h a 24h">`;
  for (const h of [0, 6, 12, 18, 24]) {
    const hx = x(d0 + h / 24 * (d1 - d0));
    s += `<line class="gl" x1="${hx}" x2="${hx}" y1="${TOP - 4}" y2="${H}"/><text class="ax" x="${hx}" y="${TOP - 6}" text-anchor="${h === 0 ? 'start' : h === 24 ? 'end' : 'middle'}">${h}h</text>`;
  }
  s += `<line class="base" x1="${LW}" x2="${LW + CW}" y1="${mid}" y2="${mid}"/>`;
  let slept = 0;
  for (const [a, z] of sleeps) {
    const A = Math.max(a, d0), Z = Math.min(z, end); if (Z <= A) continue;
    slept += Z - A;
    s += `<rect class="m-sleep" x="${x(A)}" y="${(y + 7 * K).toFixed(1)}" width="${Math.max(2, x(Z) - x(A)).toFixed(1)}" height="${(RH - 14 * K).toFixed(1)}" rx="3"><title>${esc('Sono das ' + hm(A) + ' às ' + hm(Z) + ' · ' + dur(Z - A))}</title></rect>`;
  }
  const dy = (y + RH - 4.3 * K).toFixed(1), top = y + 3.8 * K;
  for (const e of day) {
    const cx = x(e.t);
    if (e.kind === 'feed') s += mark(e, `<circle class="m-feed" cx="${cx}" cy="${mid}" r="${(3.6 * K).toFixed(1)}"/>`);
    if (e.kind === 'diaper') s += mark(e, `<circle class="m-diaper dot" cx="${cx}" cy="${dy}" r="${(4 * K).toFixed(1)}"/>` + (e.poo ? `<circle class="m-poo dot" cx="${cx}" cy="${dy}" r="${(2.4 * K).toFixed(1)}"/>` : ''));
    const t = topKind(e, k);
    if (t) s += mark(e, TOP_MARK[t](cx, top, 2.6 * K));
  }
  if (d0 === startOfDay(now)) s += `<line class="now" x1="${x(now)}" x2="${x(now)}" y1="${TOP - 2}" y2="${H - 2}"/>`;
  s += '</svg>';
  const n = f => day.filter(f).length, pump = day.filter(e => e.kind === 'pump');
  // Volume: só das mamadeiras (mamada no peito não tem ml).
  const ml = day.reduce((a, e) => a + (e.kind === 'feed' && e.ml || 0), 0);
  const key = shape => `<svg viewBox="0 0 12 12" aria-hidden="true">${shape}</svg>`;
  const items = [
    [key('<rect class="m-sleep" x="0" y="3" width="12" height="6" rx="2"/>'), 'Sono', dur(slept)],
    [key('<circle class="m-feed" cx="6" cy="6" r="5"/>'), 'Mamadas', n(e => e.kind === 'feed') + (ml ? ' · ' + ml + ' ml' : '')],
    [key('<circle class="m-diaper" cx="6" cy="6" r="5"/>'), 'Xixi', n(e => e.kind === 'diaper' && e.pee)],
    [key('<circle class="m-diaper" cx="6" cy="6" r="5"/><circle class="m-poo" cx="6" cy="6" r="3"/>'), 'Cocô', n(e => e.kind === 'diaper' && e.poo)],
  ];
  if (k.pump) items.push([key(TOP_MARK.pump(6, 6, 5)), 'Ordenha', pump.reduce((a, e) => a + e.ml, 0) + ' ml']);
  if (k.symptom) items.push([key(TOP_MARK.symptom(6, 6, 4.6)), 'Sintomas', n(e => topKind(e, k) === 'symptom')]);
  if (k.med) items.push([key(TOP_MARK.med(6, 6, 5)), 'Remédio', n(e => topKind(e, k) === 'med')]);
  if (k.care) items.push([key(TOP_MARK.care(6, 6, 4.6)), 'Cuidados', n(e => topKind(e, k) === 'care')]);
  return `<div class="svgbox">${s}</div><div class="lgd day">${items.map(([i, t, v]) => `<span>${i}<em>${t}</em> ${esc(String(v))}</span>`).join('')}</div>`;
}

// "Dia a dia": hoje fica mais claro, porque ainda não terminou.
function barChart(all, now, metric) {
  const m = METRICS[metric], today = startOfDay(now);
  const W = 340, H = 150, TOP = 20, BOT = 32, PH = H - TOP - BOT, slot = W / all.length, bw = slot * .56;
  const vals = all.map(m.val), max = Math.max(1, ...vals);
  const aria = all.map((d, i) => shortDay(d.d0) + ' ' + m.fmt(vals[i]) + (m.sub ? ', ' + m.sub(d) + ' com cocô' : '')).join('; ');
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(m.name)} por dia: ${esc(aria)}"><line class="base" x1="0" x2="${W}" y1="${TOP + PH}" y2="${TOP + PH}"/>`;
  all.forEach((d, i) => {
    const v = vals[i], h = v / max * PH, bx = i * slot + (slot - bw) / 2, cx = i * slot + slot / 2, isToday = d.d0 === today;
    const X = bx.toFixed(1), BW = bw.toFixed(1);
    let bar = '', inner = '';
    if (h > 0) bar += `<rect class="${m.cls}" x="${X}" y="${(TOP + PH - h).toFixed(1)}" width="${BW}" height="${h.toFixed(1)}" rx="4"/>`;
    // A parte de baixo, com o topo reto quando há barra acima; o número vai dentro se couber.
    const p = m.sub ? m.sub(d) : 0, hp = p / max * PH;
    if (hp > 0) {
      bar += `<rect class="${m.subCls}" x="${X}" y="${(TOP + PH - hp).toFixed(1)}" width="${BW}" height="${hp.toFixed(1)}" rx="4"/>`;
      if (hp < h) bar += `<rect class="${m.subCls}" x="${X}" y="${(TOP + PH - hp).toFixed(1)}" width="${BW}" height="${Math.min(4, hp / 2).toFixed(1)}"/>`;
      if (hp >= 15 && !isToday) inner = `<text class="vi" x="${cx.toFixed(1)}" y="${(TOP + PH - hp / 2 + 3.5).toFixed(1)}" text-anchor="middle">${p}</text>`;
    }
    // Hoje fica mais claro de uma vez só, para as duas partes não se somarem.
    s += (isToday && bar ? `<g class="part">${bar}</g>` : bar) + inner;
    s += `<text class="vl" x="${cx.toFixed(1)}" y="${(TOP + PH - h - 5).toFixed(1)}" text-anchor="middle">${esc(m.fmt(v))}</text>`;
    const dt = new Date(d.d0);
    s += `<text class="ax" x="${cx.toFixed(1)}" y="${H - 17}" text-anchor="middle">${isToday ? 'hoje' : DIAS[dt.getDay()].toLowerCase()}</text><text class="ax" x="${cx.toFixed(1)}" y="${H - 4}" text-anchor="middle">${dt.getDate()}</text>`;
  });
  return s + '</svg>';
}

const nf = v => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const span = ([a, z]) => dur(z - a) + ' · ' + shortDay(startOfDay(a)) + ', das ' + hm(a) + ' às ' + hm(z);
// Intervalo que pode passar de um dia: "1 dia e 5h · de seg 21, 07:30 a ter 22, 12:40".
function durLong(ms) {
  const m = Math.round(ms / MIN); if (m < 24 * 60) return dur(ms);
  const d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60);
  return (d === 1 ? '1 dia' : d + ' dias') + (h ? ' e ' + h + 'h' : '');
}
const spanLong = ([a, z]) => startOfDay(a) === startOfDay(z) ? span([a, z])
  : durLong(z - a) + ' · de ' + shortDay(startOfDay(a)) + ', ' + hm(a) + ' a ' + shortDay(startOfDay(z)) + ', ' + hm(z);
// "Os maiores sonos": os 3 sonos mais longos que começaram nestes dias e, para cada um, a última
// mamada e o último cocô registrados antes de dormir. Só põe lado a lado; não tira conclusão.
function before(list, t) { let b = null; for (const e of list) { if (e.t >= t) break; b = e; } return b; }
const agoFrom = (e, t) => startOfDay(e.t) === startOfDay(t) ? hm(e.t) : shortDay(startOfDay(e.t)) + ', ' + hm(e.t);
function longSleeps(sleeps, evs, a, z) {
  const top = sleeps.filter(([s0]) => s0 >= a && s0 < z).sort((x, y) => (y[1] - y[0]) - (x[1] - x[0])).slice(0, 3);
  if (!top.length) return '';
  const feeds = evs.filter(e => e.kind === 'feed'), poos = evs.filter(e => e.kind === 'diaper' && e.poo);
  const line = (k, what, e, s0, more = '') => `<span class="ln"><i style="--sw:var(${k})"></i><span><em>${what}:</em> ${e
    ? esc(agoFrom(e, s0) + ', ' + durLong(s0 - e.t) + ' antes' + more) : 'sem registro antes'}</span></span>`;
  return `<div class="card"><h3>Os maiores sonos e o que veio antes</h3><p class="cap">Os 3 sonos mais longos destes 7 dias, com a última mamada e o último cocô registrados antes de dormir. Toque para ver o dia.</p>
    <div class="ls">${top.map(iv => `<button class="lsi" data-open="${startOfDay(iv[0])}"><b>${esc(span(iv))}</b>
      ${(f => line('--c-feed', 'Última mamada', f, iv[0], f ? ' · ' + label(f, evs) : ''))(before(feeds, iv[0]))}${line('--c-poo', 'Último cocô', before(poos, iv[0]), iv[0])}</button>`).join('')}</div>
    <p class="foot">Mostra só o que foi registrado antes de cada sono. Não tira conclusão sobre o que fez dormir mais.</p></div>`;
}

const LGD_DIAPER = '<div class="lgd"><span><svg viewBox="0 0 12 12" aria-hidden="true"><circle class="m-diaper dot" cx="6" cy="6" r="5"/></svg>fralda só xixi</span>'
  + '<span><svg viewBox="0 0 12 12" aria-hidden="true"><circle class="m-diaper dot" cx="6" cy="6" r="5"/><circle class="m-poo dot" cx="6" cy="6" r="3"/></svg>fralda com cocô</span></div>';

// end: último dia dos 7 (início do dia). sleep: o que sleepIntervals devolve.
export function weekHtml({ end, evs, sleep, now, show, metric, on }) {
  const k = shownKinds(on);
  if (!k[metric]) metric = 'sleep';
  const today = startOfDay(now), a = addDays(end, -6), z = Math.min(addDays(end, 1), now);
  const sleeps = sleep.open === null ? sleep.out : [...sleep.out, [sleep.open, now]];
  const all = []; for (let d = a; d <= end; d = addDays(d, 1)) all.push(dayStats(d, evs, sleeps, now));
  if (all.every(d => !d.day.length && !d.slept)) return '<div class="card"><div class="empty">Nada registrado nestes 7 dias.</div></div>';

  // Média: só dias que já terminaram e têm algum registro (dia sem nada anotado não é dia sem mamada).
  const done = all.filter(d => d.d0 < today), full = done.filter(d => d.day.length), n = full.length, hasToday = done.length < all.length;
  const avg = f => full.reduce((s, d) => s + f(d), 0) / n;
  const cap = n === done.length ? (hasToday ? 'Sem contar hoje, que ainda não terminou.' : '')
    : (n ? `Só dos ${n} ${n === 1 ? 'dia' : 'dias'} com registros` : 'Nenhum dia com registros para a média') + (hasToday ? ', sem contar hoje.' : '.');

  // Destaques: o sono é do dia em que começou; o intervalo, do dia do registro que o encerrou.
  const longest = sleep.out.filter(([s0]) => s0 >= a && s0 < z).reduce((b, iv) => !b || iv[1] - iv[0] > b[1] - b[0] ? iv : b, null);
  const gapOf = list => {
    let g = null;
    for (let i = 1; i < list.length; i++) {
      const p = list[i - 1].t, q = list[i].t;
      if (q >= a && q < z && (!g || q - p > g[1] - g[0])) g = [p, q];
    }
    return g;
  };
  const gap = gapOf(evs.filter(e => e.kind === 'feed')), pooGap = gapOf(evs.filter(e => e.kind === 'diaper' && e.poo));
  const sides = { left: 0, right: 0, both: 0 }; for (const d of all) for (const e of d.feeds) if (e.side) sides[e.side]++;
  const pumps = all.reduce((s, d) => s + d.pumps.length, 0), pumpMl = all.reduce((s, d) => s + d.pumpMl, 0);

  const tile = (c, k, big, sub) => `<div class="tile" style="--sw:var(${c})"><span class="k"><i></i>${k}</span><b>${n ? big : '—'}</b><span>${n ? sub : ''}</span></div>`;
  const feedSub = [avg(d => d.breastMin) >= 1 ? dur(avg(d => d.breastMin) * MIN) + ' no peito' : '',
                   avg(d => d.ml) >= 1 ? Math.round(avg(d => d.ml)) + ' ml na mamadeira' : ''].filter(Boolean).join(' · ');

  let h = `<div class="card"><h3>Como foram os dias</h3><p class="cap">Cada linha é um dia, de 0h a 24h. Toque num dia para ver os registros.</p>
    <div class="flts">${FILTERS.filter(([f]) => k[f]).map(([f, t, c]) => `<button class="flt" data-flt="${f}" aria-pressed="${show[f] !== false}" style="--sw:var(${c})"><i></i>${t}</button>`).join('')}</div>
    <div class="svgbox">${routineChart(all, sleeps, now, show, k)}</div>${show.diaper !== false ? LGD_DIAPER : ''}</div>`;

  h += `<div class="card"><h3>Média por dia</h3>${cap ? `<p class="cap">${cap}</p>` : ''}<div class="tiles">
    ${tile('--c-sleep', 'Sono', dur(avg(d => d.slept)), 'maior sono seguido: ' + (longest ? dur(longest[1] - longest[0]) : '—'))}
    ${tile('--c-feed', 'Mamadas', nf(avg(d => d.feeds.length)), feedSub)}
    ${tile('--c-diaper', 'Fraldas', nf(avg(d => d.dia.length)), nf(avg(d => d.poo)) + ' com cocô')}
    ${k.pump ? tile('--c-pump', 'Ordenhas', nf(avg(d => d.pumps.length)), Math.round(avg(d => d.pumpMl)) + ' ml por dia') : ''}
  </div></div>`;

  h += `<div class="card"><h3>Dia a dia</h3><div class="mets">${Object.entries(METRICS).filter(([m]) => k[m]).map(([m, v]) => `<button class="met" data-met="${m}" aria-pressed="${metric === m}">${v.name}</button>`).join('')}</div>
    <div class="svgbox">${barChart(all, now, metric)}</div>
    ${METRICS[metric].sub ? '<div class="lgd"><span style="--sw:var(--c-poo)"><i></i>com cocô</span><span style="--sw:var(--c-diaper)"><i></i>só xixi</span></div>' : ''}${hasToday ? '<p class="foot">A barra mais clara é hoje, até agora.</p>' : ''}</div>`;

  h += `<div class="card"><h3>Nestes 7 dias</h3><div class="hl">
    <div><b>Maior sono seguido</b><span>${longest ? span(longest) : '—'}</span></div>
    <div><b>Maior intervalo entre mamadas</b><span>${gap ? span(gap) : '—'}</span></div>
    <div><b>Maior intervalo entre cocôs</b><span>${pooGap ? spanLong(pooGap) : '—'}</span></div>
    <div><b>Peito nas mamadas</b><span>${sides.left + sides.right + sides.both ? `esquerdo ${sides.left}× · direito ${sides.right}× · os dois ${sides.both}×` : '—'}</span></div>
    ${k.pump ? `<div><b>Ordenhas</b><span>${pumps ? `${pumps} ${pumps === 1 ? 'ordenha' : 'ordenhas'} · ${pumpMl} ml no total` : '—'}</span></div>` : ''}
  </div><p class="foot">O painel só junta o que foi registrado. Não avalia nem compara com outros bebês.</p></div>`;
  h += longSleeps(sleep.out, evs, a, z);
  return h;
}
