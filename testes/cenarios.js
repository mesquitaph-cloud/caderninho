// Cenários de teste. O servidor cola este arquivo no fim do fake-sb.js: T, entries e Q vêm de lá.
const CEN = (() => {
  const q = new URLSearchParams(location.search).get('cenario');
  if (q) sessionStorage.setItem('teste-cenario', q);
  return sessionStorage.getItem('teste-cenario') || 'normal';
})();
console.info('[teste] cenário:', CEN);

// Ajudantes dos cenários: a hora de um registro, "d dias atrás às hh:mm" e apagar os registros que
// passam num teste.
const at = e => Date.parse(e.at);
const dia = (d, hh = 0, mm = 0) => sod(NOW) - d * DAY + hh * 36e5 + mm * MIN;
const rmWhere = ok => { for (let i = entries.length - 1; i >= 0; i--) if (ok(entries[i])) entries.splice(i, 1); };

// "Apagar" de verdade (no fake-sb.js não apaga nada).
const thenOrig = Q.prototype.then;
Q.prototype.then = function (ok, ko) {
  if (this.op !== 'delete') return thenOrig.call(this, ok, ko);
  const rows = T[this.t] || [];
  for (const r of rows.filter(r => this.f.every(f => f(r)))) rows.splice(rows.indexOf(r), 1);
  return Promise.resolve({ data: [], error: null }).then(ok, ko);
};

// Quem anotou: no banco de verdade, a trava do 001 põe quem está logado.
const thenAuthor = Q.prototype.then;
Q.prototype.then = function (ok, ko) {
  if (this.t === 'entries' && this.op === 'insert' && this.row) this.row = { ...this.row, author_id: ME };
  return thenAuthor.call(this, ok, ko);
};

// window.testeLento = 3000 deixa a leitura dos registros 3 segundos mais lenta (para ver a tela durante
// um recarregamento, como ao voltar para o app).
const thenFast = Q.prototype.then;
Q.prototype.then = function (ok, ko) {
  if (this.t !== 'entries' || this.op !== 'select' || !window.testeLento) return thenFast.call(this, ok, ko);
  return new Promise(r => setTimeout(r, window.testeLento)).then(() => thenFast.call(this, ok, ko));
};
// window.testeFalha = true faz a leitura dos registros dar erro (como sem internet).
const thenOk = Q.prototype.then;
Q.prototype.then = function (ok, ko) {
  if (this.t !== 'entries' || this.op !== 'select' || !window.testeFalha) return thenOk.call(this, ok, ko);
  return Promise.resolve({ data: null, error: { message: 'teste' } }).then(ok, ko);
};

// "nascimento": a rotina vai até o dia em que a Helena nasceu (97 dias), para a aba Mês voltar até
// julho. "sem-nascimento": o mesmo, sem a data de nascimento anotada (a aba Mês volta até o cadastro).
if (CEN === 'nascimento' || CEN === 'sem-nascimento') {
  for (let d = 96; d > 40; d--) {
    const base = sod(NOW) - d * DAY, h = (hh, mm = 0) => base + hh * 36e5 + mm * MIN + Math.round((rnd() - .5) * 20) * MIN;
    for (const hh of [0, 3, 6, 9, 12, 15, 18, 21]) {
      const t = h(hh, 30), side = pick(['left', 'right', 'both']);
      add(t, 'feed', { src: 'breast', side, left_min: side !== 'right' ? 12 : null, right_min: side !== 'left' ? 10 : null });
      add(t + 25 * MIN, 'diaper', rnd() < .4 ? { pee: true, poo: true, poo_size: 'medio' } : { pee: true });
    }
    for (const [a, z] of [[1, 3], [4, 6], [7, 9], [10, 12], [13, 15], [16, 18], [19, 21], [22, 24.4]]) { add(h(a, 10), 'sleep'); add(h(z, 0), 'wake'); }
  }
  if (CEN === 'sem-nascimento') T.babies[0].birth_date = null;
}

// "dorme-muito": a foto do guia "Recém-nascido dorme muito" do site (07/11). Mamou há 3h10, trocou a
// fralda há 2h50 e dorme há 2h40, sem nada depois.
if (CEN === 'dorme-muito') {
  rmWhere(e => at(e) >= NOW - 200 * MIN);
  add(NOW - 190 * MIN, 'feed', { src: 'breast', side: 'left', left_min: 15, right_min: null });
  add(NOW - 170 * MIN, 'diaper', { pee: true });
  add(NOW - 160 * MIN, 'sleep');
}

let ME = U.me;
const RPC = {};

if (CEN === 'sono-aberto') {
  // Some todo sono e despertar dos últimos 6 dias; fica um "Dormiu" às 20h50 de 6 dias atrás, sem "Acordou".
  const from = dia(6);
  rmWhere(e => (e.kind === 'sleep' || e.kind === 'wake') && at(e) >= from);
  add(from + 20 * 36e5 + 50 * MIN, 'sleep');
}

// "noites": noites variadas para o cartão "Como foram as noites" da aba Mês. Troca todo sono que começa
// entre 18h e 7h por uma noite de um de três jeitos: longa (6 a 8 h seguidas), com 3 despertares ou comum.
// "noites-foto" é a base da foto do guia "Regressão do sono" (mais abaixo).
if (CEN === 'noites' || CEN === 'noites-foto') {
  const hr = e => new Date(at(e)).getHours();
  rmWhere(e => (e.kind === 'sleep' || e.kind === 'wake') && (hr(e) >= 18 || hr(e) < 7));
  for (let d = 40; d >= 1; d--) {
    const base = sod(NOW) - d * DAY, bed = base + 19 * 36e5 + Math.round(rnd() * 120) * MIN, up = base + DAY + 6.5 * 36e5;
    const r = rnd(), cuts = r < .3 ? [bed + (6 + rnd() * 2) * 36e5] : r < .55 ? [base + DAY + 30 * MIN, base + DAY + 150 * MIN, base + DAY + 270 * MIN] : [base + DAY + 120 * MIN];
    // Metade das noites com um cochilo curto às 18h, que não pode virar a hora de dormir.
    if (rnd() < .5) { add(base + 18 * 36e5 + 10 * MIN, 'sleep'); add(base + 18 * 36e5 + 30 * MIN, 'wake'); }
    let s = bed;
    // Nos despertares: às vezes mamadeira, de vez em quando cólica, tosse ou vômito.
    for (const c of cuts) {
      if (c >= up) break;
      add(s, 'sleep'); add(c, 'wake'); s = c + 25 * MIN;
      if (rnd() < .6) add(c + 5 * MIN, 'feed', { src: 'bottle', ml: 90 });
      const r2 = rnd();
      if (r2 < .08) add(c + 10 * MIN, 'symptom', { symptom: 'colica' });
      else if (r2 < .12) add(c + 10 * MIN, 'symptom', { symptom: 'tosse' });
      else if (r2 < .14) add(c + 10 * MIN, 'vomit');
    }
    add(s, 'sleep'); add(up, 'wake');
  }
}

// "mamadeira": todas as mamadas na mamadeira de fórmula, para a foto do guia "Quantos ml" (07/11). Com
// ?foto=1 sobram ~5 por dia; de 140 a 170 ml dá ~800 ml/dia, perto da média de 864 ml/dia aos 3-4 meses
// num estudo japonês com 578 bebês só de fórmula (Milk Science, J-STAGE) e de 120 a 150 ml/kg/dia (NHMRC).
if (CEN === 'mamadeira') {
  for (const e of entries) if (e.kind === 'feed') {
    e.src = 'bottle'; e.ml = pick([140, 150, 150, 160, 170]);
    delete e.side; delete e.left_min; delete e.right_min;
  }
}

// "?foto=1" (com qualquer cenário): limpa os gráficos para as fotos dos guias do site (07/11). Tira
// mamada e fralda que caem no meio de um sono e uma em cada três das que sobram (fralda com cocô fica).
const FOTO = (() => {
  if (new URLSearchParams(location.search).get('foto')) sessionStorage.setItem('teste-foto', '1');
  return sessionStorage.getItem('teste-foto') === '1';
})();
if (FOTO) {
  const evs = entries.slice().sort((a, b) => at(a) - at(b)), naps = [];
  let s0 = null;
  for (const e of evs) {
    if (e.kind === 'sleep' && s0 === null) s0 = at(e);
    else if (e.kind === 'wake' && s0 !== null) { naps.push([s0, at(e)]); s0 = null; }
  }
  if (s0 !== null) naps.push([s0, NOW]);
  const inSleep = t => naps.some(([a, z]) => t > a + MIN && t < z - MIN);
  let n = 0;
  const drop = new Set(evs.filter(e => (e.kind === 'feed' || e.kind === 'diaper') && (inSleep(at(e)) || (!e.poo && ++n % 3 === 0))));
  rmWhere(e => drop.has(e));
  window.testeRegistros = entries;
}

// "noites-foto": a foto do guia "Regressão do sono" (Patrick, 07/11), tirada com ?foto=1. As noites do
// "noites", com despertares a mais em três delas. Na foto de 07/11, dia(3) foi quarta e dia(6), domingo.
if (CEN === 'noites-foto') {
  const rm = (a, z, kinds) => rmWhere(e => at(e) >= a && at(e) <= z && kinds.includes(e.kind));
  const wake = (t, awake, feed) => { add(t, 'wake'); if (feed) add(t + 5 * MIN, 'feed', { src: 'bottle', ml: 90 }); add(t + awake * MIN, 'sleep'); };
  // Hoje: na madrugada, um despertar com mamada e outro por volta das 2h, 50 min acordada sem mamar.
  rm(dia(0, 0), dia(0, 6), ['sleep', 'wake', 'feed']);
  wake(dia(0, 0, 40), 20, true); wake(dia(0, 2, 10), 50, false);
  // Quarta: mais um despertar sem mamada na madrugada e dois entre 18h e 0h.
  wake(dia(3, 0, 50), 25, false); wake(dia(3, 21, 30), 20, false); wake(dia(3, 23, 10), 25, false);
  // Domingo: um despertar à 0h com mamada e um às 20h (a hora de dormir passa para 19h20).
  wake(dia(6, 0, 0), 25, true);
  rm(dia(6, 19), dia(6, 21), ['sleep', 'feed']);
  add(dia(6, 19, 5), 'feed', { src: 'bottle', ml: 120 }); add(dia(6, 19, 20), 'sleep'); wake(dia(6, 20, 0), 20, false);
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
if (CEN === 'app-remedio' || CEN === 'app-tarefas') {
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

// "app-lembrete" (07/11): o app do Android com a família nova do "bv-nova" (a Ana e o Pedro, sem registros),
// para o cartão "Tudo pronto" e o lembrete de 3 horas. "app-avaliar": o mesmo app com a rotina da Carol,
// para o pedido de avaliação. Os avisos agendados ficam em window.avisos; os que já tocaram, em
// window.tocados; a janela de permissão, em window.permissoes (quantas vezes apareceu).
if (CEN === 'app-lembrete' || CEN === 'app-avaliar') {
  const real = window.Capacitor, perm = { display: 'prompt' };
  window.avisos = []; window.tocados = []; window.permissoes = 0; window.avaliacoes = [];
  const LN = {
    checkPermissions: async () => ({ ...perm }),
    requestPermissions: async () => { window.permissoes++; perm.display = 'granted'; return { ...perm }; },
    createChannel: async c => { (window.canais ||= []).push(c); },
    getPending: async () => ({ notifications: window.avisos.map(n => ({ ...n })) }),
    getDeliveredNotifications: async () => ({ notifications: window.tocados.map(n => ({ ...n })) }),
    removeDeliveredNotifications: async ({ notifications }) => { const ids = new Set(notifications.map(n => +n.id)); window.tocados = window.tocados.filter(n => !ids.has(+n.id)); },
    schedule: async ({ notifications }) => { window.avisos.push(...notifications); return { notifications }; },
    cancel: async ({ notifications }) => { const ids = new Set(notifications.map(n => n.id)); window.avisos = window.avisos.filter(n => !ids.has(n.id)); },
    addListener: () => ({ remove() {} }),
  };
  window.Capacitor = { ...real, isNativePlatform: () => true, getPlatform: () => 'android',
    registerPlugin: name => name === 'LocalNotifications' ? LN
      : name === 'AppReview' ? { requestReview: async () => { window.avaliacoes.push(new Date().toISOString()); } }
      : name === 'App' ? { getLaunchUrl: async () => ({}), addListener: () => ({ remove() {} }) }
      : new Proxy({}, { get: () => async () => ({}) }) };
}

// "app-avaliacao": finge o app do iPhone; cada pedido de avaliação na loja entra em window.avaliacoes.
if (CEN === 'app-avaliacao') {
  const real = window.Capacitor;
  window.avaliacoes = [];
  window.Capacitor = { ...real, isNativePlatform: () => true, getPlatform: () => 'ios',
    registerPlugin: name => name === 'AppReview' ? { requestReview: async () => { window.avaliacoes.push(new Date().toISOString()); } }
      : name === 'App' ? { getLaunchUrl: async () => ({}), addListener: () => ({ remove() {} }) }
      : new Proxy({}, { get: () => async () => ({}) }) };
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

// Boas-vindas (30/10). "bv-nova": a Ana acabou de criar a Família Souza, com o Pedro e nenhum registro,
// só com Mamada, Sono e Fralda. "bv-convidado": o Pedro acabou de entrar na Família Andrade por convite.
// "bv-dias": a Carol, sozinha na família, entrou há 4 dias, com Ordenha e Cuidados desligados.
if (CEN === 'bv-nova' || CEN === 'app-lembrete') {
  ME = 'u-ana';
  T.profiles.push({ id: ME, display_name: 'Ana' });
  T.families = [{ id: 'f-2', name: 'Família Souza', creator_id: ME, created_at: new Date().toISOString() }];
  T.family_members = [{ family_id: 'f-2', user_id: ME, joined_at: new Date().toISOString() }];
  T.babies = [{ id: 'b-2', family_id: 'f-2', name: 'Pedro', birth_date: ymd(NOW - 20 * DAY), sex: 'M', created_at: new Date().toISOString() }];
  T.family_settings = [{ family_id: 'f-2', hidden_kinds: ['med', 'symptom', 'pump', 'care'] }];
  T.consents = [{ kind: 'terms', version: '1.3', family_id: null, created_at: new Date().toISOString() }, { kind: 'baby', version: '1.3', family_id: 'f-2', created_at: new Date().toISOString() }];
}
if (CEN === 'bv-convidado') {
  ME = U.p;
  T.family_members.find(m => m.user_id === U.p).joined_at = new Date().toISOString();
}
if (CEN === 'bv-dias') {
  window.testeBvDesde = sod(NOW) - 10 * DAY;
  T.family_members = [{ family_id: F, user_id: U.me, joined_at: new Date(sod(NOW) - 4 * DAY).toISOString() }];
  T.family_settings = [{ family_id: F, hidden_kinds: ['pump', 'care'] }];
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

// "quem-fez": quem fez diferente de quem anotou e "pegou no sono sozinha" (02/11). Nos últimos 30
// dias, 1 a cada 4 "Dormiu" pegou no sono sozinha, e as mamadeiras e fraldas que o Pedro anotou foi
// a Carol que fez.
if (CEN === 'quem-fez') {
  let i = 0;
  for (const e of entries) {
    if (at(e) < dia(30)) continue;
    if (e.kind === 'sleep' && i++ % 4 === 0) e.self_settled = true;
    if (e.author_id === U.p && (e.kind === 'diaper' || (e.kind === 'feed' && e.src === 'bottle'))) e.done_by = U.me;
  }
}

// "fraldas": a foto do guia "Quantas fraldas por dia" do site (08/11). Nos últimos 7 dias, de 6 a 8
// fraldas por dia, de 1 a 3 com cocô (nos dados de exemplo são sempre 8). Hoje fica como está.
if (CEN === 'fraldas' || CEN === 'sem-coco') {
  const alvo = [null, [7, 2], [6, 1], [8, 3], [6, 2], [7, 1], [8, 2], [7, 3]];
  for (let d = 1; d < alvo.length; d++) {
    const a = dia(d), [n, poos] = alvo[d];
    const ds = entries.filter(e => e.kind === 'diaper' && at(e) >= a && at(e) < a + DAY).sort((x, y) => at(x) - at(y));
    // Tira as que sobram espalhadas pelo dia; o cocô fica em fraldas espaçadas.
    const fora = ds.length - n, sai = new Set();
    for (let i = 0; i < fora; i++) sai.add(ds[Math.floor((i + .5) * ds.length / fora)]);
    rmWhere(e => sai.has(e));
    const ficam = ds.filter(e => !sai.has(e));
    ficam.forEach((e, i) => {
      const poo = Math.floor(i * poos / ficam.length) !== Math.floor((i + 1) * poos / ficam.length);
      if (poo) { e.poo = true; e.poo_size = e.poo_size || 'medio'; } else { delete e.poo; delete e.poo_size; }
    });
  }
}

// "sem-coco": a foto do guia "Bebê não faz cocô há X dias" do site (08/11). O mesmo do "fraldas", mas
// sem cocô de 5 dias atrás, às 6h, até 2 dias atrás, às 9h40, quando vem um cocô grande (só xixi nesse
// meio). Na foto de 08/11, o intervalo vai de seg 2, 20:37, a sex 6, 09:40: 3 dias e 13h.
if (CEN === 'sem-coco') {
  const a = dia(5, 6), z = dia(2, 9, 40);
  for (const e of entries) if (e.kind === 'diaper' && at(e) > a && at(e) < z + 4 * 36e5) { delete e.poo; delete e.poo_size; }
  add(z, 'diaper', { pee: true, poo: true, poo_size: 'grande' });
}

// "carrossel" (08/11): fotos do carrossel da página inicial. A Helena acordada há pouco mais de uma hora
// (para "Acordou há" no alto da tela) e três dúvidas para a consulta. Abrir com o relógio às 13h.
if (CEN === 'carrossel') {
  const sl = entries.filter(e => e.kind === 'sleep').pop(), wk = entries.filter(e => e.kind === 'wake').pop();
  if (sl && (!wk || at(sl) > at(wk))) add(Math.max(at(sl) + 60 * MIN, NOW - 72 * MIN), 'wake');
  entries.sort((a, b) => at(a) - at(b));
  T.questions = [
    { id: 'qc1', family_id: F, baby_id: B, body: 'É normal ficar 3 dias sem cocô?', asked_on: null, answer: null, created_at: new Date(NOW - 6 * DAY).toISOString() },
    { id: 'qc2', family_id: F, baby_id: B, body: 'Os cochilos da tarde estão curtos, é normal?', asked_on: null, answer: null, created_at: new Date(NOW - 4 * DAY).toISOString() },
    { id: 'qc3', family_id: F, baby_id: B, body: 'Quando começar a introdução alimentar?', asked_on: null, answer: null, created_at: new Date(NOW - 2 * DAY).toISOString() },
  ];
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

// "tarefas" e "app-tarefas" (08/11, Tarefas e Pomada): a rotina da Helena com banho de sol às 9h, tummy time
// 3 vezes por dia e a pomada na troca de fralda (Bepantol e Hipoglós), e a última fralda de hoje com as duas
// pomadas. "app-tarefas" finge o app do Android, como o "app-remedio" (avisos em window.avisos).
// "tarefas-vazio": sem nenhuma tarefa programada (a capivara).
T.routines = T.routines || [];
if (CEN === 'tarefas' || CEN === 'app-tarefas') {
  const fam = T.babies[0].family_id, baby = T.babies[0].id, made = new Date(NOW - 5 * DAY).toISOString();
  T.routines.push(
    { id: 'r-1', family_id: fam, baby_id: baby, kind: 'sunbath', name: null, schedule: 'fixed', times: ['09:00:00'], per_day: null, items: null, stopped_at: null, created_by: U.me, created_at: made },
    { id: 'r-2', family_id: fam, baby_id: baby, kind: 'tummy', name: null, schedule: 'count', times: null, per_day: 3, items: null, stopped_at: null, created_by: U.me, created_at: made },
    { id: 'r-3', family_id: fam, baby_id: baby, kind: 'ointment', name: null, schedule: 'diaper', times: null, per_day: null, items: ['Bepantol', 'Hipoglós'], stopped_at: null, created_by: U.p, created_at: made });
  const d = T.entries.filter(e => e.kind === 'diaper').at(-1);
  if (d) T.entries.push({ id: 'oint-1', family_id: fam, baby_id: baby, kind: 'ointment', at: d.at, ointments: ['Bepantol', 'Hipoglós'], diaper_id: d.id,
                          author_id: d.author_id, created_at: d.at });
}

