// Resumo para mandar à família: os totais de uma semana ou de um mês, em tela e em texto para
// compartilhar. Só soma o que foi registrado; celebra o cuidado, não avalia o bebê. Segue os botões
// da família: sem Ordenha ligada, não fala de ordenha. Sintomas e vômito ficam sempre de fora.
import { MIN, HOUR, esc, dur, shortDate } from './util.js';
import { kg } from './growth.js';

const n1 = v => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const liters = ml => ml >= 1000 ? n1(ml / 1000) + ' L' : ml + ' ml';
const hours = ms => ms >= 10 * HOUR ? Math.round(ms / HOUR) + ' h' : dur(ms);
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
const ymd = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

const CARE_WORDS = { massage: ['massagem', 'massagens'], bath: ['banho', 'banhos'], nasal: ['lavagem nasal', 'lavagens nasais'] };

// Totais de [a, z). sleep: o que sleepIntervals devolve; o sono em andamento conta até agora.
// on(k): se a família usa o botão k (Ordenha, Remédio e os cuidados só entram se usar).
export function periodStats({ a, z, evs, sleep, now, weights, milestones, on = () => true }) {
  const end = Math.min(z, now), day = evs.filter(e => e.t >= a && e.t < end);
  const feeds = day.filter(e => e.kind === 'feed'), bottles = feeds.filter(e => e.src === 'bottle');
  const sleeps = sleep.open === null ? sleep.out : [...sleep.out, [sleep.open, now]];
  const inP = sleeps.filter(([s0]) => s0 >= a && s0 < end);
  const A = ymd(a), Z = ymd(end - 1);
  return {
    any: day.length > 0,
    feeds: feeds.length, bottles: bottles.length, bottleMl: bottles.reduce((s, e) => s + (e.ml || 0), 0),
    breastMs: feeds.reduce((s, e) => s + (e.left_min || 0) + (e.right_min || 0), 0) * MIN,
    slept: sleeps.reduce((s, [x, y]) => s + Math.max(0, Math.min(y, end) - Math.max(x, a)), 0),
    longest: inP.reduce((b, iv) => !b || iv[1] - iv[0] > b[1] - b[0] ? iv : b, null),
    diapers: day.filter(e => e.kind === 'diaper').length, poos: day.filter(e => e.kind === 'diaper' && e.poo).length,
    pumpMl: on('pump') ? day.filter(e => e.kind === 'pump').reduce((s, e) => s + e.ml, 0) : 0,
    doses: on('med') ? day.filter(e => e.kind === 'med' && !e.skipped).length : 0,
    care: Object.keys(CARE_WORDS).filter(on).map(k => [k, day.filter(e => e.kind === k).length]).filter(([, n]) => n),
    // Peso: o último antes do período e o último dentro dele, para dizer de quanto para quanto.
    wFrom: weights.filter(w => w.measured_on < A).at(-1) || null,
    wTo: weights.filter(w => w.measured_on >= A && w.measured_on <= Z).at(-1) || null,
    marks: milestones.filter(m => m.happened_on >= A && m.happened_on <= Z),
  };
}

const careText = s => s.care.map(([k, n]) => plural(n, ...CARE_WORDS[k])).join(', ');

// As linhas do resumo, iguais na tela e no texto.
function lines(s) {
  const out = [];
  const feedBits = [s.bottleMl ? liters(s.bottleMl) + ' na mamadeira' : '', s.breastMs ? hours(s.breastMs) + ' no peito' : ''].filter(Boolean);
  if (s.feeds) out.push(['feed', plural(s.feeds, 'mamada', 'mamadas') + (feedBits.length ? ': ' + feedBits.join(' e ') : '')]);
  if (s.slept) out.push(['sleep', hours(s.slept) + ' de sono' + (s.longest ? '; o maior sono seguido foi de ' + dur(s.longest[1] - s.longest[0]) : '')]);
  if (s.diapers) out.push(['diaper', plural(s.diapers, 'fralda', 'fraldas') + ', ' + s.poos + ' com cocô']);
  if (s.pumpMl) out.push(['pump', liters(s.pumpMl) + ' de leite ordenhado']);
  if (s.doses) out.push(['med', plural(s.doses, 'dose de remédio dada', 'doses de remédio dadas')]);
  if (s.care.length) out.push(['care', 'Cuidados: ' + careText(s)]);
  if (s.wTo) out.push(['weight', 'Peso: ' + (s.wFrom ? 'de ' + kg(s.wFrom.grams) + ' (' + shortDate(s.wFrom.measured_on) + ') para ' : '') + kg(s.wTo.grams) + ' (' + shortDate(s.wTo.measured_on) + ')']);
  if (s.marks.length) out.push(['mark', (s.marks.length === 1 ? 'Marco: ' : 'Marcos: ') + s.marks.map(m => m.title + ' (' + shortDate(m.happened_on) + ')').join(', ')]);
  return out;
}

// title: "Setembro de Marina, até 27 set" ("de", como no resto do app: o nome não diz se é da ou do).
// span: "mês" ou "semana", para o parabéns do fim.
export function reportText(s, { title, name, span }) {
  return title + ', pelo Caderninho:\n' + lines(s).map(([, t]) => '• ' + t).join('\n')
    + `\nParabéns a quem cuida de ${name} por mais ${span === 'mês' ? 'um mês' : 'uma semana'} de cuidado!`;
}

const TILE = { feed: '--c-feed', sleep: '--c-sleep', diaper: '--c-diaper', pump: '--c-pump' };
// Cartão do mês: os números grandes e a lista, e o botão de compartilhar.
export function monthHtml(s, { heading, cap }) {
  if (!s.any) return `<div class="card"><h3>${esc(heading)}</h3><div class="empty">Nada registrado neste mês.</div></div>`;
  const tile = (c, k, big, sub) => `<div class="tile" style="--sw:var(${c})"><span class="k"><i></i>${k}</span><b>${esc(big)}</b><span>${esc(sub)}</span></div>`;
  let h = `<div class="card"><h3>${esc(heading)}</h3><p class="cap">${esc(cap)}</p><div class="tiles">`;
  h += s.bottleMl ? tile(TILE.feed, 'Na mamadeira', liters(s.bottleMl), 'em ' + plural(s.bottles, 'mamadeira', 'mamadeiras')) : '';
  h += tile(TILE.feed, 'Mamadas', String(s.feeds), s.breastMs ? hours(s.breastMs) + ' no peito' : '');
  h += tile(TILE.sleep, 'Sono', hours(s.slept), s.longest ? 'maior seguido: ' + dur(s.longest[1] - s.longest[0]) : '');
  h += tile(TILE.diaper, 'Fraldas', String(s.diapers), s.poos + ' com cocô');
  if (s.pumpMl) h += tile(TILE.pump, 'Ordenhado', liters(s.pumpMl), '');
  h += '</div>';
  const extra = [];
  if (s.doses) extra.push(['Remédios', plural(s.doses, 'dose dada', 'doses dadas')]);
  if (s.care.length) extra.push(['Cuidados', careText(s)]);
  if (s.wTo) extra.push(['Peso', (s.wFrom ? kg(s.wFrom.grams) + ' → ' : '') + kg(s.wTo.grams)]);
  if (s.marks.length) extra.push([s.marks.length === 1 ? 'Marco' : 'Marcos', s.marks.map(m => m.title).join(', ')]);
  if (extra.length) h += `<div class="hl">${extra.map(([k, v]) => `<div><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('')}</div>`;
  return h + '</div>';
}

// Prévia da mensagem e os botões de compartilhar e copiar.
export function shareHtml(text, { heading = 'Mandar para a família', note = '' } = {}) {
  return `<div class="card"><h3>${esc(heading)}</h3>${note ? `<p class="cap">${esc(note)}</p>` : ''}<div class="msgbox">${esc(text)}</div>
    <div class="row2">${typeof navigator !== 'undefined' && navigator.share ? '<button class="save" data-share="share">Compartilhar</button>' : ''}<button class="ghost" data-share="copy">Copiar texto</button></div>
    <p class="foot">Só soma o que foi registrado no Caderninho.</p></div>`;
}
