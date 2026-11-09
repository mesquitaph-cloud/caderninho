// Página das lojas: quem chega por um link de convite (?convite=...) sem o app vê os passos do convite.
if (new URLSearchParams(location.search).has('convite')) {
  for (const id of ['lnInv', 'lnSteps', 'lnPaste']) document.getElementById(id).hidden = false;
  document.getElementById('lnTag').hidden = true;
}

// As fotos seguem o tema do celular (<picture>). Quem escolheu dia ou noite no antigo site (legal.js põe
// data-theme) vê as fotos do tema escolhido.
const theme = document.documentElement.dataset.theme;
if (theme === 'dark' || theme === 'light') {
  for (const s of document.querySelectorAll('picture source')) s.media = theme === 'dark' ? 'all' : 'not all';
}

const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Carrossel: passa sozinho a cada 4 s e volta ao primeiro no fim. Para enquanto a pessoa toca, passa o mouse
// ou usa as setas, e volta a girar 6 s depois. Com "reduzir movimento" ligado, fica parado.
const track = document.getElementById('lnTrack');
const dots = [...document.getElementById('lnDots').children];
const step = () => track.firstElementChild.getBoundingClientRect().width + 14;
let hold = false, resume;
const pause = () => { hold = true; clearTimeout(resume); };
const later = () => { clearTimeout(resume); resume = setTimeout(() => { hold = false; }, 6000); };
for (const e of ['pointerdown', 'mouseenter', 'focusin', 'wheel']) track.addEventListener(e, pause, { passive: true });
for (const e of ['pointerup', 'mouseleave', 'focusout', 'touchend']) track.addEventListener(e, later, { passive: true });
document.getElementById('lnPrev').addEventListener('click', () => { pause(); later(); track.scrollBy({ left: -step(), behavior: 'smooth' }); });
document.getElementById('lnNext').addEventListener('click', () => { pause(); later(); track.scrollBy({ left: step(), behavior: 'smooth' }); });
track.addEventListener('scroll', () => {
  const n = Math.round(track.scrollLeft / step());
  dots.forEach((d, i) => d.classList.toggle('on', i === n));
}, { passive: true });
if (!calm) setInterval(() => {
  if (hold || document.hidden) return;
  const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  track.scrollTo({ left: end ? 0 : track.scrollLeft + step(), behavior: 'smooth' });
}, 4000);

// Vídeo: sem som, começa quando aparece na tela e pausa quando sai. Só baixa quando a pessoa chega nele.
const video = document.getElementById('lnVideo');
if (!calm && 'IntersectionObserver' in window) {
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) video.play().catch(() => {}); else video.pause();
  }), { threshold: 0.6 }).observe(video);
}
