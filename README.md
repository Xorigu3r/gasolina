# Xoriguer · Gasolina a prop (app web)

PWA que, amb la ubicació del mòbil, mostra les gasolineres properes ordenades pel preu del carburant triat
(gasolina 95, 98, gasoil, gasoil Premium, GLP) i diu **si val la pena desviar-se**. Sense anuncis.
Català, castellà, francès i anglès. Creat per Xavier Musté.

Adreça prevista: **https://xorigu3r.github.io/gasolina/** (GitHub Pages, branca `main`).

## Com funciona
- **Dades**: API oficial i gratuïta del Ministeri (MITECO), sense clau i amb CORS obert:
  `…/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/{codi}`.
  Només es baixa la província (o les 2–4 províncies, a prop d'una frontera) on és l'usuari: uns 0,8 MB cadascuna.
  Es guarden 30 minuts a la memòria cau `gasolina-dades`; sense internet es fan servir les últimes guardades (amb avís).
- **Quina província**: `js/provincies.js` porta una graella de quadres de 0,2° amb les províncies que hi tenen gasolineres.
- **Val la pena?**: per a cada gasolinera es compta `litres × preu + anada i tornada × consum × preu`, amb la distància
  en línia recta × 1,3. Es compara amb la més propera. Menys de 0,30 € de diferència = «gairebé igual».
- **Horari**: `js/horari.js` llegeix el format del Ministeri (`L-V: 06:00-22:00; S-D: 07:00-22:00`, `24H`, trams amb `y`,
  horaris que passen la mitjanit). Si l'horari només parla d'un dia (p. ex. `L: 06:00-22:00`, força habitual), els altres
  dies surt «Mira l'horari» en lloc de dir que és tancada.
- **Ruta**: botons per obrir Google Maps o Waze.
- **Sense permís d'ubicació**: «Tria una població» (província + població; es fa servir el centre de les seves gasolineres).

## Dades que guarda a l'aparell
`localStorage`: `gasolina.config` (carburant, consum, litres, distància, idioma, mida de lletra) i `gasolina.lloc`
(població triada a mà). Llegeix (no escriu) `xoriguer_idioma` de la pàgina de descàrregues.

## Manteniment
- `sw.js`: **puja `VERSION` a cada canvi**. Només esborra memòries cau que comencen per `gasolina-` (les altres apps
  Xoriguer comparteixen l'origen `xorigu3r.github.io`).
- `py -I eines\genera_provincies.py` – torna a fer `js/provincies.js` (baixa 12 MB; rarament cal).
- `py -I eines\genera_icones.py` – torna a fer les icones.
