// Janela de sono (item 60, prévia aprovada em 13/11: https://claude.ai/artifact/RYPyjm5Z4ARWtnvXJrmffU).
// Com o bebê acordado, o cartão do bebê mostra há quanto tempo e, até 12 meses, a faixa da referência da
// idade em duração (nunca hora no relógio). Sem estado: o app.js passa a hora do "Acordou", o nascimento
// e menina ou menino. Os textos foram aprovados palavra por palavra pelo Patrick em 13/11.
import { MIN, HOUR, pad } from './util.js';

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

// As palavras que mudam com menina ou menino; sem anotar, a forma com barra (Patrick, 13/11).
export function forms(sex) {
  return sex === 'F' ? { ac: 'acordada', cans: 'cansada', art: 'A ' }
       : sex === 'M' ? { ac: 'acordado', cans: 'cansado', art: 'O ' }
       : { ac: 'acordado/a', cans: 'cansado/a', art: '' };
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// O momento da janela: antes dela, dentro, nos 15 min do fim, ou depois.
const LAST = 15 * MIN;
export function winPhase(awake, ref) {
  return awake < ref[0] ? 'antes' : awake < ref[1] - LAST ? 'dentro' : awake <= ref[1] ? 'fim' : 'depois';
}

// A frase da faixa (9.1 a 9.4 e 9.6). Devolve HTML: a segunda parte vai em negrito leve.
export function winText(awake, ref, sex) {
  const f = forms(sex), head = cap(f.ac) + ' há ' + fmtDur(awake);
  if (!ref) return head;
  const ph = winPhase(awake, ref);
  const tail = ph === 'antes' ? 'Janela de sono em <b>' + fmtDur(ref[0] - awake) + '</b>'
    : ph === 'dentro' ? '<b>Pode estar com sono</b>'
    : ph === 'fim' ? '<b>Pode estar com bastante sono</b>'
    : '<b>Pode estar ficando ' + f.cans + '</b>';
  return head + ' · ' + tail;
}

// A régua pequena (9.5): a faixa da idade, o ponto de agora e só os números nas marcas.
export function rulerHtml(awake, ref) {
  const max = ref[1] * 1.5, pc = x => (Math.min(x, max) / max * 100).toFixed(1);
  const a = pc(ref[0]), z = pc(ref[1]);
  return `<span class="ruler" aria-hidden="true"><i class="trk"></i><i class="rng" style="left:${a}%;width:${(z - a).toFixed(1)}%"></i>`
    + `<i class="now" style="left:${pc(awake)}%"></i>`
    + `<span class="tk" style="left:${a}%">${fmtDur(ref[0])}</span><span class="tk" style="left:${z}%">${fmtDur(ref[1])}</span></span>`;
}

// O aviso no celular (10.1 e 10.2): um por soneca, 15 min antes do começo da janela, só entre 6h e 18h.
// wake: a hora do "Acordou" (ms). Devolve { at, title, body } ou null.
export const NOTICE_BEFORE = 15 * MIN;
export function winNotice(wake, ref, baby) {
  if (!ref) return null;
  const at = wake + ref[0] - NOTICE_BEFORE, h = new Date(at).getHours();
  if (h < 6 || h >= 18) return null;
  const f = forms(baby.sex);
  return { at, title: f.art + baby.name + ' pode estar ficando com sono',
           body: cap(f.ac) + ' há ' + fmtDur(ref[0] - NOTICE_BEFORE) + '. A janela de sono começa em 15 min.' };
}

// Um "Acordou" de mais de 12 horas atrás não vira contador: faltou anotar um sono.
export const WAKE_MAX = 12 * HOUR;
