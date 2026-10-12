// Chaves públicas do Supabase. A publishable key é feita para ir dentro do app;
// quem protege os dados são as regras de acesso do banco (RLS), não o segredo desta chave.
// Nunca coloque aqui a chave "secret" / "service_role".
export const SUPABASE_URL = 'https://vrhgirpklyklhvzwdfiq.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_YXZoYYYicgrNpB8a1g_LQw_tQI1dbPL';

// Entrar com Google. Deixe false até configurar o Google Cloud e ligar o Google no Supabase
// (passo a passo no README). O código por e-mail continua valendo de qualquer jeito.
export const GOOGLE_LOGIN = false;

// IDs dos clientes do Google (projeto "soneca" no Google Cloud). São públicos, feitos para ir no app;
// a chave secreta do cliente Web fica só no Supabase, nunca aqui.
export const GOOGLE_WEB_CLIENT_ID = '826802260715-42kmiplisksmvq2l4t9jbr9phu20g97u.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = '826802260715-6kv6ootv0hjlhp06ocoo01vlti5nv5nm.apps.googleusercontent.com';

// Conta de demonstração para a revisão da Apple: com este e-mail, a entrada pede senha em vez de
// mandar código. Aqui fica só o SHA-256 do e-mail (minúsculo), para o endereço não aparecer no site.
// A conta é criada à mão no Supabase, com senha; a senha não vai para o código (passos no README).
export const DEMO_EMAIL_SHA256 = '52403205c819de91ced2427a7796e28edd113937a55d110fc012011c2f9f5584';
