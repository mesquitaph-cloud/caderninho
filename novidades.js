// Cartão de novidades (item 77): aparece uma vez, na primeira abertura do app depois de atualizar.
// Prévia e textos aprovados pelo Patrick em 17/11: https://claude.ai/artifact/Um2XFygBDM8aqeB5ebhami
// Para uma versão nova: acrescentar uma entrada em NOVIDADES (a chave é a versão do app, "1.0.5") com
// título, abertura e itens; versão sem entrada não mostra nada. Cada item usa um ícone de ICONES e uma cor
// de chip (feed, sleep ou diaper, as variáveis de cada registro no styles.css). Sem capivara, sem SQL.
import { esc } from './util.js';

export const NOV_KEY = 'cad-novidades';   // neste aparelho: a última versão cujas novidades já foram vistas

// Traço fino arredondado, como os demais ícones do app (viewBox 24).
const ICONES = {
  lua: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  grafico: '<path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6"/>',
  familia: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.3"/><path d="M3.5 19c.4-3 2.6-5 5.5-5s5.1 2 5.5 5M15 14.2c2.6-.5 4.8 1 5.5 4.3"/>',
};

export const NOVIDADES = {
  '1.0.4': {
    title: 'Novidades do Soneca',
    intro: 'Três mudanças nesta versão.',
    items: [
      { icon: 'lua', chip: 'sleep', title: 'Janela de sono do seu bebê', text: 'O Soneca calcula a janela a partir das sonecas que você anotou e mostra quanto falta para a próxima.' },
      { icon: 'grafico', chip: 'feed', title: 'Tendências', text: 'Veja como está o padrão de sono e despertar do seu bebê.' },
      { icon: 'familia', chip: 'diaper', title: 'Bebê e família num só lugar', text: 'Os dados do bebê e da família ficam juntos na aba Família.' },
    ],
    button: 'Entendi',
  },
};

// Mostrar? Só com novidades escritas para esta versão e sem a marca desta versão neste aparelho.
// Instalação nova nunca vê (o onboarding grava a marca, ver novSeen no app.js).
export const novFor = (version, seen) => (version && NOVIDADES[version] && seen !== version) ? NOVIDADES[version] : null;

export function novHtml(n) {
  return `<div class="cbox nov" role="dialog" aria-modal="true" aria-labelledby="novT"><h3 id="novT">${esc(n.title)}</h3><p class="novin">${esc(n.intro)}</p>`
    + n.items.map(i => `<div class="novit"><span class="novic ${esc(i.chip)}" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONES[i.icon] || ''}</svg></span>`
      + `<div><h4>${esc(i.title)}</h4><p>${esc(i.text)}</p></div></div>`).join('')
    + `<button class="save" data-nov="ok">${esc(n.button)}</button></div>`;
}
