"""Shell de escritorio de Ahora: la ventana, la bandeja y el puente a SQLite.

Es el punto de entrada de la app. Tres cosas que hace:

1. **Elige qué servir.** Si existe un build de Vite (`dist/`, con `index.html`),
   lo sirve desde ahí — es la app real. Si no existe, cae al dev server de Vite
   en el puerto 1420, para poder desarrollar sin compilar antes.

2. **La ventana vive en bandeja.** La X no cierra el proceso: la esconde, y la
   app sigue corriendo con el motor de avisos. Lo único que termina de verdad
   es "Salir": el del menú de bandeja, o el botón homónimo de Ajustes — los dos
   llaman a `Api.quit()`.

3. **Expone la API al frontend.** Cada método de `Api` queda disponible en JS
   como `window.pywebview.api.<nombre>` — ese es el puente que usa
   `src/lib/pywebviewApi.ts`.
"""

import functools
import http.server
import pathlib
import socketserver
import sys
import threading
import traceback
import urllib.parse

try:
    import webview
except ImportError:
    # Casi siempre es que se lanzó con el Python del sistema en vez del del
    # venv, y las deps viven ahí. Un traceback pelado ("No module named
    # 'webview'") no dice eso; esto sí, y da el comando exacto.
    sys.exit(
        "Faltan dependencias del shell.\n"
        "\n"
        "Lo más probable es que se esté usando el Python del sistema en vez del\n"
        "del venv del proyecto. Corré:\n"
        "\n"
        "    npm run app\n"
        "\n"
        "que ya apunta a shell\\.venv\\Scripts\\python.exe.\n"
        "\n"
        "Si el venv no existe todavía:\n"
        "\n"
        "    python -m venv shell/.venv\n"
        "    shell\\.venv\\Scripts\\pip install -r shell\\requirements.txt"
    )

import autostart
import db
import hotkey as hotkey_mod
import recurrence
import tray as tray_mod

APP_NAME = "Ahora"

# El build de Vite y el puerto del dev server.
DIST_DIR = pathlib.Path(__file__).resolve().parent.parent / "dist"
DEV_URL = "http://localhost:1420"

WINDOW_WIDTH = 480
WINDOW_HEIGHT = 800

# Bandera que distingue "la app quiere terminar" de "el usuario pulsó la X".
# Ambos llegan como el mismo evento `closing`, y el manejador de la X lo
# cancela siempre — así que sin esto, `window.destroy()` desde "Salir" también
# se cancela y el proceso no termina nunca. `_quit_app()` la levanta antes de
# destruir; el manejador la mira y deja pasar el cierre. No hace falta bajarla:
# tras levantarla el proceso termina.
_quitting = threading.Event()

# La ventana está escondida en la bandeja. pywebview no expone si lo está, así
# que se lleva a mano: la levanta la X (y el arranque con `--hidden`) y la baja
# `_show_window`.
_hidden = threading.Event()

# La captura se abrió con el atajo global desde la bandeja: al cerrarla hay que
# volver a esconder la ventana (`captura_closed`). Si la ventana ya estaba
# visible, no se levanta y la captura se cierra sin tocarla.
_restore_on_captura_close = threading.Event()

# Lo que recibe el frontend cuando el atajo abre la captura (ver App.tsx).
CAPTURA_EVENT_JS = "window.dispatchEvent(new CustomEvent('ahora:captura'))"


class _NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """Sirve archivos sin cachear.

    Es una app de escritorio, no un sitio: el "build" cambia cada vez que se
    compila, y un `index.html` cacheado mostrando un bundle viejo sería
    confuso de depurar. `SimpleHTTPRequestHandler` manda `Last-Modified`, así
    que sin esto el navegador puede quedarse pegado con una versión anterior.
    """

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, *args):
        # El servidor está acá solo para servir archivos; los 404 de las
        # peticiones que hace WebView2 no son información útil.
        pass


def _serve_dist(directory: pathlib.Path) -> str:
    """Levanta un servidor estático para `directory` y devuelve su URL.

    Pywebview tiene su propio servidor para rutas locales, pero en la 6.2.1
    su ruta para `/` está rota: llama al handler de assets sin argumentos y
    la carga inicial de la página responde 500 (ventana en blanco). Servir el
    directorio con el servidor de la stdlib son veinte líneas y funciona.

    Puerto 0 = que el sistema elija uno libre, así dos copias de la app pueden
    convivir sin pelear por el 1420. El hilo es daemon para que no impida
    terminar el proceso.
    """
    handler = functools.partial(_NoCacheHandler, directory=str(directory))
    server = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{server.server_address[1]}/"


def resolve_url(force_dev: bool = False) -> str:
    """Qué cargar en la ventana: el build si existe, si no el dev server.

    El criterio es "¿hay `dist/index.html`?". Un `dist/` a medio copiar (sin
    index.html) no cuenta como build — se usa el dev server antes que abrir un
    directorio vacío.

    `force_dev` (el flag `--dev`) salta la búsqueda del build. Hace falta
    porque si hay un `dist/` de una compilación anterior, sin este flag la app
    serviría ese build viejo y el hot-reload del dev server no se vería: la
    ventana abriría bien, pero con el código de la última compilación.
    """
    if not force_dev and (DIST_DIR / "index.html").is_file():
        return _serve_dist(DIST_DIR)
    return DEV_URL


def with_theme(url: str, theme: str) -> str:
    """Agrega `?theme=<valor>` a la URL con la que arranca la ventana.

    El script de `index.html` lo lee antes de que React pinte y pone el tema
    guardado en `<html>`. Pasarlo por la URL evita el parpadeo de ver primero
    el tema del sistema: preguntárselo a la base desde JS sería asíncrono, y
    para entonces la primera pantalla ya se habría pintado. Va antes del `#`
    del router, así que no interfiere con las rutas.
    """
    parts = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit(
        parts._replace(path=parts.path or "/", query=urllib.parse.urlencode({"theme": theme}))
    )


class Api:
    """Cada método queda expuesto en JS como `window.pywebview.api.<nombre>`.

    Los de datos son los de `db.py`; los de sistema (autostart, notificaciones)
    no son SQL y por eso viven acá, de vuelta de sus plugins anteriores.
    """

    def __init__(self, tray, hotkey):
        self._tray = tray
        self._hotkey = hotkey

    # --- datos ---

    def list_items(self):
        return db.list_items()

    def add_item(self, item):
        db.add_item(item)

    def complete_item(self, item_id):
        db.complete_item(item_id)

    def skip_item(self, item_id):
        db.skip_item(item_id)

    def start_item(self, item_id):
        db.start_item(item_id)

    def unstart_item(self, item_id):
        db.unstart_item(item_id)

    def snooze_item(self, item_id, snoozed_until_iso):
        db.snooze_item(item_id, snoozed_until_iso)

    def record_seguimiento_nag(self, item_id, nagged_at_iso, nagged_today_count):
        db.record_seguimiento_nag(item_id, nagged_at_iso, nagged_today_count)

    def delete_item(self, item_id):
        db.delete_item(item_id)

    def archive_completed(self):
        db.archive_completed()

    def auto_archive_missed_citas(self):
        """Citas perdidas que se archivan solas (docs/FILOSOFIA.md, "Estados").

        La corre `refresh()` del frontend, no solo el arranque: la app vive en
        bandeja días, y si dependiera del arranque una cita de ayer seguiría
        `pendiente` hasta el día siguiente. Devuelve cuántas archivó, que
        normalmente es 0.
        """
        return db.auto_archive_missed_citas()

    def list_recurrence_rules(self):
        return db.list_recurrence_rules()

    def create_recurrence_rule(self, rule):
        db.create_recurrence_rule(rule)

    def materialize_occurrence(self, rule, date):
        return db.materialize_occurrence(rule, date)

    def get_settings(self):
        return db.get_settings()

    def update_settings(self, partial):
        db.update_settings(partial)

    def expand_recurrences(self, rules, from_, to):
        return recurrence.expand_recurrences(rules, from_, to)

    # --- sistema ---

    def get_autostart(self):
        """Si la app arranca con el sistema. El toggle de Ajustes lo muestra."""
        return autostart.is_enabled()

    def set_autostart(self, enabled):
        """Prende/apaga el autostart. Devuelve el estado real resultante.

        `set_enabled` ya devuelve la verdad (puede fallar al escribir el
        registro), así que el toggle de Ajustes no queda mintiendo.
        """
        return autostart.set_enabled(bool(enabled))

    def get_hotkey_status(self):
        """Estado del atajo global: `{active, reason}`. Ajustes lo muestra."""
        return self._hotkey.status()

    def configure_hotkey(self, enabled, combination):
        """Activa, desactiva o cambia el atajo, y lo guarda si se pudo aplicar.

        Una combinación inválida se rechaza sin tocar el atajo ni lo guardado
        (`reason: "invalida"`). Una ocupada sí se guarda: puede liberarse luego,
        y Ajustes muestra el motivo. Devuelve lo que quedó guardado más el
        estado, para que el frontend muestre la verdad.
        """
        enabled = bool(enabled)
        try:
            hotkey_mod.parse_combination(combination)
        except ValueError:
            saved = db.get_settings()
            return {
                **self._hotkey.status(),
                "reason": hotkey_mod.REASON_INVALID,
                "enabled": bool(saved["hotkey_enabled"]),
                "combination": saved["hotkey_combination"],
            }
        db.update_settings({"hotkey_enabled": int(enabled), "hotkey_combination": combination})
        if enabled:
            status = self._hotkey.start(combination)
        else:
            self._hotkey.stop()
            status = self._hotkey.status()
        return {**status, "enabled": enabled, "combination": combination}

    def captura_closed(self):
        """El frontend cerró la captura: si la abrió el atajo desde la bandeja,
        vuelve a esconder la ventana."""
        for window in list(webview.windows):
            restore_after_captura(window)

    def notify(self, title, body=""):
        """Notificación del sistema operativo, para cuando la ventana está oculta."""
        return self._tray.notify(title, body)

    def quit(self):
        """Cierra la app de verdad (equivale a "Salir" en la bandeja)."""
        _quit_app()


def _show_window(window) -> None:
    """Trae la ventana al frente. Lo que llama el ícono de la bandeja.

    `show()` alcanza para todos los casos: en Windows hace `Show()` +
    `Activate()`, y `Show()` sobre una ventana minimizada la restaura. No hace
    falta un `restore()` aparte ni preguntar por el estado.
    """
    try:
        window.show()
        _hidden.clear()
    except Exception:
        pass


def open_captura(window) -> None:
    """Lo que hace el atajo global: ventana al frente y captura abierta.

    Si la ventana estaba en la bandeja, se anota para devolverla ahí al cerrar
    la captura. Si ya había una captura pendiente de restaurar (el atajo se
    pulsó dos veces) no se borra la anotación: la ventana ya está visible, pero
    sigue siendo cierto que antes estaba escondida.
    """
    if _hidden.is_set():
        _restore_on_captura_close.set()
    _show_window(window)
    try:
        window.evaluate_js(CAPTURA_EVENT_JS)
    except Exception:
        pass  # la página aún no cargó: la ventana al frente ya es útil


def restore_after_captura(window) -> None:
    """Devuelve la ventana a la bandeja si la captura la había sacado de ella."""
    if not _restore_on_captura_close.is_set():
        return
    _restore_on_captura_close.clear()
    try:
        window.hide()
        _hidden.set()
    except Exception:
        pass


def open_from_tray(window) -> None:
    """"Abrir Ahora" de la bandeja: el usuario eligió quedarse con la ventana,
    así que cualquier restauración pendiente de una captura se descarta."""
    _restore_on_captura_close.clear()
    _show_window(window)


def _quit_app() -> None:
    """Termina el proceso. Lo llama el menú "Salir" de la bandeja.

    Destruir la última ventana es lo que hace que `webview.start()` vuelva y
    el proceso termine — por eso "Salir" sí cierra de verdad y la X no.

    Ojo: `destroy()` no es un cierre a la fuerza, pasa por el evento `closing`
    y por lo tanto por el manejador de la X, que lo cancelaría. Por eso se
    levanta `_quitting` antes: sin la bandera, "Salir" escondería la ventana
    y el proceso seguiría vivo.
    """
    _quitting.set()
    for window in list(webview.windows):
        try:
            window.destroy()
        except Exception:
            pass


def make_close_handler(window):
    """Construye el manejador de cierre para una ventana.

    Es función de módulo (y no un cierre anidado en `main()`) para poder
    probarla con una ventana falsa: `shell/test_quit.py` lo hace sin abrir
    nada.

    La X esconde la ventana en vez de cerrar la app. Devolver False cancela el
    cierre (así está modelado `events.closing` en pywebview: el handler cancela
    cuando devuelve False). Sin esto, cerrar la ventana mataría el proceso y
    con él el motor de avisos — la app dejaría de avisar sin que nadie se
    entere.

    Pero cuando la app está saliendo (`_quitting` levantada por `_quit_app`),
    el manejador no esconde nada y devuelve True: el cierre sigue, la última
    ventana se destruye y `webview.start()` vuelve. Sin esta distinción,
    `destroy()` pasaría por este mismo manejador, se cancelaría, y "Salir" no
    terminaría el proceso nunca.
    """

    def on_closing() -> bool:
        if _quitting.is_set():
            return True
        window.hide()
        _hidden.set()
        return False

    return on_closing


def main() -> None:
    db.migrate()

    url = with_theme(resolve_url(force_dev="--dev" in sys.argv), db.get_settings()["theme"])
    # Con `--hidden` (autostart) la app arranca en bandeja sin molestar. Sin
    # él, se muestra normalmente.
    start_hidden = "--hidden" in sys.argv
    if start_hidden:
        _hidden.set()

    # El ícono de bandeja se crea antes que la ventana, pero sus acciones
    # hablan de `window` — que todavía no existe. Eso está bien porque las
    # funciones se evalúan recién cuando alguien toca el menú, y para entonces
    # `window` ya tiene valor (los closures ven la variable, no su valor).
    tray = tray_mod.Tray(on_open=lambda: open_from_tray(window), on_quit=_quit_app)

    # El atajo global se arranca con lo guardado. Un atajo ocupado o inválido
    # no impide nada: queda inactivo y Ajustes dice por qué.
    hotkey = hotkey_mod.Hotkey(lambda: open_captura(window))
    settings = db.get_settings()
    if settings["hotkey_enabled"]:
        hotkey.start(settings["hotkey_combination"])

    window = webview.create_window(
        APP_NAME,
        url,
        width=WINDOW_WIDTH,
        height=WINDOW_HEIGHT,
        hidden=start_hidden,
        min_size=(380, 520),
        js_api=Api(tray, hotkey),
    )

    window.events.closing += make_close_handler(window)

    # El ícono de bandeja corre en su propio hilo, porque `webview.start()`
    # ocupa el principal hasta que la app termina. Si no se puede levantar
    # (sin pystray, ícono ilegible), la app sigue andando con la ventana.
    tray.start()
    try:
        # `icon` es el de la ventana y la barra de tareas. La doc de pywebview
        # dice que solo vale en GTK/Qt, pero platforms/winforms.py (6.2.1, la
        # versión fijada) lo aplica a Form.Icon; sin él extrae el de python.exe.
        webview.start(icon=str(tray_mod.ICON_PATH), debug=False)
    finally:
        # Salir de `start()` significa que no queda ninguna ventana: la app
        # terminó. Se baja el ícono de bandeja para que no quede un fantasma.
        tray.stop()
        hotkey.stop()


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Si pywebview no puede arrancar (no hay WebView2, falta una DLL), el
        # traceback en una consola que nadie ve no sirve de nada: se escribe
        # en un archivo al lado del script.
        with open(pathlib.Path(__file__).parent / "crash.log", "w", encoding="utf-8") as f:
            f.write(traceback.format_exc())
        raise
