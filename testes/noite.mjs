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
