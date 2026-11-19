// Testes da noite de cada bebê (item 65): a regra nova de noite, sonecas e despertares, a antiga nos dias
// de antes da mudança e o histórico dos horários. Sem navegador nem banco: `node --no-warnings testes/noite.mjs`.
// Sai com erro (código 1) se algum caso falhar.
import { nights } from '../noites.js';
import { nightRule, napsOf, nightSave, nightNow, deName } from '../noite.js';
import { periodStats } from '../report.js';

import { localDate, addDays, startOfDay, HOUR, MIN } from '../util.js';
const ok = (c, m) => { if (!c) { console.log('FALHOU:', m); process.exitCode = 1; } else console.log('ok:', m); };
const D = new Date(2026, 10, 10).getTime(), H = (d, h, m = 0) => d + h * HOUR + m * MIN, D1 = addDays(D, 1), Dm1 = addDays(D, -1);
const baby = { name: 'Marina', sex: 'F', night: [{ from: localDate(D), start: 20, end: 6 }] };
const rule = nightRule(baby);
ok(rule(Dm1) === null && rule(D).start === 20, 'regra antiga antes, nova a partir do dia');
const sleeps = [[H(Dm1, 19), H(Dm1, 23, 30)], [H(Dm1, 23, 45), H(D, 6, 30)],
  [H(D, 14), H(D, 15)], [H(D, 19, 40), H(D, 23)], [H(D, 23, 30), H(D1, 2)], [H(D1, 2, 20), H(D1, 7)], [H(D1, 8), H(D1, 9)]];
const now = H(addDays(D, 3), 12);
const ns = nights(Dm1, D1, [], sleeps, now, rule);
const n = ns.find(x => x.d === D);
ok(n.ns.length === 3, 'sono das 19h40 conta inteiro na noite (3 sonos)');
ok(n.t0 === H(D, 19, 40) && n.hasBed, 'hora de dormir = primeiro sono da noite');
ok(n.wakes.length === 2, 'dois despertares; acordar às 7h (depois do fim) não conta');
ok(napsOf(sleeps, rule, D).length === 1, 'só a soneca das 14h é soneca no dia D');
ok(napsOf(sleeps, rule, D1).some(([x]) => x === H(D1, 8)), 'sono das 8h é soneca do dia seguinte');
const o = ns.find(x => x.d === Dm1);
ok(o.c === null && o.t0 === H(Dm1, 19), 'dia antes da mudança fica na regra antiga');
// cochilo antes da noite, sem passar do começo; dorme 21h30: sem despertar no meio
const s2 = [[H(D, 19), H(D, 19, 30)], [H(D, 21, 30), H(D1, 5)]];
const n2 = nights(D, D1, [], s2, now, rule)[0];
ok(n2.ns.length === 1 && n2.wakes.length === 0 && n2.t0 === H(D, 21, 30), 'cochilo das 19h é soneca; acordado antes do 1º sono não é despertar');
ok(napsOf(s2, rule, D).length === 1, 'cochilo das 19h às 19h30 conta como soneca');
// sem regra das 3h: noite só de sonos curtos tem hora de dormir
const s3 = [[H(D, 20, 10), H(D, 21)], [H(D, 21, 20), H(D, 22)]];
ok(nights(D, D1, [], s3, now, rule)[0].hasBed, 'sai a regra das 3h');
// salvar
const saved = nightSave(baby, 21, 7, H(D, 10));
ok(saved.length === 1 && saved[0].start === 21, 'salvar no mesmo dia troca o item');
const saved2 = nightSave(baby, 21, 7, H(addDays(D, 2), 10));
ok(saved2.length === 2 && nightNow({ night: saved2 }).start === 21, 'salvar outro dia acrescenta');
const r2 = nightRule({ night: saved2 });
ok(r2(D1).start === 20 && r2(addDays(D, 2)).start === 21, 'cada dia usa o horário de quando valia');
ok(nightRule({}).call(null, D) === null && nightNow({}).start === 18, 'sem o 025: regra antiga e 18h às 6h');
ok(deName({ name: 'Theo', sex: 'M' }) === 'do Theo' && deName({ name: 'Alex' }) === 'de Alex' && deName({}) === 'do bebê', 'nomes nas frases');
// resumo: sono de dia e texto
const ps = periodStats({ a: D, z: D1, evs: [{ t: H(D, 9), kind: 'feed' }], sleep: { out: sleeps, open: null }, now, weights: [], milestones: [], rule });
ok(ps.napDay === HOUR && ps.napSpan === 'das 6h às 20h', 'resumo: sono de dia ' + ps.napDay / MIN + ' min, ' + ps.napSpan);
// Tendências (item 58): a bolinha de cada despertar fica na hora do acordou, desde 0h do dia da noite.
// Noite do dia D: dorme 20h, acorda 2h30 (dia seguinte), volta a dormir 3h, acorda 6h -> 26,5 h na escala.
{
  const { dayRows } = await import('../tendencias.js');
  const s5 = [[H(D, 20), H(D1, 2, 30)], [H(D1, 3), H(D1, 6)]];
  const r = dayRows([D], s5.flatMap(([x, y]) => [{ kind: 'sleep', t: x }, { kind: 'wake', t: y }]), now, rule)[0];
  ok(r.desp === 1 && r.wk.length === 1, 'Tendências: um despertar, uma bolinha');
  ok(r.wk[0] / HOUR === 26.5, 'Tendências: despertar às 2h30 fica em 26,5 h');
  ok(r.desp === nights(D, D1, [], s5, now, rule)[0].wakes.length, 'Tendências conta os mesmos despertares de "Como foram as noites"');
}
// Tendências, guia Sono (item 81): dia de calendário, 0h às 24h.
{
  const { dayRows, calendarSleep, trendWindow, trendsHtml } = await import('../tendencias.js');
  const evsOf = ss => ss.flatMap(([x, y]) => y === null ? [{ kind: 'sleep', t: x }] : [{ kind: 'sleep', t: x }, { kind: 'wake', t: y }]);
  const d17 = new Date(2026, 10, 17).getTime(), d18 = addDays(d17, 1), d19 = addDays(d17, 2);
  const ss = [[H(d17, 13), H(d17, 14, 30)], [H(d17, 21), H(d18, 6)]];
  const rows = dayRows([d17, d18, d19], evsOf(ss), H(d18, 8), rule);
  ok(rows[0].day === 1.5 * HOUR + 3 * HOUR && rows[1].day === 6 * HOUR, 'Sono: 21h às 6h se divide, 3 h no dia 17 e 6 h no dia 18');
  ok(rows[2].day === 0, 'Sono: dia sem registro soma zero');
  ok(rows[0].night === 9 * HOUR && rows[0].desp === 0, 'A noite segue no dia em que começa (17), inteira');
  // sono em andamento conta até agora (dia 18, 8h: dormiu 7h30 e ainda dorme)
  const open = [[H(d17, 21), H(d18, 6)], [H(d18, 7, 30), null]];
  ok(dayRows([d18], evsOf(open), H(d18, 8), rule)[0].day === 6.5 * HOUR, 'Sono em andamento conta até agora');
  ok(calendarSleep([[H(d17, 23), H(d19, 1)]], null, H(d19, 2), d18) === 24 * HOUR, 'Sono de mais de um dia: o dia do meio tem 24 h');
  ok(calendarSleep([], H(d18, 0), H(d18, 8), d18) === 8 * HOUR, 'Em andamento desde a meia-noite');
  // maior sono seguido: dia em que a noite começa (a de 17 para 18 fica em 17)
  ok(rows[0].longest === 9 * HOUR && rows[1].longest === 0, 'Maior sono seguido fica no dia em que a noite começa');
  // a coluna de hoje aparece sempre, mesmo vazia (dados incompletos)
  const now2 = H(d19, 9), win = trendWindow('d', 0, now2, d17);
  ok(win.days.at(-1) === d19, 'a janela do dia a dia termina em hoje');
  const html = trendsHtml({ t: { tab: 'sono', mode: 'd', off: 0, sel: null, info: null }, evs: evsOf([...ss, [H(addDays(d17, -1), 21), H(d17, 6)], [H(addDays(d17, -2), 21), H(addDays(d17, -1), 6)]]), now: now2, first: addDays(d17, -3), who: '' });
  ok((html.match(/class="today"/g) || []).length >= 5 && html.includes('>hoje<'), 'hoje aparece (tracejada) em todos os gráficos, mesmo vazia');
}
{
  const { dayRows } = await import('../tendencias.js');
  const d17 = new Date(2026, 10, 17).getTime(), d18 = addDays(d17, 1);
  const e = [[H(d17, 13), H(d17, 14, 30)], [H(d17, 21), H(d18, 6)]].flatMap(([x, y]) => [{ kind: 'sleep', t: x }, { kind: 'wake', t: y }]);
  const r = dayRows([d17, d18], e, H(d18, 8), rule);
  ok(r[0].dayNap === 1.5 * HOUR && r[0].dayNight === 3 * HOUR && r[1].dayNight === 6 * HOUR && r[1].dayNap === 0, 'Sono: parte de dia e parte da noite dentro do dia de calendário');
}
