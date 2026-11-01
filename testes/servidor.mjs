// Soneca no computador, com o Supabase de mentira (loja/ferramentas/fake-sb.js) e cenários de teste.
// Nada sai daqui: o banco de verdade não é chamado. Rodar com `node testes/servidor.mjs` e abrir
// http://localhost:5174/?cenario=NOME (o cenário fica guardado na aba até trocar).
//   normal        rotina de 40 dias da Helena, como nas fotos da loja
//   sono-aberto   um "Dormiu" de 6 dias atrás sem "Acordou" (o caso do Bruno, 17/10)
//   sem-familia   conta nova sem família, com um convite válido para a Família Andrade (o caso da Ca)
//   noites        noites variadas (longas, com 3 despertares e comuns) para o cartão da aba Mês
//   app-convite   a mesma conta, no "app do iPhone" aberto pelo link de convite (Universal Link)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const PORT = +process.env.PORT || 5174;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const fake = () => fs.readFileSync(path.join(REPO, 'loja/ferramentas/fake-sb.js'), 'utf8')
  + '\n' + fs.readFileSync(path.join(HERE, 'cenarios.js'), 'utf8');

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  if (/^\/vendor\/supabase-js-/.test(p)) { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(fake()); }
  const f = path.join(REPO, p);
  if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('Soneca de teste em http://localhost:' + PORT + '/?cenario=normal'));
