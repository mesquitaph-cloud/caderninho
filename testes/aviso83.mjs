// Testes do aviso "programe um remédio / uma tarefa" (item 83): `node --no-warnings testes/aviso83.mjs`.
// Só a lógica de quando mostrar (aviso83.js). Sai com erro (código 1) se algum caso falhar.
import { avisoEscolher, avisoCalendario, avisoMarco, avisoDia, avisoHtml, avisoKey, AVISO_TEXTO } from '../aviso83.js';
const ok = (c, m) => { if (!c) { console.log('FALHOU:', m); process.exitCode = 1; } else console.log('ok:', m); };
const H = 3600000, D = 24 * H, M0 = Date.parse('2026-11-01T12:00:00-03:00');
const ambos = { tarefa: true, remedio: true };
const esc = (agora, o = {}) => avisoEscolher({ marco: M0, entrada: M0, agora, falta: ambos, vistos: {}, ...o });
const tipo = (agora, o) => esc(agora, o)?.tipo ?? null;

ok(avisoMarco([{ created_at: '2026-11-03T00:00:00Z' }, { created_at: '2026-11-01T15:00:00Z' }]) === Date.parse('2026-11-01T15:00:00Z'), 'marco zero: o bebê mais antigo');
ok(Number.isNaN(avisoMarco([])), 'sem bebê: sem marco');
ok(avisoDia(M0, M0 + 23 * H) === 0 && avisoDia(M0, M0 + 24 * H) === 1, 'dia 0 = as primeiras 24 h');

// Espera de 3 h
ok(tipo(M0 + 2 * H) === null, 'antes de 3 h: nada');
ok(tipo(M0 + 3 * H) === 'tarefa', 'depois de 3 h (dia 0): tarefa');
// Calendário com os dois em falta
const dias = {}; for (const [d, t] of [[0, 'tarefa'], [1, 'remedio'], [3, 'tarefa'], [4, 'remedio'], [5, 'tarefa'], [6, 'remedio']]) {
  dias[d] = t; ok(tipo(M0 + d * D + 5 * H) === t, `dia ${d}, os dois em falta: ${t || 'nada'}`);
}
// Dia 2 e 7 só com o dia anterior visto (nada a mostrar)
ok(tipo(M0 + 2 * D + 5 * H, { vistos: { tarefa: [0], remedio: [1] } }) === null, 'dia 2 com 0 e 1 vistos: nada');
ok(tipo(M0 + 7 * D + 5 * H) === null && tipo(M0 + 30 * D) === null, 'a partir do 7º dia nunca mais, mesmo sem ter visto nada');
// Dispensar
ok(tipo(M0 + 3 * D + H * 5, { vistos: { tarefa: [0, 3], remedio: [1] } }) === null, '"Agora não" no dia 3: some até o dia 5');
ok(tipo(M0 + 5 * D + H * 5, { vistos: { tarefa: [0, 3], remedio: [1] } }) === 'tarefa', 'dia 5: volta');
ok(tipo(M0 + 6 * D + H * 5, { vistos: { tarefa: [0, 3, 5], remedio: [1, 4] } }) === 'remedio', 'dia 6: remédio');
// Não abriu no dia marcado: próxima abertura
const e = esc(M0 + 3 * D + 5 * H + 10 * H, { vistos: {} });
ok(e.tipo === 'tarefa', 'pulou dias 0 e 3 e abriu mais tarde: tarefa (a próxima abertura)');
ok(esc(M0 + 4 * D + H * 5, { vistos: { tarefa: [0, 3] } }).tipo === 'remedio', 'não abriu no dia 1 (remédio pendente), abre no 4: remédio');
ok(tipo(M0 + 6 * D + 20 * H, { vistos: { tarefa: [0, 3, 5] } }) === 'remedio', 'não abriu no dia 6 até tarde (ainda dentro do dia 6): mostra');
// Nunca os dois no mesmo dia: mostrar um consome os vencidos dos dois
const c = esc(M0 + 4 * D + 5 * H);
ok(c.tipo === 'remedio' && c.consumir.tarefa.join() === '0,3' && c.consumir.remedio.join() === '1,4', 'abriu só no dia 4: remédio, e tarefa vencida (0 e 3) é consumida');
const depois = esc(M0 + 4 * D + 6 * H, { vistos: { tarefa: [0, 3], remedio: [1, 4] } });
ok(depois === null, 'segunda abertura no mesmo dia: nada (só um por dia)');
// Cada tipo à parte
ok(avisoCalendario({ tarefa: true, remedio: false }).remedio === undefined, 'só falta tarefa: sem calendário de remédio');
for (const [d, t] of [[0, 'tarefa'], [1, null], [3, 'tarefa'], [4, null], [5, 'tarefa'], [6, null]]) {
  ok(tipo(M0 + d * D + 5 * H, { falta: { tarefa: true, remedio: false }, vistos: d === 1 || d === 4 || d === 6 ? { tarefa: d === 1 ? [0] : d === 4 ? [0, 3] : [0, 3, 5] } : {} }) === t, `só falta tarefa, dia ${d}: ${t || 'nada'}`);
}
for (const [d, t] of [[0, 'remedio'], [1, null], [3, 'remedio'], [4, null], [5, 'remedio'], [6, null], [7, null]]) {
  const v = { remedio: [0, 3, 5].filter(x => x < d) };
  ok(tipo(M0 + d * D + 5 * H, { falta: { tarefa: false, remedio: true }, vistos: v }) === t, `só falta remédio (calendário da tarefa 0/3/5), dia ${d}: ${t || 'nada'}`);
}
ok(tipo(M0 + H * 5, { falta: { tarefa: false, remedio: false } }) === null, 'tem os dois: nenhum cartão');
// Cadastrou: some
ok(tipo(M0 + 3 * D + 5 * H, { falta: { tarefa: false, remedio: true } }) === 'remedio', 'cadastrou a tarefa no dia 3: o cartão de tarefa sai e o de remédio aparece (calendário 0/3/5)');
// Convite
const EN = M0 + 2 * D;   // entrou no dia 2
ok(tipo(EN + 2 * H, { entrada: EN }) === null, 'convite: 2 h depois de entrar, nada (mesmo com o marco antigo)');
ok(tipo(EN + 3 * H, { entrada: EN }) !== null, 'convite: 3 h depois de entrar, mostra');
ok(tipo(M0 + 8 * D, { entrada: M0 + 7 * D }) === null, 'convite no dia 7: nada');
ok(tipo(M0 + 5 * D, { entrada: M0 + 4 * D + 22 * H }) === null && tipo(M0 + 5 * D + 2 * H, { entrada: M0 + 4 * D + 22 * H }) === 'tarefa', 'convite perto da meia-noite: espera as 3 h');
// Sem marco / data inválida
ok(avisoEscolher({ marco: NaN, entrada: M0, agora: M0 + 5 * H, falta: ambos }) === null, 'sem marco: nada');
// Textos aprovados
const t = avisoHtml('tarefa'), r = avisoHtml('remedio');
for (const x of ['Programe uma tarefa da rotina', 'O Soneca lembra no horário e a família toda vê quem fez.', 'Programar tarefa', 'Agora não']) ok(t.includes(x), 'texto aprovado: ' + x);
for (const x of ['Programe um remédio', 'O Soneca lembra no horário e a família toda vê quem deu. Só o que vocês programarem.', 'Programar remédio', 'Agora não']) ok(r.includes(x), 'texto aprovado: ' + x);
ok(!/capi|<svg/i.test(t + r), 'sem capivara');
ok(avisoKey('f1', 'tarefa') === 'cad-aviso83-f1-tarefa', 'chave por família e tipo');
ok(AVISO_TEXTO.tarefa.titulo.length > 0, 'textos num lugar só');
