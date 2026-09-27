// Peso e marcos: o que a família anota do bebê fora da rotina.
// Só guarda e mostra; não compara com curva de crescimento nem com idade esperada.
import { esc, ageText, fullDate, shortDate } from './util.js';

// Sugestões para anotar um marco. Sem idade: cada bebê tem o seu tempo.
export const MILESTONES = ['Sorriu', 'Firmou a cabeça', 'Rolou', 'Sentou sem apoio', 'Engatinhou', 'Primeiro dente',
  'Primeira papinha', 'Ficou em pé', 'Primeiros passos', 'Primeira palavra'];

export const kg = g => (g / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 }) + ' kg';
// "5,2" ou "5.235" em kg; "5235" em gramas. Nulo se não der para ler.
export function parseKg(txt) {
  const v = parseFloat(String(txt).trim().replace(/\s|kg/gi, '').replace(',', '.'));
  if (!isFinite(v) || v <= 0) return null;
  return Math.round(v > 100 ? v : v * 1000);
}
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

// Gráfico do peso: um ponto por pesagem, ligados por uma linha, no tempo. O último leva o valor.
// A lista embaixo do gráfico traz todos os números.
export function weightChart(ws) {
  const W = 340, H = 176, L = 34, R = 18, T = 22, B = 24, PW = W - L - R, PH = H - T - B;
  const pts = ws.map(w => ({ t: new Date(w.measured_on + 'T12:00').getTime(), w }));
  const t0 = pts[0].t, t1 = Math.max(pts.at(-1).t, t0 + 864e5);
  const gs = ws.map(w => w.grams), step = niceStep(Math.max(...gs) - Math.min(...gs) || 500);
  let lo = Math.floor(Math.min(...gs) / step) * step, hi = Math.ceil(Math.max(...gs) / step) * step;
  if (hi === lo) hi += step;
  const x = t => +(L + (t - t0) / (t1 - t0) * PW).toFixed(1), y = g => +(T + (hi - g) / (hi - lo) * PH).toFixed(1);
  const first = ws[0], last = ws.at(-1);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Peso de ${fullDate(first.measured_on)} a ${fullDate(last.measured_on)}: de ${kg(first.grams)} a ${kg(last.grams)}`)}">`;
  s += `<text class="ax" x="0" y="${T - 10}">kg</text>`;
  for (let g = lo; g <= hi; g += step) s += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}"/><text class="ax" x="${L - 6}" y="${y(g) + 3.5}" text-anchor="end">${kgNum(g)}</text>`;
  s += `<text class="ax" x="${L}" y="${H - 6}">${esc(shortDate(first.measured_on))}</text>`;
  if (last.measured_on !== first.measured_on) s += `<text class="ax" x="${W - R}" y="${H - 6}" text-anchor="end">${esc(shortDate(last.measured_on))}</text>`;
  s += `<polyline class="wl" points="${pts.map(p => x(p.t) + ',' + y(p.w.grams)).join(' ')}"/>`;
  for (const p of pts) s += `<g><circle class="wh" cx="${x(p.t)}" cy="${y(p.w.grams)}" r="12"/><circle class="wp" cx="${x(p.t)}" cy="${y(p.w.grams)}" r="4.5"/><title>${esc(fullDate(p.w.measured_on) + ': ' + kg(p.w.grams))}</title></g>`;
  const lx = x(pts.at(-1).t), ly = y(last.grams);
  s += `<text class="vl" x="${lx}" y="${ly - 10}" text-anchor="${lx > W - R - 30 ? 'end' : 'middle'}">${esc(kg(last.grams))}</text>`;
  return s + '</svg>';
}
