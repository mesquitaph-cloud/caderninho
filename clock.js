// Ajuste de horário dentro da tela, no lugar do relógio do celular (que em alguns aparelhos
// deixava o botão "Definir" fora da tela). O jeito principal é digitar; − e + mexem de 1 em 1.
// Quem usa lê o valor como de um campo: o bloco tem o id, `value` ("HH:MM") e dispara `input`.
import { pad } from './util.js';

// ink: cor dos botões (feed, sleep, med...); label: nome para leitor de tela.
export function clockHtml(id, value, ink = 'feed', label = 'Horário') {
  const [H, M] = (value || '00:00').split(':');
  const half = (u, v, name, one) => `<div class="cunit"><button type="button" data-cstep="${u}:-1" aria-label="${one} antes">−</button><input inputmode="numeric" enterkeyhint="${u === 'h' ? 'next' : 'done'}" autocomplete="off" data-cu="${u}" value="${v}" aria-label="${name}"><button type="button" data-cstep="${u}:1" aria-label="${one} depois">+</button></div>`;
  return `<div class="clock" id="${id}" role="group" aria-label="${label}" style="--k:var(--${ink}-ink)" data-v="${pad(+H)}:${pad(+M)}">${half('h', H, 'Hora', 'Uma hora')}<span class="colon">:</span>${half('m', M, 'Minutos', 'Um minuto')}</div>`;
}

const parts = c => c.dataset.v.split(':').map(Number);
function set(c, h, m) {
  const t = ((h * 60 + m) % 1440 + 1440) % 1440, v = pad(Math.floor(t / 60)) + ':' + pad(t % 60);
  const [hi, mi] = c.querySelectorAll('input');
  hi.value = v.slice(0, 2); mi.value = v.slice(3);
  if (v === c.dataset.v) return;
  c.dataset.v = v; c.value = v;
  c.dispatchEvent(new Event('input', { bubbles: true }));
}
// Grava o que foi digitado pela metade (ex.: só "1" na hora) ou volta o número de antes.
function commit(inp) {
  const c = inp.closest('.clock'), [h, m] = parts(c), d = inp.dataset.typed;
  delete inp.dataset.typed; inp.classList.remove('typing');
  if (!d) return set(c, h, m);
  inp.dataset.cu === 'h' ? set(c, +d, m) : set(c, h, +d);
}

let rep, wait;
const stop = () => { clearTimeout(wait); clearInterval(rep); };
function step(b) {
  const c = b.closest('.clock'); if (!c) return;
  c.querySelectorAll('input[data-typed]').forEach(commit);
  const [u, d] = b.dataset.cstep.split(':'), [h, m] = parts(c);
  set(c, h, m + (u === 'h' ? 60 : 1) * +d);
}
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('[data-cstep]'); if (!b) return;
  e.preventDefault(); stop(); step(b);
  wait = setTimeout(() => { rep = setInterval(() => b.isConnected ? step(b) : stop(), 90); }, 400);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => document.addEventListener(t, stop, true));
// Teclado (Enter/espaço) nos botões: o click sem ponteiro tem detail 0.
document.addEventListener('click', e => { const b = e.target.closest('[data-cstep]'); if (b && e.detail === 0) step(b); });

document.addEventListener('focusin', e => {
  const inp = e.target; if (!inp.matches?.('.clock input')) return;
  // Esvazia o campo e deixa o número de antes em cinza: o que digitar entra no lugar, sem
  // depender de o celular selecionar o texto (em alguns teclados de Android isso falha).
  delete inp.dataset.typed; inp.placeholder = inp.value; inp.value = '';
});
document.addEventListener('focusout', e => { if (e.target.matches?.('.clock input')) commit(e.target); });
// Digitando: dois números completam; hora de 3 a 9 ou minuto de 6 a 9 já completam sozinhos.
document.addEventListener('input', e => {
  const inp = e.target; if (!inp.matches?.('.clock input')) return;
  e.stopPropagation();
  const u = inp.dataset.cu, max = u === 'h' ? 23 : 59, quick = u === 'h' ? 3 : 6;
  let d = inp.value.replace(/\D/g, '').slice(0, 2);
  if (+d > max) d = d.slice(0, 1);     // 29 não é hora: fica o 2
  inp.value = d; inp.dataset.typed = d; inp.classList.toggle('typing', !!d);
  if (d.length === 2 || (d && +d >= quick)) {
    const mi = inp.closest('.clock').querySelector('[data-cu="m"]');
    commit(inp);
    if (u === 'h') mi.focus(); else inp.blur();
  }
}, true);
document.addEventListener('keydown', e => {
  const inp = e.target; if (e.key !== 'Enter' || !inp.matches?.('.clock input')) return;
  e.preventDefault();
  inp.dataset.cu === 'h' ? inp.closest('.clock').querySelector('[data-cu="m"]').focus() : inp.blur();
});
