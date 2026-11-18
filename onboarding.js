// Onboarding v02 (sem paywall), aprovado pelo Patrick em 18/11/2026. O login passa a vir DEPOIS das
// perguntas do bebê e do sono, antes de "Quase pronto". Este arquivo guarda só a lógica, sem tela e sem
// banco, para os testes (testes/onboarding.mjs) rodarem no Node:
//   - onde ficam as respostas (só no aparelho, por etapa) e como voltar a elas depois do login;
//   - a rota de entrada pela conta (entryRoute);
//   - a lista de etapas de cada caso (onbSteps);
//   - as contas das telas de sono (horário do "Dormiu às", frase e régua da janela, aviso da soneca tardia).
// Nada daqui fala com o Supabase: até "Criar família", as respostas existem só neste aparelho.
import { MIN, HOUR, pad, startOfDay, addDays, lsGet, lsSet } from './util.js';
import { monthsOld, wakeRef, fmtDur } from './janela.js';

// Onde as respostas ficam guardadas (o login com o Google/Apple sai da página e volta; o app pode ser
// fechado no meio). A chave começa com "cad-" como as outras do aparelho.
export const ONB_KEY = 'cad-onb';
// Marca de que a pessoa tocou num botão de entrar (a frase "Ao continuar, você aceita a Política e os
// Termos" vale como aceite): depois do login, o aceite é gravado com a versão vigente e a marca some.
export const LOGIN_FLAG = 'cad-login-aceite';

// O começo da noite que já vem marcado na pergunta (a prévia de 18/11 marcava 20h; antes era 18h).
export const ONB_NIGHT_DEFAULT = 20;
// REGRA PROVISÓRIA (o Patrick ainda vai definir): o aviso amarelo da tela 7 fala de sonecas que começam
// depois de "hora da noite menos esta quantidade de horas". Com a noite às 20h, 17h.
export const NAP_WARN_HOURS = 3;
// "Dormiu às" vazio: o Soneca usa este tempo atrás.
export const SLEEP_AGO_DEFAULT = 30 * MIN;
// Quanto durou a última soneca (tela 6A): guardado, ainda não entra na conta da janela.
export const NAP_LENGTHS = [['30', 'Até 30 min'], ['60', '30 min a 1h'], ['120', '1h a 2h'], ['121', 'Mais de 2h']];

// As respostas em branco. via: 'novo' (começou por "Começar", sem conta) ou 'conta' (já tinha conta ou entrou
// por "Já tenho conta"): quem já tem conta não vê a tela "Quem fez o Soneca".
export function blank(via = 'novo') {
  return { via, k: 'bebe', name: '', birth: '', sex: null, feed: null, milk: null, food: null,
    sleep: null, at: '', nap: null, sat: '', night: ONB_NIGHT_DEFAULT, alert: null,
    pname: '', role: null, side: null, fam: '' };
}

// Guardar e ler. O que vai para o aparelho é só o que a pessoa respondeu (o aceite da tela final não vai:
// ela marca de novo).
const KEEP = Object.keys(blank());
export function onbSave(O, store = lsSet) {
  const o = {}; for (const k of KEEP) o[k] = O[k];
  store(ONB_KEY, JSON.stringify({ v: 1, ...o }));
}
export function onbLoad(read = lsGet) {
  try {
    const s = JSON.parse(read(ONB_KEY));
    if (!s || s.v !== 1 || typeof s !== 'object') return null;
    const O = blank(s.via === 'conta' ? 'conta' : 'novo');
    for (const k of KEEP) if (k in s) O[k] = s[k];
    return O;
  } catch { return null; }
}
export const onbClear = (store = lsSet) => store(ONB_KEY, null);

// "Tem respostas": alguma coisa preenchida, ou já passou da primeira tela. Quem só tocou em "Começar"
// e fechou o app volta às Boas-vindas.
export function hasAnswers(O) {
  if (!O) return false;
  if (O.k && O.k !== 'bebe') return true;
  return !!(O.name || O.birth || O.sex || O.feed || O.sleep);
}

// A rota de entrada, decidida na abertura do app. Devolve:
//   'welcome'   sem conta e sem respostas: Boas-vindas ("Começar" / "Já tenho conta")
//   'resume'    sem conta e com respostas: volta à etapa em que parou
//   'login'     sem conta, com convite guardado: a tela de login primeiro
//   'terms'     com conta, mas sem aceite da versão vigente da Política e dos Termos
//   'name'      com conta e convite, sem perfil: nome e "Você é", depois o convite
//   'invite'    com conta e convite: "Entrar na família", sem a tela "Quem fez o Soneca" nem as perguntas
//   'home'      com conta e com família: tela inicial (as respostas guardadas são descartadas)
//   'perguntas' com conta e sem família: perguntas do bebê e do sono, sem a tela de login, depois Quase pronto
export function entryRoute({ session, profile, terms, invite, families, saved }) {
  if (!session) return invite ? 'login' : hasAnswers(saved) ? 'resume' : 'welcome';
  if (!terms) return 'terms';
  if (invite) return profile ? 'invite' : 'name';
  if (families > 0) return 'home';
  return 'perguntas';
}

// As telas do caso, na ordem. months: idade do bebê em meses (monthsOld); session: já há conta.
// Telas: bebe, mama, mamadeira (só mamadeira), comida (6 meses ou mais), quem (só para quem começou por
// "Começar"), gancho, agora (acordada ou dormindo?), acordada e janela, ou dormindo e dormindo2, login (só sem
// conta), quase. "Pular" em agora, acordada ou dormindo limpa a resposta de sono e cai direto no login.
export function onbSteps(O, { session = false, months = null } = {}) {
  const s = ['bebe', 'mama'];
  if (O.feed === 'bottle' || O.feed === 'both') s.push('mamadeira');
  if (months !== null && months >= 6) s.push('comida');
  if (O.via === 'novo') s.push('quem');
  s.push('gancho', 'agora');
  if (O.sleep === 'wake') s.push('acordada', 'janela');
  else if (O.sleep === 'sleep') s.push('dormindo', 'dormindo2');
  if (!session) s.push('login');
  s.push('quase');
  return s;
}
// A tela em que voltar a abrir. Uma etapa que já não existe (o "login", depois de entrar) vale a seguinte;
// sem lista que a ache, Quase pronto.
export function resumeStep(O, steps) {
  if (steps.includes(O.k)) return O.k;
  return O.k === 'login' ? 'quase' : steps.includes('quase') ? 'quase' : steps[0];
}
export const nextStep = (steps, k) => steps[Math.min(steps.indexOf(k) + 1, steps.length - 1)];
export const prevStep = (steps, k) => steps[steps.indexOf(k) - 1] ?? null;
// "Pular" no sono: sem resposta e sem janela; a próxima é o login (ou Quase pronto, com conta).
export function skipSleep(O, steps0) {
  O.sleep = null; O.at = ''; O.sat = ''; O.nap = null; O.alert = null;
  const steps = steps0.filter(k => !['acordada', 'janela', 'dormindo', 'dormindo2'].includes(k));
  return steps.includes('login') ? 'login' : 'quase';
}

/* ---------- as contas das telas de sono ---------- */
// "13h30", "15h", "9h05"
export const clk = t => { const d = new Date(t); return d.getHours() + 'h' + (d.getMinutes() ? pad(d.getMinutes()) : ''); };
// Hoje às hh:mm; se ainda não chegou, ontem (o primeiro registro nunca fica no futuro).
export function atToday(hhmm, now) {
  const [H, M] = hhmm.split(':').map(Number), d0 = startOfDay(now);
  const t = new Date(d0).setHours(H, M, 0, 0);
  return t > now ? new Date(addDays(d0, -1)).setHours(H, M, 0, 0) : t;
}
// "Dormiu às": o horário da pessoa, ou (campo vazio) 30 minutos antes de agora.
export function sleepStart(hhmm, now) {
  // Arredondado ao minuto mais próximo: o campo guarda hora e minuto, e "30 min atrás" não vira 31.
  return /^\d\d:\d\d$/.test(hhmm || '') ? atToday(hhmm, now) : Math.round((now - SLEEP_AGO_DEFAULT) / MIN) * MIN;
}
// "Acordou às": o horário da pessoa; vazio, agora.
export const wakeStart = (hhmm, now) => /^\d\d:\d\d$/.test(hhmm || '') ? atToday(hhmm, now) : now;

// A frase da tela 7 (só para a resposta "Acordada"). awake em ms desde o "Acordou"; ref = [de, até] em ms ou
// null (12 meses ou mais, ou sem nascimento: só o contador). Antes da janela, a frase nova da prévia
// ("A próxima janela de sono começa em X e termina às Y"); dentro ou depois dela, as frases que o app já
// tinha (janela.js, winText). Devolve { kind, start, end } para a tela montar o texto.
export function windowInfo(wakeAt, ref, now) {
  const awake = Math.max(0, now - wakeAt);
  if (!ref) return { kind: 'contador', awake, ref: null };
  const start = wakeAt + ref[0], end = wakeAt + ref[1];
  return { kind: now < start ? 'antes' : 'durante', awake, ref, start, end };
}
// "10 minutos", "1 minuto", "1h20"
export function minutosText(ms) {
  const m = Math.max(1, Math.round(ms / MIN));
  return m < 60 ? m + (m === 1 ? ' minuto' : ' minutos') : fmtDur(ms);
}
// A hora (inteira) a partir da qual uma soneca pode atrapalhar a noite: começo da noite menos NAP_WARN_HOURS.
export const napWarnHour = night => ((+night - NAP_WARN_HOURS) + 24) % 24;
export const napWarnText = night => `Tome cuidado com sonecas que comecem depois das ${napWarnHour(night)}h: podem atrapalhar o sono da noite.`;

export { monthsOld, wakeRef };
