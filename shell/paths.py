"""Rutas de la app: dónde están los recursos y dónde van los datos.

La app asumía que corre desde el repo y calculaba todo relativo a su propio
archivo (`dist/`, `assets/`, `agenda.db`, `crash.log`). Empaquetada eso se
rompe: los datos no pueden ir junto al código (en `Program Files` ni siquiera
se puede escribir, y una actualización los borraría).

Dos conceptos, y nada más:

- `RESOURCE_DIR`: solo lectura. Contiene `dist/` y `assets/`. En desarrollo es
  la raíz del repo; empaquetada es `sys._MEIPASS` (ahí deja PyInstaller los
  `--add-data`).
- `DATA_DIR`: lo que se escribe (`agenda.db`, `crash.log`). En desarrollo es
  `shell/` — así `shell/agenda.db` y los tests siguen igual que siempre.
  Empaquetada es `%LOCALAPPDATA%\\Ahora`.

`resolve_dirs` es pura a propósito: recibe todo por parámetro para probarla
sin congelar nada. Las constantes del módulo la llaman con los valores reales.
"""

import os
import sys
from pathlib import Path

# Nombre de la carpeta de datos dentro de %LOCALAPPDATA%. Es la identidad de
# la app instalada; si algún día cambia, la agenda anterior queda huérfana.
APP_DATA_DIR_NAME = "Ahora"

# Override para probar sin tocar nada real: con `AHORA_DATA_DIR` apuntando a
# una carpeta temporal, la app (empaquetada o no) escribe ahí. Es una sola
# línea y no cambia el comportamiento por defecto.
DATA_DIR_ENV_VAR = "AHORA_DATA_DIR"


def resolve_dirs(
    *,
    frozen: bool,
    meipass: str | None,
    localappdata: str | None,
    repo_root: Path,
    data_dir_override: str | None,
) -> tuple[Path, Path]:
    """Devuelve `(RESOURCE_DIR, DATA_DIR)` según dónde corre la app.

    - `frozen`: `sys.frozen`, True cuando corre empaquetada con PyInstaller.
    - `meipass`: `sys._MEIPASS`, la carpeta temporal con los recursos.
    - `localappdata`: `%LOCALAPPDATA%`, la base de los datos empaquetados.
    - `repo_root`: la raíz del repo (solo se usa en desarrollo).
    - `data_dir_override`: valor de `AHORA_DATA_DIR`, o None si no está.

    El override manda siempre: es para probar sin tocar ni `shell/` ni
    `%LOCALAPPDATA%`. Sin override, empaquetada usa `_MEIPASS` y
    `%LOCALAPPDATA%\\Ahora`; en desarrollo, la raíz del repo y `shell/`.
    """
    if frozen:
        resource_dir = Path(meipass) if meipass else repo_root
        if data_dir_override:
            data_dir = Path(data_dir_override)
        elif localappdata:
            data_dir = Path(localappdata) / APP_DATA_DIR_NAME
        else:
            # No pasa en Windows (`%LOCALAPPDATA%` siempre existe); es el último
            # recurso para no reventar si alguien congela en otro sistema.
            data_dir = Path.home() / APP_DATA_DIR_NAME
        return resource_dir, data_dir

    resource_dir = repo_root
    if data_dir_override:
        data_dir = Path(data_dir_override)
    else:
        data_dir = repo_root / "shell"
    return resource_dir, data_dir


_REPO_ROOT = Path(__file__).resolve().parent.parent

RESOURCE_DIR, DATA_DIR = resolve_dirs(
    frozen=getattr(sys, "frozen", False),
    meipass=getattr(sys, "_MEIPASS", None),
    localappdata=os.environ.get("LOCALAPPDATA"),
    repo_root=_REPO_ROOT,
    data_dir_override=os.environ.get(DATA_DIR_ENV_VAR),
)
