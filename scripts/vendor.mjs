// Monta vendor/supabase.js: a biblioteca do Supabase num arquivo só, servida pelo próprio site e
// embutida no app, sem depender do jsdelivr. Rodar de novo só ao trocar a versão no package.json.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('node_modules/@supabase/supabase-js/package.json', 'utf8'));
await build({
  stdin: { contents: "export { createClient } from '@supabase/supabase-js';", resolveDir: '.', loader: 'js' },
  bundle: true, format: 'esm', platform: 'browser', target: 'es2020', minify: true, legalComments: 'none',
  banner: { js: `// @supabase/supabase-js ${version} (MIT), montado por scripts/vendor.mjs. Não editar à mão.` },
  outfile: 'vendor/supabase.js',
});
console.log('vendor/supabase.js', version);
