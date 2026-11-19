// Dados de exemplo das capturas de ASO (v2). O telas-aso.mjs cola este arquivo no fim do fake-sb.js: T, entries,
// NOW, DAY, MIN, sod, id, U, F, B vêm de lá. Refaz todo o sono da Helena (3 meses, família Andrade):
//  - as noites das últimas 7 (de 1 a 7 dias atrás) crescem de 6h20 para 9h, com os despertares ficando mais curtos;
//    as anteriores ficam em torno de 6h20;
//  - sonecas do dia como no resto da loja; hoje às 14h32 ela dorme desde 13h17 (?aso=base) ou acordou há 45 min
//    (?aso=acordada: a faixa da janela de sono).
const ASO = new URLSearchParams(location.search).get('aso') || 'base';
{
  let sd = 11; const r2 = () => (sd = (sd * 48271) % 2147483647) / 2147483647;
  const aut = [U.me, U.me, U.p, U.v];
  for (let i = entries.length - 1; i >= 0; i--) if (entries[i].kind === 'sleep' || entries[i].kind === 'wake') entries.splice(i, 1);
  const put = (t, kind) => { if (t <= NOW) entries.push({ id: id(), family_id: F, baby_id: B, kind, at: new Date(t).toISOString(), author_id: aut[Math.floor(r2() * 4)] }); };
  const j = m => Math.round((r2() - .5) * 2 * m) * MIN;
  const hm = (b, h, m = 0) => b + h * 36e5 + m * MIN;
  for (let d = 41; d >= 0; d--) {
    const base = sod(NOW) - d * DAY, today = d === 0;
    // Sonecas do dia (6h às 18h) e a do começo da noite.
    const naps = [[7, 30, 8, 50], [10, 0, 11, 35], [13, 10, 14, 35], [16, 0, 17, 15], [18, 30, 19, 5]];
    naps.forEach(([a, b, c, e], i) => {
      let s = hm(base, a, b) + j(12), w = hm(base, c, e) + j(12);
      if (today && i === 2) { // a soneca de hoje: dormindo desde 13h17, ou acordou há 45 min
        if (ASO === 'acordada') { s = hm(base, 12, 20); w = NOW - 45 * MIN; } else { s = hm(base, 13, 17); w = null; }
      }
      put(s, 'sleep'); if (w) put(w, 'wake');
    });
    // A noite que começa na noite deste dia e termina de manhã: k = 0 (a de 7 dias atrás) a 6 (a de ontem).
    if (today) continue;
    const k = d <= 7 ? 7 - d : 0, flat = d > 7, nz = flat ? 10 : 4;
    const S = hm(base, 21, 30) - k * 12.5 * MIN + j(nz), E = hm(base + DAY, 5, 35) + k * 4 * MIN + j(flat ? 6 : 1);
    const w = (45 - k * 5) * MIN, c1 = hm(base + DAY, 0, 55) + j(3), c2 = hm(base + DAY, 3, 30) + j(5);
    put(S, 'sleep'); put(c1, 'wake'); put(c1 + w, 'sleep'); put(c2, 'wake'); put(c2 + w, 'sleep'); put(E, 'wake');
  }
  // Dúvidas para a consulta (aparecem no relatório): sem "normal".
  T.questions[1].body = 'Sonecas curtas à tarde';
}
