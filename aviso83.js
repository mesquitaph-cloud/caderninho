// Aviso para famílias sem remédio ou tarefa programados (item 83; prévia v05 aprovada em 19/11:
// https://claude.ai/artifact/EmDVtcQaK5p9EpsWGDRSnf). Um cartão na tela Hoje, no estilo do de boas-vindas,
// sem capivara. Cada tipo é avaliado à parte: só aparece o que a família ainda NÃO tem (remédio ou
// tarefa ativos, de qualquer bebê). Este arquivo só decide quando mostrar; o desenho fica em app.js.
// Texto para trocar depois (item 84, teste A/B): mexer só em AVISO_TEXTO.
import { esc } from './util.js';

export const HOUR_MS = 3600000, DAY_MS = 24 * HOUR_MS;
export const AVISO_ESPERA = 3 * HOUR_MS;      // espera antes do primeiro cartão (e de quem entra por convite)
export const AVISO_ULTIMO_DIA = 6;            // do 7º dia em diante, nunca mais
// Dias contados do marco zero (dia 0 = as primeiras 24 h). Com os dois em falta: tarefa 0/3/5, remédio 1/4/6.
// Com só um em falta, ele usa os dias da tarefa (0/3/5).
export const AVISO_DIAS = { tarefa: [0, 3, 5], remedio: [1, 4, 6] };
export const AVISO_TEXTO = {
  tarefa: { titulo: 'Programe uma tarefa da rotina', texto: 'O Soneca lembra no horário e a família toda vê quem fez.', botao: 'Programar tarefa' },
  remedio: { titulo: 'Programe um remédio', texto: 'O Soneca lembra no horário e a família toda vê quem deu. Só o que vocês programarem.', botao: 'Programar remédio' },
  depois: 'Agora não',
};
export const avisoKey = (familyId, tipo) => `cad-aviso83-${familyId}-${tipo}`;

// Marco zero da família: o bebê mais antigo (created_at). Sem bebê, sem marco.
export function avisoMarco(babies) {
  const ts = (babies || []).map(b => Date.parse(b.created_at)).filter(Number.isFinite);
  return ts.length ? Math.min(...ts) : NaN;
}
// Dia do calendário (0, 1, 2…) em que a família está.
export const avisoDia = (marco, agora) => Math.floor((agora - marco) / DAY_MS);
// Os dias do calendário de cada tipo que falta ({} se nenhum falta).
export function avisoCalendario(falta) {
  const out = {};
  if (falta.tarefa) out.tarefa = AVISO_DIAS.tarefa;
  if (falta.remedio) out.remedio = falta.tarefa ? AVISO_DIAS.remedio : AVISO_DIAS.tarefa;
  return out;
}
// Decide qual cartão mostrar agora (ou nenhum).
//  marco: ms do bebê mais antigo · entrada: ms de quando esta pessoa entrou na família · agora: ms
//  falta: { tarefa, remedio } (true = a família não tem) · vistos: { tarefa: [dias], remedio: [dias] }
// Devolve { tipo, consumir: { tipo: [dias] } } — os dias marcados como vistos ao mostrar (todos os que já
// venceram, dos dois tipos, para nunca sair outro cartão no mesmo dia) — ou null.
export function avisoEscolher({ marco, entrada, agora, falta, vistos = {} }) {
  if (!Number.isFinite(marco) || !Number.isFinite(agora)) return null;
  const dia = avisoDia(marco, agora);
  if (dia < 0 || dia > AVISO_ULTIMO_DIA) return null;
  const desde = Math.max(marco, Number.isFinite(entrada) ? entrada : marco) + AVISO_ESPERA;
  if (agora < desde) return null;
  const cal = avisoCalendario(falta);
  const venceu = {};
  for (const tipo in cal) venceu[tipo] = cal[tipo].filter(d => d <= dia && !(vistos[tipo] || []).includes(d));
  const tipos = Object.keys(cal).filter(t => venceu[t].length);
  if (!tipos.length) return null;
  // O de dia marcado mais recente; empate (só com um calendário só) não existe. Tarefa na dúvida.
  tipos.sort((a, b) => Math.max(...venceu[b]) - Math.max(...venceu[a]) || (a === 'tarefa' ? -1 : 1));
  const consumir = {};
  for (const t of tipos) consumir[t] = venceu[t];
  return { tipo: tipos[0], consumir };
}
export function avisoHtml(tipo) {
  const t = AVISO_TEXTO[tipo];
  return `<div class="card bv aviso" role="region" aria-labelledby="avT"><h3 id="avT">${esc(t.titulo)}</h3><p>${esc(t.texto)}</p>`
    + `<div class="btns"><button class="save" data-av="go">${esc(t.botao)}</button><button class="link" data-av="no">${esc(AVISO_TEXTO.depois)}</button></div></div>`;
}
