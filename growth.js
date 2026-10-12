// Peso, comprimento e marcos: o que a família anota do bebê fora da rotina.
// Peso e comprimento aparecem sobre as curvas da OMS (as da Caderneta da Criança, adotadas pela SBP)
// quando o bebê tem nascimento e menina ou menino anotados. Só mostra as linhas e os pontos: não diz
// se o bebê está acima ou abaixo de nada. Os seis marcos motores da OMS e a média de sono e de fraldas
// ganham a faixa de referência para a idade, do mesmo jeito: a faixa e o ponto, sem avaliar.
import { DAY, esc, dur, ageText, fullDate, shortDate } from './util.js';
import { WHO } from './who.js';

// Sugestões para anotar um marco. Os motores levam os nomes dos marcos da OMS, para cair na faixa.
export const MILESTONES = ['Sorriu', 'Firmou a cabeça', 'Rolou', 'Sentou sem apoio', 'Engatinhou', 'Primeiro dente',
  'Primeira papinha', 'Ficou em pé com apoio', 'Andou com apoio', 'Ficou em pé sozinho', 'Andou sozinho', 'Primeira palavra'];

// Janelas da OMS para os seis marcos motores, do percentil 1 ao 99, em meses (WHO Motor Development
// Study, 2006: as mesmas crianças das curvas de crescimento). Na ordem do começo da faixa.
export const MOTOR = [['Sentou sem apoio', 3.8, 9.2], ['Ficou em pé com apoio', 4.8, 11.4], ['Engatinhou', 5.2, 13.5],
  ['Andou com apoio', 5.9, 13.7], ['Ficou em pé sozinho', 6.9, 16.9], ['Andou sozinho', 8.2, 17.6]];
const n1 = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const motorRange = title => { const m = MOTOR.find(([t]) => t === title); return m ? `faixa da OMS: ${n1(m[1])} a ${n1(m[2])} meses` : ''; };
// Idade em meses (com fração) num dia "aaaa-mm-dd", ou hoje.
const monthsOn = (birth, ymd) => ((ymd ? new Date(ymd + 'T00:00') : new Date()) - new Date(birth + 'T00:00')) / DAY / 30.4375;

// As faixas de 0 a 18 meses, o nome em cima de cada uma. Com o nascimento, a linha de hoje e um ponto
// no dia em que cada marco foi anotado.
export function motorChart(birth, milestones) {
  const W = 340, L = 6, R = 12, T = 6, rowH = 36, H = T + MOTOR.length * rowH + 26, x = m => +(L + Math.min(18, m) / 18 * (W - L - R)).toFixed(1);
  const now = birth ? monthsOn(birth) : null;
  let s = `<svg class="chart mchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc('Faixas da OMS para seis marcos motores, de 0 a 18 meses' + (now != null && now <= 18 ? '; hoje, ' + ageText(birth) : ''))}">`;
  const ticks = [0, 3, 6, 9, 12, 15, 18];
  for (const m of ticks) s += `<text class="ax" x="${x(m)}" y="${H - 8}" text-anchor="${m ? m === 18 ? 'end' : 'middle' : 'start'}">${m ? m + 'm' : '0'}</text>`;
  MOTOR.forEach(([t, lo, hi], i) => {
    const y = T + i * rowH, done = birth && milestones.find(m => m.title === t && m.happened_on >= birth);
    // A grade só na altura da faixa, para não cortar o nome do marco.
    s += ticks.map(m => `<line class="gl" x1="${x(m)}" x2="${x(m)}" y1="${y + 16}" y2="${y + 30}"/>`).join('');
    s += `<text class="mn" x="${L}" y="${y + 12}">${esc(t)}</text><rect class="mb" x="${x(lo)}" y="${y + 18}" width="${(x(hi) - x(lo)).toFixed(1)}" height="10" rx="5"/>`;
    if (done && monthsOn(birth, done.happened_on) <= 18) s += `<circle class="wp" cx="${x(monthsOn(birth, done.happened_on))}" cy="${y + 23}" r="6"><title>${esc(t + ': ' + fullDate(done.happened_on))}</title></circle>`;
  });
  if (now != null && now <= 18) s += MOTOR.map((_, i) => `<line class="today" x1="${x(now)}" x2="${x(now)}" y1="${T + i * rowH + 15}" y2="${T + i * rowH + 31 + (i === MOTOR.length - 1 ? 5 : 0)}"/>`).join('')
    + `<text class="mn" x="${x(now) + (now > 15 ? -4 : 4)}" y="${H - 24}" text-anchor="${now > 15 ? 'end' : 'start'}">hoje</text>`;
  return s + '</svg>';
}

// Sono por dia, contando as sonecas (National Sleep Foundation, 2015), pela idade em meses.
const SLEEP_REF = [[4, 14, 17, '0 a 3 meses'], [12, 12, 15, '4 a 11 meses'], [24, 11, 14, '1 a 2 anos']];
// Uma faixa de referência com o ponto da média. open: a faixa segue até o fim do eixo ("6 ou mais").
function refBar(min, max, lo, hi, v, cls, ticks, unit, aria) {
  const W = 300, x = t => +(8 + (Math.min(max, Math.max(min, t)) - min) / (max - min) * (W - 16)).toFixed(1);
  return `<svg class="chart" viewBox="0 0 ${W} 34" role="img" aria-label="${esc(aria)}"><line class="rl" x1="8" x2="${W - 8}" y1="13" y2="13"/>`
    + `<rect class="mb" x="${x(lo)}" y="7" width="${(x(hi) - x(lo)).toFixed(1)}" height="12" rx="6"/><circle class="${cls}" cx="${x(v)}" cy="13" r="6"/>`
    + ticks.map((t, i) => `<text class="ax" x="${x(t)}" y="32" text-anchor="${i ? i === ticks.length - 1 ? 'end' : 'middle' : 'start'}">${t}${t === ticks.at(-1) ? unit : ''}</text>`).join('') + '</svg>';
}
const nf = v => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
// "Para a idade de Marina": a média de sono e de fraldas com xixi por dia ao lado da referência.
// at: o último dia do período ("aaaa-mm-dd"), para a idade. sleep em ms e pee por dia, ou null sem dias.
// Vazio sem o nascimento, sem dias com registro ou fora das idades com referência.
export function refHtml({ birth, at, name, cap, sleep, pee }) {
  if (!birth || at < birth || sleep == null) return '';
  const age = monthsOn(birth, at), days = Math.round(age * 30.4375), sr = SLEEP_REF.find(r => age < r[0]);
  let h = '';
  if (sr) {
    const [, lo, hi, when] = sr;
    h += `<div class="ref"><div class="t"><span>Sono por dia</span><em>${esc(name)}: ${dur(sleep)}</em></div>`
      + refBar(lo - 4, hi + 3, lo, hi, sleep / 36e5, 'rd-sleep', [lo - 4, lo, hi, hi + 3], ' h', `Referência de ${lo} a ${hi} horas; média de ${dur(sleep)}`)
      + `<span class="s">Referência de ${when}: ${lo} a ${hi} h, com as sonecas</span></div>`;
  }
  if (days >= 6 && age < 24) {
    const max = Math.max(12, Math.ceil(pee));
    h += `<div class="ref"><div class="t"><span>Fraldas com xixi por dia</span><em>${esc(name)}: ${nf(pee)}</em></div>`
      + refBar(0, max, 6, max, pee, 'rd-diaper', [0, 6, max], '', `Referência de 6 ou mais; média de ${nf(pee)}`)
      + '<span class="s">Referência: 6 ou mais por dia</span></div>';
  }
  if (!h) return '';
  return `<div class="card"><h3>Para a idade de ${esc(name)}</h3><p class="cap">${esc(ageText(birth, at) + '. ' + cap)}</p>${h}
    <p class="foot">Referências gerais para bebês saudáveis: National Sleep Foundation e Academia Americana de Pediatria. Cada bebê tem seu ritmo; quem avalia é o pediatra.</p></div>`;
}

export const kg = g => (g / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) + ' kg';
// "5,2" ou "5.235" em kg; "5235" em gramas. Nulo se não der para ler.
export function parseKg(txt) {
  const v = parseFloat(String(txt).trim().replace(/\s|kg/gi, '').replace(',', '.'));
  if (!isFinite(v) || v <= 0) return null;
  return Math.round(v > 100 ? v : v * 1000);
}
// "62,3" ou "62.3" em cm. Nulo se não der para ler.
export function parseCm(txt) {
  const v = parseFloat(String(txt).trim().replace(/\s|cm/gi, '').replace(',', '.'));
  return isFinite(v) && v > 0 ? Math.round(v * 10) / 10 : null;
}
export const cmText = c => Number(c).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' cm';
// Idade do bebê naquele dia, para ir junto do peso e do marco.
export function ageOn(birth, ymd) {
  if (!birth || ymd < birth) return '';
  return ymd === birth ? 'no dia em que nasceu' : 'com ' + ageText(birth, ymd);
}
const byDay = (a, b, k) => a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : a.created_at < b.created_at ? -1 : 1;
export const sortWeights = ws => ws.slice().sort((a, b) => byDay(a, b, 'measured_on'));
export const sortMilestones = ms => ms.slice().sort((a, b) => byDay(a, b, 'happened_on'));

// Um passo redondo para o eixo, com no máximo 5 marcas.
function niceStep(span) { for (const s of [100, 200, 250, 500, 1000, 2000, 5000]) if (span / s <= 4) return s; return 10000; }
const kgNum = g => (g / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// Sem as curvas (falta o nascimento ou menina/menino): um ponto por medida, ligados por uma linha, no
// tempo. O último leva o valor. A lista embaixo do gráfico traz todos os números.
export function weightChart(rows, kind = 'weight') {
  const len = kind === 'length', val = r => len ? Math.round(r.cm * 10) : r.grams, txt = r => len ? cmText(r.cm) : kg(r.grams);
  const ws = rows.map(r => ({ ...r, grams: val(r) })), axis = g => len ? (g / 10).toLocaleString('pt-BR') : kgNum(g);
  const W = 340, H = 176, L = 34, R = 18, T = 22, B = 24, PW = W - L - R, PH = H - T - B;
  const pts = ws.map(w => ({ t: new Date(w.measured_on + 'T12:00').getTime(), w }));
  const t0 = pts[0].t, t1 = Math.max(pts.at(-1).t, t0 + 864e5);
  const gs = ws.map(w => w.grams), step = len ? [10, 20, 50, 100].find(s => (Math.max(...gs) - Math.min(...gs) || 50) / s <= 4) || 200 : niceStep(Math.max(...gs) - Math.min(...gs) || 500);
  let lo = Math.floor(Math.min(...gs) / step) * step, hi = Math.ceil(Math.max(...gs) / step) * step;
  if (hi === lo) hi += step;
  const x = t => +(L + (t - t0) / (t1 - t0) * PW).toFixed(1), y = g => +(T + (hi - g) / (hi - lo) * PH).toFixed(1);
  const first = ws[0], last = ws.at(-1);
  const fr = rows[0], lr = rows.at(-1);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${len ? 'Comprimento' : 'Peso'} de ${fullDate(first.measured_on)} a ${fullDate(last.measured_on)}: de ${txt(fr)} a ${txt(lr)}`)}">`;
  s += `<text class="ax" x="0" y="${T - 10}">${len ? 'cm' : 'kg'}</text>`;
  for (let g = lo; g <= hi; g += step) s += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}"/><text class="ax" x="${L - 6}" y="${y(g) + 3.5}" text-anchor="end">${axis(g)}</text>`;
  s += `<text class="ax" x="${L}" y="${H - 6}">${esc(shortDate(first.measured_on))}</text>`;
  if (last.measured_on !== first.measured_on) s += `<text class="ax" x="${W - R}" y="${H - 6}" text-anchor="end">${esc(shortDate(last.measured_on))}</text>`;
  s += `<polyline class="wl" points="${pts.map(p => x(p.t) + ',' + y(p.w.grams)).join(' ')}"/>`;
  pts.forEach((p, i) => s += `<g><circle class="wh" cx="${x(p.t)}" cy="${y(p.w.grams)}" r="12"/><circle class="wp" cx="${x(p.t)}" cy="${y(p.w.grams)}" r="4.5"/><title>${esc(fullDate(p.w.measured_on) + ': ' + txt(rows[i]))}</title></g>`);
  const lx = x(pts.at(-1).t), ly = y(last.grams);
  s += `<text class="vl" x="${lx}" y="${ly - 10}" text-anchor="${lx > W - R - 30 ? 'end' : 'middle'}">${esc(txt(lr))}</text>`;
  return s + '</svg>';
}

/* ---------- curvas da OMS ---------- */
// Percentis 3, 15, 50, 85 e 97, como nas curvas publicadas pela OMS. A faixa clara vai do 15 ao 85.
const PCT = [[-1.881, 'P3'], [-1.036, 'P15'], [0, 'P50'], [1.036, 'P85'], [1.881, 'P97']];
const zval = ([L, M, S], z) => L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);
const lmsAt = (t, m) => { const i = Math.min(Math.floor(m), t.length - 2), f = m - i, a = t[i], b = t[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; };
export const MAX_MONTHS = 60;
// Idade em meses (com fração) num dia (aaaa-mm-dd), contada do nascimento.
export const monthsOld = (birth, ymd) => (Date.parse(ymd + 'T12:00') - Date.parse(birth + 'T12:00')) / (30.4375 * 864e5);
// A janela que o gráfico abre: do nascimento até um pouco depois da última medida, no mínimo 6 meses.
export function growthWindow(rows, birth) {
  const last = rows.length ? monthsOld(birth, rows.at(-1).measured_on) : 0;
  return [0, Math.min(MAX_MONTHS, Math.max(6, Math.ceil(last + 1.5)))];
}
// Peso ou comprimento sobre as curvas da OMS, de a a b meses. rows: as medidas daquele tipo.
// cls: o começo das classes (o relatório usa as suas cores). O eixo de baixo é a idade.
export function growthChart({ rows, kind, sex, birth, a, b, W = 340, H = 214, id = 'g', cls = 'g' }) {
  const len = kind === 'length', t = WHO[kind][sex], unit = len ? 'cm' : 'kg';
  const val = r => len ? +r.cm : r.grams / 1000, text = v => v.toLocaleString('pt-BR', { maximumFractionDigits: len ? 1 : 2 }) + ' ' + unit;
  const L = 30, R = 30, T = 18, B = 24, PW = W - L - R, PH = H - T - B, N = 60;
  const pts = rows.map(r => [monthsOld(birth, r.measured_on), val(r), r]).filter(([m]) => m >= 0 && m <= MAX_MONTHS);
  const ms = Array.from({ length: N + 1 }, (_, i) => a + (b - a) * i / N);
  let lo = Infinity, hi = -Infinity;
  for (const m of ms) { lo = Math.min(lo, zval(lmsAt(t, m), PCT[0][0])); hi = Math.max(hi, zval(lmsAt(t, m), PCT[4][0])); }
  for (const [m, v] of pts) if (m >= a && m <= b) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const span = hi - lo, step = len ? (span > 40 ? 10 : span > 15 ? 5 : 2) : (span > 12 ? 2 : span > 5 ? 1 : .5);
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const x = m => +(L + (m - a) / (b - a) * PW).toFixed(1), y = v => +(T + (hi - v) / (hi - lo) * PH).toFixed(1);
  const line = z => ms.map(m => x(m) + ',' + y(zval(lmsAt(t, m), z))).join(' ');
  const c = n => cls + '-' + n;
  let s = `<svg class="${c('chart')}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${len ? 'Comprimento' : 'Peso'} para idade sobre as curvas da OMS para ${sex === 'F' ? 'meninas' : 'meninos'}, de ${Math.round(a)} a ${Math.round(b)} meses`)}">`;
  s += `<defs><clipPath id="${id}-clip"><rect x="${L}" y="${T}" width="${PW}" height="${PH}"/></clipPath></defs><text class="${c('ax')}" x="0" y="${T - 7}">${unit}</text>`;
  for (let v = lo; v <= hi + 1e-9; v += step) s += `<line class="${c('gl')}" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="${c('ax')}" x="${L - 5}" y="${y(v) + 3.5}" text-anchor="end">${v.toLocaleString('pt-BR')}</text>`;
  s += `<g clip-path="url(#${id}-clip)"><polygon class="${c('band')}" points="${line(PCT[3][0])} ${ms.slice().reverse().map(m => x(m) + ',' + y(zval(lmsAt(t, m), PCT[1][0]))).join(' ')}"/>`;
  for (const [z] of PCT) s += `<polyline class="${c('cv')}${z === 0 ? ' ' + c('mid') : ''}" points="${line(z)}"/>`;
  if (pts.length > 1) s += `<polyline class="${c('wl')}" points="${pts.map(([m, v]) => x(m) + ',' + y(v)).join(' ')}"/>`;
  for (const [m, v, r] of pts) s += `<circle class="${c('wp')}" cx="${x(m)}" cy="${y(v)}" r="3.8"><title>${esc(fullDate(r.measured_on) + ': ' + text(v))}</title></circle>`;
  s += '</g>';
  for (const [z, n] of PCT) s += `<text class="${c('zl')}" x="${W - R + 3}" y="${y(zval(lmsAt(t, b), z)) + 3}">${n}</text>`;
  const sp = b - a, tick = sp <= 8 ? 1 : sp <= 16 ? 2 : sp <= 30 ? 3 : 12;
  for (let m = Math.ceil(a / tick - 1e-9) * tick; m <= b + 1e-9; m += tick)
    s += `<text class="${c('ax')}" x="${x(m)}" y="${H - 7}" text-anchor="middle">${m === 0 ? 'nasc.' : m % 12 === 0 ? m / 12 + (m === 12 ? ' ano' : ' anos') : m + 'm'}</text>`;
  const lp = pts.at(-1);
  if (lp && lp[0] >= a && lp[0] <= b) s += `<text class="${c('vl')}" x="${x(lp[0])}" y="${y(lp[1]) - 9}" text-anchor="${x(lp[0]) > W - R - 30 ? 'end' : 'middle'}">${esc(text(lp[1]))}</text>`;
  return s + '</svg>';
}
