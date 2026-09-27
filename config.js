// Chaves públicas do Supabase. A publishable key é feita para ir dentro do app;
// quem protege os dados são as regras de acesso do banco (RLS), não o segredo desta chave.
// Nunca coloque aqui a chave "secret" / "service_role".
export const SUPABASE_URL = 'https://vrhgirpklyklhvzwdfiq.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_YXZoYYYicgrNpB8a1g_LQw_tQI1dbPL';

// Entrar com Google. Deixe false até configurar o Google Cloud e ligar o Google no Supabase
// (passo a passo no README). O código por e-mail continua valendo de qualquer jeito.
export const GOOGLE_LOGIN = false;
