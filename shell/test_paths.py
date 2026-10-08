"""Check manual: python test_paths.py

Verifica `shell/paths.py`: dónde mira la app los recursos y dónde escribe los
datos, en desarrollo y empaquetada, más el override `AHORA_DATA_DIR`.

Lo que importa verificar: en desarrollo nada cambia (`shell/agenda.db` sigue
siendo la base, los tests existentes ni se enteran) y empaquetada los datos
van a `%LOCALAPPDATA%\\Ahora`, nunca junto al código. Si eso se rompe, una
actualización borra la agenda o la app ni siquiera puede escribir.
"""

from pathlib import Path

import paths

REPO = Path(paths.__file__).resolve().parent.parent
SHELL = REPO / "shell"


def _resolve(**kwargs):
    base = {
        "frozen": False,
        "meipass": None,
        "localappdata": None,
        "repo_root": REPO,
        "data_dir_override": None,
    }
    base.update(kwargs)
    return paths.resolve_dirs(**base)


# 1. Desarrollo: recursos en la raíz del repo, datos en shell/ (como siempre).
resource, data = _resolve()
assert resource == REPO, resource
assert data == SHELL, data
print(f"   ok  desarrollo: recursos en {resource.name}/, datos en shell/")

# 2. Empaquetada: recursos en _MEIPASS, datos en %LOCALAPPDATA%\\Ahora.
resource, data = _resolve(
    frozen=True,
    meipass="C:\\temporal\\_MEI123",
    localappdata="C:\\Users\\alguien\\AppData\\Local",
)
assert resource == Path("C:\\temporal\\_MEI123"), resource
assert data == Path("C:\\Users\\alguien\\AppData\\Local\\Ahora"), data
print("   ok  empaquetada: datos en %LOCALAPPDATA%\\Ahora, no junto al .exe")

# 3. Override: manda sobre todo lo demás, congelada o no.
resource, data = _resolve(frozen=True, meipass="C:\\x", localappdata="C:\\y",
                          data_dir_override="C:\\prueba")
assert data == Path("C:\\prueba"), data
resource, data = _resolve(data_dir_override="C:\\prueba")
assert data == Path("C:\\prueba"), data
assert resource == REPO, resource
print("   ok  AHORA_DATA_DIR manda en desarrollo y empaquetada")

# 4. Las constantes del módulo, corriendo desde el repo, son las de
#    desarrollo: si alguien las toca, este es el primer lugar que avisa.
assert paths.RESOURCE_DIR == REPO, paths.RESOURCE_DIR
assert paths.DATA_DIR == SHELL, paths.DATA_DIR
assert paths.DATA_DIR / "agenda.db" == SHELL / "agenda.db"
print("   ok  constantes del módulo: desarrollo, sin cambios")

print("OK: las rutas separan recursos de datos")
