// Janela de sono (item 60; 1ª etapa, prévia aprovada em 13/11: https://claude.ai/artifact/RYPyjm5Z4ARWtnvXJrmffU;
// 2ª etapa, a janela do próprio bebê e o contador de dias do item 73, prévia 13 aprovada em 16/11:
// https://claude.ai/artifact/3q6Hzf8QKppDALfn8DBthA).
// Com o bebê acordado, o cartão do bebê mostra há quanto tempo e, até 12 meses, a faixa da referência da
// idade em duração (nunca hora no relógio). Sem estado: o app.js passa a hora do "Acordou", o nascimento
// e menina ou menino. Os textos foram aprovados palavra por palavra pelo Patrick em 13/11.
import { MIN, HOUR, pad, startOfDay, addDays } from './util.js';
import { NIGHT_START, NIGHT_END } from './noite.js';

// Tempo acordado entre um sono e outro, por idade, da Cleveland Clinic ("Wake Windows by Age",
// https://health.clevelandclinic.org/wake-windows-by-age, 25/04/2024, conferido em 13/11/2026), em
// minutos. Cada linha vale até o mês da frente (sem incluir). 4 a 5 meses não está na fonte: média das
// vizinhas (3 a 4 meses e 5 a 7 meses), decisão do Patrick em 13/11. De 12 meses em diante, sem faixa:
// só o contador (a fonte vai até 12 meses; o Patrick decidiu o mesmo até 18 meses e depois).
const REF = [[1, 30, 60], [3, 60, 120], [4, 75, 150], [5, 100, 195], [7, 120, 240], [10, 150, 270], [12, 180, 360]];

// Meses completos no dia de "now" (como o ageText do util.js). Sem nascimento ou nascimento depois de hoje: null.
export function monthsOld(birth, now) {
  if (!birth) return null;
  const b = new Date(birth + 'T00:00'), n = new Date(now);
  if (n.getTime() < b.getTime()) return null;
  let m = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth();
  if (n.getDate() < b.getDate()) m--;
  return Math.max(0, m);
}
// A faixa da idade em ms, [de, até], ou null (sem nascimento, ou 12 meses ou mais).
export function wakeRef(birth, now) {
  const m = monthsOld(birth, now); if (m === null) return null;
  const r = REF.find(x => m < x[0]);
  return r ? [r[1] * MIN, r[2] * MIN] : null;
}

// "45 min", "1h", "1h20": como nos textos aprovados (sem o "1h00" do dur do util.js).
export function fmtDur(ms) {
  const m = Math.max(0, Math.round(ms / MIN));
  if (m < 60) return m + ' min';
  return Math.floor(m / 60) + 'h' + (m % 60 ? pad(m % 60) : '');
}

// As palavras que mudam com menina ou menino; sem anotar, a forma com barra (Patrick, 13/11 e 16/11).
export function forms(sex) {
  return sex === 'F' ? { ac: 'acordada', cans: 'cansada', art: 'A ', da: 'da', dela: 'dela', propria: 'própria' }
       : sex === 'M' ? { ac: 'acordado', cans: 'cansado', art: 'O ', da: 'do', dela: 'dele', propria: 'próprio' }
       : { ac: 'acordado/a', cans: 'cansado/a', art: '', da: 'do/a', dela: 'dele/a', propria: 'próprio/a' };
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// O momento da janela: antes dela, dentro, nos 15 min do fim, ou depois.
const LAST = 15 * MIN;
export function winPhase(awake, ref) {
  return awake < ref[0] ? 'antes' : awake < ref[1] - LAST ? 'dentro' : awake <= ref[1] ? 'fim' : 'depois';
}

// A frase da faixa (9.1 a 9.4 e 9.6). Devolve HTML: a segunda parte vai em negrito leve.
// near (perto da noite, nearNight): 'direto' mostra só o "Acordada há"; 'soneca' troca a faixa pela frase.
export const NAP_LATE_TEXT = 'Uma soneca agora pode atrapalhar o sono da noite.';
export function winText(awake, ref, sex, near) {
  const f = forms(sex), head = cap(f.ac) + ' há ' + fmtDur(awake);
  if (!ref || near === 'direto') return head;
  if (near === 'soneca') return head + '<span class="hwn">' + NAP_LATE_TEXT + '</span>';
  const ph = winPhase(awake, ref);
  const tail = ph === 'antes' ? 'Janela de sono em <b>' + fmtDur(ref[0] - awake) + '</b>'
    : ph === 'dentro' ? '<b>Pode estar com sono</b>'
    : ph === 'fim' ? '<b>Pode estar com bastante sono</b>'
    : '<b>Pode estar ficando ' + f.cans + '</b>';
  return head + ' · ' + tail;
}

// A régua pequena (9.5): a faixa (do bebê ou da idade), o ponto de agora e só os números nas marcas.
export function rulerHtml(awake, ref) {
  const max = ref[1] * 1.5, pc = x => (Math.min(x, max) / max * 100).toFixed(1);
  const a = pc(ref[0]), z = pc(ref[1]);
  return `<span class="ruler" aria-hidden="true"><i class="trk"></i><i class="rng" style="left:${a}%;width:${(z - a).toFixed(1)}%"></i>`
    + `<i class="now" style="left:${pc(awake)}%"></i>`
    + `<span class="tk" style="left:${a}%">${fmtDur(ref[0])}</span><span class="tk" style="left:${z}%">${fmtDur(ref[1])}</span></span>`;
}

/* ---------- a janela do próprio bebê (2ª etapa, decidida em 16/11) ---------- */
// O dia do bebê vai do fim ao começo da noite que vale na data (babies.night, item 65; sem horário
// anotado, 18h às 6h). rule é o nightRule do noite.js; d, o início do dia (ms).
export function dayBounds(rule, d) {
  const c = rule(d) || { start: NIGHT_START, end: NIGHT_END }, p = rule(addDays(d, -1)) || { end: NIGHT_END };
  return { day0: d + p.end * HOUR, night: d + c.start * HOUR };
}
// As sonecas de dia do dia d, com o sono de antes (sleeps: sonos [início, fim] terminados, em ordem).
// Soneca: começa depois do fim da noite de antes e termina até o começo da noite (o sono que passa do
// começo conta inteiro como noite, como no noite.js).
function napsWithPrev(sleeps, rule, d) {
  const { day0, night } = dayBounds(rule, d), out = [];
  for (let i = 0; i < sleeps.length; i++) {
    const [x, y] = sleeps[i];
    if (x >= day0 && x < night && y <= night) out.push({ nap: sleeps[i], prev: i ? sleeps[i - 1] : null, day0 });
  }
  return out;
}
// Despertar curto (decisão do Patrick em 16/11, depois da simulação com dados reais): acordar por menos de
// 15 min e voltar a dormir é interrupção do sono, não janela. Só para a conta da janela: os sonos com um
// despertar curto entre eles viram um só, do primeiro "Dormiu" ao último "Acordou" (em cadeia). Os totais
// de sono, o Diário, as Tendências e o relatório seguem com os sonos como foram anotados.
export const WAKE_SHORT = 15 * MIN;
export function mergeShort(sleeps) {
  const out = [];
  for (const [x, y] of sleeps) {
    const p = out[out.length - 1];
    if (p && x - p[1] < WAKE_SHORT) p[1] = Math.max(p[1], y);
    else out.push([x, y]);
  }
  return out;
}
// As janelas que contam no dia d, em ms: do "Acordou" de dia (o fim do sono de antes, depois do fim da
// noite) até o "Dormiu" de uma soneca de dia, de 15 min (WAKE_SHORT) a 6 h. A que termina no sono da noite
// fica fora. sleeps já com os despertares curtos juntados (mergeShort).
export const WIN_MIN = WAKE_SHORT, WIN_MAX = 6 * HOUR;
export function dayWindows(sleeps, rule, d) {
  const out = [];
  for (const { nap, prev, day0 } of napsWithPrev(sleeps, rule, d)) {
    if (!prev || prev[1] < day0) continue;
    const w = nap[0] - prev[1];
    if (w >= WIN_MIN && w <= WIN_MAX) out.push(w);
  }
  return out;
}
// Percentil com interpolação linear (P25 = 0,25), sobre uma lista de números.
export function pct(list, p) {
  const s = [...list].sort((a, b) => a - b), i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}
const r5 = m => Math.round(m / 5) * 5;
// A faixa do bebê a partir das janelas (ms): centro na mediana; largura do P25 ao P75, de 45 min a 1h30,
// centrada na mediana; nunca começa antes de 30 min (se cair antes, começa aos 30 com a mesma largura);
// começo e fim arredondados de 5 em 5 min. Devolve [de, até] em ms, com a mediana (sem arredondar, em ms)
// em .med, para a regra perto da noite.
export function ownWindow(ws) {
  const m = ws.map(x => x / MIN), med = pct(m, .5);
  const w = Math.min(Math.max(pct(m, .75) - pct(m, .25), 45), 90);
  let s = med - w / 2, e = med + w / 2;
  if (s < 30) { s = 30; e = 30 + w; }
  const r = [r5(s) * MIN, r5(e) * MIN];
  r.med = med * MIN;
  return r;
}
// A janela que o app usa para o bebê agora. Dados: os últimos 7 dias (hoje e os 6 de antes), se houver 5
// ou mais dias com soneca de dia que conta; senão, os últimos 14 com 5 ou mais; senão, a faixa da idade.
// Só até 12 meses (de 12 meses em diante e sem nascimento, só o contador, como na 1ª etapa).
// Devolve { ref, own, days, valid, nap, mid }: valid = dias que valem nos últimos 14 (contador do item 73);
// nap = soneca típica para a regra perto da noite (mediana das sonecas que começam a partir das 15h, se
// houver 5 ou mais, senão de todas, no máximo 1 h; null sem sonecas); mid = o centro da janela para o
// "direto até a noite" de 3 meses em diante (a mediana do bebê, ou o meio da faixa da idade; null abaixo
// de 3 meses). Os sonos entram com os despertares curtos juntados (mergeShort).
export const NEED_DAYS = 5, MID_MONTHS = 3;
export function babyWin(sleeps, rule, birth, now) {
  const age = wakeRef(birth, now);
  if (!age) return { ref: null, own: false, days: 0, valid: 0, nap: null, mid: null };
  sleeps = mergeShort(sleeps);
  const today = startOfDay(now), per = [];
  for (let k = 0; k < 14; k++) per.push(dayWindows(sleeps, rule, addDays(today, -k)));
  const count = n => per.slice(0, n).filter(x => x.length).length;
  const valid = count(14), days = count(7) >= NEED_DAYS ? 7 : valid >= NEED_DAYS ? 14 : 0;
  const ws = days ? per.slice(0, days).flat() : [];
  const naps = [];
  for (let k = 0; k < (days || 14); k++) for (const { nap } of napsWithPrev(sleeps, rule, addDays(today, -k))) naps.push(nap);
  const late = naps.filter(([x]) => new Date(x).getHours() >= 15);
  const use = late.length >= 5 ? late : naps;
  const nap = use.length ? Math.min(pct(use.map(([x, y]) => y - x), .5), HOUR) : null;
  const ref = days ? ownWindow(ws) : age;
  const mid = monthsOld(birth, now) < MID_MONTHS ? null : days ? ref.med : (age[0] + age[1]) / 2;
  return { ref, own: !!days, days, valid, nap, mid };
}
// Perto da noite (A = hora do "Acordou", N = começo da noite daquele dia, nap = soneca típica, mid = o
// centro do babyWin): 'direto' se dá para ir até a noite dentro da janela (N − A ≤ até; de 3 meses em
// diante, até o maior entre o fim da janela e 1,5 × o centro, decisão de 16/11): só o "Acordada há", sem
// faixa, frase nem aviso; 'soneca' se uma soneca no começo da janela acabaria a menos de `de` da noite
// (N − (A + de + nap) < de): a frase no lugar da faixa, sem aviso; null no resto do dia.
export function nearNight(A, ref, N, nap, mid = null) {
  if (!ref) return null;
  if (N - A <= (mid == null ? ref[1] : Math.max(ref[1], 1.5 * mid))) return 'direto';
  if (nap != null && N - (A + ref[0] + nap) < ref[0]) return 'soneca';
  return null;
}
// O começo da noite do dia em que o bebê acordou.
export const nightOf = (rule, wake) => dayBounds(rule, startOfDay(wake)).night;

// O aviso no celular (16/11): um por soneca, 5 min antes do começo da janela, nunca antes de 30 min
// acordado (aí chega aos 30, com a frase do começo), só durante o dia do bebê, e nunca perto da noite.
// wake: a hora do "Acordou" (ms); w: o babyWin; rule: o nightRule. Devolve { at, title, body } ou null.
export const NOTICE_BEFORE = 5 * MIN, NOTICE_FLOOR = 30 * MIN;
export function winNotice(wake, w, baby, rule) {
  const ref = w?.ref; if (!ref) return null;
  if (nearNight(wake, ref, nightOf(rule, wake), w.nap, w.mid)) return null;
  const at0 = wake + ref[0] - NOTICE_BEFORE, floor = at0 < wake + NOTICE_FLOOR, at = floor ? wake + NOTICE_FLOOR : at0;
  const { day0, night } = dayBounds(rule, startOfDay(at));
  if (at < day0 || at >= night) return null;
  const f = forms(baby.sex);
  return floor ? { at, title: f.art + baby.name + ' pode estar com sono', body: 'Começou a janela de sono.' }
               : { at, title: f.art + baby.name + ' pode estar ficando com sono', body: 'Janela de sono em 5 min.' };
}

/* ---------- textos da 2ª etapa (aprovados palavra por palavra em 16/11) ---------- */
// Contador do item 73, antes dos 5 dias: 5 bolinhas (os dias que valem nos últimos 14) e a frase.
export function counterHtml(valid, baby) {
  const f = forms(baby.sex), n = Math.max(1, NEED_DAYS - valid), on = Math.min(valid, NEED_DAYS);
  const dots = Array.from({ length: NEED_DAYS }, (_, i) => `<i${i < on ? ' class="on"' : ''}></i>`).join('');
  const txt = (n === 1 ? 'Falta 1 dia' : 'Faltam ' + n + ' dias') + ' de sonecas anotadas para a janela vir dos registros ' + f.da + ' ' + baby.name + '.';
  return `<span class="hwc"><span class="wdots" aria-hidden="true">${dots}</span><span>${txt}</span></span>`;
}
// Aviso de novidade (uma vez por pessoa) e mensagem da troca de faixa (uma vez, ao passar da idade).
export const novTitle = b => 'Novidade: a janela de sono ' + forms(b.sex).da + ' ' + b.name;
export function novText(b, own) {
  const f = forms(b.sex);
  return (own ? 'Agora o Soneca mostra a janela de sono a partir dos registros ' + f.da + ' ' + f.propria + ' ' + b.name + '.'
              : 'Agora o Soneca vai passar a mostrar a janela de sono a partir dos registros ' + f.da + ' ' + b.name + ' quando houver 5 dias de sono anotados.')
    + ' Para desligar, vá em Família > Sono.';
}
export const NOV_ASK = 'Avisar no celular quando a janela de sono estiver chegando?';
export const swapTitle = b => 'A janela de sono ' + forms(b.sex).da + ' ' + b.name + ' mudou';
export function swapText(b, ref) {
  const f = forms(b.sex);
  return 'Agora ela vem dos registros ' + f.dela + ': ' + fmtDur(ref[0]) + ' a ' + fmtDur(ref[1]) + ' ' + f.ac + '. Antes, era a referência para a idade.';
}

// Um "Acordou" de mais de 12 horas atrás não vira contador: faltou anotar um sono.
export const WAKE_MAX = 12 * HOUR;
