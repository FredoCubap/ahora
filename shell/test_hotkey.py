"""Check manual: python test_hotkey.py

El registro real depende de user32 (solo Windows) y de que otra app no tenga
el atajo, así que acá se prueba la lógica con un backend falso que imita a
Windows: el parseo de la combinación, el registro y desregistro en el hilo, la
degradación cuando el atajo está ocupado y que un fallo del callback no mata
el atajo. Que Windows entregue de verdad el atajo desde otra aplicación se
comprueba a mano (tarea 4.2 del cambio `atajo-global-captura`).
"""

import queue
import threading

import hotkey

# --- parse_combination ---
assert hotkey.parse_combination("Win+Alt+A") == (hotkey.MOD_WIN | hotkey.MOD_ALT, ord("A"))
assert hotkey.parse_combination("ctrl+shift+f5") == (
    hotkey.MOD_CONTROL | hotkey.MOD_SHIFT,
    0x74,
)
assert hotkey.parse_combination(" Ctrl + 7 ") == (hotkey.MOD_CONTROL, ord("7"))
for malo in ["A", "Win+Alt", "", "Ctrl+A+B", "Ctrl+Ñ", "Ctrl+F13", "Ctrl+Espacio", "Ctrl++"]:
    try:
        hotkey.parse_combination(malo)
        raise AssertionError(f"aceptó una combinación inválida: {malo!r}")
    except ValueError:
        pass
print("   ok  parseo de combinaciones")


class FakeBackend:
    """Imita a user32: `wait()` bloquea hasta que el test dispara o cierra."""

    registered: list = []  # (mods, vk) vigentes
    busy = False
    events: "queue.Queue[str]" = queue.Queue()

    def register(self, mods, vk):
        if FakeBackend.busy:
            return hotkey.ERROR_HOTKEY_ALREADY_REGISTERED
        FakeBackend.registered.append((mods, vk))
        return 0

    def wait(self):
        return FakeBackend.events.get(timeout=2) == "hotkey"

    def unregister(self):
        FakeBackend.registered.clear()

    def post_quit(self):
        FakeBackend.events.put("quit")


def nuevo(on_trigger):
    FakeBackend.registered = []
    FakeBackend.busy = False
    FakeBackend.events = queue.Queue()
    return hotkey.Hotkey(on_trigger, backend_factory=FakeBackend)


# --- registro, disparo y desregistro ---
disparos = threading.Semaphore(0)
h = nuevo(disparos.release)
assert h.start("Win+Alt+A") == {"active": True, "reason": None}
assert FakeBackend.registered == [(hotkey.MOD_WIN | hotkey.MOD_ALT, ord("A"))]
FakeBackend.events.put("hotkey")
assert disparos.acquire(timeout=2), "el atajo no llegó al callback"
h.stop()
assert FakeBackend.registered == [], "stop() no desregistró el atajo"
assert h.status()["active"] is False
h.stop()  # idempotente
print("   ok  registro, disparo y desregistro")

# --- re-arrancar con otra combinación reemplaza a la anterior ---
h = nuevo(lambda: None)
h.start("Win+Alt+A")
assert h.start("Ctrl+Alt+N")["active"] is True
assert FakeBackend.registered == [(hotkey.MOD_CONTROL | hotkey.MOD_ALT, ord("N"))]
h.stop()
print("   ok  reconfigurar reemplaza el atajo")

# --- degradación: ocupado, inválido y sin Windows ---
h = nuevo(lambda: None)
FakeBackend.busy = True
assert h.start("Win+Alt+A") == {"active": False, "reason": hotkey.REASON_BUSY}
assert h.start("A") == {"active": False, "reason": hotkey.REASON_INVALID}
h.stop()  # no debe lanzar aunque nunca se activó

sin_win = hotkey.Hotkey(lambda: None)  # backend real: en Linux/macOS no existe
if hotkey.sys.platform != "win32":
    assert sin_win.start("Win+Alt+A") == {"active": False, "reason": hotkey.REASON_UNAVAILABLE}
print("   ok  ocupado, inválido y plataforma sin soporte degradan en silencio")

# --- un callback que revienta no mata el atajo ---
llamadas = threading.Semaphore(0)


def malo():
    llamadas.release()
    raise RuntimeError("callback roto")


h = nuevo(malo)
h.start("Win+Alt+A")
for _ in range(2):
    FakeBackend.events.put("hotkey")
    assert llamadas.acquire(timeout=2), "el atajo dejó de responder tras un fallo"
h.stop()
print("   ok  un callback roto no mata el atajo")

print("OK: el atajo global registra, dispara, se reconfigura y degrada en silencio")
