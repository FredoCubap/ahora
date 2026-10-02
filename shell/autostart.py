r"""Arranque con el sistema operativo, vía registro de Windows.

Una entrada en `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` con la
línea de comando para relanzar la app. Se usa `HKCU` y no `HKLM` a propósito:
no pide permisos de administrador y alcanza para un autostart por usuario, que
es lo que necesita una agenda personal — no tiene sentido que arranque para
cualquier cuenta de la máquina.

En Linux/macOS no hay registro: `is_enabled()` responde False y `set_enabled()`
no hace nada. La app sigue funcionando; solo el autostart no está disponible.
"""

import sys

# Clave estándar de Windows para "programas que arrancan con el usuario".
RUN_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"
# Como la clave es global para toda la app, el nombre del valor identifica a
# esta entrada y evita pisar las de otros programas.
VALUE_NAME = "Ahora"


def _is_windows() -> bool:
    return sys.platform == "win32"


def _launch_command() -> str:
    """El comando completo con el que hay que relazar la app.

    Windows guarda esto como una línea de comando, así que van el intérprete y
    el script entre comillas.

    Se usa `pythonw.exe` (el lanzador sin consola) cuando se está corriendo
    desde un venv: si la entrada de autostart apuntara a `python.exe`, al
    iniciar sesión abriría una ventana negra de consola detrás de la app.

    El flag `--hidden` hace que la app arranque directo en bandeja, sin
    mostrar la ventana: es lo que se quiere al iniciar sesión — la app está
    ahí escuchando, no molestando. La ventana aparece cuando se toca el ícono.

    `python main.py` a secas no sirve igual: el proceso que lanza Windows no
    tiene la misma carpeta de trabajo, así que la ruta va absoluta. Si la app
    llegó a empaquetarse con PyInstaller, `sys.frozen` apunta al ejecutable
    real y se usa ese solo.
    """
    import pathlib

    if getattr(sys, "frozen", False):
        return f'"{sys.executable}" --hidden'

    exe = pathlib.Path(sys.executable).resolve()
    windowless = exe.with_name("pythonw.exe")
    if windowless.exists():
        exe = windowless
    script = pathlib.Path(__file__).resolve().parent / "main.py"
    return f'"{exe}" "{script}" --hidden'


def is_enabled() -> bool:
    if not _is_windows():
        return False
    import winreg

    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY) as key:
            value, _ = winreg.QueryValueEx(key, VALUE_NAME)
    except (FileNotFoundError, OSError):
        return False
    return bool(value)


def set_enabled(enabled: bool) -> bool:
    """Prende o apaga el autostart. Devuelve el estado effective resultante.

    Devolver el estado real (y no lo pedido) deja que el frontend pueda
    mostrar la verdad: si el registro no estaba y no se pudo escribir, el
    toggle queda en "apagado" en vez de mentir diciendo "prendido".
    """
    if not _is_windows():
        return False
    import winreg

    if not enabled:
        try:
            with winreg.OpenKey(
                winreg.HKEY_CURRENT_USER, RUN_KEY, 0, winreg.KEY_SET_VALUE
            ) as key:
                winreg.DeleteValue(key, VALUE_NAME)
        except FileNotFoundError:
            pass  # ya estaba apagado: no es un error
        except OSError:
            return is_enabled()
        return False

    try:
        with winreg.CreateKeyEx(
            winreg.HKEY_CURRENT_USER, RUN_KEY, 0, winreg.KEY_SET_VALUE
        ) as key:
            winreg.SetValueEx(key, VALUE_NAME, 0, winreg.REG_SZ, _launch_command())
    except OSError:
        return is_enabled()

    return is_enabled()
