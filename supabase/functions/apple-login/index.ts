// Soneca — função apple-login (Supabase Edge Function), para quem entra com a Apple no app do iPhone.
//   { action: 'save', code }  logo depois de entrar: troca o código da Apple pela chave de acesso
//                             (refresh token) e guarda em public.apple_tokens.
//   { action: 'revoke' }      antes de apagar a conta: cancela o acesso na Apple e apaga a chave.
// Só atende quem entrou (o token do Supabase vem no cabeçalho). Segredos no painel do Supabase
// (Edge Functions → Secrets): APPLE_TEAM_ID, APPLE_KEY_ID e APPLE_PRIVATE_KEY (o .p8 inteiro).
// Nunca devolve a chave da Apple nem dados da pessoa.
import { createClient } from 'npm:@supabase/supabase-js@2.117.1';

const CLIENT_ID = 'br.app.soneca';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlText = (s: string) => b64url(new TextEncoder().encode(s));

// A "senha" que a Apple pede a cada chamada: um JWT assinado com a chave .p8, válido por 5 minutos.
async function clientSecret(): Promise<string> {
  const pem = (Deno.env.get('APPLE_PRIVATE_KEY') || '').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const head = b64urlText(JSON.stringify({ alg: 'ES256', kid: Deno.env.get('APPLE_KEY_ID') }));
  const body = b64urlText(JSON.stringify({ iss: Deno.env.get('APPLE_TEAM_ID'), iat: now, exp: now + 300, aud: 'https://appleid.apple.com', sub: CLIENT_ID }));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(head + '.' + body)));
  return head + '.' + body + '.' + b64url(sig);
}

async function apple(path: string, params: Record<string, string>) {
  return fetch('https://appleid.apple.com/auth/' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: await clientSecret(), ...params }),
  });
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return reply(401, { error: 'not_authenticated' });

  const { action, code } = await req.json().catch(() => ({}));

  if (action === 'save') {
    if (typeof code !== 'string' || !code) return reply(400, { error: 'code' });
    const r = await apple('token', { grant_type: 'authorization_code', code });
    const t = await r.json().catch(() => ({}));
    if (!r.ok || !t.refresh_token) return reply(502, { error: 'apple_token' });
    const { error } = await admin.from('apple_tokens')
      .upsert({ user_id: user.id, refresh_token: t.refresh_token, updated_at: new Date().toISOString() });
    return error ? reply(500, { error: 'save' }) : reply(200, { ok: true });
  }

  if (action === 'revoke') {
    const { data } = await admin.from('apple_tokens').select('refresh_token').eq('user_id', user.id).maybeSingle();
    if (!data) return reply(200, { ok: true, apple: false }); // não entrou com a Apple: nada a cancelar
    const r = await apple('revoke', { token: data.refresh_token, token_type_hint: 'refresh_token' });
    if (!r.ok) return reply(502, { error: 'apple_revoke' });
    await admin.from('apple_tokens').delete().eq('user_id', user.id);
    return reply(200, { ok: true, apple: true });
  }

  return reply(400, { error: 'action' });
});
