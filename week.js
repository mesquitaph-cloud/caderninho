// Painel da semana: os 7 dias que terminam no dia escolhido.
// Só junta o que foi registrado: não avalia nem compara com outros bebês.
import { MIN, startOfDay, addDays, hm, dur, esc, dayTitle, shortDay, DIAS } from './util.js';

// "Dia a dia": uma barra por dia do que estiver escolhido.
export const METRICS = {
  sleep:  { name: 'Sono',     cls: 'm-sleep',  val: s => s.slept,        fmt: v => dur(v) },
  feed:   { name: 'Mamadas',  cls: 'm-feed',   val: s => s.feeds.length, fmt: String },
  diaper: { name: 'Fraldas',  cls: 'm-diaper', val: s => s.dia.length,   fmt: String },
  pump:   { name: 'Ordenhas', cls: 'm-pump',   val: s => s.pumpMl,       fmt: v => v ? v + ' ml' : '0' },
};
const FILTERS = [['sleep', 'Sono', '--c-sleep'], ['feed', 'Mamada', '--c-feed'], ['diaper', 'Fralda', '--c-diaper'], ['pump', 'Ordenha', '--c-pump']];

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
function routineChart(all, sleeps, now, show) {
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
    if (show.sleep) for (const [a, z] of sleeps) {
      const A = Math.max(a, d.d0), Z = Math.min(z, end);
      if (Z > A) s += `<rect class="m-sleep" x="${x(f(A))}" y="${y + 7}" width="${Math.max(1.5, (f(Z) - f(A)) * CW).toFixed(1)}" height="${RH - 14}" rx="3"/>`;
    }
    for (const e of d.day) {
      const cx = x(f(e.t));
      if (e.kind === 'feed' && show.feed) s += `<circle class="m-feed" cx="${cx}" cy="${mid}" r="3.6"/>`;
      if (e.kind === 'diaper' && show.diaper) s += `<circle class="m-diaper" cx="${cx}" cy="${y + RH - 3.5}" r="2.3"/>`;
      if (e.kind === 'pump' && show.pump) s += `<rect class="m-pump" x="${(cx - 2.6).toFixed(1)}" y="${y + 1.2}" width="5.2" height="5.2" rx="1"/>`;
    }
    if (d.d0 === today) s += `<line class="now" x1="${x(f(now))}" x2="${x(f(now))}" y1="${y + 3}" y2="${y + RH - 3}"/>`;
    s += '</g>';
  });
  return s + '</svg>';
}

// "Dia a dia": hoje fica mais claro, porque ainda não terminou.
function barChart(all, now, metric) {
  const m = METRICS[metric], today = startOfDay(now);
  const W = 340, H = 150, TOP = 20, BOT = 32, PH = H - TOP - BOT, slot = W / all.length, bw = slot * .56;
  const vals = all.map(m.val), max = Math.max(1, ...vals);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(m.name)} por dia: ${esc(all.map((d, i) => shortDay(d.d0) + ' ' + m.fmt(vals[i])).join(', '))}"><line class="base" x1="0" x2="${W}" y1="${TOP + PH}" y2="${TOP + PH}"/>`;
  all.forEach((d, i) => {
    const v = vals[i], h = v / max * PH, bx = i * slot + (slot - bw) / 2, cx = i * slot + slot / 2, isToday = d.d0 === today;
    if (h > 0) s += `<rect class="${m.cls}${isToday ? ' part' : ''}" x="${bx.toFixed(1)}" y="${(TOP + PH - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="4"/>`;
    s += `<text class="vl" x="${cx.toFixed(1)}" y="${(TOP + PH - h - 5).toFixed(1)}" text-anchor="middle">${esc(m.fmt(v))}</text>`;
    const dt = new Date(d.d0);
    s += `<text class="ax" x="${cx.toFixed(1)}" y="${H - 17}" text-anchor="middle">${isToday ? 'hoje' : DIAS[dt.getDay()].toLowerCase()}</text><text class="ax" x="${cx.toFixed(1)}" y="${H - 4}" text-anchor="middle">${dt.getDate()}</text>`;
  });
  return s + '</svg>';
}

const nf = v => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const span = ([a, z]) => dur(z - a) + ' · ' + shortDay(startOfDay(a)) + ', das ' + hm(a) + ' às ' + hm(z);

// end: último dia dos 7 (início do dia). sleep: o que sleepIntervals devolve.
export function weekHtml({ end, evs, sleep, now, show, metric }) {
  const today = startOfDay(now), a = addDays(end, -6), z = Math.min(addDays(end, 1), now);
  const sleeps = sleep.open === null ? sleep.out : [...sleep.out, [sleep.open, now]];
  const all = []; for (let d = a; d <= end; d = addDays(d, 1)) all.push(dayStats(d, evs, sleeps, now));
  if (all.every(d => !d.day.length && !d.slept)) return '<div class="card"><div class="empty">Nada registrado nestes 7 dias.</div></div>';

  // Média: só dias que já terminaram e têm algum registro (dia sem nada anotado não é dia sem mamada).
  const done = all.filter(d => d.d0 < today), full = done.filter(d => d.day.length), n = full.length, hasToday = done.length < all.length;
  const avg = f => full.reduce((s, d) => s + f(d), 0) / n;
  const cap = n === done.length ? (hasToday ? 'Sem contar hoje, que ainda não terminou.' : '')
    : (n ? `Só dos ${n} ${n === 1 ? 'dia' : 'dias'} com registros` : 'Nenhum dia com registros para a média') + (hasToday ? ', sem contar hoje.' : '.');

  // Destaques: o sono é do dia em que começou; o intervalo, do dia da mamada que o encerrou.
  const longest = sleep.out.filter(([s0]) => s0 >= a && s0 < z).reduce((b, iv) => !b || iv[1] - iv[0] > b[1] - b[0] ? iv : b, null);
  const feeds = evs.filter(e => e.kind === 'feed'); let gap = null;
  for (let i = 1; i < feeds.length; i++) {
    const p = feeds[i - 1].t, q = feeds[i].t;
    if (q >= a && q < z && (!gap || q - p > gap[1] - gap[0])) gap = [p, q];
  }
  const sides = { left: 0, right: 0, both: 0 }; for (const d of all) for (const e of d.feeds) if (e.side) sides[e.side]++;
  const pumps = all.reduce((s, d) => s + d.pumps.length, 0), pumpMl = all.reduce((s, d) => s + d.pumpMl, 0);

  const tile = (c, k, big, sub) => `<div class="tile" style="--sw:var(${c})"><span class="k"><i></i>${k}</span><b>${n ? big : '—'}</b><span>${n ? sub : ''}</span></div>`;
  const feedSub = [avg(d => d.breastMin) >= 1 ? dur(avg(d => d.breastMin) * MIN) + ' no peito' : '',
                   avg(d => d.ml) >= 1 ? Math.round(avg(d => d.ml)) + ' ml na mamadeira' : ''].filter(Boolean).join(' · ');

  let h = `<div class="card"><h3>Como foram os dias</h3><p class="cap">Cada linha é um dia, de 0h a 24h. Toque num dia para ver os registros.</p>
    <div class="flts">${FILTERS.map(([k, t, c]) => `<button class="flt" data-flt="${k}" aria-pressed="${show[k]}" style="--sw:var(${c})"><i></i>${t}</button>`).join('')}</div>
    <div class="svgbox">${routineChart(all, sleeps, now, show)}</div></div>`;

  h += `<div class="card"><h3>Média por dia</h3>${cap ? `<p class="cap">${cap}</p>` : ''}<div class="tiles">
    ${tile('--c-sleep', 'Sono', dur(avg(d => d.slept)), 'maior sono seguido: ' + (longest ? dur(longest[1] - longest[0]) : '—'))}
    ${tile('--c-feed', 'Mamadas', nf(avg(d => d.feeds.length)), feedSub)}
    ${tile('--c-diaper', 'Fraldas', nf(avg(d => d.dia.length)), nf(avg(d => d.poo)) + ' com cocô')}
    ${tile('--c-pump', 'Ordenhas', nf(avg(d => d.pumps.length)), Math.round(avg(d => d.pumpMl)) + ' ml por dia')}
  </div></div>`;

  h += `<div class="card"><h3>Dia a dia</h3><div class="mets">${Object.entries(METRICS).map(([k, m]) => `<button class="met" data-met="${k}" aria-pressed="${metric === k}">${m.name}</button>`).join('')}</div>
    <div class="svgbox">${barChart(all, now, metric)}</div>${hasToday ? '<p class="foot">A barra mais clara é hoje, até agora.</p>' : ''}</div>`;

  h += `<div class="card"><h3>Nestes 7 dias</h3><div class="hl">
    <div><b>Maior sono seguido</b><span>${longest ? span(longest) : '—'}</span></div>
    <div><b>Maior intervalo entre mamadas</b><span>${gap ? span(gap) : '—'}</span></div>
    <div><b>Peito nas mamadas</b><span>${sides.left + sides.right + sides.both ? `esquerdo ${sides.left}× · direito ${sides.right}× · os dois ${sides.both}×` : '—'}</span></div>
    <div><b>Ordenhas</b><span>${pumps ? `${pumps} ${pumps === 1 ? 'ordenha' : 'ordenhas'} · ${pumpMl} ml no total` : '—'}</span></div>
  </div><p class="foot">O painel só junta o que foi registrado. Não avalia nem compara com outros bebês.</p></div>`;
  return h;
}
