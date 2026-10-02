"""Check manual: python test_serve.py

Verifica que el build se sirva bien: la raíz devuelve el index.html y los
assets se pueden bajar. Es el mismo código que usa `main.resolve_url()`, así
que si este check pasa, la ventana abre la app en vez de una página en blanco.

Existe porque el servidor de rutas locales de pywebview 6.2.1 tiene la ruta
`/` rota (llama al handler sin argumentos → 500). Este test es la red de
seguridad de haberlo esquivado con el servidor de la stdlib.
"""

import pathlib
import urllib.request

import main

dist = main.DIST_DIR
assert (dist / "index.html").is_file(), f"no hay build en {dist} — corré `npm run build` primero"

url = main._serve_dist(dist)

# 1. La raíz tiene que devolver el index.html (no un 500, no un listado).
with urllib.request.urlopen(url) as r:
    assert r.status == 200, r.status
    body = r.read().decode("utf-8")
assert "<div id=\"root\">" in body, f"la raíz no devolvió el index.html: {body[:200]}"

# 2. Los assets que el index referencia tienen que existir y servirse. Si el
#    build queda con rutas absolutas y el server no las resuelve, esto falla.
import re

for asset in re.findall(r'(?:src|href)="/?(assets/[^"]+)"', body):
    with urllib.request.urlopen(url + asset) as r:
        assert r.status == 200, f"{asset} → {r.status}"
    print(f"  ok  {asset}")

# 3. Un archivo inexistente tiene que dar 404, no reventar el server.
try:
    urllib.request.urlopen(url + "no-existe.js")
    raise AssertionError("un archivo inexistente debería dar 404")
except urllib.error.HTTPError as e:
    assert e.code == 404, e.code

print(f"OK: el build se sirve bien desde {url}")
