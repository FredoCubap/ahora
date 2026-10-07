"""Bandeja del sistema: ícono con "Abrir Ahora" / "Salir", y notificaciones.

Es el equivalente del tray de Tauri. vive en un hilo aparte del de la ventana
porque `webview.start()` bloquea hasta que la app cierra, y el ícono de la
bandeja tiene que seguir respondiendo mientras tanto (si no, desde la bandeja
no se podría abrir la ventana).

El ícono de la bandeja es el mismo asset de la app (`assets/icon.ico`), que ya
trae las resoluciones que Windows necesita para el área de notificación (16 a
256 px) — no hace falta una imagen aparte.

Si algo de esto falla (sin `pystray`, ícono ilegible, backend sin soporte), la
app **no se cae**: `Tray.start()` devuelve `False` y la ventana sigue siendo
usable. La bandeja es una comodidad, no un requisito para usar la agenda.
"""

import paths

APP_NAME = "Ahora"

# El ícono es un recurso: vive en `assets/`, lo ubica `paths` según se corra
# desde el repo o empaquetado. Se mantiene el nombre porque `main.py` y
# `test_tray.py` lo usan.
ICON_PATH = paths.RESOURCE_DIR / "assets" / "icon.ico"


def _load_image():
    """Carga el ícono, o `None` si no se puede (Pillow faltante, archivo roto)."""
    try:
        from PIL import Image

        return Image.open(ICON_PATH)
    except Exception:
        return None


class Tray:
    """Ícono de bandeja + notificaciones del sistema.

    `on_open` se llama al pedir "Abrir" o al hacer clic izquierdo: el dueño de
    la ventana (main.py) decide qué significa "traer la ventana al frente",
    porque desde acá no se puede — la ventana es de pywebview, no nuestra.
    """

    def __init__(self, on_open, on_quit):
        self._on_open = on_open
        self._on_quit = on_quit
        self._icon = None
        self._available = False

    def start(self) -> bool:
        """Levanta el ícono en su propio hilo. False si no se pudo."""
        try:
            import pystray
        except ImportError:
            return False

        image = _load_image()
        if image is None:
            return False

        menu = pystray.Menu(
            pystray.MenuItem("Abrir Ahora", self._handle_open, default=True),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Salir", self._handle_quit),
        )
        self._icon = pystray.Icon(APP_NAME, image, APP_NAME, menu)

        try:
            # `run_detached` levanta el loop de mensajes en un hilo aparte y
            # devuelve enseguida: el hilo principal lo ocupa `webview.start()`.
            self._icon.run_detached()
        except Exception:
            self._icon = None
            return False

        self._available = True
        return True

    def notify(self, title: str, body: str = "") -> bool:
        """Notificación del sistema operativo. False si no se pudo mostrar.

        La usa el frontend a través de `Api.notify` — es la única forma de
        enterarte de un aviso con la ventana oculta en bandeja.
        """
        if not self._available or self._icon is None:
            return False
        try:
            self._icon.notify(body or title, title=title)
            return True
        except Exception:
            return False

    def stop(self) -> None:
        if self._icon is None:
            return
        try:
            self._icon.stop()
        except Exception:
            pass
        self._icon = None
        self._available = False

    def _handle_open(self, icon=None, item=None) -> None:
        try:
            self._on_open()
        except Exception:
            pass

    def _handle_quit(self, icon=None, item=None) -> None:
        try:
            self._on_quit()
        except Exception:
            pass
