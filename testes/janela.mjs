// Testes da janela de sono do próprio bebê (item 60, 2ª etapa, e contador do item 73; regra aprovada pelo
// Patrick em 16/11, prévia 13: https://claude.ai/artifact/3q6Hzf8QKppDALfn8DBthA). Sem navegador nem banco:
// `node --no-warnings testes/janela.mjs`. Sai com erro (código 1) se algum caso falhar.
import { ownWindow, babyWin, dayWindows, mergeShort, nearNight, winNotice, winText, counterHtml, novTitle, novText, swapTitle, swapText, fmtDur, infoHtml, INFO_TITLE } from '../janela.js';
import { nightRule } from '../noite.js';
import { addDays, localDate, HOUR, MIN } from '../util.js';
const ok = (c, m) => { if (!c) { console.log('FALHOU:', m); process.exitCode = 1; } else console.log('ok:', m); };
const faixa = r => fmtDur(r[0]) + '–' + fmtDur(r[1]);
const M = x => x.map(m => m * MIN);

// 1. Os 5 bebês da prévia 13 (janelas em minutos, já sem as que terminam no sono da noite).
const PREVIA = [
  ['Ana', '30 min–1h20', [12,13,14,15,16,16,16,16,19,20,26,27,27,28,32,34,42,43,43,43,45,48,52,55,56,59,60,64,66,74,83,84,94,94,107,109,138,141,142,147]],
  ['Bia', '1h–1h45', [10,10,14,15,29,40,45,48,54,60,60,63,65,68,70,70,76,76,79,80,82,86,87,87,88,89,90,90,91,95,95,96,97,99,108,121,122,124,186]],
  ['Caio', '1h10–1h55', [11,13,14,15,15,29,70,78,79,81,82,85,87,89,89,89,90,91,91,91,92,96,96,96,97,97,100,101,103,106,107,127,132,219]],
  ['Davi', '1h35–2h20', [38,65,75,83,102,103,110,110,111,119,120,129,140,143,150,157,159,247,309]],
  ['Lia', '1h40–2h50', [10,11,50,69,85,89,101,109,110,117,120,122,134,156,158,160,160,167,170,171,180,195,211,240,300]],
];
for (const [n, want, w] of PREVIA) { const got = faixa(ownWindow(M(w))); ok(got === want, `prévia: ${n} ${got} (esperado ${want})`); }

// 2. Casos da regra.
ok(faixa(ownWindow(M([20, 25, 30, 35, 40]))) === '30 min–1h15', 'piso de 30 min: empurrada, mesma largura (45 min)');
ok(faixa(ownWindow(M([80, 88, 90, 92, 100]))) === '1h10–1h55', 'largura mínima: 45 min centrada na mediana (1h30)');
ok(faixa(ownWindow(M([60, 100, 150, 200, 240]))) === '1h45–3h15', 'largura máxima: 1h30 centrada na mediana (2h30)');
ok(faixa(ownWindow(M([60, 90, 120, 150, 180]))) === '1h30–2h30', 'largura do P25 ao P75 (1h) quando está entre 45 min e 1h30');

// 3. Dias: 7, 14 ou a idade. Bebê de 2 meses (faixa da idade 1h a 2h), noite padrão 18h às 6h.
const NOW = new Date(2026, 10, 16, 12, 0).getTime(), T = addDays(NOW, 0);
const birth = localDate(addDays(T, -65)), rule0 = nightRule({});
// Um dia: acorda às 7h, soneca 8h30–10h30 (janela 1h30), soneca 11h30–12h30 (janela 1h). Mediana 1h15, largura 45 min.
const dia = (d, w = 90) => [[addDays(d, -1) + 19 * HOUR, d + 7 * HOUR], [d + 7 * HOUR + w * MIN, d + 9 * HOUR + w * MIN], [d + 10 * HOUR + w * MIN, d + 11 * HOUR + w * MIN]];
const days = ks => ks.flatMap(k => dia(addDays(T, -k))).sort((a, b) => a[0] - b[0]);
const w7 = babyWin(days([1, 2, 3, 4, 5]), rule0, birth, NOW);
ok(w7.own && w7.days === 7 && faixa(w7.ref) === '55 min–1h40', `5 dias nos últimos 7: janela própria (${faixa(w7.ref)})`);
const w14 = babyWin(days([1, 2, 8, 9, 10]), rule0, birth, NOW);
ok(w14.own && w14.days === 14 && w14.valid === 5, 'só 2 dias nos 7, 5 nos 14: usa os 14 dias');
const wAge = babyWin(days([1, 2, 9]), rule0, birth, NOW);
ok(!wAge.own && faixa(wAge.ref) === '1h–2h' && wAge.valid === 3, 'menos de 5 dias nos 14: faixa da idade, contador com 3');
ok(!babyWin(days([1, 2, 3, 4, 5]), rule0, localDate(addDays(T, -400)), NOW).ref, '12 meses ou mais: sem faixa');

// 4. Só contam as janelas que terminam numa soneca de dia (a do sono da noite fica fora).
const rule20 = nightRule({ night: [{ from: localDate(addDays(T, -30)), start: 20, end: 6 }] });
const d = addDays(T, -1);
const s4 = [[d + 13 * HOUR, d + 14 * HOUR], [d + 15 * HOUR, d + 16 * HOUR], [d + 19 * HOUR, d + 19 * HOUR + 40 * MIN], [d + 20 * HOUR + 15 * MIN, addDays(d, 1) + 6 * HOUR]];
ok(dayWindows(s4, rule20, d).join() === String(HOUR) + ',' + String(3 * HOUR), 'noite às 20h: a soneca das 19h conta; a janela que termina no sono das 20h15 fica fora');
ok(dayWindows(s4, rule0, d).join() === String(HOUR), 'noite às 18h (padrão): o sono das 19h é da noite e fica fora');

// 5. Perto da noite. Janela 1h a 1h45, soneca típica 40 min, noite às 18h.
const ref = [60 * MIN, 105 * MIN], N = T + 18 * HOUR, nap = 40 * MIN;
ok(nearNight(N - 100 * MIN, ref, N, nap) === 'direto', 'N − A ≤ fim da janela: direto até a noite');
ok(nearNight(N - 150 * MIN, ref, N, nap) === 'soneca', 'N − (A + início + S) < início: a frase da soneca');
ok(nearNight(N - 160 * MIN, ref, N, nap) === null, 'N − (A + início + S) = início: normal');
ok(winText(30 * MIN, ref, 'F', 'direto') === 'Acordada há 30 min', 'direto: só o "Acordada há"');
ok(winText(30 * MIN, ref, 'M', 'soneca').includes('Uma soneca agora pode atrapalhar o sono da noite.'), 'soneca: a frase no lugar da faixa');

// 6. Aviso no celular.
const ana = { name: 'Ana', sex: 'F' }, wk = T + 9 * HOUR;
const n1 = winNotice(wk, { ref, nap }, ana, rule0);
ok(n1.at === wk + 55 * MIN && n1.title === 'A Ana pode estar ficando com sono' && n1.body === 'Janela de sono em 5 min.', 'aviso 5 min antes do começo');
const n2 = winNotice(wk, { ref: [30 * MIN, 80 * MIN], nap }, ana, rule0);
ok(n2.at === wk + 30 * MIN && n2.title === 'A Ana pode estar com sono' && n2.body === 'Começou a janela de sono.', 'piso de 30 min: aviso aos 30 com a frase do começo');
ok(!winNotice(N - 100 * MIN, { ref, nap }, ana, rule0) && !winNotice(N - 150 * MIN, { ref, nap }, ana, rule0), 'perto da noite: sem aviso');
ok(!winNotice(T + 4 * HOUR, { ref, nap }, ana, rule0), 'aviso antes do fim da noite (6h): não sai');
ok(!!winNotice(T + 5 * HOUR + 30 * MIN, { ref, nap }, ana, rule0), 'acordou às 5h30, aviso às 6h25: sai (dia do bebê)');
ok(!winNotice(T + 4 * HOUR + 30 * MIN, { ref, nap }, { name: 'Ana', sex: 'F' }, nightRule({ night: [{ from: localDate(T), start: 18, end: 7 }] })), 'noite até as 7h: aviso às 5h25 não sai');

// 7. Textos (palavra por palavra) e concordância.
const caio = { name: 'Caio', sex: 'M' }, alex = { name: 'Alex' };
ok(counterHtml(3, ana).includes('Faltam 2 dias de sonecas anotadas para a janela vir dos registros da Ana.') && (counterHtml(3, ana).match(/class="on"/g) || []).length === 3, 'contador: 3 bolinhas, faltam 2');
ok(counterHtml(4, caio).includes('Falta 1 dia de sonecas anotadas para a janela vir dos registros do Caio.'), 'contador no singular, masculino');
ok(counterHtml(0, alex).includes('Faltam 5 dias de sonecas anotadas para a janela vir dos registros do/a Alex.'), 'contador sem sexo anotado: forma com barra');
ok(novTitle(ana) === 'Novidade: a janela de sono da Ana', 'novidade: título');
ok(novText(ana, true) === 'Agora o Soneca mostra a janela de sono a partir dos registros da própria Ana. Para desligar, vá em Família > Sono.', 'novidade com os 5 dias');
ok(novText(caio, true) === 'Agora o Soneca mostra a janela de sono a partir dos registros do próprio Caio. Para desligar, vá em Família > Sono.', 'novidade, masculino');
ok(novText(ana, false) === 'Agora o Soneca vai passar a mostrar a janela de sono a partir dos registros da Ana quando houver 5 dias de sono anotados. Para desligar, vá em Família > Sono.', 'novidade antes dos 5 dias');
ok(swapTitle(ana) === 'A janela de sono da Ana mudou' && swapText(ana, [30 * MIN, 80 * MIN]) === 'Agora ela vem dos registros dela: 30 min a 1h20 acordada. Antes, era a referência para a idade.', 'troca de faixa');
ok(swapText(caio, ref) === 'Agora ela vem dos registros dele: 1h a 1h45 acordado. Antes, era a referência para a idade.', 'troca de faixa, masculino');

// 8. Despertar curto (16/11): menos de 15 min acordado entre dois sonos é interrupção do sono, não janela.
const h = (x, m = 0) => d + x * HOUR + m * MIN, noite = [addDays(d, -1) + 19 * HOUR, d + 7 * HOUR];
const s10 = [noite, [h(8, 30), h(9, 30)], [h(9, 40), h(10, 30)]];
ok(mergeShort(s10).length === 2 && mergeShort(s10)[1].join() === [h(8, 30), h(10, 30)].join(), 'despertar de 10 min: a soneca vira uma só, das 8h30 às 10h30');
ok(dayWindows(mergeShort(s10), rule0, d).join() === String(90 * MIN), 'despertar de 10 min: não gera janela (só a de 1h30 antes da soneca)');
const s15 = [noite, [h(8, 30), h(9, 30)], [h(9, 45), h(10, 30)]];
ok(mergeShort(s15).length === 3 && dayWindows(mergeShort(s15), rule0, d).join() === [90 * MIN, 15 * MIN].join(), 'despertar de exatamente 15 min: não junta, é janela');
const sCad = [noite, [h(8, 30), h(9)], [h(9, 5), h(9, 30)], [h(9, 40), h(10, 30)]];
ok(mergeShort(sCad).length === 2 && mergeShort(sCad)[1].join() === [h(8, 30), h(10, 30)].join(), 'dois despertares curtos seguidos: juntam em cadeia');
ok(s10.length === 3 && s10[1][1] === h(9, 30), 'mergeShort não muda a lista de sonos recebida');
// Soneca típica: soneca das 9h às 9h45 e outra das 13h às 13h45 com um despertar de 10 min no meio.
const diaCurto = k => { const x = addDays(T, -k); return [[addDays(x, -1) + 19 * HOUR, x + 7 * HOUR], [x + 9 * HOUR, x + 9 * HOUR + 45 * MIN], [x + 13 * HOUR, x + 13 * HOUR + 15 * MIN], [x + 13 * HOUR + 25 * MIN, x + 13 * HOUR + 45 * MIN]]; };
const wCurto = babyWin([1, 2, 3, 4, 5].flatMap(diaCurto).sort((a, b) => a[0] - b[0]), rule0, birth, NOW);
ok(wCurto.nap === 45 * MIN, `soneca típica depois da junção: 45 min (${fmtDur(wCurto.nap)}; sem juntar seria 20 min)`);

// 9. "Direto até a noite" com 1,5 × o centro, de 3 meses em diante (16/11). Janela 1h a 1h45, noite às 18h.
ok(nearNight(N - 150 * MIN, ref, N, nap, null) === 'soneca', '2 meses (sem centro): regra antiga, N − A = 2h30 não é direto');
ok(w7.mid === null && wAge.mid === null, '2 meses: babyWin não manda centro (regra antiga)');
ok(nearNight(N - 150 * MIN, ref, N, nap, 100 * MIN) === 'direto', '3 meses ou mais, centro 1h40: N − A = 1,5 × centro (2h30) é direto');
ok(nearNight(N - 151 * MIN, ref, N, nap, 100 * MIN) !== 'direto', '3 meses ou mais, centro 1h40: N − A = 2h31 não é direto');
ok(nearNight(N - 105 * MIN, ref, N, nap, 60 * MIN) === 'direto' && nearNight(N - 106 * MIN, ref, N, nap, 60 * MIN) !== 'direto', '1,5 × centro abaixo do fim da janela: vale o fim da janela');
const birth3 = localDate(addDays(T, -100));
const w3age = babyWin(days([1, 2, 9]), rule0, birth3, NOW);
ok(!w3age.own && faixa(w3age.ref) === '1h15–2h30' && w3age.mid === 112.5 * MIN, '3 meses com a faixa da idade: centro = meio da faixa (1h52,5)');
ok(nearNight(N - 168 * MIN, w3age.ref, N, null, w3age.mid) === 'direto' && nearNight(N - 169 * MIN, w3age.ref, N, null, w3age.mid) === null, 'faixa da idade: direto até 1,5 × 1h52,5 = 2h48,75');
const w3own = babyWin(days([1, 2, 3, 4, 5]), rule0, birth3, NOW);
ok(w3own.own && w3own.mid === 75 * MIN && faixa(w3own.ref) === '55 min–1h40', '3 meses com janela própria: centro = mediana do bebê (1h15), faixa da tela igual');
ok(!winNotice(N - 150 * MIN, { ref, nap, mid: 100 * MIN }, ana, rule0), '3 meses ou mais, direto pelo 1,5 ×: sem aviso no celular');

// 9. Botão i da faixa (item 74, texto B aprovado em 16/11): os números do quadro Hoje vêm do babyWin.
ok(w7.n === 10, `quadro Hoje: 10 janelas nos 5 dias (${w7.n})`);
const iOwn = infoHtml(w7, { name: 'Bia', sex: 'F' }, 2), iAge = infoHtml(wAge, { name: 'Leo', sex: null }, 1);
ok(INFO_TITLE === 'Como funciona a janela de sono', 'título da folha');
ok(iOwn.includes('<b>55 min a 1h40 acordada</b>') && iOwn.includes('A partir de 10 vezes em que a Bia ficou acordada antes de uma soneca, nos últimos 7 dias.'), 'janela própria: quadro Hoje');
ok(iOwn.includes('Como a conta é feita') && !iOwn.includes('Cleveland') && !iOwn.includes('Nos primeiros dias'), 'janela própria: com a lista, sem a fonte');
ok(iAge.includes('<b>1h a 2h acordado/a</b>') && iAge.includes('Referência para 1 mês. Faltam 2 dias de sonecas anotadas para a janela vir dos registros do/a Leo.'), 'pela idade: quadro Hoje, sem sexo anotado com barra');
ok(iAge.includes('registros do/a próprio/a Leo.') && iAge.includes('Cleveland Clinic') && !iAge.includes('Como a conta'), 'pela idade: sem a lista, com a fonte');
ok(infoHtml({ ...wAge, valid: 4 }, { name: 'Leo', sex: 'M' }, 2).includes('Referência para 2 meses. Falta 1 dia de sonecas anotadas para a janela vir dos registros do Leo.'), 'pela idade: Falta 1 dia, no singular');
ok(infoHtml(w7, { name: '<b>', sex: 'M' }, 2).includes('o &lt;b&gt; costuma ficar acordado'), 'nome escapado');
