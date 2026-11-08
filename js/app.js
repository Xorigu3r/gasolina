// ============================================================
//  Xoriguer · Gasolina a prop
//  Dades: API oficial del Ministeri (sense clau, CORS obert). Només es baixa la província
//  (o províncies) on és l'usuari i es guarda 30 minuts a la memòria cau «gasolina-dades».
//  Claus de localStorage pròpies: gasolina.config, gasolina.lloc
// ============================================================
const API = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/";
const CACHE_DADES = "gasolina-dades";
const VIDA_DADES = 30 * 60 * 1000;
const FACTOR_CARRETERA = 1.3;
const MAX_LLISTA = 40;

const FUELS = {
  g95: ["Precio Gasolina 95 E5", "Precio Gasolina 95 E10"],
  g98: ["Precio Gasolina 98 E5", "Precio Gasolina 98 E10"],
  ga:  ["Precio Gasoleo A"],
  gp:  ["Precio Gasoleo Premium"],
  glp: ["Precio Gases licuados del petróleo"],
};

const $ = id => document.getElementById(id);
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const CFG = Object.assign({ fuel: "g95", cons: 6.5, litres: 40, radi: 10, zoom: 1, lang: null, ordre: "preu", obertes: true },
  store.get("gasolina.config", {}));
const desa = () => store.set("gasolina.config", CFG);

let LLOC = null;          // {lat, lon, nom?}  (nom = població triada a mà)
let ESTACIONS = [];       // de les províncies baixades
let PROVS_BAIXADES = [];  // codis
let DATA_API = "";        // "08/11/2026 21:21:18"
let VELL = false;         // dades velles (sense internet)
let HORA_CARREGA = 0;     // quan es van baixar les dades que tenim

// ---------------- Utilitats ----------------
const num = s => { const v = parseFloat(String(s || "").replace(",", ".")); return isFinite(v) ? v : NaN; };
const locale = () => ({ ca: "ca-ES", es: "es-ES", fr: "fr-FR", en: "en-GB" })[XLANG];
const euros = v => new Intl.NumberFormat(locale(), { style: "currency", currency: "EUR" }).format(v);
const preu = v => new Intl.NumberFormat(locale(), { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(v);
const km = d => (d < 1 ? new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 }).format(Math.round(d * 100) * 10) + " m"
  : new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(d) + " km");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const majuscules = s => String(s || "").toLowerCase().replace(/(^|[\s\-/(.'’])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
  .replace(/\bS\/n\b/gi, "s/n").replace(/\b(De|Del|La|Las|Los|El|Y|I|D'|L')\b/g, w => w.toLowerCase()).replace(/^./, c => c.toUpperCase());

function distKm(a, b, c, d) {
  const R = 6371, r = Math.PI / 180;
  const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// ---------------- Quines províncies cal baixar ----------------
function provinciesProperes(lat, lon, radi) {
  const P = PAS_GRAELLA, fi = Math.floor(lat / P), fj = Math.floor(lon / P);
  const marge = radi + 16;                      // + mitja diagonal d'un quadre
  const n = Math.ceil(marge / 17) + 1;
  const millor = {};
  for (let i = fi - n; i <= fi + n; i++) for (let j = fj - n; j <= fj + n; j++) {
    const codis = GRAELLA[`${i},${j}`];
    if (!codis) continue;
    const d = distKm(lat, lon, (i + .5) * P, (j + .5) * P);
    if (d > marge) continue;
    for (let k = 0; k < codis.length; k += 2) { const c = codis.slice(k, k + 2); if (!(c in millor) || d < millor[c]) millor[c] = d; }
  }
  return Object.entries(millor).sort((a, b) => a[1] - b[1]).slice(0, 4).map(e => e[0]);
}

// ---------------- Baixar i guardar dades ----------------
function aprima(e, prov) {
  const p = {};
  for (const [f, camps] of Object.entries(FUELS)) {
    for (const c of camps) { const v = num(e[c]); if (v > 0) { p[f] = v; break; } }
  }
  return { id: e.IDEESS, n: (e["Rótulo"] || "").trim(), a: e["Dirección"], m: e.Municipio, l: e.Localidad, cp: e["C.P."],
    lat: num(e.Latitud), lon: num(e["Longitud (WGS84)"]), h: e.Horario, p, prov };
}

async function obreCache() { try { return await caches.open(CACHE_DADES); } catch (e) { return null; } }

async function dadesProvincia(codi) {
  const url = API + codi;
  const cache = await obreCache();
  let desat = null;
  if (cache) {
    const r = await cache.match(url);
    if (r) { try { desat = await r.json(); } catch (e) {} }
    if (desat && Date.now() - desat.t < VIDA_DADES) return desat;
  }
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    if (j.ResultadoConsulta !== "OK") throw new Error(j.ResultadoConsulta);
    const nou = { t: Date.now(), fecha: j.Fecha, e: j.ListaEESSPrecio.map(e => aprima(e, codi)).filter(e => isFinite(e.lat) && isFinite(e.lon)) };
    if (cache) await cache.put(url, new Response(JSON.stringify(nou), { headers: { "Content-Type": "application/json" } }));
    return nou;
  } catch (err) {
    if (desat) { desat.vell = true; return desat; }
    throw err;
  }
}

async function carregaProvincies(codis) {
  const nomes = codis.map(c => majuscules(PROVINCIES[c] || c)).join(", ");
  estat(t("loading", { p: nomes }));
  const res = await Promise.all(codis.map(dadesProvincia));
  ESTACIONS = res.flatMap(r => r.e);
  PROVS_BAIXADES = codis.slice();
  DATA_API = res.map(r => r.fecha).sort().slice(-1)[0] || "";
  VELL = res.some(r => r.vell);
  HORA_CARREGA = Math.min(...res.map(r => r.t));
}

// ---------------- Missatges ----------------
function estat(txt) { $("status").classList.toggle("hidden", !txt); $("statusTxt").textContent = txt || ""; }
function avis(txt) { $("msg").classList.toggle("hidden", !txt); $("msg").textContent = txt || ""; }

// ---------------- Buscar ----------------
function demanaUbicacio() {
  return new Promise((ok, ko) => {
    if (!navigator.geolocation) return ko({ code: -1 });
    navigator.geolocation.getCurrentPosition(p => ok({ lat: p.coords.latitude, lon: p.coords.longitude }), ko,
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 });
  });
}

async function buscaOnSoc() {
  avis(""); estat(t("locating"));
  try {
    LLOC = await demanaUbicacio();
    store.set("gasolina.lloc", null);           // ara mana el GPS
  } catch (e) {
    estat("");
    avis(e.code === 1 ? t("geo_denied") : e.code === -1 ? t("geo_none") : t("geo_fail"));
    return;
  }
  await mostraLloc();
}

async function mostraLloc() {
  const codis = provinciesProperes(LLOC.lat, LLOC.lon, CFG.radi);
  if (!codis.length) { estat(""); avis(t("out_spain")); $("results").classList.add("hidden"); return; }
  try {
    if (codis.some(c => !PROVS_BAIXADES.includes(c)) || dadesCaducades()) await carregaProvincies(codis);
  } catch (e) {
    estat(""); avis(t("net_fail")); return;
  }
  estat("");
  avis(VELL ? t("net_old", { h: horaApi() }) : "");
  pinta();
}
const dadesCaducades = () => Date.now() - HORA_CARREGA > VIDA_DADES;

function horaApi() {
  const m = DATA_API.match(/^(\d\d)\/(\d\d)\/(\d{4}) (\d\d):(\d\d)/);
  if (!m) return "";
  const avui = new Date();
  const mateixDia = +m[1] === avui.getDate() && +m[2] === avui.getMonth() + 1;
  return `${m[4]}:${m[5]}` + (mateixDia ? "" : ` (${m[1]}/${m[2]})`);
}

// ---------------- Càlculs ----------------
function calcula() {
  const f = CFG.fuel;
  let llista = ESTACIONS.filter(e => e.p[f]).map(e => {
    const d = distKm(LLOC.lat, LLOC.lon, e.lat, e.lon);
    return Object.assign({}, e, { d, preu: e.p[f], est: estatHorari(e.h) });
  }).filter(e => e.d <= CFG.radi);
  if (CFG.obertes) llista = llista.filter(e => e.est.obert !== false);
  const viatge = e => 2 * e.d * FACTOR_CARRETERA * CFG.cons / 100 * e.preu;
  for (const e of llista) e.cost = CFG.litres * e.preu + viatge(e);
  const candidates = llista.filter(e => e.est.obert !== false);
  const ref = (candidates.length ? candidates : llista).slice().sort((a, b) => a.d - b.d)[0];
  const millor = candidates.slice().sort((a, b) => a.cost - b.cost)[0];
  for (const e of llista) e.estalvi = ref ? ref.cost - e.cost : 0;
  llista.sort(CFG.ordre === "dist" ? (a, b) => a.d - b.d : (a, b) => a.preu - b.preu || a.d - b.d);
  return { llista, ref, millor };
}

// ---------------- Pintar ----------------
function textHorari(est) {
  if (est.obert === true) return est.h24 ? [t("open_24"), "open"] : [t("open_until", { h: est.fins }), "open"];
  if (est.obert === false) {
    if (!est.obre) return [t("closed"), "shut"];
    if (!est.obreDia) return [t("closed_opens", { h: est.obre }), "shut"];
    if (est.obreDia === 1) return [t("closed_tom", { h: est.obre }), "shut"];
    return [t("closed_day", { d: TX.days[LI[XLANG]][est.obreDiaSetmana], h: est.obre }), "shut"];
  }
  return [t("open_unknown"), "unk"];
}
const ICO = {
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  route: '<svg viewBox="0 0 24 24"><path d="M3 11l18-8-8 18-2-8z"/></svg>',
};
function botonsRuta(e) {
  const ll = `${e.lat},${e.lon}`;
  return `<div class="go">
    <a class="gm" href="https://www.google.com/maps/dir/?api=1&destination=${ll}&travelmode=driving" target="_blank" rel="noopener">${ICO.route}${t("go_gmaps")}</a>
    <a class="wz" href="https://waze.com/ul?ll=${ll}&navigate=yes" target="_blank" rel="noopener">${ICO.route}${t("go_waze")}</a></div>`;
}
const nomEst = e => esc(e.n || majuscules(e.l || e.m));
const adreca = e => esc(majuscules(e.a) + " · " + majuscules(e.l && e.l.toLowerCase() !== (e.m || "").toLowerCase() ? `${e.l} (${e.m})` : e.m));

function pinta() {
  if (!LLOC) return;
  const { llista, ref, millor } = calcula();
  $("results").classList.remove("hidden");
  $("count").textContent = t("count", { n: llista.length, km: CFG.radi });
  pintaFont();

  if (!llista.length) {
    $("best").classList.add("hidden");
    $("list").innerHTML = `<div class="msg">${esc(t("none", { km: CFG.radi }))}</div>`;
    return;
  }
  // Targeta de la millor opció
  if (millor) {
    const estalvi = ref.cost - millor.cost;
    const [ht, hc] = textHorari(millor.est);
    $("best").classList.remove("hidden");
    $("best").innerHTML = `<h3>${t("best_title")}</h3>
      <div class="bn">${nomEst(millor)}</div>
      <div class="sm">${adreca(millor)}</div>
      <div class="bp">${preu(millor.preu)} <small>${t("per_l")}</small></div>
      <div class="meta"><span>${ICO.pin}${t("km_away", { km: km(millor.d) })}</span> · <span class="${hc}">${ht}</span></div>
      <p>${millor === ref || estalvi < 0.3 ? t("best_same") : t("best_save", { e: euros(estalvi), n: nomEst(ref), km: km(ref.d) })}</p>
      <p class="sm">${t("best_basis", { l: CFG.litres, c: String(CFG.cons).replace(".", XLANG === "en" ? "." : ",") })}</p>
      ${botonsRuta(millor)}`;
  } else $("best").classList.add("hidden");

  $("list").innerHTML = llista.slice(0, MAX_LLISTA).map(e => {
    const [ht, hc] = textHorari(e.est);
    let badge;
    if (e === ref) badge = `<div class="badge ref">${t("nearest")}</div>`;
    else if (Math.abs(e.estalvi) < 0.3) badge = `<div class="badge mid">${t("same")}</div>`;
    else if (e.estalvi > 0) badge = `<div class="badge ok">${t("worth", { e: euros(e.estalvi) })}</div>`;
    else badge = `<div class="badge bad">${t("not_worth", { e: euros(-e.estalvi) })}</div>`;
    return `<article class="st${e.est.obert === false ? " closed" : ""}">
      <div class="r1"><div class="who"><div class="nm">${nomEst(e)}</div><div class="ad">${adreca(e)}</div></div>
        <div class="pr"><b>${preu(e.preu)}</b><small>${t("per_l")}</small></div></div>
      <div class="meta"><span>${ICO.pin}${t("km_away", { km: km(e.d) })}</span><span class="${hc}">${ICO.clock}${ht}</span></div>
      ${badge}
      <details><summary>${t("hours")}</summary>${esc(e.h)}<br>${t("fill_cost", { l: CFG.litres, e: euros(CFG.litres * e.preu) })}</details>
      ${botonsRuta(e)}
    </article>`;
  }).join("");
}

function pintaFont() {
  $("source").textContent = DATA_API ? t("source", { h: horaApi() }) : "";
}

// ---------------- Textos i controls ----------------
function aplicaTextos() {
  document.documentElement.lang = XLANG;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  $("fuels").innerHTML = Object.keys(FUELS).map(f => `<button data-f="${f}" class="${f === CFG.fuel ? "on" : ""}">${t("f_" + f)}</button>`).join("");
  $("langSel").innerHTML = LANGS.map(l => `<button data-l="${l.id}" class="${l.id === XLANG ? "on" : ""}">${l.name}</button>`).join("");
  $("btnSearchTxt").textContent = LLOC && !LLOC.nom ? t("btn_refresh") : t("btn_search");
  $("fromTxt").textContent = LLOC && LLOC.nom ? t("place_from", { m: LLOC.nom }) : "";
  marcaSeg("sortSel", "s", CFG.ordre); marcaSeg("radiusSel", "r", CFG.radi); marcaSeg("sizeSel", "z", CFG.zoom);
  $("onlyOpen").checked = CFG.obertes;
  $("inCons").value = String(CFG.cons).replace(".", ",");
  $("inLitres").value = CFG.litres;
  omplePickerProv();
}
function marcaSeg(id, attr, v) { document.querySelectorAll(`#${id} button`).forEach(b => b.classList.toggle("on", b.dataset[attr] == v)); }

$("fuels").onclick = e => { const b = e.target.closest("button"); if (!b) return; CFG.fuel = b.dataset.f; desa(); marcaSeg("fuels", "f", CFG.fuel); pinta(); };
$("sortSel").onclick = e => { const b = e.target.closest("button"); if (!b) return; CFG.ordre = b.dataset.s; desa(); marcaSeg("sortSel", "s", CFG.ordre); pinta(); };
$("onlyOpen").onchange = e => { CFG.obertes = e.target.checked; desa(); pinta(); };
$("btnSearch").onclick = () => buscaOnSoc().then(aplicaTextos);

// El meu cotxe
$("btnCar").onclick = () => $("carSheet").classList.remove("hidden");
const tancaCotxe = () => { llegeixCotxe(); $("carSheet").classList.add("hidden"); if (LLOC) mostraLloc(); };
$("carDone").onclick = tancaCotxe;
$("carSheet").onclick = e => { if (e.target.id === "carSheet") tancaCotxe(); };
function llegeixCotxe() {
  const c = num($("inCons").value), l = num($("inLitres").value);
  if (c >= 2 && c <= 30) CFG.cons = Math.round(c * 10) / 10;
  if (l >= 5 && l <= 150) CFG.litres = Math.round(l);
  desa(); aplicaTextos();
}
document.querySelectorAll("[data-step]").forEach(b => b.onclick = ev => {
  ev.preventDefault();
  const k = b.dataset.step, d = +b.dataset.d;
  if (k === "cons") CFG.cons = Math.min(30, Math.max(2, Math.round((num($("inCons").value) || CFG.cons) * 10 + d * 10) / 10));
  else CFG.litres = Math.min(150, Math.max(5, (num($("inLitres").value) || CFG.litres) + d));
  desa(); aplicaTextos();
});
$("inCons").onchange = llegeixCotxe; $("inLitres").onchange = llegeixCotxe;
$("radiusSel").onclick = e => { const b = e.target.closest("button"); if (!b) return; CFG.radi = +b.dataset.r; desa(); marcaSeg("radiusSel", "r", CFG.radi); };
$("sizeSel").onclick = e => { const b = e.target.closest("button"); if (!b) return; CFG.zoom = +b.dataset.z; desa(); aplicaZoom(); marcaSeg("sizeSel", "z", CFG.zoom); };
$("langSel").onclick = e => { const b = e.target.closest("button"); if (!b) return; CFG.lang = XLANG = b.dataset.l; desa(); aplicaTextos(); pinta(); };
const aplicaZoom = () => document.documentElement.dataset.z = CFG.zoom;

// Triar població a mà
let PICK_EST = [];
function omplePickerProv() {
  const sel = $("selProv"), act = sel.value;
  sel.innerHTML = `<option value="">${t("place_choose")}</option>` + Object.entries(PROVINCIES)
    .map(([c, n]) => [c, majuscules(n)]).sort((a, b) => a[1].localeCompare(b[1], locale()))
    .map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join("");
  sel.value = act;
}
$("btnPlace").onclick = () => $("placeSheet").classList.remove("hidden");
$("placeSheet").onclick = e => { if (e.target.id === "placeSheet") $("placeSheet").classList.add("hidden"); };
$("selProv").onchange = async e => {
  const c = e.target.value, m = $("selMun");
  m.disabled = true; $("placeGo").disabled = true;
  m.innerHTML = `<option>${c ? "…" : ""}</option>`;
  if (!c) return;
  try { PICK_EST = (await dadesProvincia(c)).e; } catch (err) { m.innerHTML = `<option>${esc(t("net_fail"))}</option>`; return; }
  const muns = [...new Set(PICK_EST.map(x => x.m))].sort((a, b) => a.localeCompare(b, locale()));
  m.innerHTML = `<option value="">${t("place_choose")}</option>` + muns.map(x => `<option>${esc(x)}</option>`).join("");
  m.disabled = false;
};
$("selMun").onchange = e => { $("placeGo").disabled = !e.target.value; };
$("placeGo").onclick = async () => {
  const mun = $("selMun").value, sel = PICK_EST.filter(x => x.m === mun);
  if (!sel.length) return;
  LLOC = { lat: sel.reduce((s, x) => s + x.lat, 0) / sel.length, lon: sel.reduce((s, x) => s + x.lon, 0) / sel.length, nom: mun };
  store.set("gasolina.lloc", LLOC);
  $("placeSheet").classList.add("hidden");
  aplicaTextos(); avis("");
  await mostraLloc();
};
$("placeHere").onclick = () => { $("placeSheet").classList.add("hidden"); buscaOnSoc().then(aplicaTextos); };

// ---------------- Inici ----------------
XLANG = triaIdioma(CFG.lang);
aplicaZoom();
aplicaTextos();
(async () => {
  const desat = store.get("gasolina.lloc", null);
  if (desat && isFinite(desat.lat)) { LLOC = desat; aplicaTextos(); mostraLloc(); return; }
  // Si ja ens havia donat permís, busquem directament (la gent no ha de prémer res)
  try {
    const p = await navigator.permissions.query({ name: "geolocation" });
    if (p.state === "granted") buscaOnSoc().then(aplicaTextos);
  } catch (e) {}
})();

if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) navigator.serviceWorker.register("sw.js");
