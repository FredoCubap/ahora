"""Check manual: python test_autostart.py

El autostart escribe en el registro de Windows, así que los tests no tocan la
clave real: `_launch_command` es una función pura y es lo único que se verifica
acá. Que el registro se escriba bien no se puede comprobar sin romper el
autostart de la máquina, así que eso se prueba a mano una vez y se confía.

Lo que importa verificar es que el comando guardado sea absolute y apunte a
`pythonw.exe`: si el path fuera relativo, Windows no encontraría el intérprete
al iniciar sesión, y con `python.exe` (con consola) abriría una ventana negra.
"""

import pathlib
import sys

import autostart

cmd = autostart._launch_command()

# 1. El path del intérprete va absoluto: Windows no resuelve relativos en la
#    clave Run, y un path relativo rompería el arranque al iniciar sesión.
#    Puede ser python.exe o pythonw.exe — lo que se comprueba es el path, no
#    cuál de los dos.
interpreter = cmd.split('"')[1]
assert pathlib.Path(interpreter).is_absolute(), interpreter

# 2. Desde un venv debe apuntar a pythonw.exe, no a python.exe: la entrada de
#    autostart no puede abrir una consola.
venv_pythonw = pathlib.Path(sys.executable).resolve().with_name("pythonw.exe")
if venv_pythonw.exists():
    assert "pythonw.exe" in cmd, f"arranca con consola (python.exe): {cmd}"
    assert "python.exe" not in cmd, cmd

# 3. El script va con path absoluto y entre comillas (puede tener espacios).
assert f'"{pathlib.Path(__file__).resolve().parent / "main.py"}"' in cmd, cmd

# 4. Arranca oculto: si no, al iniciar sesión saltaría una ventana de golpe.
assert "--hidden" in cmd, cmd

print(f"OK: comando de autostart -> {cmd}")
