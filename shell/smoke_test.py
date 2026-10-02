"""Smoke test end-to-end: python smoke_test.py

Abre la app de verdad (ventana de pywebview, build servido) y comprueba que el
puente `window.pywebview.api` funciona de punta a punta: el JS llama a un método
expuesto por `Api` en main.py y el resultado vuelve a JS.

Los otros checks (`test_*.py`) verifican piezas sueltas. Este es el único que
comprueba que las piezas están *pegadas*: que pywebview inyectó la API, que el
nombre del método existe, que los argumentos se decodifican y que el retorno
llega. Todo lo demás puede pasar sus tests y seguir con la app en blanco.

Abre una ventana, así que no va en `test_*.py` (esos son headless).

Cómo trae los resultados de vuelta
----------------------------------
El camino natural sería `evaluate_js("api.list_items()")` y quedarse con lo que
devuelva. No sirve: `evaluate_js` resuelve la promesa, pero el valor resuelto no
se marshalea de vuelta —vuelve un `{}` vacío sin importar lo que fuera. Es un
quirk de pywebview, no un bug de la app.

Lo que sí funciona es la dirección que la app usa realmente: una función de
Python expuesta con `js_api` es invocable desde JS, y ahí el valor sí llega
entero. Así que el JS corre las llamadas y pasa cada resultado a `Api.resultado`,
un sumidero en Python. Eso ejercita las dos direcciones del puente.

Qué verifica, en orden:

1. `window.pywebview.api` existe (si no, el puente no se inyectó).
2. `list_items()` responde — ida y vuelta contra SQLite de verdad.
3. `add_item()` + `list_items()` devuelven el ítem recién creado: el camino de
   escritura con argumentos, no solo el de lectura.
4. `get_autostart()` responde un booleano (un método de sistema, no de datos).
5. `notify()` no lanza. Puede devolver `false` si no hay bandeja; lo que no
   puede es reventar el puente.

Al final borra el ítem que creó, para no dejar basura en la agenda real.
"""

import sys
import threading
import time

import webview

import db
import main

# El script corre en el contexto de la página, así que el sumidero se busca en
# la API expuesta, no en variables de Python.
SINK = "window.pywebview.api.resultado"

JS_CHECKS = f"""
(async () => {{
  const api = window.pywebview.api;
  const ok = (n, v) => api.resultado(n, v);
  const titulo = "smoke test: item temporal";

  ok("api_existe", !!(api && api.resultado));
  if (!(api && api.resultado)) return;

  ok("list_items", await api.list_items());
  ok("get_autostart", await api.get_autostart());
  ok("notify", await api.notify("smoke", "prueba"));

  await api.add_item({{
    title: titulo,
    note: null,
    status: "pendiente",
    fixed_time: null,
    due_time: null,
    waiting_on: null,
    recurrence_id: null
  }});
  ok("tras_crear", await api.list_items());
  ok("titulo_prueba", titulo);
}})();
"""


class _ApiStub(main.Api):
    """La API de la app, más un sumidero para los resultados del JS.

    El smoke test no necesita la bandeja real, y levantar un ícono del sistema
    durante un test sería inesperado. Los métodos de datos y de autostart son los
    de verdad; `notify` es el único que se apaga.
    """

    def __init__(self):
        super().__init__(tray=None)
        self.resultados = {}

    def notify(self, title, body=""):
        return False

    def resultado(self, nombre, valor):
        """Lo que el JS va pasando de un check al siguiente."""
        self.resultados[nombre] = valor


ESPERADOS = (
    "api_existe",
    "list_items",
    "get_autostart",
    "notify",
    "tras_crear",
    "titulo_prueba",
)


def _esperar(api, timeout=30.0):
    """Espera a que el JS haya pasado todos los resultados.

    `evaluate_js` no espera a la promesa: devuelve apenas el script devuelve su
    promise, y las llamadas de la API siguen en vuelo. Hay que pollar el sumidero
    — con timeout, porque si el puente está roto no va a llegar nunca y la
    espera tiene que cortar sola.
    """
    limite = time.monotonic() + timeout
    while time.monotonic() < limite:
        faltan = [k for k in ESPERADOS if k not in api.resultados]
        if not faltan:
            return
        time.sleep(0.1)
    faltan = [k for k in ESPERADOS if k not in api.resultados]
    raise AssertionError(f"el JS no devolvio: {', '.join(faltan)} ({timeout}s)")


def _assert(cond, msg):
    if not cond:
        raise AssertionError(msg)


def _check(api):
    """Los asserts, sobre lo que el JS devolvió."""
    r = api.resultados

    _assert(r.get("api_existe") is True, "window.pywebview.api no se inyectó")
    print("   ok  window.pywebview.api existe")

    _assert(isinstance(r.get("list_items"), list), f"list_items() -> {r.get('list_items')!r}")
    print(f"   ok  list_items() -> {len(r['list_items'])} items")

    _assert(
        isinstance(r.get("get_autostart"), bool),
        f"get_autostart() -> {r.get('get_autostart')!r}",
    )
    print(f"   ok  get_autostart() -> {r['get_autostart']}")

    # `notify` devuelve false a propósito (no hay bandeja en el test). Lo que se
    # comprueba es que llegó la respuesta y no reventó el puente.
    _assert(isinstance(r.get("notify"), bool), f"notify() -> {r.get('notify')!r}")
    print(f"   ok  notify() -> {r['notify']} (false = sin bandeja, esperado en test)")

    titulo = r.get("titulo_prueba")
    creados = [i for i in r.get("tras_crear", []) if i.get("title") == titulo]
    _assert(len(creados) == 1, f"el item creado no aparece (aparecen {len(creados)})")
    creado = creados[0]
    print(f"   ok  add_item() + list_items() -> id {creado['id']}")

    # Limpieza: el smoke test no debe dejar basura en la agenda real.
    db.delete_item(creado["id"])
    restantes = [i for i in db.list_items() if i.get("title") == titulo]
    _assert(not restantes, f"no se borro: quedan {restantes}")
    print("   ok  el item de prueba se borro")


def run() -> int:
    db.migrate()

    url = main.resolve_url()
    print(f"1. url: {url}")

    api = _ApiStub()
    window = webview.create_window(
        "Ahora · smoke", url, width=420, height=640, js_api=api
    )

    # El error se guarda, no se tira desde el handler: pywebview atrapa las
    # excepciones de los eventos y el proceso terminaría con exit 0, haciendo
    # pasar un test que en realidad rompió.
    estado = {"error": None, "ok": False}

    def on_loaded():
        try:
            window.evaluate_js(JS_CHECKS)
            _esperar(api)
            _check(api)
            estado["ok"] = True
        except Exception as exc:
            estado["error"] = exc
        finally:
            window.destroy()

    window.events.loaded += on_loaded

    # Red de seguridad: si la página no carga, `loaded` no dispara y el bucle
    # queda vivo para siempre. Corta por los ojos.
    def watchdog():
        if not window.events.loaded.wait(timeout=60):
            estado["error"] = AssertionError("la pagina no cargo en 60s")
            for w in list(webview.windows):
                w.destroy()

    threading.Thread(target=watchdog, daemon=True).start()

    webview.start(debug=False)

    if estado["error"] is not None:
        print(
            f"\nFALLO: {type(estado['error']).__name__}: {estado['error']}",
            file=sys.stderr,
        )
        return 1
    if not estado["ok"]:
        print("\nFALLO: los checks no llegaron a terminarse", file=sys.stderr)
        return 1

    print("\nOK: el puente JS <-> Python funciona de punta a punta")
    return 0


if __name__ == "__main__":
    if not (main.DIST_DIR / "index.html").is_file():
        print(
            f"No hay build en {main.DIST_DIR}.\n"
            "Corre `npm run build` primero, o `npm run dev` en otra terminal.",
            file=sys.stderr,
        )
        raise SystemExit(1)
    raise SystemExit(run())
