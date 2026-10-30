// Cenários de teste. O servidor cola este arquivo no fim do fake-sb.js: T, entries e Q vêm de lá.
const CEN = (() => {
  const q = new URLSearchParams(location.search).get('cenario');
  if (q) sessionStorage.setItem('teste-cenario', q);
  return sessionStorage.getItem('teste-cenario') || 'normal';
})();
console.info('[teste] cenário:', CEN);

// "Apagar" de verdade (no fake-sb.js não apaga nada).
const thenOrig = Q.prototype.then;
Q.prototype.then = function (ok, ko) {
  if (this.op !== 'delete') return thenOrig.call(this, ok, ko);
  const rows = T[this.t] || [];
  for (const r of rows.filter(r => this.f.every(f => f(r)))) rows.splice(rows.indexOf(r), 1);
  return Promise.resolve({ data: [], error: null }).then(ok, ko);
};

// window.testeLento = 3000 deixa a leitura dos registros 3 segundos mais lenta (para ver a tela durante
// um recarregamento, como ao voltar para o app).
const thenFast = Q.prototype.then;
Q.prototype.then = function (ok, ko) {
  if (this.t !== 'entries' || this.op !== 'select' || !window.testeLento) return thenFast.call(this, ok, ko);
  return new Promise(r => setTimeout(r, window.testeLento)).then(() => thenFast.call(this, ok, ko));
};

let ME = U.me;
const RPC = {};

if (CEN === 'sono-aberto') {
  // Some todo sono e despertar dos últimos 6 dias; fica um "Dormiu" às 20h50 de 6 dias atrás, sem "Acordou".
  const from = sod(NOW) - 6 * DAY;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if ((e.kind === 'sleep' || e.kind === 'wake') && Date.parse(e.at) >= from) entries.splice(i, 1);
  }
  add(from + 20 * 36e5 + 50 * MIN, 'sleep');
}

// "app-convite": finge o app do iPhone aberto por um link de convite (Universal Link), sem passar
// pelo navegador. O app tem de mostrar a tela do convite, não "Criar família".
if (CEN === 'app-convite') {
  const real = window.Capacitor;
  window.Capacitor = { ...real, isNativePlatform: () => true, getPlatform: () => 'ios',
    registerPlugin: name => name === 'App'
      ? { getLaunchUrl: async () => ({ url: 'https://soneca.app.br/?convite=teste-convite' }), addListener: () => ({ remove() {} }) }
      : new Proxy({}, { get: () => async () => ({}) }) };
}

// "app-remedio": finge o app do Android, com avisos de mentira guardados em window.avisos (pendentes)
// e window.tocarAviso(n) para fingir o toque. Mais um remédio de 8 em 8 horas.
if (CEN === 'app-remedio') {
  const real = window.Capacitor, perm = { display: 'prompt' }, taps = [];
  window.avisos = [];
  window.tocarAviso = n => taps.forEach(f => f({ notification: n }));
  const LN = {
    checkPermissions: async () => ({ ...perm }),
    requestPermissions: async () => { perm.display = 'granted'; return { ...perm }; },
    createChannel: async c => { window.canal = c; },
    getPending: async () => ({ notifications: window.avisos.map(n => ({ ...n })) }),
    schedule: async ({ notifications }) => { window.avisos.push(...notifications); return { notifications }; },
    cancel: async ({ notifications }) => { const ids = new Set(notifications.map(n => n.id)); window.avisos = window.avisos.filter(n => !ids.has(n.id)); },
    addListener: (ev, f) => { if (ev === 'localNotificationActionPerformed') taps.push(f); return { remove() {} }; },
  };
  window.Capacitor = { ...real, isNativePlatform: () => true, getPlatform: () => 'android',
    registerPlugin: name => name === 'LocalNotifications' ? LN : name === 'App'
      ? { getLaunchUrl: async () => ({}), addListener: () => ({ remove() {} }) }
      : new Proxy({}, { get: () => async () => ({}) }) };
  T.medicines.push({ id: 'm-2', family_id: T.medicines[0].family_id, baby_id: T.medicines[0].baby_id, name: 'Amoxicilina', amount: '5 ml',
    schedule: 'every', times: ['06:00:00', '14:00:00', '22:00:00'], every_hours: 8, start_date: ymd(NOW - DAY), days: 7, stopped_at: null,
    created_by: U.me, created_at: new Date(NOW - 2 * DAY).toISOString() });
}

if (CEN === 'sem-familia' || CEN === 'app-convite') {
  // A Ca: conta nova, nome e Termos aceitos, nenhuma família. O convite "teste-convite" vale.
  ME = 'u-ca';
  T.profiles.push({ id: ME, display_name: 'Ca' });
  T.consents = [{ kind: 'terms', version: '1.3', family_id: null, created_at: '2026-10-17T12:00:00Z' }];
  const fam = T.families.splice(0), mem = T.family_members.splice(0);
  RPC.invite_info = ({ tok }) => tok === 'teste-convite'
    ? [{ creator_name: 'Carol', family_name: fam[0].name, is_valid: true }] : [];
  RPC.accept_invite = ({ tok }) => {
    if (tok !== 'teste-convite') return { error: { message: 'invite_not_found' } };
    if (!T.families.length) { T.families.push(...fam); T.family_members.push(...mem); }
    T.family_members.push({ family_id: fam[0].id, user_id: ME, joined_at: new Date().toISOString() });
    return { data: fam[0].id };
  };
}

// "app-politica": finge o app do iPhone; o que o app manda abrir no navegador do celular fica em
// window.abertos (para conferir que a Política e os Termos não abrem o próprio app).
if (CEN === 'app-politica') {
  const real = window.Capacitor;
  window.abertos = [];
  window.Capacitor = { ...real, isNativePlatform: () => true, getPlatform: () => 'ios',
    registerPlugin: name => name === 'Browser' ? { open: async o => { window.abertos.push(o.url); } }
      : name === 'App' ? { getLaunchUrl: async () => ({}), addListener: () => ({ remove() {} }) }
      : new Proxy({}, { get: () => async () => ({}) }) };
}

const baseClient = createClient;
createClient = (...a) => {
  const c = baseClient(...a);
  c.auth.getSession = async () => ({ data: { session: { user: { id: ME, email: ME + '@exemplo.com', user_metadata: {} } } } });
  c.rpc = async (name, args) => {
    const r = RPC[name] ? RPC[name](args || {}) : null;
    if (r && (r.error || 'data' in r)) return { data: r.data ?? null, error: r.error ?? null };
    return { data: r, error: null };
  };
  return c;
};
