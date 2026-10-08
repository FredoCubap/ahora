# Tasks

> Las tareas 1 a 4 las puede hacer OpenCode en una rama, con `npm run ci` en verde al final de cada grupo. La 4.1 necesita Inno Setup instalado (pedir OK a Fredo antes de instalarlo) y el grupo 5 lo hacen Fredo y Claude a mano, porque necesita una máquina limpia.

## 1. Rutas y datos

- [x] 1.1 Crear `shell/paths.py` con una función pura (recibe `frozen`, `meipass`, `localappdata`, la raíz del repo y el valor de `AHORA_DATA_DIR`) que devuelva `RESOURCE_DIR` y `DATA_DIR` según la decisión 1 y 2 del diseño, y las constantes del módulo que la usan. Crear `shell/test_paths.py` (en el estilo de los otros, con `assert`) que cubra: desarrollo (datos en `shell/`), empaquetado (datos en `%LOCALAPPDATA%\Ahora`, recursos en `_MEIPASS`) y el override `AHORA_DATA_DIR`. Verificar con `npm run ci shell` que pasa.
- [x] 1.2 En `shell/db.py`, `shell/main.py` y `shell/tray.py`, sustituir los cálculos a mano (`DB_PATH`, `DIST_DIR`, `crash.log`, `ICON_PATH`) por los valores de `paths`, y crear `DATA_DIR` en `main()` antes de `db.migrate()`. Mantener `db.DB_PATH` como variable de módulo. Verificar con `npm run ci` que todo sigue en verde sin cambiar ningún test existente, y que desde el repo `db.DB_PATH` sigue siendo `shell/agenda.db`.
- [x] 1.3 En `shell/test_autostart.py`, añadir el caso empaquetado: con `sys.frozen` simulado, `_launch_command()` devuelve la ruta de `sys.executable` entre comillas más `--hidden`, sin `pythonw.exe` ni `main.py`. Restaurar `sys.frozen` al terminar. Verificar con `npm run ci shell`.

## 2. Dependencias

- [x] 2.1 Fijar en `shell/requirements.txt` `pythonnet` y `clr_loader` a las versiones que da `shell\.venv\Scripts\pip freeze` (3.1.0 y 0.3.1 al momento de escribir esto) y crear `shell/requirements-dev.txt` con `-r requirements.txt` y `pyinstaller==6.22.3`. Verificar creando un entorno virtual temporal fuera del repo, instalando `requirements-dev.txt` y comprobando que `npm run ci` sigue en verde con las versiones fijadas.

## 3. Empaquetado

- [x] 3.1 Crear `scripts/package.mjs` (en el estilo de `scripts/ci.mjs`, sin dependencias nuevas) que ejecute `npm run build` y luego PyInstaller del `shell/.venv` con `--noconfirm --clean --windowed --name Ahora --icon assets/icon.ico --paths shell --add-data "dist;dist" --add-data "assets;assets"`, con `--distpath build/package`, `--workpath build/work` y `--specpath build`, usando rutas absolutas (PyInstaller resuelve las relativas respecto al `.spec`). Añadir el script `package` a `package.json` y `build/` al `.gitignore`. Verificar que `npm run package` produce `build/package/Ahora/Ahora.exe`, y que falla con un mensaje claro si falta PyInstaller.
- [x] 3.2 Comprobar con `pythonnet` 3.1.0 que el `.exe` empaquetado abre: lanzarlo con PowerShell `Start-Process` y `AHORA_DATA_DIR` apuntando a una carpeta temporal (para no tocar el `%LOCALAPPDATA%` real) y verificar que la ventana carga la pantalla principal, que `agenda.db` se crea en esa carpeta y no dentro de la carpeta del `.exe`, y que "Salir de Ahora" termina el proceso. Si falla, aplicar la alternativa del diseño y anotarlo.
- [x] 3.3 En `docs/DESARROLLO.md`, reescribir la sección "Empaquetado" con `npm run package`, el requisito de `shell/requirements-dev.txt` y dónde guarda los datos la app empaquetada (más cómo copiar a mano `shell/agenda.db`); añadir a `CLAUDE.md`, en "Trampas conocidas", que las rutas se piden siempre a `shell/paths.py` y nunca con `__file__`. Verificar con `npx prettier --check docs/DESARROLLO.md CLAUDE.md`.

## 4. Instalador

- [x] 4.1 Crear `installer/ahora.iss` y el script `installer` de `package.json` (que llame a `ISCC.exe` si existe y si no explique cómo instalar Inno Setup) con: instalación por usuario sin administrador, `CloseApplications`, acceso directo en el menú Inicio con el ícono, versión `0.1.0-prueba` tomada de `package.json`, salida `build/installer/Ahora-Setup-prueba.exe`, y borrado de la entrada `Run\Ahora` del registro al desinstalar sin tocar `%LOCALAPPDATA%\Ahora`. Verificar que `npm run installer` genera el `.exe`.
- [x] 4.2 En `README.md`, añadir una sección corta "Versión de prueba" que explique cómo obtener el instalador, que no está firmado (aviso de SmartScreen) y que no es la distribución oficial. Verificar que `npx prettier --check README.md` pasa.

## 5. Verificación en una máquina limpia (Fredo y Claude)

- [ ] 5.1 Instalar `Ahora-Setup-prueba.exe` en una máquina o entorno limpio (Windows Sandbox o una VM) con un usuario sin permisos de administrador. Verificar: instala sin pedir credenciales, abre con el ícono propio, y la agenda se crea en `%LOCALAPPDATA%\Ahora`.
- [ ] 5.2 En ese entorno verificar que la X esconde en la bandeja, que "Salir" termina sin dejar procesos, que el inicio automático activado reabre la app oculta tras reiniciar, y que una notificación del sistema aparece. Anotar si WebView2 hacía falta.
- [ ] 5.3 Instalar una segunda vez encima con la app abierta y verificar que se cierra y se actualiza conservando los ítems. Desinstalar y verificar que desaparece la carpeta de instalación y la entrada de inicio automático, y que la agenda sigue en `%LOCALAPPDATA%\Ahora`.

## 6. Instancia única y cierre del sistema (hallazgos del grupo 5)

Al probar en máquina real aparecieron dos agujeros del ciclo de vida con la app instalada:

- Abrir el `.exe` dos veces crea dos procesos (X escondida + olvido de la bandeja = N iconos y avisos duplicados; se vieron 106). Nada lo impedía.
- Desinstalar o reinstalar con la app corriendo (escondida) falla: el manejador de cierre veta TODO cierre que no sea la X, incluido el que pide el instalador al actualizar y el que pide Windows al apagar. Reproducido: desinstalar deja 31 archivos huérfanos sin desinstalador, y reinstalar muestra el diálogo de "no pudo cerrar las aplicaciones".

- [x] 6.1 En `shell/main.py`, impedir la segunda instancia con un mutex con nombre (`Local\...`, derivado de `DATA_DIR` para que desarrollo e instalada puedan convivir pero dos iguales no). La segunda termina en silencio antes de tocar nada. Verificar lanzando el `.exe` dos veces: un solo proceso.
- [x] 6.2 En `shell/main.py`, dejar pasar los cierres que no son del usuario: un manejador `FormClosing` sobre `window.native` que pone `Cancel = False` cuando `CloseReason != UserClosing` (apagado, reinicio, instalador). La X sigue escondiendo igual. Verificar reinstalando y desinstalando con la app corriendo: sin diálogo de error y sin archivos huérfanos.
- [x] 6.3 Tests: `test_quit.py` cubre el manejador con `CloseReason` simulado (sistema pasa, usuario cancela); `test_single.py` cubre que la segunda instancia termina. Verificar con `npm run ci shell`.
