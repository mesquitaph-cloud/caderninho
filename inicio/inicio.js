// Página das lojas: quem chega por um link de convite (?convite=...) sem o app vê os passos do convite.
if (new URLSearchParams(location.search).has('convite')) {
  for (const id of ['lnInv', 'lnSteps', 'lnPaste']) document.getElementById(id).hidden = false;
  for (const id of ['lnTag', 'lnSite']) document.getElementById(id).hidden = true;
}
