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
import time
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
import paths
import recurrence
import tray as tray_mod

APP_NAME = "Ahora"

# El build de Vite (un recurso: lo ubica `paths`) y el puerto del dev server.
DIST_DIR = paths.RESOURCE_DIR / "dist"
DEV_URL = "http://localhost:1420"

WINDOW_WIDTH = 480
WINDOW_HEIGHT = 800

# Bandera que distingue "la app quiere terminar" de "la X".
#
# Hace falta aunque el manejador mire `CloseReason`: `destroy()` desde otro
# hilo (es como lo llama "Salir", vía `Invoke`) llega con motivo `UserClosing`
# igual que la X — verificado con traza (reason=UserClosing en un `destroy()`
# programático). Sin la bandera no hay forma de distinguirlos.
# `_quit_app()` la levanta antes de destruir; no hace falta bajarla porque tras
# levantarla el proceso termina.
_quitting = threading.Event()


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

    def __init__(self, tray):
        self._tray = tray

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
    except Exception:
        pass


def _quit_app() -> None:
    """Termina el proceso. Lo llama el menú "Salir" de la bandeja.

    Destruir la última ventana es lo que hace que `webview.start()` vuelva y
    el proceso termine — por eso "Salir" sí cierra de verdad y la X no.
    Levanta `_quitting` antes (ver la bandera): `destroy()` llega con motivo
    `UserClosing` igual que la X, y sin la bandera "Salir" escondería en vez
    de terminar.
    """
    _quitting.set()
    for window in list(webview.windows):
        try:
            window.destroy()
        except Exception:
            pass
    for window in list(webview.windows):
        try:
            window.destroy()
        except Exception:
            pass


def make_close_handler(window):
    """Construye el manejador de cierre para una ventana.

    Es función de módulo (y no un cierre anidado en `main()`) para poder
    probarla sin abrir nada: `shell/test_quit.py` lo hace con motivos
    simulados.

    Un solo manejador con la razón a la vista (`CloseReason`), suscripto
    directo al Form (ver `subscribe_system_close`): la X esconde, "Salir"
    termina, el sistema pasa. Tres detalles que costó aprender:

    - NO va por `window.events.closing` de pywebview: suscribir ahí (aunque el
      manejador devuelva lo que sea) hace que Windows vete WM_QUERYENDSESSION,
      y ni el instalador ni el apagado pueden cerrar la app. Verificado con
      sonda Win32: sin esa suscripción la query se acepta, con ella se veta.
    - "Salir" necesita la bandera `_quitting` ADEMÁS de la razón: `destroy()`
      desde otro hilo llega con motivo `UserClosing` igual que la X
      (verificado con traza). Sin la bandera no hay forma de distinguirlos.
    - `CloseMainWindow` de PowerShell (y el "Finalizar tarea") llega como
      `TaskManagerClosing`, no como `UserClosing`: también pasa, que es lo
      correcto. Para simular la X de verdad hay que mandar `WM_SYSCOMMAND` con
      `SC_CLOSE`.
    """
    try:
        import clr  # noqa: F401 -- sin esto `System` no existe

        clr.AddReference("System.Windows.Forms")
        from System.Windows.Forms import CloseReason
    except Exception:
        # Sin WinForms no hay nada que suscribir (y sin runtime ni siquiera
        # hay veto que arreglar): la app arranca igual, sin este manejo.
        return None

    def on_form_closing(sender, args):
        if _quitting.is_set() or args.CloseReason != CloseReason.UserClosing:
            args.Cancel = False
        else:
            window.hide()
            args.Cancel = True

    return on_form_closing


def _try_subscribe(window, handler) -> bool:
    """Un intento de suscribir `handler` al Form real. False si todavía no se
    puede (sin Form, sin handle) o si falla.

    Suscribirse (`+=`) desde otro hilo es seguro: `EventHandlerList.Add` tiene
    lock propio. Lo que NO se puede desde otro hilo es invocar controles — por
    eso esto solo suscribe; el manejador lo invoca .NET en el hilo de la UI
    cuando el cierre ocurre. (Se probó derivar con `Invoke`, pero invocar un
    delegado de pythonnet a mano revienta el proceso; suscribir directo anda.)
    """
    try:
        form = window.native
    except Exception:
        return False
    if form is None:
        return False
    try:
        if not form.IsHandleCreated:
            return False
    except Exception:
        return False
    try:
        form.FormClosing += handler
        return True
    except Exception:
        return False


def subscribe_system_close(window, timeout_s: float = 30.0) -> bool:
    """Suscribe el cierre con razón al Form real. Para probar sin ventana, ver
    `test_quit.py` (la lógica vive en `make_close_handler` y el reintento en
    `_try_subscribe`).

    El Form (`window.native`) lo crea `webview.start()` en el hilo de la UI,
    que todavía no existe cuando `main()` arma la ventana — por eso esto corre
    en un hilo aparte que reintenta hasta que el Form y su handle existen (con
    tope, para no girar para siempre si la ventana nunca se crea). Cubre
    arranques ocultos (`--hidden`) igual que visibles: el Form existe en
    ambos, se muestre o no.
    """
    handler = make_close_handler(window)
    if handler is None:
        return False

    def watch() -> None:
        # Se espera al Form Y a su handle: `window.native` se asigna al
        # principio del constructor, antes de que la ventana exista de verdad.
        # Sin esta espera la suscripción pierde la carrera a veces sí y a
        # veces no, y el veto vuelve de forma intermitente — que es
        # exactamente lo que se vio probando: funciona una vez, falla la
        # siguiente, sin cambiar nada.
        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            if _try_subscribe(window, handler):
                return
            time.sleep(0.1)

    threading.Thread(target=watch, daemon=True).start()
    return True


# Se guarda el handle para que viva lo que viva el proceso: si se cerrara, el
# mutex se liberaría y una segunda instancia pasaría.
_single_instance_mutex = []


def ensure_single_instance(data_dir=None) -> bool:
    """True si esta es la única instancia, False si ya hay otra corriendo.

    Un mutex con nombre del kernel: la primera lo crea y lo mantiene; la
    segunda lo encuentra ocupado y termina en silencio antes de tocar nada (ni
    ventana, ni bandeja, ni base). Sin esto, abrir el `.exe` dos veces (fácil
    cuando la X esconde a bandeja y se olvida) duplica iconos y avisos.

    El nombre deriva de `DATA_DIR`: dos procesos con la misma agenda se
    excluyen, pero desarrollo e instalada (distinta agenda) pueden convivir —
    si no, probar la instalada con el dev abierto fallaría en silencio y
    parecería que el instalador no anda. El mutex muere con el proceso, así
    que un cuelgue no deja nada trabado.

    `data_dir` solo existe para probar con un directorio falso; en la app
    siempre es `paths.DATA_DIR`.

    Si algo falla (no Windows, sin permisos), se deja pasar: duplicar es
    molesto, no arrancar es peor.
    """
    try:
        import ctypes
        import hashlib

        if sys.platform != "win32":
            return True
        base = str(data_dir) if data_dir is not None else str(paths.DATA_DIR)
        name = "Local\\AhoraSingleInstance-" + hashlib.sha1(
            base.encode("utf-8")
        ).hexdigest()[:12]
        kernel32 = ctypes.windll.kernel32
        handle = kernel32.CreateMutexW(None, False, name)
        if not handle:
            return True
        # 183 = ERROR_ALREADY_EXISTS: otra instancia lo creó antes.
        if kernel32.GetLastError() == 183:
            kernel32.CloseHandle(handle)
            return False
        _single_instance_mutex.append(handle)
        return True
    except Exception:
        return True


def main() -> None:
    # Segunda instancia: termina en silencio con código 0 (no es un error, no
    # hay nada que reportar y en modo ventana ni siquiera hay consola que lea
    # un mensaje). Va antes de todo: no toca ni la base.
    if not ensure_single_instance():
        return

    # La carpeta de datos puede no existir (primer arranque instalada): se crea
    # antes de migrar, porque si no `sqlite3.connect` falla. En desarrollo ya
    # existe (`shell/`) y esto no hace nada.
    paths.DATA_DIR.mkdir(parents=True, exist_ok=True)
    db.migrate()

    url = with_theme(resolve_url(force_dev="--dev" in sys.argv), db.get_settings()["theme"])
    # Con `--hidden` (autostart) la app arranca en bandeja sin molestar. Sin
    # él, se muestra normalmente.
    start_hidden = "--hidden" in sys.argv

    # El ícono de bandeja se crea antes que la ventana, pero sus acciones
    # hablan de `window` — que todavía no existe. Eso está bien porque las
    # funciones se evalúan recién cuando alguien toca el menú, y para entonces
    # `window` ya tiene valor (los closures ven la variable, no su valor).
    tray = tray_mod.Tray(on_open=lambda: _show_window(window), on_quit=_quit_app)

    window = webview.create_window(
        APP_NAME,
        url,
        width=WINDOW_WIDTH,
        height=WINDOW_HEIGHT,
        hidden=start_hidden,
        min_size=(380, 520),
        js_api=Api(tray),
    )

    # El cierre con razón (la X esconde, el sistema y "Salir" pasan): corre en
    # un hilo que espera al Form real (ver función). A propósito NO se usa
    # `window.events.closing` de pywebview: suscribir ahí veta WM_QUERYENDSESSION
    # y ni el instalador ni el apagado pueden cerrar la app.
    subscribe_system_close(window)

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


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Si pywebview no puede arrancar (no hay WebView2, falta una DLL), el
        # traceback en una consola que nadie ve no sirve de nada: se escribe
        # en un archivo en la carpeta de datos, al lado de la agenda.
        with open(paths.DATA_DIR / "crash.log", "w", encoding="utf-8") as f:
            f.write(traceback.format_exc())
        raise
