"""Genera js/provincies.js: noms de les províncies i una graella de 0,2° que diu quines províncies
tenen gasolineres a cada quadre. Així l'app sap quina província (o províncies, a prop d'una frontera)
ha de demanar a l'API sense haver de baixar els 12 MB de tota Espanya.

    py -I eines\\genera_provincies.py [es.json]

Sense argument, baixa la llista completa de l'API del Ministeri (uns 12 MB). Només cal tornar-lo a
executar si s'obren gasolineres en zones on abans no n'hi havia (rarament).
"""
import json
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

API = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/"
ARREL = Path(__file__).resolve().parent.parent
PAS = 0.2


def baixa(url):
    with urllib.request.urlopen(url, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def num(s):
    return float(s.replace(",", "."))


if len(sys.argv) > 1:
    dades = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
else:
    dades = baixa(API + "EstacionesTerrestres/")
prov = baixa(API + "Listados/Provincias/")

graella = defaultdict(set)
for e in dades["ListaEESSPrecio"]:
    try:
        la, lo = num(e["Latitud"]), num(e["Longitud (WGS84)"])
    except ValueError:
        continue
    graella[f"{int(la // PAS)},{int(lo // PAS)}"].add(e["IDProvincia"])

noms = {p["IDPovincia"]: p["Provincia"].replace("\\/", "/") for p in prov}
G = {k: "".join(sorted(v)) for k, v in sorted(graella.items())}
text = ("/* GENERAT per eines/genera_provincies.py. No l'editis a mà. */\n"
        f"const PAS_GRAELLA = {PAS};\n"
        "const PROVINCIES = " + json.dumps(dict(sorted(noms.items())), ensure_ascii=False) + ";\n"
        "// clau \"fila,columna\" (lat/0,2 , lon/0,2) → codis de província de 2 xifres enganxats\n"
        "const GRAELLA = " + json.dumps(G, separators=(",", ":")) + ";\n")
(ARREL / "js" / "provincies.js").write_text(text, encoding="utf-8")
print(f"{len(noms)} províncies, {len(G)} quadres")
