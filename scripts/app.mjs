// Copia os arquivos do site para www/, a pasta que o Capacitor embute no app de iPhone.
// O site continua sendo a única fonte: nada em www/ se edita à mão (está no .gitignore).
// Uso: npm run app (copia e sincroniza com o projeto do iPhone em ios/).
import { cpSync, readdirSync, rmSync, mkdirSync } from 'node:fs';

const OUT = 'www';
// A Política e os Termos não vão: no app, os links abrem o site no Safari.
const FILES = ['index.html', 'styles.css', ...readdirSync('.').filter(f => f.endsWith('.js'))];
const DIRS = ['fonts', 'vendor', 'icons'];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const f of FILES) cpSync(f, `${OUT}/${f}`);
for (const d of DIRS) cpSync(d, `${OUT}/${d}`, { recursive: true });
console.log(`www/: ${FILES.length} arquivos e ${DIRS.join(', ')}`);
