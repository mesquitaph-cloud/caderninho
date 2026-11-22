// Cartão "convide alguém para a família" (item 35; prévia aprovada em 22/11:
// https://claude.ai/artifact/X9yccQXyZncFKHYaFPUf4z). Fica na tela inicial, no fim, no estilo dos outros
// cartões de boas-vindas, sem capivara. Este arquivo só decide quando mostrar e guarda os fechamentos
// (neste celular, uma chave por família: cad-convite35-<família>); o desenho fica em app.js. Sem SQL.
//   Quem vê: família com 1 membro e registros em 3 dias diferentes.
//   Some de vez: quando entra o 2º membro, ou no 2º fechamento ("Agora não" ou ×).
//   1º fechamento: some por 14 dias do calendário; se ainda houver 1 membro, volta uma única vez.
//   Se o convite do item 56 está na tela no mesmo dia, o cartão espera (um por vez, o do 56 primeiro).
// Textos aprovados pelo Patrick em 22/11, palavra por palavra: não mudar sem nova aprovação.
import { esc, startOfDay, addDays } from './util.js';

export const CONVITE35_DIAS = 3;      // dias diferentes com registro
export const CONVITE35_ESPERA = 14;   // dias do calendário depois do 1º fechamento
export const CONVITE35_TEXTO = {
  titulo: 'Percebemos que você não convidou ninguém para a sua família!',
  corpo: nome => `O Soneca permite que você convide outros membros da família para ajudar a anotar e cuidar de ${nome}. Gostaria de convidar alguém para participar dessa família?`,
  convidar: 'Convidar',
  depois: 'Agora não',
};
export const convite35Key = familyId => 'cad-convite35-' + familyId;

// Lê o que ficou guardado: { n: quantas vezes fechou, ate: quando fechou por último (ms) }.
export function convite35Ler(raw) {
  try { const o = JSON.parse(raw); return { n: Math.max(0, +o.n || 0), ate: +o.ate || 0 }; } catch { return { n: 0, ate: 0 }; }
}
// Quantos dias diferentes têm registro. tempos: ms de cada registro.
export const convite35Dias = tempos => new Set(tempos.map(t => startOfDay(t))).size;

// Devolve true se o cartão deve aparecer agora.
//  membros: quantos membros a família tem · tempos: ms dos registros · guardado: { n, ate } · agora: ms
//  outroCartao: true se um cartão de boas-vindas ou o convite do 56 está na tela agora
export function convite35Mostrar({ membros, tempos, guardado = { n: 0, ate: 0 }, agora, outroCartao = false }) {
  if (outroCartao || membros !== 1 || guardado.n >= 2) return false;
  if (convite35Dias(tempos) < CONVITE35_DIAS) return false;
  if (guardado.n === 0) return true;
  return startOfDay(agora) >= addDays(startOfDay(guardado.ate), CONVITE35_ESPERA);
}
// O que guardar ao fechar (× ou "Agora não").
export const convite35Fechar = (guardado, agora) => ({ n: Math.min(2, guardado.n + 1), ate: agora });
// Entrou o 2º membro: some de vez.
export const convite35Encerrado = () => ({ n: 2, ate: 0 });

export function convite35Html(nome) {
  const T = CONVITE35_TEXTO;
  return `<div class="card bv"><button class="x" data-cv="no" aria-label="Fechar">×</button><h3>${T.titulo}</h3><p>${T.corpo(esc(nome))}</p>`
    + `<div class="btns"><button class="save" data-cv="go">${T.convidar}</button><button class="link" data-cv="no">${T.depois}</button></div></div>`;
}
