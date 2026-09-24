#!/usr/bin/env node
// Trava do conector do Supabase: roda antes de cada ferramenta do Supabase (PreToolUse).
// É uma segunda camada. A primeira é o próprio conector em modo só leitura (ver README).
//   - ferramenta fora da lista de leitura: bloqueia
//   - SQL que não seja um único SELECT/WITH, ou que toque em segredos: bloqueia
//   - SQL que leia dados pessoais (e-mail, nomes, observações...): pede confirmação
//   - o resto (contagens, estrutura do banco, logs): segue o fluxo normal de permissões
import { readFileSync } from 'node:fs';

const READ_TOOLS = new Set([
  'search_docs', 'list_tables', 'list_extensions', 'list_migrations', 'get_logs', 'get_advisors',
  'list_organizations', 'get_organization', 'list_projects', 'get_project', 'get_project_url',
  'list_edge_functions', 'get_edge_function', 'list_branches', 'list_storage_buckets',
  'get_storage_config', 'generate_typescript_types', 'get_cost',
]);

// Palavras que mudam dados, esquema, permissões ou sessão.
const WRITE_WORDS = /\b(insert|update|delete|merge|upsert|drop|alter|create|grant|revoke|truncate|copy|call|do|execute|prepare|deallocate|vacuum|cluster|reindex|refresh|lock|comment|security|set|reset|listen|notify|unlisten|discard|import|load|begin|commit|rollback|savepoint|release|into|share)\b/;
// Funções com efeito colateral ou que alcançam rede, arquivos e segredos.
const DANGER = /\b(pg_terminate_backend|pg_cancel_backend|pg_reload_conf|pg_rotate_logfile|set_config|nextval|setval|pg_sleep|pg_advisory\w*|pg_notify|pg_read_file|pg_read_binary_file|pg_ls_dir|pg_stat_file|lo_\w+|dblink\w*|http\w*|net\s*\.|vault\s*\.|pg_shadow|pg_authid|create_family|accept_invite)\b/;
// Dados pessoais ou segredos de login: só com confirmação.
const PERSONAL = /\b(\w*email\w*|\w*phone\w*|note|name|display_name|birth_date|raw_user_meta_data|raw_app_meta_data|\w*token\w*|\w*password\w*)\b|\bauth\s*\.\s*(?!users\b)\w+/;

function decide(decision, reason) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: {
    hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason } }));
  process.exit(0);
}

// Tira comentários e textos entre aspas, para que 'delete' dentro de um texto não conte.
function strip(sql) {
  return sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\$(\w*)\$[\s\S]*?\$\1\$/g, "''")
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"/g, '')
    .toLowerCase()
    .trim()
    .replace(/;\s*$/, '');
}

function checkSql(raw) {
  if (typeof raw !== 'string' || !raw.trim()) decide('deny', 'Consulta vazia ou em formato desconhecido.');
  const sql = strip(raw);
  if (sql.includes(';')) decide('deny', 'Só um comando por vez.');
  if (!/^(select|with)\b/.test(sql)) decide('deny', 'Só leitura: a consulta precisa começar com SELECT ou WITH.');
  const w = sql.match(WRITE_WORDS);
  if (w) decide('deny', `Só leitura: "${w[1]}" não é permitido.`);
  const d = sql.match(DANGER);
  if (d) decide('deny', `Função ou área bloqueada: "${d[0].trim()}".`);
  const star = sql.replace(/count\s*\(\s*\*\s*\)/g, '').includes('*');
  const p = sql.match(PERSONAL);
  if (star || p) decide('ask', `A consulta pode ler dados pessoais (${star ? 'todas as colunas' : p[0]}). Confirme antes de rodar.`);
}

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const tool = String(input.tool_name || '').split('__').pop();
  if (tool === 'execute_sql') checkSql(input.tool_input?.query ?? input.tool_input?.sql);
  else if (!READ_TOOLS.has(tool)) decide('deny', `A ferramenta "${tool}" pode alterar o Supabase e está bloqueada pela trava do projeto.`);
  process.exit(0);
} catch (e) {
  decide('deny', 'A trava do Supabase não conseguiu analisar o pedido: ' + e.message);
}
