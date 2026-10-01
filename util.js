// Utilidades sem estado: ícones, datas, textos e rótulos dos registros.

const P = 'fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"';
export const ICON = {
  feed: `<svg viewBox="0 0 24 24" ${P}><path d="M9 3h6M10.5 3v3M13.5 3v3"/><path d="M9.5 6h5a1.5 1.5 0 0 1 1.5 1.5V19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V7.5A1.5 1.5 0 0 1 9.5 6z"/><path d="M8 12h3M8 15.5h3"/></svg>`,
  sleep: `<svg viewBox="0 0 24 24" ${P}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>`,
  diaper: `<svg viewBox="0 0 24 24" ${P}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>`,
  vomit: `<svg viewBox="0 0 24 24" ${P}><circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M8.5 15.5c1-1 2-1 3.5 0s2.5 1 3.5 0"/></svg>`,
  pump: `<svg viewBox="0 0 24 24" ${P}><path d="M5.5 3h13l-4 5.5h-5z"/><path d="M10 8.5v1.8a2 2 0 0 0-1.5 1.9V19a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-6.8a2 2 0 0 0-1.5-1.9V8.5"/><path d="M10.5 15h3M10.5 17.8h3"/></svg>`,
  other: `<svg viewBox="0 0 24 24" ${P}><path d="M12 5v14M5 12h14"/></svg>`,
  med: `<svg viewBox="0 0 24 24" ${P}><rect x="2.8" y="8.2" width="18.4" height="7.6" rx="3.8" transform="rotate(-45 12 12)"/><path d="M9.3 9.3l5.4 5.4"/></svg>`,
  symptom: `<svg viewBox="0 0 24 24" ${P}><path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/></svg>`,
  massage: `<svg viewBox="0 0 24 24" ${P}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`,
  bath: `<svg viewBox="0 0 24 24" ${P}><path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M6 12V6a2 2 0 0 1 3.5-1.3"/><path d="M8 21l1-2M16 21l-1-2"/></svg>`,
  nasal: `<svg viewBox="0 0 24 24" ${P}><path d="M14.5 3.5l6 6"/><path d="M17.5 6.5l-8.8 8.8a3 3 0 0 1-4.2-4.2l8.8-8.8"/><path d="M6 20.5c-1.2 0-2-.8-2-1.8 0-1.2 2-3.2 2-3.2s2 2 2 3.2c0 1-.8 1.8-2 1.8z"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" ${P}><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,
  siren: `<svg viewBox="0 0 24 24" ${P}><path d="M7 18v-5a5 5 0 0 1 10 0v5"/><path d="M4.5 21h15M5.5 18h13"/><path d="M12 3v2M5.5 6l1.4 1.4M18.5 6l-1.4 1.4"/></svg>`,
  pencil: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" ${P}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" ${P}><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5M21 20a6 6 0 0 0-4-5.6"/></svg>`,
  // Barra de baixo: Hoje (o calendário), Família (o menu de pessoas) e Perfil (a pessoa com a engrenagem).
  today: `<svg viewBox="0 0 24 24" ${P}><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13.2v3.6"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" ${P}><circle cx="10" cy="7.5" r="3.5"/><path d="M3 20a7 7 0 0 1 9.6-6.5"/><circle cx="17.5" cy="17.5" r="2.4"/><path d="M19.9 17.5h1.5M18.7 19.6l.75 1.3M16.3 19.6l-.75 1.3M15.1 17.5h-1.5M16.3 15.4l-.75-1.3M18.7 15.4l.75-1.3"/></svg>`,
};
ICON.wake = ICON.sleep;

export const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
export const MESES_L = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
export const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export const pad = n => String(n).padStart(2, '0');
export function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
// Pelo calendário, e não somando 24h: o dia pode ter 23h ou 25h quando muda o horário.
export function addDays(d0, n) { const d = new Date(d0); d.setDate(d.getDate() + n); return startOfDay(d.getTime()); }
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

// "27 set 2026": o dia de um peso ou de um marco (aaaa-mm-dd).
export function fullDate(ymd) { const d = new Date(ymd + 'T00:00'); return d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear(); }
export const shortDate = ymd => { const d = new Date(ymd + 'T00:00'); return d.getDate() + ' ' + MESES[d.getMonth()]; };
// "sáb 20": o dia nos gráficos do painel.
export function shortDay(d0) { const d = new Date(d0); return DIAS[d.getDay()].toLowerCase() + ' ' + d.getDate(); }
// "19 a 25 set" ou "29 set a 5 out": os 7 dias do painel.
export function rangeTitle(a, z) {
  const A = new Date(a), Z = new Date(z);
  return A.getMonth() === Z.getMonth() ? A.getDate() + ' a ' + Z.getDate() + ' ' + MESES[Z.getMonth()]
    : A.getDate() + ' ' + MESES[A.getMonth()] + ' a ' + Z.getDate() + ' ' + MESES[Z.getMonth()];
}

// Idade hoje ou, com "at" (aaaa-mm-dd), naquele dia: "2 meses e 7 dias".
export function ageText(birth, at) {
  if (!birth) return '';
  const b = new Date(birth + 'T00:00'), n = at ? new Date(at + 'T00:00') : new Date();
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
// Sintomas: o que a família marca no botão Sintomas. Vômito também está lá, mas grava o registro
// de vômito de sempre. "Outro": o que aconteceu vai na observação.
export const SYMPTOM = { febre: 'Febre', colica: 'Cólica', choro: 'Choro inconsolável', tosse: 'Tosse', assadura: 'Assadura',
                         vacina: 'Reação à vacina', dentes: 'Incômodo dos dentes', outro: 'Outro' };
// Tamanho do cocô, opcional, na fralda com cocô. O alerta marrom (vazou da fralda) é à parte.
export const POO_SIZE = { pequeno: 'pequeno', medio: 'médio', grande: 'grande', gigante: 'gigante' };
export const CARE = { massage: 'Massagem', bath: 'Banho', nasal: 'Lavagem nasal' };
const temp = c => Number(c).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' °C';
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
  if (e.kind === 'diaper') {
    const poo = 'cocô' + (e.poo_size ? ' ' + POO_SIZE[e.poo_size] : '');
    return e.pee && e.poo ? 'Xixi + ' + poo : e.poo ? cap(poo) : 'Xixi';
  }
  if (e.kind === 'vomit') return 'Vômito';
  if (e.kind === 'med') return e.med_name + (e.med_amount ? ' · ' + e.med_amount : '');
  if (e.kind === 'symptom') return e.symptom === 'outro' ? e.note || 'Sintoma'
    : (SYMPTOM[e.symptom] || 'Sintoma') + (e.temp_c != null ? ' · ' + temp(e.temp_c) : '') + (e.duration_min ? ' · durou ' + dur(e.duration_min * MIN) : '');
  if (CARE[e.kind]) return CARE[e.kind];
  return e.note || 'Outros';
}
// Linha de baixo do registro: minutos de cada peito, de qual peito saiu a ordenha ou qual dose do remédio.
export function detail(e) {
  if (e.kind === 'feed' && e.side === 'both' && (e.left_min || e.right_min))
    return 'esquerdo' + (e.left_min ? ' ' + e.left_min + ' min' : '') + ', direito' + (e.right_min ? ' ' + e.right_min + ' min' : '');
  if (e.kind === 'pump' && e.side) return SIDE[e.side];
  if (e.kind === 'med') return e.dose_at ? 'dose das ' + hm(Date.parse(e.dose_at)) + (e.skipped ? ' pulada' : '') : 'quando precisou';
  return '';
}

export function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
export function lsSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} }
