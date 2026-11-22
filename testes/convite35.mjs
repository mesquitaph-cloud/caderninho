// Testes do cartão "convide alguém para a família" (item 35): `node --no-warnings testes/convite35.mjs`.
// Só a regra de quando mostrar (convite35.js). Sai com erro (código 1) se algum caso falhar.
import { convite35Mostrar, convite35Fechar, convite35Ler, convite35Dias, convite35Html, convite35Encerrado } from '../convite35.js';
const ok = (c, m) => { if (!c) { console.log('FALHOU:', m); process.exitCode = 1; } else console.log('ok:', m); };
const D = 86400000, H = 3600000, T0 = new Date(2026, 10, 1, 12).getTime();   // meio-dia, hora local (o dia do calendário é local)
const dias = n => Array.from({ length: n }, (_, i) => T0 + i * D);
const base = { membros: 1, tempos: dias(3), guardado: { n: 0, ate: 0 }, agora: T0 + 5 * D };
const m = o => convite35Mostrar({ ...base, ...o });

ok(m({}), '1 membro e 3 dias de registro: mostra');
ok(!m({ tempos: dias(2) }), 'só 2 dias: não mostra');
ok(!m({ tempos: [T0, T0 + H, T0 + 2 * H, T0 + 3 * H] }), '4 registros no mesmo dia: não mostra');
ok(convite35Dias([T0, T0 + H, T0 + D]) === 2, 'conta dias diferentes, não registros');
ok(!m({ membros: 2 }), '2 membros: não mostra');
ok(!m({ tempos: [] }), 'sem registro: não mostra');
ok(!m({ outroCartao: true }), 'boas-vindas ou convite do 56 na tela: espera');
// Fechamentos
const f1 = convite35Fechar({ n: 0, ate: 0 }, T0 + 5 * D + 3 * H);
ok(f1.n === 1, '1º "Agora não": conta 1');
ok(!m({ guardado: f1, agora: T0 + 5 * D + 4 * H }), 'no mesmo dia: não volta');
ok(!m({ guardado: f1, agora: T0 + 18 * D + 11 * H }), 'no 13º dia: ainda não volta');
ok(m({ guardado: f1, agora: T0 + 19 * D - 11 * H }), 'no 14º dia: volta');
ok(m({ guardado: f1, agora: T0 + 60 * D }), 'meses depois, ainda com 1 membro: volta');
ok(!m({ guardado: f1, agora: T0 + 60 * D, membros: 2 }), 'volta, mas já há 2 membros: não');
const f2 = convite35Fechar(f1, T0 + 19 * D);
ok(f2.n === 2 && !m({ guardado: f2, agora: T0 + 400 * D }), '2º fechamento: some de vez');
ok(convite35Fechar(f2, T0).n === 2, 'não passa de 2');
ok(!m({ guardado: convite35Encerrado(), agora: T0 + 400 * D }), 'entrou o 2º membro (encerrado): nunca mais');
// Leitura do que foi guardado
ok(convite35Ler(null).n === 0 && convite35Ler('lixo').n === 0 && convite35Ler('{"n":1,"ate":5}').ate === 5, 'leitura do armazenamento, com valor inválido');
// Textos aprovados
const h = convite35Html('Helena');
for (const x of ['Percebemos que você não convidou ninguém para a sua família!',
  'O Soneca permite que você convide outros membros da família para ajudar a anotar e cuidar de Helena. Gostaria de convidar alguém para participar dessa família?',
  '>Convidar<', '>Agora não<', 'aria-label="Fechar"']) ok(h.includes(x), 'texto aprovado: ' + x);
ok(convite35Html('<b>').includes('&lt;b&gt;'), 'nome do bebê escapado');
