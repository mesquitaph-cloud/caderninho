// Utilidades sem estado: ícones, datas, textos e rótulos dos registros.

const P = 'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"';
export const ICON = {
  feed: `<svg viewBox="0 0 24 24" ${P}><path d="M9 3h6M10.5 3v3M13.5 3v3"/><path d="M9.5 6h5a1.5 1.5 0 0 1 1.5 1.5V19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V7.5A1.5 1.5 0 0 1 9.5 6z"/><path d="M8 12h3M8 15.5h3"/></svg>`,
  sleep: `<svg viewBox="0 0 24 24" ${P}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>`,
  diaper: `<svg viewBox="0 0 24 24" ${P}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>`,
  vomit: `<svg viewBox="0 0 24 24" ${P}><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M8.5 15.5c1-1 2-1 3.5 0s2.5 1 3.5 0"/></svg>`,
  pump: `<svg viewBox="0 0 24 24" ${P}><path d="M5.5 3h13l-4 5.5h-5z"/><path d="M10 8.5v1.8a2 2 0 0 0-1.5 1.9V19a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-6.8a2 2 0 0 0-1.5-1.9V8.5"/><path d="M10.5 15h3M10.5 17.8h3"/></svg>`,
  other: `<svg viewBox="0 0 24 24" ${P}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" ${P}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" ${P}><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5M21 20a6 6 0 0 0-4-5.6"/></svg>`,
};
ICON.wake = ICON.sleep;

export const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export const pad = n => String(n).padStart(2, '0');
export function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
export function hm(t) { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
export function dur(ms) {
  const m = Math.max(0, Math.round(ms / MIN));
  if (m < 60) return m + ' min';
  if (m < 24 * 60) return Math.floor(m / 60) + 'h' + pad(m % 60);
  const d = Math.floor(m / (24 * 60)); return d === 1 ? '1 dia' : d + ' dias';
}
export function ago(t) { const ms = Date.now() - t; return ms < MIN ? 'agora' : 'há ' + dur(ms); }
export function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

export function dayTitle(d0) {
  const now = Date.now(), dt = new Date(d0);
  const nome = d0 === startOfDay(now) ? 'Hoje' : d0 === startOfDay(now - DAY) ? 'Ontem' : DIAS[dt.getDay()];
  return nome + ', ' + dt.getDate() + ' ' + MESES[dt.getMonth()];
}

export function ageText(birth) {
  if (!birth) return '';
  const b = new Date(birth + 'T00:00'), n = new Date();
  let m = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth();
  if (n.getDate() < b.getDate()) m--;
  if (m <= 0) { const t = Math.floor((startOfDay(n) - b.getTime()) / DAY); return t === 1 ? '1 dia' : t + ' dias'; }
  const ref = new Date(b); ref.setMonth(b.getMonth() + m);
  const d = Math.floor((startOfDay(n) - startOfDay(ref)) / DAY);
  return (m === 1 ? '1 mês' : m + ' meses') + (d ? ' e ' + (d === 1 ? '1 dia' : d + ' dias') : '');
}

// Sono = intervalo entre um "dormiu" e o "acordou" seguinte.
export function sleepIntervals(evs) {
  const out = []; let start = null;
  for (const e of evs) {
    if (e.kind === 'sleep') { if (start === null) start = e.t; }
    else if (e.kind === 'wake' && start !== null) { out.push([start, e.t]); start = null; }
  }
  return { out, open: start };
}
function sleepBefore(evs, wake) {
  let s = null;
  for (const e of evs) { if (e.t >= wake.t) break; if (e.kind === 'sleep') s = s ?? e.t; if (e.kind === 'wake') s = null; }
  return s;
}
// Qual peito: na mamada no peito e na ordenha.
const SIDE = { left: 'peito esquerdo', right: 'peito direito', both: 'os dois peitos' };
export const SIDE_SHORT = { left: 'esquerdo', right: 'direito', both: 'os dois' };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export function label(e, evs) {
  if (e.kind === 'feed') {
    if (e.src === 'bottle') return 'Mamadeira' + (e.ml ? ' · ' + e.ml + ' ml' : '');
    if (e.src !== 'breast') return 'Mamada';
    const min = (e.left_min || 0) + (e.right_min || 0);
    return (e.side ? cap(SIDE[e.side]) : 'Peito') + (min ? ' · ' + dur(min * MIN) : '');
  }
  if (e.kind === 'pump') return 'Ordenha · ' + e.ml + ' ml';
  if (e.kind === 'sleep') return 'Dormiu';
  if (e.kind === 'wake') { const s = sleepBefore(evs, e); return s !== null ? 'Acordou · dormiu ' + dur(e.t - s) : 'Acordou'; }
  if (e.kind === 'diaper') return e.pee && e.poo ? 'Xixi + cocô' : e.poo ? 'Cocô' : 'Xixi';
  if (e.kind === 'vomit') return 'Vômito';
  return e.note || 'Outros';
}
// Linha de baixo do registro: minutos de cada peito, ou de qual peito saiu a ordenha.
export function detail(e) {
  if (e.kind === 'feed' && e.side === 'both' && (e.left_min || e.right_min))
    return 'esquerdo' + (e.left_min ? ' ' + e.left_min + ' min' : '') + ', direito' + (e.right_min ? ' ' + e.right_min + ' min' : '');
  if (e.kind === 'pump' && e.side) return SIDE[e.side];
  return '';
}

export function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
export function lsSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} }
