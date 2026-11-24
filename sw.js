// Xoriguer · Gasolina a prop · funcionament sense connexió
// Quan canviïs l'app, puja el número de versió perquè els mòbils agafin la nova.
// IMPORTANT: totes les apps Xoriguer comparteixen l'origen xorigu3r.github.io.
// Aquest fitxer NOMÉS toca les memòries cau que comencen per "gasolina-".
const VERSION = "gasolina-v5-avis";
const DADES = "gasolina-dades";   // preus i avís guardats per l'app (js/app.js); no s'esborra en actualitzar
const APP = [
  "./", "index.html", "manifest.json", "css/app.css", "marca/marca.css", "marca/Montserrat-ExtraBold.ttf",
  "js/i18n.js", "js/provincies.js", "js/horari.js", "js/avis.js", "js/app.js",
  "vendor/fonts/pjs-400.woff2", "vendor/fonts/pjs-600.woff2", "vendor/fonts/pjs-700.woff2", "vendor/fonts/pjs-800.woff2",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png",
  "icons/apple-touch-icon.png", "icons/mark-256.png", "icons/favicon-64.png",
];

// Avís de baixada de preu: mateixa lògica i textos que l'app
importScripts("js/i18n.js", "js/avis.js");

// En segon pla (Chrome d'Android amb l'app instal·lada; el navegador decideix quan, unes quantes vegades al dia)
async function miraPreusEnSegonPla() {
  const a = await llegeixAvis();
  if (!a || !a.on) return;
  const estacions = [];
  for (const codi of a.provs || []) {
    const r = await fetch(AVIS_API + codi, { cache: "no-store" });
    if (!r.ok) return;
    const j = await r.json();
    if (j.ResultadoConsulta !== "OK") return;
    for (const e of j.ListaEESSPrecio) estacions.push(aprimaAvis(e));
  }
  const { a: nou, baixada } = revisaAvis(a, estacions);
  if (baixada) {
    XLANG = LI[nou.lang] !== undefined ? nou.lang : "ca";
    nou.pendent = baixada;      // perquè l'app també ho ensenyi quan s'obri
    await self.registration.showNotification(t("al_drop"), {
      body: textBaixada(baixada, nou.fuel), icon: "icons/icon-192.png", badge: "icons/favicon-64.png",
      tag: AVIS_SYNC, renotify: true, data: { url: self.registration.scope },
    });
  }
  await desaAvis(nou);
}
self.addEventListener("periodicsync", e => {
  if (e.tag === AVIS_SYNC) e.waitUntil(miraPreusEnSegonPla().catch(() => {}));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cl => {
    const obert = cl.find(c => c.url.startsWith(self.registration.scope));
    return obert ? obert.focus() : self.clients.openWindow(self.registration.scope);
  }));
});

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("gasolina-") && k !== VERSION && k !== DADES).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // l'API del Ministeri la gestiona l'app
  if (!url.pathname.startsWith(new URL("./", self.registration.scope).pathname)) return;

  // Pàgina i codi propi: primer internet (per rebre actualitzacions), si no, la còpia guardada
  if (req.mode === "navigate" || /\.(html|js|css|json)$/.test(url.pathname) || url.pathname.endsWith("/")) {
    e.respondWith(
      fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("index.html")))
    );
    return;
  }
  // Icones i fonts: primer la còpia guardada
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
    return res;
  })));
});
