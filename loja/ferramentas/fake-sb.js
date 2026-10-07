// Supabase de mentira para as fotos das lojas: dados de exemplo em memória, nada sai daqui.
const NOW = Date.now();
const DAY = 864e5, MIN = 6e4;
const sod = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const ymd = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const U = { me: 'u-carol', p: 'u-patrick', v: 'u-vovo' };
const F = 'f-1', B = 'b-1';
let n = 0; const id = () => 'e' + (++n);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];
const authors = [U.me, U.me, U.p, U.v];

const entries = [];
const add = (t, kind, x = {}) => { if (t <= NOW) entries.push({ id: id(), family_id: F, baby_id: B, kind, at: new Date(t).toISOString(), author_id: pick(authors), ...x }); };
// 40 dias de rotina de um bebê de 3 meses
for (let d = 40; d >= 0; d--) {
  const base = sod(NOW) - d * DAY;
  const h = (hh, mm = 0) => base + hh * 36e5 + mm * MIN + Math.round((rnd() - .5) * 20) * MIN;
  // sono da noite: dorme ~20h30 do dia anterior; acorda pras mamadas
  const feeds = [[0, 40], [3, 30], [6, 20], [9, 10], [12, 0], [14, 50], [17, 40], [20, 15]];
  for (const [hh, mm] of feeds) {
    const t = h(hh, mm);
    if (rnd() < .2 && hh >= 9) add(t, 'feed', { src: 'bottle', ml: pick([90, 110, 120, 130]) });
    else { const side = pick(['left', 'right', 'both']); const a = 8 + Math.floor(rnd() * 10), b = 6 + Math.floor(rnd() * 10);
      add(t, 'feed', { src: 'breast', side, left_min: side !== 'right' ? a : null, right_min: side !== 'left' ? b : null }); }
    add(t + 25 * MIN, 'diaper', rnd() < .35 ? { pee: true, poo: true, poo_size: pick(['pequeno', 'medio', 'grande']) } : { pee: true });
  }
  // sonecas do dia e sono da noite
  const naps = [[0, 50, 3, 20], [3, 45, 6, 5], [7, 30, 8, 50], [10, 0, 11, 35], [13, 10, 14, 35], [16, 0, 17, 15], [18, 30, 19, 5], [20, 50, 24, 30]];
  for (const [a, b, c, e] of naps) { const s = h(a, b); add(s, 'sleep'); add(h(c, e), 'wake'); }
  if (d % 2 === 0) add(h(9, 40), 'pump', { ml: pick([60, 80, 100]), side: pick(['left', 'right']) });
  if (d % 3 === 0) add(h(15, 30), 'tummy', { duration_min: pick([5, 10]) });
  if (d % 2 === 1) add(h(19, 40), 'bath');
  if (d < 6) add(h(8, 0), 'med', { med_name: 'Vitamina D', med_amount: '2 gotas', medicine_id: 'm-1', dose_at: new Date(base + 8 * 36e5).toISOString() });
}
// hoje: 14:32, a Helena dorme desde 13:10 (aparece "Dormindo há")
const today = entries.filter(e => Date.parse(e.at) >= sod(NOW));
const lastWake = today.filter(e => e.kind === 'wake').pop();
if (lastWake && Date.parse(lastWake.at) > NOW - 85 * MIN) entries.splice(entries.indexOf(lastWake), 1);

const T = {
  profiles: [{ id: U.me, display_name: 'Carol' }, { id: U.p, display_name: 'Pedro' }, { id: U.v, display_name: 'Vó Lúcia' }],
  families: [{ id: F, name: 'Família Andrade', creator_id: U.me, created_at: '2026-07-01T00:00:00Z' }],
  family_members: [{ family_id: F, user_id: U.me, joined_at: '2026-07-01T00:00:00Z' }, { family_id: F, user_id: U.p, joined_at: '2026-07-02T00:00:00Z' }, { family_id: F, user_id: U.v, joined_at: '2026-07-10T00:00:00Z' }],
  babies: [{ id: B, family_id: F, name: 'Helena', birth_date: ymd(NOW - 97 * DAY), sex: 'F', created_at: '2026-07-01T00:00:00Z' }],
  entries,
  medicines: [{ id: 'm-1', family_id: F, baby_id: B, name: 'Vitamina D', amount: '2 gotas', schedule: 'fixed', times: ['08:00:00'], every_hours: null, start_date: ymd(NOW - 30 * DAY), days: null, stopped_at: null, created_by: U.me, created_at: '2026-09-01T00:00:00Z' }],
  weights: [[0, 3250, 49], [14, 3600, 51], [33, 4450, 54], [62, 5400, 57.5], [90, 6150, 60]].map(([dd, g, cm], i) => ({ id: 'w' + i, family_id: F, baby_id: B, measured_on: ymd(NOW - (97 - dd) * DAY), grams: g, cm, note: null })),
  milestones: [{ id: 'ms1', family_id: F, baby_id: B, happened_on: ymd(NOW - 52 * DAY), title: 'Sorriu', note: null }, { id: 'ms2', family_id: F, baby_id: B, happened_on: ymd(NOW - 10 * DAY), title: 'Firmou a cabeça', note: null }],
  questions: [{ id: 'q1', family_id: F, baby_id: B, body: 'Quando começar a introdução alimentar?', asked_on: null, answer: null, created_at: '2026-10-01T00:00:00Z' },
              { id: 'q2', family_id: F, baby_id: B, body: 'O sono da tarde está curto, é normal?', asked_on: null, answer: null, created_at: '2026-10-03T00:00:00Z' }],
  family_settings: [{ family_id: F, hidden_kinds: [] }],
  invites: [], feedback: [],
};

class Q {
  constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.one = 0; this.ord = null; this.rg = null; this.row = null; }
  select() { return this; }
  eq(k, v) { this.f.push(r => r[k] === v); return this; }
  in(k, v) { this.f.push(r => v.includes(r[k])); return this; }
  is(k, v) { this.f.push(r => (r[k] ?? null) === v); return this; }
  gte(k, v) { this.f.push(r => r[k] >= v); return this; }
  order(k) { this.ord = k; return this; }
  range(a, b) { this.rg = [a, b]; return this; }
  maybeSingle() { this.one = 1; return this; }
  single() { this.one = 2; return this; }
  insert(r) { this.op = 'insert'; this.row = r; return this; }
  update(r) { this.op = 'update'; this.row = r; return this; }
  upsert(r) { this.op = 'insert'; this.row = r; return this; }
  delete() { this.op = 'delete'; return this; }
  then(ok, ko) {
    const rows = T[this.t] || [];
    let out;
    if (this.op === 'insert') { const r = { id: id(), created_at: new Date().toISOString(), ...this.row }; rows.push(r); out = [r]; }
    else if (this.op === 'update') { out = rows.filter(r => this.f.every(f => f(r))); out.forEach(r => Object.assign(r, this.row)); }
    else if (this.op === 'delete') { out = []; }
    else { out = rows.filter(r => this.f.every(f => f(r))); if (this.ord) out = [...out].sort((a, b) => a[this.ord] < b[this.ord] ? -1 : 1); if (this.rg) out = out.slice(this.rg[0], this.rg[1] + 1); }
    out = JSON.parse(JSON.stringify(out));
    const data = this.one ? out[0] || null : out;
    return Promise.resolve({ data, error: null }).then(ok, ko);
  }
}
const ch = { on() { return ch; }, subscribe() { return ch; } };
export function createClient() {
  return {
    auth: { getSession: async () => ({ data: { session: { user: { id: U.me, email: 'carol@exemplo.com', user_metadata: {} } } } }), signOut: async () => ({}) },
    from: t => new Q(t),
    rpc: async () => ({ data: null, error: null }),
    channel: () => ch, removeChannel() {},
  };
}
