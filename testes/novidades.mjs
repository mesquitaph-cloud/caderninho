// Testes do cartão de novidades (item 77): `node --no-warnings testes/novidades.mjs`. Sai com erro se algum caso falhar.
import { NOVIDADES, novFor, novHtml } from '../novidades.js';
const ok = (c, m) => { if (!c) { console.log('FALHOU:', m); process.exitCode = 1; } else console.log('ok:', m); };
const n = NOVIDADES['1.0.4'];
ok(novFor('1.0.4', null) === n, 'primeira abertura da 1.0.4: mostra');
ok(novFor('1.0.4', '1.0.3') === n, 'veio da 1.0.3: mostra');
ok(novFor('1.0.4', '1.0.4') === null, 'já viu a 1.0.4: não mostra');
ok(novFor('1.0.5', '1.0.4') === null, 'versão sem novidades escritas: não mostra');
ok(novFor('', null) === null, 'sem versão: não mostra');
const h = novHtml(n);
for (const t of ['Novidades do Soneca', 'Três mudanças nesta versão.', 'Janela de sono do seu bebê',
  'O Soneca calcula a janela a partir das sonecas que você anotou e mostra quanto falta para a próxima.', 'Tendências',
  'Veja como está o padrão de sono e despertar do seu bebê.', 'Bebê e família num só lugar',
  'Os dados do bebê e da família ficam juntos na aba Família.', 'Entendi']) ok(h.includes(t), 'texto aprovado: ' + t);
ok(n.items.length === 3 && (h.match(/class="novit"/g) || []).length === 3, 'três itens');
ok(!/capi/i.test(h), 'sem capivara');
