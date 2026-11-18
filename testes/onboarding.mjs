// Testes da lógica do onboarding v02 (18/11; login no fim): a rota de entrada pela conta, as etapas, as respostas
// guardadas no aparelho e as contas das telas de sono. Sem navegador nem banco:
// `node --no-warnings testes/onboarding.mjs`. Sai com erro (código 1) se algum caso falhar.
// O que aparece na tela e o que é gravado de verdade está em testes/onboarding-rotas.mjs.
import { blank, onbSave, onbLoad, onbClear, hasAnswers, entryRoute, onbSteps, resumeStep, skipSleep, nextStep, prevStep,
  sleepStart, wakeStart, atToday, clk, windowInfo, minutosText, napWarnHour, napWarnText, ONB_KEY, ONB_NIGHT_DEFAULT } from '../onboarding.js';
import { MIN, HOUR } from '../util.js';
const ok = (c, m) => { if (!c) { console.log('FALHOU:', m); process.exitCode = 1; } else console.log('ok:', m); };

// 1. Rota de entrada pela conta.
const com = { name: 'Marina', k: 'mama' };
const rota = o => entryRoute({ session: false, profile: false, terms: false, invite: false, families: 0, saved: null, ...o });
ok(rota({}) === 'welcome', 'sem sessão e sem respostas: Boas-vindas');
ok(rota({ saved: blank() }) === 'welcome', 'sem sessão e só "Começar" tocado (nada respondido): Boas-vindas');
ok(rota({ saved: { ...blank(), ...com } }) === 'resume', 'sem sessão e com respostas: retoma a etapa');
ok(rota({ saved: { ...blank(), k: 'login' } }) === 'resume', 'sem sessão e parada no login: retoma a etapa');
ok(rota({ invite: true }) === 'login', 'convite sem sessão: login primeiro');
ok(rota({ invite: true, saved: { ...blank(), ...com } }) === 'login', 'convite vence as respostas guardadas');
const sess = o => entryRoute({ session: true, profile: true, terms: true, invite: false, families: 0, saved: null, ...o });
ok(sess({ families: 1 }) === 'home', 'com sessão e com família: tela inicial');
ok(sess({ families: 1, saved: { ...blank(), ...com } }) === 'home', 'com sessão e com família: tela inicial mesmo com respostas guardadas (descartadas)');
ok(sess({}) === 'perguntas', 'com sessão e sem família: perguntas (sem login), depois Quase pronto');
ok(sess({ profile: false }) === 'perguntas', 'com sessão, sem perfil e sem convite: perguntas (nome vem em Quase pronto)');
ok(sess({ invite: true }) === 'invite', 'com sessão e convite: "Entrar na família"');
ok(sess({ invite: true, profile: false }) === 'name', 'convite e sem perfil: nome e "Você é", depois o convite');
ok(sess({ invite: true, families: 1 }) === 'invite', 'convite vale mesmo para quem já tem família (como hoje)');
ok(sess({ terms: false }) === 'terms', 'sem o aceite da versão vigente: tela de aceite');

// 2. Etapas.
const N = { session: false, months: 2 };
ok(onbSteps(blank(), N).join() === 'bebe,mama,quem,gancho,agora,login,quase', 'sem resposta de sono: bebe, mama, quem, gancho, agora, login, quase');
ok(onbSteps({ ...blank(), sleep: 'wake' }, N).join() === 'bebe,mama,quem,gancho,agora,acordada,janela,login,quase', 'Acordada: acordada e janela');
ok(onbSteps({ ...blank(), sleep: 'sleep' }, N).join() === 'bebe,mama,quem,gancho,agora,dormindo,dormindo2,login,quase', 'Dormindo: dormindo e "está dormindo"');
ok(onbSteps({ ...blank(), feed: 'both' }, { ...N, months: 7 }).join() === 'bebe,mama,mamadeira,comida,quem,gancho,agora,login,quase', 'mamadeira e comida só quando valem (mamadeira; 6 meses ou mais)');
ok(!onbSteps(blank('conta'), { session: true, months: 2 }).some(k => k === 'quem' || k === 'login'), 'quem já tem conta: sem "quem" e sem login');
ok(onbSteps(blank('novo'), { session: true, months: 2 }).includes('quem') && !onbSteps(blank('novo'), { session: true, months: 2 }).includes('login'), 'começou por "Começar" e já entrou: ainda vale a tela 4 já vista, e não há mais login');
const wk = { ...blank(), sleep: 'wake', at: '10:00', nap: '60' };
ok(skipSleep(wk, onbSteps(wk, N)) === 'login' && wk.sleep === null && wk.at === '' && wk.nap === null, 'Pular: sem resposta de sono, vai ao login');
ok(skipSleep({ ...wk }, onbSteps(wk, { session: true, months: 2 })) === 'quase', 'Pular com conta: vai a Quase pronto');
ok(nextStep(['a', 'b'], 'a') === 'b' && nextStep(['a', 'b'], 'b') === 'b' && prevStep(['a', 'b'], 'a') === null, 'navegação nas pontas');
// Voltar do login com conta: a etapa "login" não existe mais; retoma em Quase pronto.
const sv = { ...blank(), name: 'Marina', k: 'login' };
ok(resumeStep(sv, onbSteps(sv, { session: true, months: 2 })) === 'quase', 'redirecionamento do Google/Apple: respostas guardadas na tela de login retomam em Quase pronto');
ok(resumeStep({ ...sv, k: 'mama' }, onbSteps(sv, N)) === 'mama', 'sem conta, retoma na etapa guardada');

// 3. Guardar e ler (só no aparelho). Aqui o "aparelho" é um objeto.
const mem = {}; const set = (k, v) => { v == null ? delete mem[k] : mem[k] = v; }, get = k => mem[k] ?? null;
const O = { ...blank(), name: 'Marina', birth: '2026-09-15', sex: 'F', feed: 'breast', sleep: 'wake', at: '13:10', nap: '60', night: 20, alert: true, pname: 'Patrick', role: 'avoa', side: 'pai', fam: 'Família X', k: 'login', ok: true };
onbSave(O, set);
const volta = onbLoad(get);
ok(volta && volta.name === 'Marina' && volta.k === 'login' && volta.sleep === 'wake' && volta.at === '13:10' && volta.alert === true && volta.role === 'avoa' && volta.side === 'pai', 'respostas lidas na volta (nome, etapa, sono, horário, aviso, parentesco, lado)');
ok(!('ok' in JSON.parse(mem[ONB_KEY])), 'o aceite da tela final não é guardado');
ok(Object.keys(mem).join() === ONB_KEY, 'tudo numa chave só do aparelho (' + ONB_KEY + ')');
ok(hasAnswers(volta), 'respostas guardadas contam como respostas');
onbClear(set); ok(onbLoad(get) === null && !hasAnswers(null), 'depois de limpar, não há respostas');
ok(onbLoad(() => '{quebrado') === null && onbLoad(() => '{"v":9}') === null, 'guardado estragado ou de outra versão é ignorado');

// 4. "Dormiu às": vazio = 30 minutos atrás; hora de hoje; hora que ainda não chegou vale ontem.
const NOW = new Date(2026, 10, 18, 14, 0, 20).getTime();
ok(Math.abs(NOW - sleepStart('', NOW) - 30 * MIN) <= 30000, 'Dormiu às vazio: 30 min atrás (arredondado ao minuto)');
ok(sleepStart('13:30', NOW) === new Date(2026, 10, 18, 13, 30).getTime(), 'Dormiu às 13:30: hoje');
ok(sleepStart('16:00', NOW) === new Date(2026, 10, 17, 16, 0).getTime(), 'Dormiu às 16:00 (ainda não chegou): ontem');
ok(wakeStart('', NOW) === NOW && atToday('14:00', NOW) === new Date(2026, 10, 18, 14, 0).getTime(), 'Acordou às vazio: agora');
ok(clk(new Date(2026, 10, 18, 13, 30)) === '13h30' && clk(new Date(2026, 10, 18, 15, 0)) === '15h' && clk(new Date(2026, 10, 18, 9, 5)) === '9h05', 'horas como 13h30, 15h, 9h05');

// 5. A frase da janela: acordada há 50 min, faixa de 1h a 2h → começa em 10 min e termina às 15h10.
const wakeAt = NOW - 50 * MIN, ref = [60 * MIN, 120 * MIN];
const w = windowInfo(wakeAt, ref, NOW);
ok(w.kind === 'antes' && minutosText(w.start - NOW) === '10 minutos' && clk(w.end) === '15h10', 'acordada há 50 min: "começa em 10 minutos e termina às 15h10"');
ok(windowInfo(NOW - 90 * MIN, ref, NOW).kind === 'durante', 'dentro da janela: frase que o app já tinha');
ok(windowInfo(NOW - 5 * MIN, null, NOW).kind === 'contador', 'sem faixa da idade (12 meses ou mais, ou sem nascimento): só o contador');
ok(minutosText(30 * 1000) === '1 minuto' && minutosText(80 * MIN) === '1h20', '1 minuto e 1h20');

// 6. Aviso da soneca tardia: noite menos 3 h (regra provisória). Padrão da pergunta: 20h.
ok(ONB_NIGHT_DEFAULT === 20 && napWarnHour(20) === 17 && napWarnHour(18) === 15, 'noite às 20h: depois das 17h (18h: 15h)');
ok(napWarnText(20) === 'Tome cuidado com sonecas que comecem depois das 17h: podem atrapalhar o sono da noite.', 'texto do aviso, como na nota');
