// "Como foram as noites" (aba Mês, decidido com o Patrick em 01/11; prévia aprovada:
// https://claude.ai/artifact/8rsozCzxU6Xvv1bMyW721b). Compara as noites de 6 h seguidas ou mais com
// as outras do mês, contando em quantas noites algo aconteceu, e resume os despertares do mês. Só põe
// lado a lado: não procura associações nem diz o que ajuda o bebê a dormir (CONTEXT.md).
//   Noite: o sono que começa entre 18h e 6h. Soneca: o sono que começa entre 6h e 18h.
//   Hora de dormir: o primeiro sono de mais de 3 h da noite (02/11; antes era o primeiro sono, e o
//   cochilo do começo da noite virava a hora de dormir). Prévia: https://claude.ai/artifact/WPDLkEEwTS78BkJ3HbGwZL
//   Despertar: um "acordou" entre a hora de dormir e as 6h seguido de outro "dormiu" antes das 6h.
//   Noite sem sono de mais de 3 h: conta nas noites de 6 h e nos despertares (a partir de 0h),
//   mas fica fora das linhas de "antes de dormir".
//   Noites de 6 h: todas as de maior sono seguido de 6 h ou mais, contra as de menos (02/11; antes eram
//   só as 7 mais longas). Cada lado precisa de pelo menos 3 noites; senão, só a contagem.
//   Os despertares (02/11, no lugar da comparação das noites com 2 ou mais): quantos, o tempo médio do
//   "acordou" ao "dormiu" seguinte, em quantos mamou e em quantos teve sintoma ou vômito anotado nesse
//   intervalo, com o nome de cada sintoma. Desde 02/11 (pedido da Carol), também em quantas noites houve
//   despertar e a média de despertares só nessas noites.
//   As noites com mais despertares e o que veio antes (02/11, pedido da Carol, no formato de "Os maiores
//   sonos" da aba Semana): as 3 do mês com mais despertares (empate: a mais recente primeiro), com a hora
//   de dormir, a última mamada e o último cocô antes dela. Noite sem sono de mais de 3 h: o primeiro sono.
//   Prévia aprovada em 02/11: https://claude.ai/artifact/W9ZLLSQzxCtDCrJ5JxEzoq
import { HOUR, esc, dur, hm, addDays, label, MESES, MESES_L, SYMPTOM } from './util.js';
import { before, beforeLine } from './week.js';

const LONG = 6 * HOUR, BED = 3 * HOUR, FEW = 3, MAX_SLEEP = 14 * HOUR;
const at = (d0, h) => d0 + h * HOUR; // d0 é início do dia; ok para 6h e 18h (a troca de horário é à meia-noite)

// Uma noite por dia d: os sonos que começam em [d 18h, d+1 6h).
// Também usada por Tendências (tendencias.js), que precisa dos sonos de cada noite (ns).
export function nights(a, z, evs, sleeps, now) {
  const out = [], ivs = sleeps.filter(([x, y]) => y - x <= MAX_SLEEP);
  const feeds = evs.filter(e => e.kind === 'feed'), baths = evs.filter(e => e.kind === 'bath');
  const syms = evs.filter(e => e.kind === 'symptom' || e.kind === 'vomit');
  for (let d = a; d < z; d = addDays(d, 1)) {
    const d1 = addDays(d, 1), w0 = at(d, 18), w1 = at(d1, 6);
    if (w1 > now) break;
    const ns = ivs.filter(([x]) => x >= w0 && x < w1);
    if (!ns.length) continue;
    const main = ns.find(([x, y]) => y - x > BED), bed = main ? main[0] : null, from = bed ?? d1;
    const longest = Math.max(...ns.map(([x, y]) => y - x));
    // Cada despertar: do "acordou" (y) ao "dormiu" seguinte (back).
    const wakes = ns.flatMap(([x, y], i) => {
      if (!(x >= from && y >= from && y < w1 && ns[i + 1])) return [];
      const back = ns[i + 1][0], inWake = e => e.t >= y && e.t < back;
      return [{ awake: back - y, fed: feeds.some(inWake), syms: syms.filter(inWake).map(e => e.kind === 'vomit' ? 'Vômito' : SYMPTOM[e.symptom] || 'Outro') }];
    });
    if (bed === null) {
      out.push({ d, t0: ns[0][0], hasBed: false, ns, longest, wakes, late: null, bath: null, feedSoon: null, napGap: null, ml: null, breast: null, nap: null });
      continue;
    }
    // O dia que veio antes: das 6h até a hora de dormir.
    const day0 = at(d, 6), dayEvs = evs.filter(e => e.t >= day0 && e.t < bed);
    const naps = ivs.filter(([x, y]) => x >= day0 && x < at(d, 18) && y <= bed);
    const dayFeeds = dayEvs.filter(e => e.kind === 'feed');
    const lastFeed = feeds.filter(e => e.t < bed && e.t >= bed - 24 * HOUR).at(-1);
    const any = dayEvs.length > 0 || naps.length > 0;
    out.push({
      d, t0: bed, hasBed: true, ns, longest, wakes,
      late: (bed - d) > 20 * HOUR,
      bath: baths.some(e => e.t >= bed - 3 * HOUR && e.t <= bed),
      feedSoon: lastFeed ? bed - lastFeed.t < 2 * HOUR : null,
      napGap: naps.length ? bed - naps.at(-1)[1] >= 2 * HOUR : null,
      ml: any ? dayFeeds.filter(e => e.src === 'bottle').reduce((s, e) => s + (e.ml || 0), 0) : null,
      breast: any ? dayFeeds.reduce((s, e) => s + (e.left_min || 0) + (e.right_min || 0), 0) : null,
      nap: any ? naps.reduce((s, [x, y]) => s + y - x, 0) : null,
    });
  }
  return out;
}

const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
// As linhas: cada uma diz, para uma noite, sim, não ou null (sem registro para saber).
function rows(all, evs, a, z) {
  const r = [['Foi dormir depois das 20h', n => n.late]];
  if (evs.some(e => e.kind === 'bath' && e.t >= a && e.t < z)) r.push(['Banho nas 3 h antes de dormir', n => n.bath]);
  r.push(['Mamou menos de 2 h antes de dormir', n => n.feedSoon], ['Acordou da última soneca 2 h ou mais antes de dormir', n => n.napGap]);
  for (const [k, txt, fmt] of [['ml', 'Mamadeira', v => Math.round(v) + ' ml'], ['breast', 'Peito', v => Math.round(v) + ' min'], ['nap', 'Sono de dia', v => dur(v)]]) {
    const vs = all.map(n => n[k]).filter(v => v !== null);
    if (!vs.some(v => v > 0)) continue;
    const m = mean(vs);
    r.push([txt + ' acima da média do mês <em>(' + esc(fmt(m)) + ')</em>', n => n[k] === null ? null : n[k] > m]);
  }
  return r;
}

const pct = (x, n) => Math.round(100 * x / n);
const val = (x, n, cls, col) => `<div class="nt-v"><b class="${cls}">${x} de ${n} (${pct(x, n)}%)</b><span class="nt-bar"><i style="width:${pct(x, n)}%;background:var(${col})"></i></span></div>`;
function group(title, keyA, keyB, inA, rest, rs) {
  const items = rs.map(([txt, f]) => {
    const ya = inA.map(f).filter(v => v !== null), yb = rest.map(f).filter(v => v !== null);
    if (!ya.length || !yb.length) return '';
    return `<div class="nt-it"><p>${txt}</p>${val(ya.filter(Boolean).length, ya.length, 'nt-a', '--c-sleep')}${val(yb.filter(Boolean).length, yb.length, 'nt-b', '--curve-mid')}</div>`;
  }).join('');
  return `<div class="nt-g"><h4>${title}</h4><div class="nt-key"><span><i class="nt-ia"></i>${keyA}</span><span><i class="nt-ib"></i>${keyB}</span></div>${items}</div>`;
}
const fewBox = (title, text) => `<div class="nt-g"><h4>${title}</h4><p class="nt-few">${text}</p></div>`;
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

// Os despertares do mês, sem comparar: tempo até voltar a dormir, mamada e sintoma.
function wakesBox(all, month) {
  const T = 'Os despertares', ws = all.flatMap(n => n.wakes), W = ws.length;
  if (!W) return fewBox(T, `Nenhum despertar anotado em ${month}.`);
  const sym = ws.filter(w => w.syms.length).length, counts = {};
  for (const s of ws.flatMap(w => w.syms)) counts[s] = (counts[s] || 0) + 1;
  const list = Object.entries(counts).sort((x, y) => y[1] - x[1]).map(([s, c]) => `${esc(s)} (${c})`).join(', ');
  const withW = all.filter(n => n.wakes.length).length, perNight = (W / withW).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return `<div class="nt-g"><h4>${T}</h4><p class="nt-sub">${plural(W, 'despertar', 'despertares')} em ${plural(all.length, 'noite', 'noites')}.</p>
    <div class="nt-it"><p>Noites com despertar</p>${val(withW, all.length, 'nt-a', '--c-sleep')}</div>
    <div class="nt-it"><p>Média nas noites com despertar</p><div class="nt-v1"><b class="nt-a">${perNight} por noite</b></div></div>
    <div class="nt-it"><p>Tempo médio até voltar a dormir</p><div class="nt-v1"><b class="nt-a">${dur(mean(ws.map(w => w.awake)))}</b></div></div>
    <div class="nt-it"><p>Mamou durante o despertar</p>${val(ws.filter(w => w.fed).length, W, 'nt-a', '--c-sleep')}</div>
    <div class="nt-it"><p>Sintoma anotado durante o despertar</p>${val(sym, W, 'nt-a', '--c-sleep')}${list ? `<p class="nt-sym">${list}</p>` : ''}</div></div>`;
}

// "noite de 14 para 15 out"; na virada do mês, "noite de 31 out para 1 nov".
export function nightName(d) {
  const x = new Date(d), y = new Date(addDays(d, 1));
  return 'noite de ' + x.getDate() + (x.getMonth() === y.getMonth() ? '' : ' ' + MESES[x.getMonth()]) + ' para ' + y.getDate() + ' ' + MESES[y.getMonth()];
}
// As 3 noites com mais despertares e o que veio antes, como "Os maiores sonos" da aba Semana.
function topWakes(all, evs) {
  const top = all.filter(n => n.wakes.length).sort((x, y) => y.wakes.length - x.wakes.length || y.d - x.d).slice(0, 3);
  if (!top.length) return '';
  const feeds = evs.filter(e => e.kind === 'feed'), poos = evs.filter(e => e.kind === 'diaper' && e.poo);
  const item = n => {
    const f = before(feeds, n.t0);
    return `<button class="lsi" data-open="${n.d}"><b>${plural(n.wakes.length, 'despertar', 'despertares')} · ${nightName(n.d)}</b>
      <span class="lsl"><i style="--sw:var(--c-sleep)"></i><span><em>${n.hasBed ? 'Hora de dormir' : 'Primeiro sono'}:</em> ${hm(n.t0)}</span></span>
      ${beforeLine('--c-feed', 'Última mamada', f, n.t0, f ? ' · ' + label(f, evs) : '')}${beforeLine('--c-poo', 'Último cocô', before(poos, n.t0), n.t0)}</button>`;
  };
  return `<div class="nt-g"><h4>As noites com mais despertares e o que veio antes</h4>
    <p class="nt-sub">Com a hora de dormir, a última mamada e o último cocô registrados antes. Toque para ver o dia.</p>
    <div class="ls">${top.map(item).join('')}</div></div>`;
}

// a, z: o mês [a, z). sleeps: os sonos fechados, [dormiu, acordou].
export function nightsHtml({ a, z, evs, sleeps, now }) {
  const all = nights(a, z, evs, sleeps, now), N = all.length;
  if (!N) return '';
  const rs = rows(all, evs, a, z);
  const T1 = 'As noites com 6 h seguidas ou mais', month = MESES_L[new Date(a).getMonth()];
  const top = all.filter(n => n.longest >= LONG), rest = all.filter(n => n.longest < LONG);
  const g1 = top.length < FEW ? fewBox(T1, `Ainda são poucas noites com 6 horas seguidas para comparar: ${top.length} de ${N}.`)
    : rest.length < FEW ? fewBox(T1, `Dormiu 6 horas seguidas ou mais em ${top.length} de ${N} noites. São poucas as outras para comparar.`)
    : group(T1, `${top.length} noites com 6 h ou mais`, `${rest.length} noites com menos de 6 h`, top, rest, rs);
  return `<div class="card nt"><h3>Como foram as noites</h3>
    <p class="cap">${month}, ${N === 1 ? '1 noite' : N + ' noites'} com sono anotado.</p>
    <div class="nt-defs"><p><b>Hora de dormir:</b> o primeiro sono de mais de 3&nbsp;h que começa entre 18h e 6h.</p><p><b>Despertar:</b> acordou e voltou a dormir entre a hora de dormir e as 6h.</p></div>
    ${g1}${wakesBox(all, month.toLowerCase())}${topWakes(all, evs)}<p class="foot">Só põe lado a lado o que foi anotado. Poucas noites não bastam para dizer o que ajuda o bebê a dormir.</p></div>`;
}
