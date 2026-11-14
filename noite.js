// A noite de cada bebê (item 65; decidido com o Patrick em 13/11; prévias aprovadas:
// https://claude.ai/artifact/8qdYxEkgAWJ5LdszNH7bMZ e https://claude.ai/artifact/MLAYnM3BS8u4eMxnp35AyL).
// A família diz o que é a noite: começo (16h a 23h) e fim (4h a 9h), de hora em hora; padrão 18h às 6h.
//   Do começo da noite em diante, todo sono é sono da noite. Um sono que começa antes e passa do começo
//   conta inteiro como noite. Os outros, entre o fim de uma noite e o começo da outra, são sonecas.
//   Despertar: acordar e voltar a dormir durante a noite, depois do primeiro sono dela.
//   Sai a regra do "primeiro sono de mais de 3 h": a hora de dormir é o primeiro sono da noite.
// Vale daqui para frente: babies.night (025) guarda desde quando vale cada horário, e os dias antes do
// primeiro horário ficam com a regra antiga (noites.js). Sem o 025, tudo fica na regra antiga.
// Não muda: o relatório do pediatra (regra fixa, por ora) e o aviso da janela de sono (6h às 18h).
import { HOUR, addDays, localDate } from './util.js';

export const NIGHT_START = 18, NIGHT_END = 6;
export const STARTS = [16, 17, 18, 19, 20, 21, 22, 23], ENDS = [4, 5, 6, 7, 8, 9];
export const ONB_STARTS = [18, 19, 20, 21, 22];   // a pergunta do onboarding (só o começo)
const okItem = x => x && /^\d{4}-\d{2}-\d{2}$/.test(x.from) && STARTS.includes(x.start) && ENDS.includes(x.end);

// A lista de horários do bebê, em ordem de data. Sem o 025 (ou estragada): vazia.
export function nightHist(b) {
  const h = Array.isArray(b?.night) ? b.night.filter(okItem) : [];
  return h.slice().sort((x, y) => x.from < y.from ? -1 : x.from > y.from ? 1 : 0);
}
// O horário de hoje (o último da lista) ou o padrão.
export function nightNow(b) {
  const x = nightHist(b).at(-1);
  return x ? { start: x.start, end: x.end } : { start: NIGHT_START, end: NIGHT_END };
}
export const isDefault = c => c.start === NIGHT_START && c.end === NIGHT_END;
// "20h às 6h"
export const nightText = c => c.start + 'h às ' + c.end + 'h';
// A lista depois de salvar um horário que vale a partir de hoje (troca o de hoje, se já houver).
export function nightSave(b, start, end, now) {
  const today = localDate(now);
  return [...nightHist(b).filter(x => x.from < today), { from: today, start, end }];
}

// A regra de cada dia: rule(d) devolve { start, end } da noite que começa no dia d (início do dia, em
// ms), ou null quando o dia é de antes do primeiro horário (regra antiga).
export function nightRule(b) {
  const h = nightHist(b);
  if (!h.length) return () => null;
  const memo = new Map();
  return d => {
    if (memo.has(d)) return memo.get(d);
    const ymd = localDate(d);
    let c = null;
    for (const x of h) if (x.from <= ymd) c = { start: x.start, end: x.end }; else break;
    memo.set(d, c);
    return c;
  };
}
export const OLD_RULE = () => null;

// Os limites do dia d: day0, o fim da noite de antes (o dia começa ali); w0 e w1, o começo e o fim da
// noite que começa em d. Na regra antiga, 6h e 18h. d é o início do dia; o Brasil não tem horário de verão.
export function bounds(rule, d) {
  const c = rule(d), p = rule(addDays(d, -1));
  return { c, day0: d + (p ? p.end : NIGHT_END) * HOUR, w0: d + (c ? c.start : NIGHT_START) * HOUR,
           w1: addDays(d, 1) + (c ? c.end : NIGHT_END) * HOUR };
}
// As sonecas do dia d (sonos [início, fim]). Regra antiga: os que começam entre 6h e 18h, inteiros.
// Regra nova: os que começam depois do fim da noite de antes e terminam até o começo da noite (o que
// passa do começo conta inteiro como noite).
export function napsOf(sleeps, rule, d) {
  const { c, day0, w0 } = bounds(rule, d);
  return sleeps.filter(([x, y]) => x >= day0 && x < w0 && (!c || y <= w0));
}
// O nome do bebê nas frases: "da Marina", "do Theo", "de Alex" (sem menina ou menino anotado) ou "do bebê".
export function deName(b) {
  const n = (b?.name || '').trim();
  if (!n) return 'do bebê';
  return (b.sex === 'F' ? 'da ' : b.sex === 'M' ? 'do ' : 'de ') + n;
}
// "Noite de Marina" (como aprovado, sem artigo); sem nome, "Noite do bebê".
export const nightTitle = b => (b?.name || '').trim() ? 'Noite de ' + b.name.trim() : 'Noite do bebê';
