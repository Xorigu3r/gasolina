"""Genera data/ev/*.json (punts de recàrrega per a cotxes elèctrics) a partir del fitxer oficial de la DGT
(Punt d'Accés Nacional, dades del MITECO, llicència CC BY, s'actualitza cada 24 h):
    https://nap.dgt.es/datex2/v3/miterd/EnergyInfrastructureTablePublication/electrolineras.xml

El fitxer original fa uns 84 MB (DATEX II) i no deixa llegir-lo des del navegador (no té CORS).
Per això aquest script el converteix en quadres d'1° × 1° molt petits, que l'app baixa del seu propi servidor.
Ho fa sol cada dia el GitHub Action .github/workflows/electrolineres.yml.

    py -I eines\\genera_electrolineres.py [electrolineras.xml]

No porta preus ni si el punt està lliure ara: la DGT no els publica en aquest fitxer.
"""
import gzip
import io
import json
import math
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

URL = "https://nap.dgt.es/datex2/v3/miterd/EnergyInfrastructureTablePublication/electrolineras.xml"
ARREL = Path(__file__).resolve().parent.parent
SORTIDA = ARREL / "data" / "ev"

NS = {
    "com": "http://datex2.eu/schema/3/common",
    "loc": "http://datex2.eu/schema/3/locationReferencing",
    "locx": "http://datex2.eu/schema/3/locationExtension",
    "egi": "http://datex2.eu/schema/3/energyInfrastructure",
    "fac": "http://datex2.eu/schema/3/facilities",
}
SITE = "{%s}energyInfrastructureSite" % NS["egi"]

# Tipus d'endoll → codi curt que fa servir l'app
ENDOLLS = {
    "iec62196T2": "t2", "iec62196T2COMBO": "ccs", "chademo": "chademo", "domesticF": "schuko",
    "domesticE": "schuko", "iec62196T1": "t1", "iec62196T1COMBO": "ccs",
}
DIES = {"lunes": "L", "martes": "M", "miercoles": "X", "miércoles": "X", "jueves": "J", "viernes": "V",
        "sabado": "S", "sábado": "S", "domingo": "D"}
ORDRE_DIES = "LMXJVSD"


def obre():
    if len(sys.argv) > 1:
        return open(sys.argv[1], "rb")
    req = urllib.request.Request(URL, headers={"Accept-Encoding": "gzip", "User-Agent": "XoriguerGasolina/1.0"})
    r = urllib.request.urlopen(req, timeout=600)
    dades = r.read()
    if r.headers.get("Content-Encoding") == "gzip" or dades[:2] == b"\x1f\x8b":
        dades = gzip.decompress(dades)
    return io.BytesIO(dades)


def text(el, cami):
    x = el.find(cami, NS)
    return (x.text or "").strip() if x is not None and x.text else ""


def horari(label):
    """'Lunes (08:30 - 17:30) Martes (...)' → 'L: 08:30-17:30; M: ...' (el format del Ministeri, que l'app ja sap llegir)."""
    per_dia = defaultdict(list)
    for dia, a, b in re.findall(r"([A-Za-zÁÉÍÓÚáéíóú]+)\s*\((\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\)", label or ""):
        d = DIES.get(dia.lower())
        if d:
            per_dia[d].append(f"{a.zfill(5)}-{b.zfill(5)}")
    if not per_dia:
        return ""
    trams = []
    for d in ORDRE_DIES:
        if d in per_dia:
            fr = " y ".join(sorted(set(per_dia[d])))
            trams.append(f"{d}: {'24H' if fr in ('00:00-23:59', '00:00-00:00', '00:00-24:00') else fr}")
    return "; ".join(trams)


def neteja(s, prefix):
    return s[len(prefix):].strip() if s.startswith(prefix) else s.strip()


llocs = {}   # (lat, lon, operador) → registre (ajunta els punts que són al mateix lloc)
data_pub = ""
for ev, el in ET.iterparse(obre(), events=("end",)):
    if el.tag == "{%s}publicationTime" % NS["com"] and not data_pub:
        data_pub = (el.text or "").strip()
    if el.tag != SITE:
        continue
    try:
        lat = float(text(el, "fac:locationReference/loc:coordinatesForDisplay/loc:latitude"))
        lon = float(text(el, "fac:locationReference/loc:coordinatesForDisplay/loc:longitude"))
    except ValueError:
        el.clear(); continue
    if not (27 < lat < 44.5 and -19 < lon < 5):      # coordenades impossibles per a Espanya
        el.clear(); continue
    nom = text(el, "fac:name/com:values/com:value")
    oper = text(el, "fac:operator/fac:name/com:values/com:value")
    adr, mun = "", ""
    for linia in el.iterfind(".//locx:addressLine/locx:text/com:values/com:value", NS):
        t = (linia.text or "").strip()
        if t.startswith("Dirección:"): adr = neteja(t, "Dirección:")
        elif t.startswith("Municipio:"): mun = neteja(t, "Municipio:")
    h = horari(text(el, "fac:operatingHours/fac:label"))
    endolls = defaultdict(int)   # (tipus, kW) → quants
    for c in el.iterfind(".//egi:connector", NS):
        tipus = ENDOLLS.get(text(c, "egi:connectorType"), "altres")
        try:
            kw = round(float(text(c, "egi:maxPowerAtSocket") or 0) / 1000, 1)
        except ValueError:
            kw = 0
        if kw > 1000: kw = round(kw / 1000, 1)          # algun operador ho posa en mW
        endolls[(tipus, int(kw) if kw == int(kw) else kw)] += 1
    clau = (round(lat, 3), round(lon, 3), oper.lower())     # ~100 m: el mateix aparcament o estació
    r = llocs.get(clau)
    if r is None:
        r = llocs[clau] = {"n": nom, "o": oper, "a": adr, "m": mun, "lat": round(lat, 5), "lon": round(lon, 5), "h": h, "e": defaultdict(int)}
    elif not r["h"] and h:
        r["h"] = h
    for k, v in endolls.items():
        r["e"][k] += v
    el.clear()

# Treu les sigles finals «CP1», «CP2»… quan s'han ajuntat diversos punts del mateix lloc
for r in llocs.values():
    r["n"] = re.sub(r"\s*\bCP\s*\d+\s*$", "", r["n"]).strip() or r["n"]

quadres = defaultdict(list)
for r in llocs.values():
    e = sorted(([t, kw, n] for (t, kw), n in r["e"].items()), key=lambda x: -x[1])
    quadres[f"{math.floor(r['lat'])}_{math.floor(r['lon'])}"].append([r["n"], r["o"], r["a"], r["m"], r["lat"], r["lon"], r["h"], e])

SORTIDA.mkdir(parents=True, exist_ok=True)
for vell in SORTIDA.glob("*.json"):
    vell.unlink()
for k, v in quadres.items():
    v.sort(key=lambda x: (x[4], x[5]))
    (SORTIDA / f"{k}.json").write_text(json.dumps(v, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
index = {"data": data_pub, "font": URL, "llocs": len(llocs), "quadres": sorted(quadres)}
(SORTIDA / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=0), encoding="utf-8")
print(f"{len(llocs)} llocs de recàrrega en {len(quadres)} quadres · publicació {data_pub}")
