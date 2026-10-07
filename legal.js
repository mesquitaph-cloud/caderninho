// Política e Termos: a mesma aparência escolhida no app (Perfil › Aparência), sem esperar a página carregar.
try { const t = localStorage.getItem('cad-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
