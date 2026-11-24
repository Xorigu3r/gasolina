// ============================================================
//  Avís de baixada de preu · el fan servir l'app (js/app.js) i el service worker (sw.js)
//
//  L'avís es guarda a la memòria cau «gasolina-dades» (clau …/avis.json), no a localStorage, perquè el
//  service worker també l'ha de poder llegir i actualitzar quan mira els preus en segon pla.
//  { on, cents (1–7), fuel, lat, lon, radi, provs, zona, lang,
//    ref, refData, refNom, refMun   ← preu de referència: el més barat quan es va activar o del darrer avís
//    ultim, ultimData                ← el més barat la darrera vegada que es va mirar
//    pendent }                       ← baixada trobada en segon pla que l'app encara no ha ensenyat
// ============================================================
const AVIS_API = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/";
const AVIS_CACHE = "gasolina-dades";
const AVIS_SYNC = "gasolina-preu";
const AVIS_FUELS = {
  g95: ["Precio Gasolina 95 E5", "Precio Gasolina 95 E10"],
  g98: ["Precio Gasolina 98 E5", "Precio Gasolina 98 E10"],
  ga:  ["Precio Gasoleo A"],
  gp:  ["Precio Gasoleo Premium"],
  glp: ["Precio Gases licuados del petróleo"],
};
const AVIS_CLAU = (self.registration ? self.registration.scope : new URL("./", location.href).href) + "avis.json";

async function llegeixAvis() {
  try {
    const r = await (await caches.open(AVIS_CACHE)).match(AVIS_CLAU);
    return r ? await r.json() : null;
  } catch (e) { return null; }
}
async function desaAvis(a) {
  try {
    await (await caches.open(AVIS_CACHE)).put(AVIS_CLAU,
      new Response(JSON.stringify(a), { headers: { "Content-Type": "application/json" } }));
  } catch (e) {}
}

function avisDist(a, b, c, d) {
  const R = 6371, r = Math.PI / 180;
  const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const avisNum = s => { const v = parseFloat(String(s || "").replace(",", ".")); return isFinite(v) ? v : NaN; };

// Gasolinera de l'API → { n, m, lat, lon, p: {g95: 1.459, …} }
function aprimaAvis(e) {
  const p = {};
  for (const [f, camps] of Object.entries(AVIS_FUELS)) {
    for (const c of camps) { const v = avisNum(e[c]); if (v > 0) { p[f] = v; break; } }
  }
  return { n: (e["Rótulo"] || "").trim(), m: e.Municipio, lat: avisNum(e.Latitud), lon: avisNum(e["Longitud (WGS84)"]), p };
}

// La gasolinera més barata del carburant de l'avís dins la distància de l'avís
function mesBarata(estacions, a) {
  let millor = null;
  for (const e of estacions) {
    const v = e.p && e.p[a.fuel];
    if (!v || !isFinite(e.lat)) continue;
    if (avisDist(a.lat, a.lon, e.lat, e.lon) > a.radi) continue;
    if (!millor || v < millor.preu) millor = { preu: v, n: e.n, m: e.m, lat: e.lat, lon: e.lon };
  }
  return millor;
}

// Mira si ha baixat prou. Retorna { a (actualitzat), baixada: null | {preu, abans, abansData, n, m, cents} }
function revisaAvis(a, estacions, ara = Date.now()) {
  const m = mesBarata(estacions, a);
  if (!m) return { a, baixada: null };
  a.ultim = m.preu; a.ultimData = ara;
  // 0,5 mil·lèsimes de marge pels arrodoniments (els preus vénen amb 3 decimals)
  if (m.preu <= a.ref - a.cents / 100 + 0.0005) {
    const baixada = { preu: m.preu, abans: a.ref, abansData: a.refData, n: m.n, m: m.m, lat: m.lat, lon: m.lon,
      cents: Math.round((a.ref - m.preu) * 1000) / 10 };
    Object.assign(a, { ref: m.preu, refData: ara, refNom: m.n, refMun: m.m });
    return { a, baixada };
  }
  return { a, baixada: null };
}

// Text de l'avís (fa servir t() i TX de js/i18n.js, que també carrega el service worker)
function textBaixada(b, fuel) {
  const loc = { ca: "ca-ES", es: "es-ES", fr: "fr-FR", en: "en-GB" }[XLANG];
  const p3 = v => new Intl.NumberFormat(loc, { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v);
  return t("al_drop_txt", {
    f: t("f_" + fuel), n: b.n || "", m: b.m || "", p: p3(b.preu),
    c: new Intl.NumberFormat(loc, { maximumFractionDigits: 1 }).format(b.cents),
    d: new Date(b.abansData).toLocaleDateString(loc, { day: "numeric", month: "numeric" }),
  });
}
