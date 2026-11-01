// "Como foram as noites" (aba Mês, decidido com o Patrick em 01/11; prévia aprovada:
// https://claude.ai/artifact/8rsozCzxU6Xvv1bMyW721b). Compara grupos fixos de noites com as outras
// do mês, contando em quantas noites algo aconteceu. Só põe lado a lado: não procura associações nem
// diz o que ajuda o bebê a dormir (CONTEXT.md).
//   Noite: o sono que começa entre 18h e 6h. Madrugada: 0h às 6h; despertar é um "acordou" nesse
//   horário seguido de outro "dormiu" antes das 6h. Soneca: o sono que começa entre 6h e 18h.
//   Noites mais longas: as até 7 de maior sono seguido, só as de 6 h ou mais.
//   Cada lado precisa de pelo menos 3 noites; senão, só a contagem.
import { HOUR, esc, dur, addDays, MESES_L } from './util.js';

const LONG = 6 * HOUR, TOP = 7, FEW = 3, MAX_SLEEP = 14 * HOUR;
const at = (d0, h) => d0 + h * HOUR; // d0 é início do dia; ok para 6h e 18h (a troca de horário é à meia-noite)

// Uma noite por dia d: os sonos que começam em [d 18h, d+1 6h).
function nights(a, z, evs, sleeps, now) {
  const out = [], ivs = sleeps.filter(([x, y]) => y - x <= MAX_SLEEP);
  const feeds = evs.filter(e => e.kind === 'feed'), baths = evs.filter(e => e.kind === 'bath');
  for (let d = a; d < z; d = addDays(d, 1)) {
    const d1 = addDays(d, 1), w0 = at(d, 18), w1 = at(d1, 6);
    if (w1 > now) break;
    const ns = ivs.filter(([x]) => x >= w0 && x < w1);
    if (!ns.length) continue;
    const bed = ns[0][0];
    const wakes = ns.filter(([, y], i) => y >= d1 && y < w1 && ns[i + 1]).length;
    // O dia que veio antes: das 6h até a hora de dormir.
    const day0 = at(d, 6), dayEvs = evs.filter(e => e.t >= day0 && e.t < bed);
    const naps = ivs.filter(([x, y]) => x >= day0 && x < at(d, 18) && y <= bed);
    const dayFeeds = dayEvs.filter(e => e.kind === 'feed');
    const lastFeed = feeds.filter(e => e.t < bed && e.t >= bed - 24 * HOUR).at(-1);
    const any = dayEvs.length > 0 || naps.length > 0;
    out.push({
      longest: Math.max(...ns.map(([x, y]) => y - x)), wakes,
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
function group(title, keyA, inA, rest, rs) {
  const items = rs.map(([txt, f]) => {
    const ya = inA.map(f).filter(v => v !== null), yb = rest.map(f).filter(v => v !== null);
    if (!ya.length || !yb.length) return '';
    return `<div class="nt-it"><p>${txt}</p>${val(ya.filter(Boolean).length, ya.length, 'nt-a', '--c-sleep')}${val(yb.filter(Boolean).length, yb.length, 'nt-b', '--curve-mid')}</div>`;
  }).join('');
  return `<div class="nt-g"><h4>${title}</h4><div class="nt-key"><span><i class="nt-ia"></i>${keyA}</span><span><i class="nt-ib"></i>${rest.length} outras noites</span></div>${items}</div>`;
}
const fewBox = (title, text) => `<div class="nt-g"><h4>${title}</h4><p class="nt-few">${text}</p></div>`;

// a, z: o mês [a, z). sleeps: os sonos fechados, [dormiu, acordou].
export function nightsHtml({ a, z, evs, sleeps, now }) {
  const all = nights(a, z, evs, sleeps, now), N = all.length;
  if (!N) return '';
  const rs = rows(all, evs, a, z);
  const T1 = 'As noites mais longas', T2 = 'As noites com 2 ou mais despertares';
  const top = all.filter(n => n.longest >= LONG).sort((x, y) => y.longest - x.longest).slice(0, TOP);
  const g1 = top.length < FEW ? fewBox(T1, `Ainda são poucas noites com 6 horas seguidas para comparar: ${top.length} de ${N}.`)
    : N - top.length < FEW ? fewBox(T1, `Dormiu 6 horas seguidas ou mais em ${top.length} de ${N} noites. São poucas as outras para comparar.`)
    : group(T1, `${top.length} noites com 6 h ou mais`, top, all.filter(n => !top.includes(n)), rs);
  const bad = all.filter(n => n.wakes >= 2);
  const g2 = bad.length < FEW ? fewBox(T2, `Ainda são poucas noites com 2 ou mais despertares para comparar: ${bad.length} de ${N}.`)
    : N - bad.length < FEW ? fewBox(T2, `Acordou 2 ou mais vezes entre 0h e 6h em ${bad.length} de ${N} noites. São poucas as outras para comparar.`)
    : group(T2, `${bad.length} noites que acordou 2 ou mais vezes entre 0h e 6h`, bad, all.filter(n => n.wakes < 2), rs);
  return `<div class="card nt"><h3>Como foram as noites</h3>
    <p class="cap">${MESES_L[new Date(a).getMonth()]}, ${N === 1 ? '1 noite' : N + ' noites'} com sono anotado. Noite é o sono que começa entre 18h e 6h.</p>
    ${g1}${g2}<p class="foot">Só põe lado a lado o que foi anotado. Poucas noites não bastam para dizer o que ajuda o bebê a dormir.</p></div>`;
}
