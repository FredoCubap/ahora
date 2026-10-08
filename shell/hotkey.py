"""Atajo global de Windows para abrir la captura rápida desde cualquier app.

Usa `RegisterHotKey` de user32 vía `ctypes` (sin dependencias nuevas). Windows
asocia el atajo al hilo que lo registra y entrega `WM_HOTKEY` a la cola de
mensajes de ESE hilo, así que el registro, el bucle de mensajes y el
desregistro viven juntos en un hilo propio. Para pararlo se le envía `WM_QUIT`.

Un atajo ocupado por otra aplicación, una combinación inválida o una plataforma
sin user32 nunca revientan: dejan el atajo inactivo con un motivo que Ajustes
muestra. El hilo y el bucle hablan con Windows a través de un "backend" para
poder probar toda la lógica en cualquier sistema (ver `test_hotkey.py`).

En Linux/macOS el atajo queda inactivo con motivo `no disponible`.
"""

import ctypes
import sys
import threading
from typing import Callable, Optional

MOD_ALT = 0x0001
MOD_CONTROL = 0x0002
MOD_SHIFT = 0x0004
MOD_WIN = 0x0008
# Sin esto, mantener la combinación pulsada dispararía el atajo en ráfaga.
MOD_NOREPEAT = 0x4000

WM_HOTKEY = 0x0312
WM_QUIT = 0x0012
PM_NOREMOVE = 0x0000
ERROR_HOTKEY_ALREADY_REGISTERED = 1409

# Un solo atajo por proceso: el id solo tiene que ser único dentro del hilo.
HOTKEY_ID = 1

# Motivos por los que el atajo puede estar inactivo (los lee Ajustes).
REASON_BUSY = "ocupado"
REASON_INVALID = "invalida"
REASON_UNAVAILABLE = "no disponible"

# Cuánto espera `start()` a que el hilo termine de registrar.
START_TIMEOUT_S = 2.0

_MODIFIERS = {
    "ctrl": MOD_CONTROL,
    "control": MOD_CONTROL,
    "alt": MOD_ALT,
    "shift": MOD_SHIFT,
    "win": MOD_WIN,
    "windows": MOD_WIN,
    "meta": MOD_WIN,
}


def parse_combination(text: str) -> tuple[int, int]:
    """Convierte `Win+Alt+A` en (modificadores, código de tecla virtual).

    Acepta letras, dígitos y F1–F12, sin distinguir mayúsculas. Exige al menos
    un modificador: un atajo global con una tecla a secas secuestraría esa
    tecla en todo el sistema. Lanza `ValueError` si la combinación no sirve.
    """
    mods = 0
    key: Optional[int] = None
    for part in (p.strip().lower() for p in str(text).split("+")):
        if part in _MODIFIERS:
            mods |= _MODIFIERS[part]
        elif key is not None:
            raise ValueError(f"más de una tecla en {text!r}")
        elif len(part) == 1 and part.isascii() and part.isalnum():
            key = ord(part.upper())
        elif part.startswith("f") and part[1:].isdigit() and 1 <= int(part[1:]) <= 12:
            key = 0x70 + int(part[1:]) - 1
        else:
            raise ValueError(f"tecla no reconocida {part!r} en {text!r}")
    if key is None:
        raise ValueError(f"falta la tecla en {text!r}")
    if not mods:
        raise ValueError(f"falta un modificador (Ctrl, Alt, Shift o Win) en {text!r}")
    return mods, key


class _Win32Backend:
    """Lo mínimo de user32 que necesita el hilo. Solo existe en Windows."""

    def __init__(self):
        from ctypes import wintypes

        self._wintypes = wintypes
        self._user32 = ctypes.WinDLL("user32", use_last_error=True)
        self._kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        self._thread_id = 0

    def register(self, mods: int, vk: int) -> int:
        """Registra el atajo en el hilo actual. Devuelve 0 o el código de error."""
        self._thread_id = self._kernel32.GetCurrentThreadId()
        # Fuerza la creación de la cola de mensajes del hilo: sin ella,
        # `PostThreadMessage(WM_QUIT)` de `stop()` fallaría si llega pronto.
        msg = self._wintypes.MSG()
        self._user32.PeekMessageW(ctypes.byref(msg), None, 0, 0, PM_NOREMOVE)
        if self._user32.RegisterHotKey(None, HOTKEY_ID, mods | MOD_NOREPEAT, vk):
            return 0
        return ctypes.get_last_error() or -1

    def wait(self) -> bool:
        """Bloquea hasta el próximo atajo (True) o hasta `WM_QUIT` (False)."""
        msg = self._wintypes.MSG()
        while True:
            got = self._user32.GetMessageW(ctypes.byref(msg), None, 0, 0)
            if got <= 0:  # 0 = WM_QUIT, -1 = error
                return False
            if msg.message == WM_HOTKEY and msg.wParam == HOTKEY_ID:
                return True

    def unregister(self) -> None:
        self._user32.UnregisterHotKey(None, HOTKEY_ID)

    def post_quit(self) -> None:
        self._user32.PostThreadMessageW(self._thread_id, WM_QUIT, 0, 0)


class Hotkey:
    """El atajo global: se arranca con una combinación y se puede re-arrancar."""

    def __init__(self, on_trigger: Callable[[], None], backend_factory=None):
        self._on_trigger = on_trigger
        # `None` = el real de Windows; los tests inyectan uno falso.
        self._backend_factory = backend_factory
        self._thread: Optional[threading.Thread] = None
        self._backend = None
        self._status = {"active": False, "reason": REASON_UNAVAILABLE}

    def status(self) -> dict:
        return dict(self._status)

    def start(self, combination: str) -> dict:
        """(Re)registra el atajo. Nunca lanza: devuelve el estado resultante."""
        self.stop()
        try:
            mods, vk = parse_combination(combination)
        except ValueError:
            return self._set(False, REASON_INVALID)

        factory = self._backend_factory
        if factory is None:
            if sys.platform != "win32":
                return self._set(False, REASON_UNAVAILABLE)
            factory = _Win32Backend

        ready = threading.Event()
        result: list[int] = []

        def run() -> None:
            try:
                backend = factory()
                error = backend.register(mods, vk)
            except Exception:
                result.append(-1)
                ready.set()
                return
            result.append(error)
            self._backend = backend if error == 0 else None
            ready.set()
            if error:
                return
            try:
                while backend.wait():
                    try:
                        self._on_trigger()
                    except Exception:
                        pass  # un fallo del callback no puede matar el atajo
            finally:
                backend.unregister()

        thread = threading.Thread(target=run, name="ahora-hotkey", daemon=True)
        thread.start()
        if not ready.wait(START_TIMEOUT_S) or not result:
            return self._set(False, REASON_UNAVAILABLE)
        error = result[0]
        if error == 0:
            self._thread = thread
            return self._set(True, None)
        thread.join(START_TIMEOUT_S)
        return self._set(
            False, REASON_BUSY if error == ERROR_HOTKEY_ALREADY_REGISTERED else REASON_UNAVAILABLE
        )

    def stop(self) -> None:
        """Desregistra el atajo y termina el hilo. No hace nada si no está activo."""
        thread, backend = self._thread, self._backend
        self._thread = self._backend = None
        if thread is not None and backend is not None:
            backend.post_quit()
            thread.join(START_TIMEOUT_S)
        self._set(False, REASON_UNAVAILABLE)

    def _set(self, active: bool, reason: Optional[str]) -> dict:
        self._status = {"active": active, "reason": reason}
        return self.status()
