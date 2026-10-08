"""Check manual: python test_captura.py

Verifica sin abrir ninguna ventana lo que hace el atajo global dentro del
shell: traer la ventana al frente y avisar al frontend, devolverla a la bandeja
al cerrar la captura (solo si estaba ahí), y `configure_hotkey` de la `Api`.

Usa una ventana falsa, un atajo falso y una DB temporal: nunca la agenda real.
"""

import os
import shutil
import tempfile

import db
import hotkey
import main

_tmpdir = tempfile.mkdtemp(suffix=".ahora-test")
db.DB_PATH = os.path.join(_tmpdir, "test-agenda.db")
db.migrate()


class _FakeWindow:
    def __init__(self):
        self.calls = []

    def show(self):
        self.calls.append("show")

    def hide(self):
        self.calls.append("hide")

    def evaluate_js(self, js):
        self.calls.append(js)


def reset():
    main._hidden.clear()
    main._restore_on_captura_close.clear()


# 1. Desde la bandeja: al frente, evento al frontend y, al cerrar, de vuelta.
reset()
main._hidden.set()
w = _FakeWindow()
main.open_captura(w)
assert w.calls == ["show", main.CAPTURA_EVENT_JS], w.calls
assert not main._hidden.is_set(), "tras mostrarla ya no está escondida"
main.restore_after_captura(w)
assert w.calls[-1] == "hide" and main._hidden.is_set()
print("   ok  desde la bandeja: al frente y de vuelta al cerrar")

# 2. Con la ventana visible: la captura se cierra sin esconderla.
reset()
w = _FakeWindow()
main.open_captura(w)
main.restore_after_captura(w)
assert "hide" not in w.calls, w.calls
print("   ok  con la ventana visible no se esconde")

# 3. Pulsar el atajo dos veces desde la bandeja no pierde la restauración.
reset()
main._hidden.set()
w = _FakeWindow()
main.open_captura(w)
main.open_captura(w)
main.restore_after_captura(w)
assert w.calls.count("hide") == 1
print("   ok  un segundo atajo no borra la restauración pendiente")

# 4. "Abrir Ahora" de la bandeja descarta la restauración.
reset()
main._hidden.set()
w = _FakeWindow()
main.open_captura(w)
main.open_from_tray(w)
main.restore_after_captura(w)
assert "hide" not in w.calls
print("   ok  abrir desde la bandeja descarta la restauración")

# 5. Un evaluate_js que falla no impide traer la ventana.
class _SinPagina(_FakeWindow):
    def evaluate_js(self, js):
        raise RuntimeError("la página no cargó")


reset()
w = _SinPagina()
main.open_captura(w)
assert w.calls == ["show"]
print("   ok  si la página no cargó, la ventana igual se muestra")


# 6. configure_hotkey: aplica, guarda, rechaza lo inválido y tolera lo ocupado.
class _FakeHotkey:
    def __init__(self, reason=None):
        self.reason, self.started, self.stopped = reason, [], 0

    def start(self, combination):
        self.started.append(combination)
        return {"active": self.reason is None, "reason": self.reason}

    def stop(self):
        self.stopped += 1

    def status(self):
        return {"active": False, "reason": hotkey.REASON_UNAVAILABLE}


fake = _FakeHotkey()
api = main.Api(tray=None, hotkey=fake)
r = api.configure_hotkey(True, "Ctrl+Alt+N")
assert r == {"active": True, "reason": None, "enabled": True, "combination": "Ctrl+Alt+N"}, r
assert fake.started == ["Ctrl+Alt+N"]
assert db.get_settings()["hotkey_combination"] == "Ctrl+Alt+N"

r = api.configure_hotkey(True, "A")  # inválida: no toca nada
assert r["reason"] == hotkey.REASON_INVALID and r["combination"] == "Ctrl+Alt+N", r
assert fake.started == ["Ctrl+Alt+N"] and db.get_settings()["hotkey_combination"] == "Ctrl+Alt+N"

r = api.configure_hotkey(False, "Ctrl+Alt+N")
assert r["enabled"] is False and fake.stopped == 1
assert db.get_settings()["hotkey_enabled"] == 0

ocupado = main.Api(tray=None, hotkey=_FakeHotkey(reason=hotkey.REASON_BUSY))
r = ocupado.configure_hotkey(True, "Win+Alt+A")
assert r["active"] is False and r["reason"] == hotkey.REASON_BUSY
assert db.get_settings()["hotkey_combination"] == "Win+Alt+A", "un atajo ocupado sí se guarda"
print("   ok  configure_hotkey aplica, guarda y rechaza lo inválido")

shutil.rmtree(_tmpdir, ignore_errors=True)
print("OK: el atajo abre la captura y la ventana vuelve a su estado previo")
