// Relatório para pediatra: o que a família leva à consulta, numa folha A4 que vira PDF pelo imprimir
// do celular, e o mesmo em texto para copiar. Só junta o que foi registrado; não avalia o bebê nem
// compara com outros bebês. A folha é sempre clara, mesmo com o app no escuro.
import { MIN, HOUR, DAY, startOfDay, addDays, hm, dur, esc, ageText, label } from './util.js';
import { kg } from './growth.js';

const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const DIA = ['dom','seg','ter','qua','qui','sex','sáb'];
const p2 = n => String(n).padStart(2, '0');
const ddmm = t => { const d = new Date(t); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1); };
const ymdDdmm = ymd => ymd.slice(8, 10) + '/' + ymd.slice(5, 7);
const ymdFull = ymd => ymdDdmm(ymd) + '/' + ymd.slice(0, 4);
const n1 = v => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
// "2h05" vira "2 h 05" na folha, mais fácil de ler impresso; de 24 h para cima, só as horas ("26 h").
const hours = ms => ms >= DAY ? Math.round(ms / HOUR) + ' h' : dur(ms).replace(/^(\d+)h(\d\d)$/, '$1 h $2').replace(/ h 00$/, ' h');
const ageAt = (birth, ymd) => !birth || ymd < birth ? '' : ymd === birth ? 'ao nascer' : ageText(birth, ymd);

// "18 de setembro a 1 de outubro" ou "18 a 30 de setembro".
export function periodTitle(a, z) {
  const A = new Date(a), Z = new Date(z);
  return A.getMonth() === Z.getMonth() ? A.getDate() + ' a ' + Z.getDate() + ' de ' + MESES[Z.getMonth()]
    : A.getDate() + ' de ' + MESES[A.getMonth()] + ' a ' + Z.getDate() + ' de ' + MESES[Z.getMonth()];
}
export const periodShort = (a, z) => {
  const A = new Date(a), Z = new Date(z);
  return A.getMonth() === Z.getMonth() ? A.getDate() + ' a ' + Z.getDate() + ' ' + MES[Z.getMonth()]
    : A.getDate() + ' ' + MES[A.getMonth()] + ' a ' + Z.getDate() + ' ' + MES[Z.getMonth()];
};

// Os números do período [a, hoje]. A média por dia é dos dias que já terminaram e têm algum
// registro: hoje não entra, e dia sem nada anotado também não.
export function reportStats({ a, now, evs, sleeps, on }) {
  const today = startOfDay(now), days = [];
  for (let d = a; d <= today; d = addDays(d, 1)) days.push(d);
  const inP = evs.filter(e => e.t >= a && e.t <= now);
  const full = days.filter(d => d < today && evs.some(e => e.t >= d && e.t < addDays(d, 1)));
  const inFull = e => full.some(d => e.t >= d && e.t < addDays(d, 1));
  const fe = evs.filter(e => inFull(e)), n = full.length;
  const feeds = fe.filter(e => e.kind === 'feed'), bottles = feeds.filter(e => e.src === 'bottle');
  const bottleMl = bottles.reduce((s, e) => s + (e.ml || 0), 0), bottlesMl = bottles.filter(e => e.ml);
  const slept = full.reduce((s, d) => s + sleeps.reduce((x, [p, q]) => x + Math.max(0, Math.min(q, addDays(d, 1)) - Math.max(p, d)), 0), 0);
  // Maior sono seguido: contado no dia em que começou.
  const longest = sleeps.filter(([p]) => p >= a && p <= now).reduce((b, iv) => !b || iv[1] - iv[0] > b[1] - b[0] ? iv : b, null);
  // Maior intervalo entre cocôs: contado no dia da fralda que o encerrou.
  const poos = evs.filter(e => e.kind === 'diaper' && e.poo);
  let gap = null;
  poos.forEach((e, i) => { if (i && e.t >= a && e.t <= now && (!gap || e.t - poos[i - 1].t > gap.ms)) gap = { ms: e.t - poos[i - 1].t, end: e.t }; });
  const dia = fe.filter(e => e.kind === 'diaper');
  return {
    days, full: n, any: inP.length > 0,
    avg: !n ? null : {
      feeds: feeds.length / n, breast: feeds.filter(e => e.src !== 'bottle').length / n, bottles: bottles.length / n,
      bottleMl: bottleMl / n, perBottle: bottlesMl.length ? bottleMl / bottlesMl.length : 0,
      breastMin: feeds.reduce((s, e) => s + (e.left_min || 0) + (e.right_min || 0), 0) / n,
      slept: slept / n, diapers: dia.length / n, poos: dia.filter(e => e.poo).length / n,
      pumpMl: on('pump') ? fe.filter(e => e.kind === 'pump').reduce((s, e) => s + e.ml, 0) / n : 0,
    },
    longest, gap,
    symptoms: inP.filter(e => e.kind === 'symptom' || e.kind === 'vomit'),
    meds: medGroups(inP.filter(e => e.kind === 'med')),
  };
}

// Doses do período, por remédio: dadas, puladas e, se forem poucas, quando.
function medGroups(es) {
  const by = new Map();
  for (const e of es) {
    const k = e.medicine_id || 'nome:' + e.med_name;
    if (!by.has(k)) by.set(k, { id: e.medicine_id, name: e.med_name, amount: e.med_amount, given: [], skipped: [] });
    const g = by.get(k); g.name = e.med_name; g.amount = e.med_amount || g.amount;
    (e.skipped ? g.skipped : g.given).push(e.t);
  }
  return [...by.values()];
}

/* ---------- gráficos da folha ---------- */
// Peso: um ponto por pesagem, ligados no tempo, com o valor em cada ponto.
function weightSvg(ws) {
  const W = 360, H = 190, L = 34, R = 26, T = 22, B = 26, P = 16;
  const tOf = w => new Date(w.measured_on + 'T12:00').getTime();
  const t0 = tOf(ws[0]), t1 = Math.max(tOf(ws.at(-1)), t0 + 7 * DAY);
  const x = t => +(L + P + (W - L - R - P) * (t - t0) / (t1 - t0)).toFixed(1);
  const gs = ws.map(w => w.grams), step = Math.max(...gs) - Math.min(...gs) > 3000 ? 1000 : 500;
  const lo = Math.floor(Math.min(...gs) / step) * step - (Math.min(...gs) % step < step * .4 ? step : 0), hi = Math.ceil(Math.max(...gs) / step) * step;
  const y = g => +(T + (H - T - B) * (hi - g) / (hi - lo)).toFixed(1);
  let s = `<svg class="rp-w" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Peso de ${kg(ws[0].grams)} em ${ymdDdmm(ws[0].measured_on)} a ${kg(ws.at(-1).grams)} em ${ymdDdmm(ws.at(-1).measured_on)}`)}">`;
  for (let g = lo; g <= hi; g += step) s += `<line class="rp-gl" x1="${L}" x2="${W - R + 10}" y1="${y(g)}" y2="${y(g)}"/><text class="rp-ax" x="${L - 6}" y="${y(g) + 3}" text-anchor="end">${(g / 1000).toLocaleString('pt-BR')}</text>`;
  s += `<text class="rp-ax" x="${L - 6}" y="${T - 10}" text-anchor="end">kg</text>`;
  // Embaixo: os meses, ou o dia de cada pesagem quando são poucas semanas.
  const months = [];
  for (let d = new Date(new Date(t0).getFullYear(), new Date(t0).getMonth() + 1, 1); d.getTime() <= t1; d.setMonth(d.getMonth() + 1)) months.push(d.getTime());
  const ticks = months.length >= 2 ? months.map(t => [t, MES[new Date(t).getMonth()]]) : ws.map(w => [tOf(w), ymdDdmm(w.measured_on)]);
  let lastX = -99;
  for (const [t, txt] of ticks) {
    if (x(t) - lastX < 34) continue; lastX = x(t);
    s += `<line class="rp-gl" x1="${x(t)}" x2="${x(t)}" y1="${H - B}" y2="${H - B + 4}"/><text class="rp-ax" x="${x(t)}" y="${H - 8}" text-anchor="middle">${txt}</text>`;
  }
  s += `<polyline class="rp-wl" points="${ws.map(w => x(tOf(w)) + ',' + y(w.grams)).join(' ')}"/>`;
  // O valor vai em cima do ponto; quando o ponto desce e está perto do anterior, vai embaixo.
  let prev = null;
  for (const w of ws) {
    const px = x(tOf(w)), py = y(w.grams);
    const below = prev && px - prev.x < 34 && py > prev.y;
    s += `<circle class="rp-wp" cx="${px}" cy="${py}" r="4.5"/>`;
    if (!prev || px - prev.x >= 26 || below) s += `<text class="rp-wv" x="${px}" y="${below ? py + 17 : py - 9}" text-anchor="middle">${(w.grams / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</text>`;
    prev = { x: px, y: py };
  }
  return s + '</svg>';
}

// Como foram os dias: uma linha por dia, de 0h a 24h. Sono, mamadas, fraldas (com cocô, o miolo
// marrom) e sintomas. Dia sem nada anotado fica em branco.
function daysSvg(days, evs, sleeps, now) {
  const W = 720, L = 62, R = 10, T = 18, RH = 20, H = T + days.length * RH + 6;
  const today = startOfDay(now);
  let s = `<svg class="rp-days" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sono, mamadas, fraldas e sintomas em cada dia, de 0h a 24h">`;
  for (const h of [0, 6, 12, 18, 24]) {
    const hx = +(L + (W - L - R) * h / 24).toFixed(1);
    s += `<line class="rp-gl" x1="${hx}" x2="${hx}" y1="${T - 4}" y2="${H - 4}"/><text class="rp-ax" x="${hx}" y="${T - 7}" text-anchor="${h === 0 ? 'start' : h === 24 ? 'end' : 'middle'}">${h}h</text>`;
  }
  days.forEach((d0, i) => {
    const d1 = addDays(d0, 1), end = Math.min(d1, now), y = T + i * RH, cy = y + RH / 2;
    const x = t => +(L + (W - L - R) * (t - d0) / (d1 - d0)).toFixed(1);
    s += `<text class="rp-dl" x="0" y="${cy + 3.5}">${d0 === today ? 'hoje' : DIA[new Date(d0).getDay()] + ' ' + ddmm(d0)}</text>`;
    for (const [p, q] of sleeps) {
      const A = Math.max(p, d0), Z = Math.min(q, end);
      if (Z > A) s += `<rect class="rp-sleep" x="${x(A)}" y="${cy - 5}" width="${Math.max(1.5, x(Z) - x(A)).toFixed(1)}" height="10" rx="3"/>`;
    }
    for (const e of evs) {
      if (e.t < d0 || e.t >= d1) continue;
      const cx = x(e.t);
      if (e.kind === 'feed') s += `<rect class="rp-feed" x="${(cx - 1.5).toFixed(1)}" y="${cy - 7}" width="3" height="14" rx="1.5"/>`;
      if (e.kind === 'diaper') s += `<circle class="rp-diaper" cx="${cx}" cy="${cy + 6.5}" r="2.8"/>` + (e.poo ? `<circle class="rp-poo" cx="${cx}" cy="${cy + 6.5}" r="1.7"/>` : '');
      if (e.kind === 'symptom' || e.kind === 'vomit') s += `<rect class="rp-sym" x="${cx - 4}" y="${cy - 4}" width="8" height="8" transform="rotate(45 ${cx} ${cy})"/>`;
    }
    if (d0 === today) s += `<line class="rp-now" x1="${x(now)}" x2="${x(now)}" y1="${y + 2}" y2="${y + RH - 2}"/>`;
  });
  return s + '</svg>';
}

/* ---------- a folha ---------- */
// parts: { routine, symptoms, meds, growth, questions }. medPlan(id): como o remédio está programado
// hoje (nulo se não está mais).
export function reportHtml({ baby, a, now, stats: R, evs, sleeps, weights, milestones, questions, parts, medPlan }) {
  const today = startOfDay(now), birth = baby.birth_date;
  const td = (v, cls = '') => `<td${cls ? ` class="${cls}"` : ''}>${v}</td>`;
  let h = '<article class="rp-paper">';
  h += `<header class="rp-head"><div><h1>${esc(baby.name)}</h1><p>${birth ? `Nasceu em ${ymdFull(birth)} · ${esc(ageText(birth))} em ${ddmm(now)}/${new Date(now).getFullYear()}` : 'Sem data de nascimento anotada'}</p></div>`
    + `<div class="rp-per"><b>${esc(periodTitle(a, today))}</b>${plural(R.days.length, 'dia', 'dias')}, até hoje às ${hm(now)}</div></header>`;

  if (parts.growth) {
    let w = '<section class="rp-sec"><h2>Peso <small>desde o nascimento</small></h2>';
    if (weights.length >= 2) {
      w += weightSvg(weights);
      w += `<p class="rp-src">${weights.map(x => esc(ymdDdmm(x.measured_on) + (x.note ? ' ' + x.note : ''))).join(' · ')}</p>`;
    } else if (weights.length) w += `<p>${esc(kg(weights[0].grams))} em ${ymdFull(weights[0].measured_on)}${weights[0].note ? ' · ' + esc(weights[0].note) : ''}</p>`;
    else w += '<p class="rp-none">Nenhum peso anotado.</p>';
    w += '</section>';
    let m = '<section class="rp-sec"><h2>Marcos</h2>';
    m += milestones.length
      ? `<table><thead><tr><th>Marco</th><th>Dia</th><th class="n">Idade</th></tr></thead><tbody>${milestones.map(x => `<tr>${td(esc(x.title))}${td(ymdDdmm(x.happened_on))}${td(esc(ageAt(birth, x.happened_on)), 'n')}</tr>`).join('')}</tbody></table>`
      : '<p class="rp-none">Nenhum marco anotado.</p>';
    h += `<div class="rp-cols">${w}${m}</section></div>`;
  }

  if (parts.routine) {
    h += `<section class="rp-sec"><h2>Rotina <small>média por dia, nos ${plural(R.full, 'dia', 'dias')} com registros (hoje não entra)</small></h2>`;
    const A = R.avg;
    if (!A) h += '<p class="rp-none">Nenhum dia completo com registros no período.</p>';
    else {
      const tile = (c, k, big, sub) => `<div style="--sw:var(${c})"><span class="k"><i></i>${k}</span><b>${esc(big)}</b><span>${esc(sub)}</span></div>`;
      const feedSub = [A.breast ? n1(A.breast) + ' no peito' : '', A.bottles ? n1(A.bottles) + ' mamadeira' : ''].filter(Boolean).join(' · ');
      h += '<div class="rp-avg">' + tile('--rp-feed', 'Mamadas', n1(A.feeds), feedSub);
      if (A.bottleMl) h += tile('--rp-feed', 'Na mamadeira', Math.round(A.bottleMl) + ' ml', A.perBottle ? Math.round(A.perBottle) + ' ml por mamadeira' : '');
      if (A.breastMin) h += tile('--rp-feed', 'No peito', hours(A.breastMin * MIN), 'quando o tempo foi anotado');
      h += tile('--rp-sleep', 'Sono', hours(A.slept), R.longest ? 'maior seguido: ' + hours(R.longest[1] - R.longest[0]) + ' (' + ddmm(R.longest[0]) + ')' : '');
      h += tile('--rp-diaper', 'Fraldas', n1(A.diapers), n1(A.poos) + ' com cocô');
      if (R.gap) h += tile('--rp-poo', 'Maior intervalo entre cocôs', hours(R.gap.ms), 'encerrado em ' + ddmm(R.gap.end));
      if (A.pumpMl) h += tile('--rp-pump', 'Ordenha', Math.round(A.pumpMl) + ' ml', 'leite tirado, por dia');
      h += '</div>';
    }
    h += '</section>';
    h += `<section class="rp-sec"><h2>Como foram os dias <small>de 0h a 24h</small></h2><div class="rp-scroll">${daysSvg(R.days, evs, sleeps, now)}</div>`
      + '<div class="rp-lgd"><span><i style="--sw:var(--rp-sleep)"></i>Sono</span><span><i style="--sw:var(--rp-feed)"></i>Mamada</span>'
      + '<span><i class="c" style="--sw:var(--rp-diaper)"></i>Fralda</span><span><i class="c" style="--sw:var(--rp-poo)"></i>com cocô</span>'
      + '<span><i class="d" style="--sw:var(--rp-sym)"></i>Sintoma ou vômito</span><span>Dia em branco: nada anotado</span></div></section>';
  }

  if (parts.symptoms) {
    h += '<section class="rp-sec"><h2>Sintomas e vômitos <small>como foram anotados</small></h2>';
    h += R.symptoms.length
      ? `<table><thead><tr><th>Dia</th><th>Hora</th><th>O quê</th></tr></thead><tbody>${R.symptoms.map(e => {
          const note = e.kind === 'symptom' && e.symptom === 'outro' ? '' : e.note;
          return `<tr>${td(ddmm(e.t))}${td(hm(e.t))}${td(`<b>${esc(label(e, evs))}</b>${note ? `<span class="sub">${esc(note)}</span>` : ''}`)}</tr>`;
        }).join('')}</tbody></table>`
      : '<p class="rp-none">Nenhum sintoma ou vômito anotado no período.</p>';
    h += '</section>';
  }

  if (parts.meds) {
    h += '<section class="rp-sec"><h2>Remédios <small>doses marcadas no período</small></h2>';
    const when = ts => ts.map(t => ddmm(t) + ' ' + hm(t)).join(', ');
    h += R.meds.length
      ? `<table><thead><tr><th>Remédio</th><th>Como está programado</th><th class="n">Doses</th></tr></thead><tbody>${R.meds.map(g => {
          const plan = medPlan(g.id);
          const given = plural(g.given.length, 'dada', 'dadas'), skipped = g.skipped.length ? plural(g.skipped.length, 'pulada', 'puladas') : '';
          const sub = [g.given.length && g.given.length <= 3 && !g.skipped.length ? when(g.given) : '', g.skipped.length && g.skipped.length <= 3 ? skipped + ' (' + g.skipped.map(ddmm).join(', ') + ')' : skipped].filter(Boolean).join(' · ');
          return `<tr>${td(`<b>${esc(g.name)}</b>${g.amount ? `<span class="sub">${esc(g.amount)}</span>` : ''}`)}${td(esc(plan || 'não está mais programado'))}${td(`${given}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}`, 'n')}</tr>`;
        }).join('')}</tbody></table>`
      : '<p class="rp-none">Nenhuma dose de remédio marcada no período.</p>';
    h += '</section>';
  }

  if (parts.questions && questions.length) {
    h += '<section class="rp-sec"><h2>Dúvidas da família</h2><ul class="rp-q">'
      + questions.map(q => `<li><span>${esc(q.body)} <small>· anotada em ${ddmm(Date.parse(q.created_at))}</small></span></li>`).join('') + '</ul></section>';
  }

  h += `<footer class="rp-foot"><span>Feito pelo Caderninho com o que a família anotou. Só junta o que foi registrado: dia sem anotação não é dia sem mamada. Não avalia nem compara com outros bebês.</span>`
    + `<span>Gerado em ${ddmm(now)}/${new Date(now).getFullYear()} às ${hm(now)}</span></footer>`;
  return h + '</article>';
}

// O mesmo relatório em texto, para copiar e mandar por mensagem.
export function reportPlain({ baby, a, now, stats: R, evs, weights, milestones, questions, parts, medPlan }) {
  const today = startOfDay(now), birth = baby.birth_date, out = [];
  out.push(`Relatório de ${baby.name} para o pediatra, pelo Caderninho`);
  if (birth) out.push(`Nasceu em ${ymdFull(birth)} · ${ageText(birth)}`);
  out.push(`Período: ${periodTitle(a, today)} (${plural(R.days.length, 'dia', 'dias')})`);
  if (parts.growth) {
    out.push('', 'Peso:');
    out.push(...(weights.length ? weights.map(w => `• ${ymdDdmm(w.measured_on)}: ${kg(w.grams)}${w.note ? ' (' + w.note + ')' : ''}`) : ['• nenhum anotado']));
    if (milestones.length) out.push('', 'Marcos:', ...milestones.map(m => `• ${m.title}: ${ymdDdmm(m.happened_on)}${birth ? ' (' + ageAt(birth, m.happened_on) + ')' : ''}`));
  }
  if (parts.routine && R.avg) {
    const A = R.avg;
    out.push('', `Rotina, média por dia (${plural(R.full, 'dia', 'dias')} com registros):`);
    out.push(`• ${n1(A.feeds)} mamadas` + (A.bottleMl ? `, ${Math.round(A.bottleMl)} ml na mamadeira` : '') + (A.breastMin ? `, ${hours(A.breastMin * MIN)} no peito` : ''));
    out.push(`• ${hours(A.slept)} de sono` + (R.longest ? `; o maior sono seguido foi de ${hours(R.longest[1] - R.longest[0])} (${ddmm(R.longest[0])})` : ''));
    out.push(`• ${n1(A.diapers)} fraldas, ${n1(A.poos)} com cocô` + (R.gap ? `; maior intervalo entre cocôs: ${hours(R.gap.ms)} (${ddmm(R.gap.end)})` : ''));
    if (A.pumpMl) out.push(`• ${Math.round(A.pumpMl)} ml de leite ordenhado`);
  }
  if (parts.symptoms) {
    out.push('', 'Sintomas e vômitos:');
    out.push(...(R.symptoms.length ? R.symptoms.map(e => {
      const note = e.kind === 'symptom' && e.symptom === 'outro' ? '' : e.note;
      return `• ${ddmm(e.t)} ${hm(e.t)}: ${label(e, evs)}${note ? ' (' + note + ')' : ''}`;
    }) : ['• nenhum anotado']));
  }
  if (parts.meds && R.meds.length) {
    out.push('', 'Remédios:');
    out.push(...R.meds.map(g => `• ${g.name}${g.amount ? ' ' + g.amount : ''}${medPlan(g.id) ? ', ' + medPlan(g.id) : ''}: ${plural(g.given.length, 'dose dada', 'doses dadas')}${g.skipped.length ? ', ' + plural(g.skipped.length, 'pulada', 'puladas') : ''}`));
  }
  if (parts.questions && questions.length) out.push('', 'Dúvidas da família:', ...questions.map(q => '• ' + q.body));
  out.push('', 'Só junta o que a família anotou no Caderninho.');
  return out.join('\n');
}

// Para o nome do PDF: "Relatório de Marina 01-10-2026".
export const pdfName = (baby, now) => { const d = new Date(now); return `Relatório de ${baby.name} ${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}`; };
