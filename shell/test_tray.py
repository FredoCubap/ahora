"""Check manual: python test_tray.py

La bandeja es lo único del shell que depende de una librería externa
(`pystray`) y de un asset (`assets/icon.ico`). Si cualquiera de los dos falla,
`Tray.start()` devuelve `False` y la app sigue funcionando con la ventana sola —
eso es lo que se verifica acá, más que el ícono se pueda leer.

Lo que NO se verifica (y es a propósito): que la notificación se vea en
pantalla y que el menú funcione. Eso hay que mirarlo, no assertarlo — un test
que "pasa" porque la balloon notification no se mostró no está probando nada.
Para eso está el smoke test y la app corriendo.
"""

import pathlib

import tray

# 1. El asset del ícono tiene que estar y ser leíble. Si alguien lo mueve o lo
#    renombra, la bandeja deja de funcionar y esto lo dice con nombre y apellido.
assert tray.ICON_PATH.is_file(), f"falta el ícono: {tray.ICON_PATH}"

image = tray._load_image()
assert image is not None, f"Pillow no pudo leer {tray.ICON_PATH}"
print(f"   ok  ícono leído: {tray.ICON_PATH.name} {image.size}")

# Windows necesita una versión propia del ícono por cada tamaño que dibuja
# (bandeja, barra de tareas, Alt+Tab...). Si falta alguna la reescala de otra y
# se ve borrosa, así que se exigen las siete (spec: openspec "identidad-de-la-app").
REQUERIDAS = {(n, n) for n in (16, 24, 32, 48, 64, 128, 256)}
sizes = set(image.info.get("sizes", ()))
assert sizes, "no se pudieron leer las resoluciones del .ico"
faltan = sorted(REQUERIDAS - sizes)
assert not faltan, f"al .ico le faltan resoluciones: {[f'{w}x{h}' for w, h in faltan]}"
print(f"   ok  resoluciones: {[f'{w}x{h}' for w, h in sorted(sizes)]}")

# 2. Sin bandeja, todo degrada en silencio en vez de reventar. Es el contrato
#    que permite que la app arranque aunque pystray no esté.
sin_tray = tray.Tray(on_open=lambda: None, on_quit=lambda: None)
assert sin_tray.notify("t", "c") is False, "notify() sin bandeja debería devolver False"
sin_tray.stop()  # no debe lanzar aunque nunca se haya arrancado
print("   ok  sin bandeja, notify() y stop() no reventan")

print("OK: la bandeja tiene lo que necesita y degrada en silencio")
