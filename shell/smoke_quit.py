"""Smoke test de salida: python smoke_quit.py

Abre una ventana de verdad con el manejador de cierre de la app y comprueba
que `_quit_app()` termina el proceso: `webview.start()` tiene que volver en
menos de 15 segundos.

`webview.start()` bloquea hasta que se cierra la última ventana, así que si el
arreglo se rompe (el manejador de la X cancelando también el cierre de
"Salir") nunca vuelve y el script se quedaría esperando para siempre. Por eso
hay un vigilante: a los 15 segundos imprime el fallo y termina con código 1.

Abre una ventana, así que es manual y no entra en `npm run ci` (igual que
`smoke_test.py`). No toca la base de datos: la página es un HTML mínimo, no la
app.

Cómo se corre (PowerShell, no Bash: Bash mata las ventanas al terminar):
  Start-Process -FilePath ".venv\\Scripts\\python.exe" -ArgumentList "smoke_quit.py" -Wait
"""

import os
import sys
import threading
import time

import webview

import main

TIMEOUT_S = 15


def _abortar() -> None:
    print(
        f"FALLO: webview.start() no volvió en {TIMEOUT_S}s: "
        "_quit_app() no cerró la ventana y el proceso seguiría vivo",
        file=sys.stderr,
        flush=True,
    )
    # `os._exit` y no `sys.exit`: este hilo no es el principal, y el principal
    # está bloqueado dentro de `webview.start()`, así que `sys.exit` no lo
    # sacaría de ahí.
    os._exit(1)


def run() -> int:
    window = webview.create_window("Ahora · smoke quit", html="<h1>smoke quit</h1>")
    window.events.closing += main.make_close_handler(window)

    # "_quit_app() desde un hilo" es lo que pasa en la app real: el menú de la
    # bandeja corre en el hilo de pystray, no en el de la ventana.
    threading.Timer(2.0, main._quit_app).start()

    vigilante = threading.Timer(TIMEOUT_S, _abortar)
    vigilante.daemon = True
    vigilante.start()

    inicio = time.monotonic()
    webview.start(debug=False)
    vigilante.cancel()

    print(f"OK: webview.start() volvió en {time.monotonic() - inicio:.1f}s, el proceso termina")
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
