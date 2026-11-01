// Monta a pasta www/ com os arquivos do site, para o Capacitor pôr dentro do app.
// O site continua sem build: a Vercel publica a raiz como está. Rodar com `npm run www`.
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const FILES = ['index.html', 'styles.css', 'manifest.webmanifest',
  'app.js', 'config.js', 'util.js', 'clock.js', 'week.js', 'noites.js', 'growth.js', 'who.js', 'report.js', 'pediatra.js', 'legal.js'];
const DIRS = ['icons', 'fonts', 'vendor', 'termos', 'privacidade'];

rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const f of FILES) cpSync(f, 'www/' + f);
for (const d of DIRS) cpSync(d, 'www/' + d, { recursive: true });
console.log('www/ pronta:', FILES.length, 'arquivos e', DIRS.length, 'pastas.');
