// ============================================================
//  Horaris de les gasolineres (format del Ministeri)
//  Exemples: "L-D: 24H" · "L-V: 06:00-22:00; S-D: 07:00-22:00" · "L-V: 09:00-13:00 y 15:00-18:00"
//  Dies: L M X J V S D (dilluns → diumenge)
// ============================================================
const DIES_LLETRA = "LMXJVSD";

// Retorna { franges: [[ [ini,fi], ... ] × 7 dies], dies: Set dels dies que surten } o null si no s'entén.
// Minuts des de les 00:00. Un tram que passa la mitjanit es parteix entre aquell dia i l'endemà.
function llegeixHorari(text) {
  if (!text) return null;
  const franges = [[], [], [], [], [], [], []];
  const dies = new Set();
  for (const tros of String(text).split(";")) {
    const m = tros.trim().match(/^([LMXJVSD](?:\s*[-,]\s*[LMXJVSD])*)\s*:\s*(.+)$/i);
    if (!m) { if (tros.trim()) return null; continue; }
    const llista = [];
    for (const part of m[1].toUpperCase().split(",")) {
      const [a, b] = part.split("-").map(s => DIES_LLETRA.indexOf(s.trim()));
      if (a < 0 || (b !== undefined && b < 0)) return null;
      if (b === undefined) llista.push(a);
      else for (let d = a; ; d = (d + 1) % 7) { llista.push(d); if (d === b) break; }
    }
    const trams = [];
    for (const t of m[2].split(/\s+y\s+|\s*,\s*/i)) {
      if (/^24\s*H$/i.test(t.trim())) { trams.push([0, 1440]); continue; }
      const h = t.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
      if (!h) return null;
      const ini = +h[1] * 60 + +h[2];
      let fi = +h[3] * 60 + +h[4];
      if (fi === 1439) fi = 1440;            // "00:00-23:59" vol dir tot el dia
      trams.push([ini, fi]);
    }
    for (const d of llista) {
      dies.add(d);
      for (const [ini, fi] of trams) {
        if (fi > ini) franges[d].push([ini, fi]);
        else if (fi === ini) franges[d].push([0, 1440]);
        else { franges[d].push([ini, 1440]); if (fi > 0) franges[(d + 1) % 7].push([0, fi]); }
      }
    }
  }
  return dies.size ? { franges, dies } : null;
}

const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// Estat ara: { obert: true|false|null, h24, fins, obre, obreDia }
//  - obert null = no se sap (horari estrany, o l'horari només parla d'un sol dia i avui no és aquest)
function estatHorari(text, ara = new Date()) {
  const h = llegeixHorari(text);
  if (!h) return { obert: null };
  const dia = (ara.getDay() + 6) % 7;          // 0 = dilluns
  const min = ara.getHours() * 60 + ara.getMinutes();
  // Moltes gasolineres posen només "L: 06:00-22:00": no sabem què fan els altres dies.
  if (!h.dies.has(dia) && h.dies.size === 1) return { obert: null };
  const avui = h.franges[dia];
  const totsDies24 = h.franges.every(f => f.some(([a, b]) => a === 0 && b === 1440));
  if (totsDies24) return { obert: true, h24: true };
  const dins = avui.find(([a, b]) => min >= a && min < b);
  if (dins) {
    // Si el tram s'allarga l'endemà (fins a les 24:00 i l'endemà comença a les 00:00), mostra l'hora real.
    let fi = dins[1];
    if (fi === 1440) {
      const dema = h.franges[(dia + 1) % 7].find(([a]) => a === 0);
      if (dema && dema[1] < 1440) fi = dema[1];
      else if (dema) return { obert: true, h24: true };
    }
    return { obert: true, fins: hhmm(fi) };
  }
  // Tancada: quan obre?
  const resta = avui.filter(([a]) => a > min).sort((x, y) => x[0] - y[0]);
  if (resta.length) return { obert: false, obre: hhmm(resta[0][0]), obreDia: 0 };
  for (let k = 1; k <= 7; k++) {
    const f = h.franges[(dia + k) % 7].slice().sort((x, y) => x[0] - y[0]);
    if (f.length) return { obert: false, obre: hhmm(f[0][0]), obreDia: k, obreDiaSetmana: (dia + k) % 7 };
  }
  return { obert: false };
}

if (typeof module !== "undefined") module.exports = { llegeixHorari, estatHorari };
