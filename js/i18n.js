// ============================================================
//  Xoriguer · Gasolina a prop · TEXTOS EN 4 IDIOMES
//  Ordre de cada fila: [català, castellà, francès, anglès]
//  {n}, {km}… es substitueixen.
// ============================================================
const LANGS = [
  { id: "ca", name: "Català" }, { id: "es", name: "Español" },
  { id: "fr", name: "Français" }, { id: "en", name: "English" },
];
const LI = { ca: 0, es: 1, fr: 2, en: 3 };

const TX = {
  app_name:     ["Gasolina a prop", "Gasolina cerca", "Carburant à proximité", "Fuel nearby"],
  app_sub:      ["Les més barates del teu voltant", "Las más baratas a tu alrededor", "Les moins chères autour de vous", "The cheapest around you"],

  fuel_title:   ["Què hi poses?", "¿Qué le pones?", "Quel carburant ?", "Which fuel?"],
  f_g95:        ["Gasolina 95", "Gasolina 95", "Essence 95", "Petrol 95"],
  f_g98:        ["Gasolina 98", "Gasolina 98", "Essence 98", "Petrol 98"],
  f_ga:         ["Gasoil", "Gasóleo A", "Gazole", "Diesel"],
  f_gp:         ["Gasoil Premium", "Gasóleo Premium", "Gazole Premium", "Premium diesel"],
  f_glp:        ["GLP (autogàs)", "GLP (autogás)", "GPL", "LPG (autogas)"],

  btn_search:   ["Busca on sóc", "Buscar donde estoy", "Chercher autour de moi", "Search where I am"],
  btn_refresh:  ["Torna a buscar", "Volver a buscar", "Rechercher à nouveau", "Search again"],
  btn_place:    ["Tria una població", "Elegir una población", "Choisir une commune", "Choose a town"],
  locating:     ["Buscant on ets…", "Buscando dónde estás…", "Localisation en cours…", "Finding your location…"],
  loading:      ["Baixant els preus de {p}…", "Descargando los precios de {p}…", "Téléchargement des prix ({p})…", "Downloading prices for {p}…"],
  geo_denied:   ["No has donat permís per saber on ets. Pots triar la població a mà.", "No has dado permiso para saber dónde estás. Puedes elegir la población a mano.", "Vous n’avez pas autorisé la localisation. Vous pouvez choisir la commune.", "Location permission was not given. You can choose the town by hand."],
  geo_fail:     ["No s’ha pogut saber on ets. Prova-ho a fora o tria la població a mà.", "No se ha podido saber dónde estás. Prueba en el exterior o elige la población a mano.", "Impossible de vous localiser. Essayez dehors ou choisissez la commune.", "Could not find your location. Try outdoors or choose the town by hand."],
  geo_none:     ["Aquest aparell no pot donar la ubicació. Tria la població a mà.", "Este aparato no puede dar la ubicación. Elige la población a mano.", "Cet appareil ne fournit pas la localisation. Choisissez la commune.", "This device can’t give its location. Choose the town by hand."],
  out_spain:    ["Sembla que no ets a Espanya: aquí només hi ha les gasolineres d’Espanya.", "Parece que no estás en España: aquí solo están las gasolineras de España.", "Vous ne semblez pas être en Espagne : seules les stations espagnoles sont disponibles.", "You don’t seem to be in Spain: only Spanish stations are available."],
  net_fail:     ["No s’han pogut baixar els preus. Mira que tinguis internet i torna-ho a provar.", "No se han podido descargar los precios. Comprueba que tienes internet y vuelve a probar.", "Impossible de télécharger les prix. Vérifiez la connexion et réessayez.", "Couldn’t download the prices. Check your internet connection and try again."],
  net_old:      ["Sense internet: preus guardats de les {h}.", "Sin internet: precios guardados de las {h}.", "Hors ligne : prix enregistrés à {h}.", "Offline: prices saved at {h}."],

  place_title:  ["Tria la població", "Elige la población", "Choisissez la commune", "Choose the town"],
  place_prov:   ["Província", "Provincia", "Province", "Province"],
  place_mun:    ["Població", "Población", "Commune", "Town"],
  place_go:     ["Mostra les gasolineres", "Mostrar las gasolineras", "Afficher les stations", "Show the stations"],
  place_choose: ["— Tria —", "— Elige —", "— Choisir —", "— Choose —"],
  place_from:   ["Des de: {m}", "Desde: {m}", "Depuis : {m}", "From: {m}"],
  place_here:   ["Des d’on ets ara", "Desde donde estás", "Depuis votre position", "From where you are"],

  best_title:   ["La millor opció", "La mejor opción", "Le meilleur choix", "Best choice"],
  best_same:    ["És també la més propera. No cal anar més lluny.", "Es también la más cercana. No hace falta ir más lejos.", "C’est aussi la plus proche. Inutile d’aller plus loin.", "It’s also the nearest one. No need to go further."],
  best_save:    ["Comptant el viatge, estalvies <b>{e}</b> respecte a la més propera ({n}, a {km}).", "Contando el viaje, ahorras <b>{e}</b> respecto a la más cercana ({n}, a {km}).", "Trajet compris, vous économisez <b>{e}</b> par rapport à la plus proche ({n}, à {km}).", "Counting the trip, you save <b>{e}</b> compared with the nearest one ({n}, {km} away)."],
  best_basis:   ["Per a {l} litres i un cotxe que gasta {c} l/100 km.", "Para {l} litros y un coche que gasta {c} l/100 km.", "Pour {l} litres et une voiture qui consomme {c} l/100 km.", "For {l} litres and a car using {c} l/100 km."],

  sort_price:   ["Més barates", "Más baratas", "Moins chères", "Cheapest"],
  sort_dist:    ["Més a prop", "Más cerca", "Plus proches", "Nearest"],
  only_open:    ["Només les obertes ara", "Solo las abiertas ahora", "Seulement ouvertes", "Open now only"],
  count:        ["{n} gasolineres a menys de {km} km", "{n} gasolineras a menos de {km} km", "{n} stations à moins de {km} km", "{n} stations within {km} km"],
  none:         ["No hi ha cap gasolinera amb aquest carburant a menys de {km} km. Prova d’ampliar la distància a «El meu cotxe».", "No hay ninguna gasolinera con este carburante a menos de {km} km. Prueba a ampliar la distancia en «Mi coche».", "Aucune station avec ce carburant à moins de {km} km. Augmentez la distance dans « Ma voiture ».", "No station with this fuel within {km} km. Try a larger distance under “My car”."],

  km_away:      ["a {km}", "a {km}", "à {km}", "{km} away"],
  per_l:        ["€/litre", "€/litro", "€/litre", "€/litre"],
  nearest:      ["La més propera", "La más cercana", "La plus proche", "Nearest"],
  worth:        ["Val la pena: estalvies {e}", "Vale la pena: ahorras {e}", "Ça vaut le coup : {e} d’économie", "Worth it: you save {e}"],
  not_worth:    ["No compensa: et costaria {e} més", "No compensa: te costaría {e} más", "Pas rentable : {e} de plus", "Not worth it: {e} more"],
  same:         ["Gairebé igual que la més propera", "Casi igual que la más cercana", "Presque pareil que la plus proche", "About the same as the nearest"],
  open_24:      ["Oberta 24 hores", "Abierta 24 horas", "Ouverte 24 h/24", "Open 24 hours"],
  open_until:   ["Oberta fins a les {h}", "Abierta hasta las {h}", "Ouverte jusqu’à {h}", "Open until {h}"],
  closed_opens: ["Tancada · obre a les {h}", "Cerrada · abre a las {h}", "Fermée · ouvre à {h}", "Closed · opens at {h}"],
  closed_tom:   ["Tancada · obre demà a les {h}", "Cerrada · abre mañana a las {h}", "Fermée · ouvre demain à {h}", "Closed · opens tomorrow at {h}"],
  closed_day:   ["Tancada · obre {d} a les {h}", "Cerrada · abre el {d} a las {h}", "Fermée · ouvre {d} à {h}", "Closed · opens {d} at {h}"],
  closed:       ["Tancada", "Cerrada", "Fermée", "Closed"],
  open_unknown: ["Mira l’horari", "Mira el horario", "Voir les horaires", "Check the hours"],
  hours:        ["Horari", "Horario", "Horaires", "Hours"],
  days:         [["dilluns", "dimarts", "dimecres", "dijous", "divendres", "dissabte", "diumenge"],
                 ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
                 ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"],
                 ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]],
  go_gmaps:     ["Google Maps", "Google Maps", "Google Maps", "Google Maps"],
  go_waze:      ["Waze", "Waze", "Waze", "Waze"],
  fill_cost:    ["{l} litres: {e}", "{l} litros: {e}", "{l} litres : {e}", "{l} litres: {e}"],

  car_title:    ["El meu cotxe", "Mi coche", "Ma voiture", "My car"],
  car_cons:     ["Quant gasta (litres cada 100 km)", "Cuánto gasta (litros cada 100 km)", "Consommation (litres aux 100 km)", "Consumption (litres per 100 km)"],
  car_litres:   ["Quants litres hi poses normalment", "Cuántos litros pones normalmente", "Litres mis d’habitude", "Litres you usually put in"],
  car_radius:   ["Fins a quina distància buscar", "Hasta qué distancia buscar", "Distance de recherche", "Search distance"],
  car_note:     ["Per saber si val la pena desviar-se, l’app compta l’anada i la tornada a cada gasolinera (la distància en línia recta × 1,3, perquè les carreteres fan voltes) i el que gastaria el cotxe en aquest viatge.", "Para saber si vale la pena desviarse, la app cuenta la ida y la vuelta a cada gasolinera (la distancia en línea recta × 1,3, porque las carreteras dan vueltas) y lo que gastaría el coche en ese viaje.", "Pour savoir si le détour vaut le coup, l’app compte l’aller-retour jusqu’à chaque station (distance à vol d’oiseau × 1,3, car les routes font des détours) et ce que la voiture consommerait.", "To tell whether a detour is worth it, the app counts the round trip to each station (straight-line distance × 1.3, because roads wind) and the fuel the car would use on it."],
  text_size:    ["Mida de la lletra", "Tamaño de la letra", "Taille du texte", "Text size"],
  ts_1:         ["Normal", "Normal", "Normale", "Normal"],
  ts_2:         ["Gran", "Grande", "Grande", "Large"],
  ts_3:         ["Molt gran", "Muy grande", "Très grande", "Extra large"],
  lang_title:   ["Idioma", "Idioma", "Langue", "Language"],
  done:         ["Fet", "Hecho", "OK", "Done"],

  source:       ["Preus oficials del Ministeri per a la Transició Ecològica, actualitzats a les {h}. Els preus poden canviar: el que val és el del sortidor.", "Precios oficiales del Ministerio para la Transición Ecológica, actualizados a las {h}. Los precios pueden cambiar: lo que vale es el del surtidor.", "Prix officiels du ministère espagnol de la Transition écologique, mis à jour à {h}. Les prix peuvent changer : seul compte celui de la pompe.", "Official prices from Spain’s Ministry for the Ecological Transition, updated at {h}. Prices can change: the pump price is what counts."],
  credit:       ["Sense anuncis. Fet per Xoriguer.", "Sin anuncios. Hecho por Xoriguer.", "Sans publicité. Réalisé par Xoriguer.", "No ads. Made by Xoriguer."],
};

let XLANG = "ca";
function t(k, vars) {
  const row = TX[k];
  let s = row ? (row[LI[XLANG]] ?? row[0]) : k;
  if (vars && typeof s === "string") for (const [n, v] of Object.entries(vars)) s = s.split(`{${n}}`).join(v);
  return s;
}
function triaIdioma(desat) {
  if (desat && LI[desat] !== undefined) return desat;
  let comu = ""; try { comu = localStorage.getItem("xoriguer_idioma") || ""; } catch (e) {}   // el de la pàgina de descàrregues (només el llegim)
  if (LI[comu] !== undefined) return comu;
  for (const l of (navigator.languages || [navigator.language])) { const c = String(l || "").slice(0, 2); if (LI[c] !== undefined) return c; }
  return "ca";
}
