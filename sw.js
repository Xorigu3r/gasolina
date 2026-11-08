// Xoriguer · Gasolina a prop · funcionament sense connexió
// Quan canviïs l'app, puja el número de versió perquè els mòbils agafin la nova.
// IMPORTANT: totes les apps Xoriguer comparteixen l'origen xorigu3r.github.io.
// Aquest fitxer NOMÉS toca les memòries cau que comencen per "gasolina-".
const VERSION = "gasolina-v1";
const DADES = "gasolina-dades";   // preus guardats per l'app (js/app.js); no s'esborra en actualitzar
const APP = [
  "./", "index.html", "manifest.json", "css/app.css",
  "js/i18n.js", "js/provincies.js", "js/horari.js", "js/app.js",
  "vendor/fonts/pjs-400.woff2", "vendor/fonts/pjs-600.woff2", "vendor/fonts/pjs-700.woff2", "vendor/fonts/pjs-800.woff2",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png",
  "icons/apple-touch-icon.png", "icons/mark-256.png", "icons/favicon-64.png",
];

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
