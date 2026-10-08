# Proposal

## Why

Ahora solo se puede usar desde el código: hace falta Node, Python, un entorno virtual y `npm run app`. Para probarla en otra máquina, o simplemente instalarla como cualquier programa, falta un instalador. Una prueba corta con PyInstaller (fuera del repo) mostró que el empaquetado es viable sin tocar el código: el `.exe` abre la ventana con el ícono propio, carga la interfaz, responde el puente con Python, muestra la bandeja y "Salir" lo termina.

Lo que impide ofrecerlo de verdad es que la app asume que corre desde el repo. Calcula sus rutas relativas a su propio archivo (`dist/`, `assets/`, `agenda.db`, `crash.log`). Empaquetada, la base de datos quedaría dentro de la carpeta de instalación, donde una actualización la borraría y donde, en `Program Files`, ni siquiera podría escribir.

**Alcance declarado:** es un instalador **de prueba**, no la distribución oficial de Ahora. Sirve para probar la instalación, la desinstalación y el comportamiento en una máquina limpia. No se firma, no se actualiza solo y no se publica; la distribución oficial queda para un cambio posterior.

## What Changes

- Un módulo de rutas único (`shell/paths.py`) separa los **recursos** de solo lectura (`dist/`, `assets/`) de los **datos** del usuario (`agenda.db`, `crash.log`). En desarrollo todo sigue como hoy; empaquetada, los datos van a `%LOCALAPPDATA%\Ahora`.
- Un script `npm run package` construye la interfaz y empaqueta la app con PyInstaller en una carpeta autónoma.
- Un script de Inno Setup y `npm run installer` producen `Ahora-Setup-prueba.exe`: instalación por usuario, sin administrador.
- Desinstalar quita la app y su entrada de inicio automático, pero conserva la agenda.
- El instalador se identifica como versión de prueba.
- Las versiones de `pythonnet` y `clr_loader` se fijan en `shell/requirements.txt`, y `PyInstaller` entra en un `shell/requirements-dev.txt` aparte. Fredo autorizó estas dependencias.

## Capabilities

### New Capabilities

- `instalacion-de-la-app`: cómo se instala, actualiza y desinstala Ahora, y dónde guarda sus datos una vez instalada.

### Modified Capabilities

<!-- Ninguna: ningún requisito existente cambia. El modo de desarrollo conserva la agenda en shell/agenda.db. -->

## Impact

- `shell/paths.py` (nuevo) y su test `shell/test_paths.py` (entra en `npm run ci`).
- `shell/db.py`, `shell/main.py` y `shell/tray.py`: dejan de calcular rutas a mano y las piden a `paths`.
- `shell/requirements.txt` (pines) y `shell/requirements-dev.txt` (nuevo, con PyInstaller).
- `scripts/package.mjs` (nuevo), `installer/ahora.iss` (nuevo), `package.json` (dos scripts) y `.gitignore` (`build/`).
- `README.md`, `docs/DESARROLLO.md` y `CLAUDE.md`: cómo empaquetar y la trampa de las rutas.
- Herramienta externa: Inno Setup, que se instala en la máquina (no es una dependencia del repo) y que solo necesita quien construya el instalador.
- Fuera de alcance: firma de código, actualizaciones automáticas, publicación (GitHub Releases, winget), CI de empaquetado, otras plataformas y migrar automáticamente una agenda de desarrollo a la instalada.
