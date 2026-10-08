# Design

## Context

Hoy cuatro sitios calculan su ruta relativa a su propio archivo: `shell/db.py` (`DB_PATH`, junto al código), `shell/main.py` (`DIST_DIR`, `crash.log`) y `shell/tray.py` (`ICON_PATH`). Eso asume que la app corre desde el repo. Ver proposal.md para la motivación y el alcance de prueba.

Una prueba corta, fuera del repo, con PyInstaller 6.22.3 en modo carpeta demostró lo siguiente (con Python 3.14, `pythonnet` 3.2.0 y `dist/` y `assets/` copiados a mano junto al `.exe`): la ventana abre con el ícono propio, la interfaz carga, el puente responde, la bandeja muestra el ícono y "Salir" termina el proceso. Esa prueba **no** cubrió: la X que esconde, el arranque con `--hidden`, las notificaciones, WebView2 ausente ni `pythonnet` 3.1.0, que es lo que fija el proyecto.

`shell/autostart.py` ya contempla el modo empaquetado: con `sys.frozen` registra `"<exe>" --hidden`. No hay que tocarlo, solo comprobarlo con un test.

## Goals / Non-Goals

**Goals:**

- Que la app empaquetada guarde sus datos en `%LOCALAPPDATA%\Ahora` y no pierda la agenda al actualizar.
- Un solo comando para empaquetar y otro para el instalador, repetibles desde cero.
- Que el modo de desarrollo y los tests existentes no cambien de comportamiento.

**Non-Goals:**

- Distribución oficial: firma de código, actualización automática, publicación, CI de empaquetado.
- Migrar automáticamente la agenda de desarrollo (`shell/agenda.db`) a la instalada.
- Otras plataformas.

## Decisions

**1. Un módulo `shell/paths.py` con dos conceptos: recursos y datos.**
`RESOURCE_DIR` es la raíz de solo lectura que contiene `dist/` y `assets/`: la raíz del repo en desarrollo y `sys._MEIPASS` empaquetado. `DATA_DIR` es donde se escribe: `shell/` en desarrollo (así `shell/agenda.db` y los tests siguen igual) y `%LOCALAPPDATA%\Ahora` empaquetado. La lógica va en una función pura que recibe `frozen`, `meipass`, `localappdata` y la raíz del repo, para probarla sin congelar nada. Se descarta dejar los datos junto al `.exe`: en una instalación en `Program Files` no se puede escribir, y una actualización los borraría.

**2. Un override `AHORA_DATA_DIR` (variable de entorno) para los datos.**
Permite probar la app empaquetada, o probarla en una máquina de pruebas, sin tocar el `%LOCALAPPDATA%` real. Es una sola línea en `paths.py` y no cambia el comportamiento por defecto.

**3. `db.py`, `main.py` y `tray.py` piden las rutas a `paths`.**
`db.DB_PATH` sigue siendo una variable de módulo (ahora con valor `paths.DATA_DIR / "agenda.db"`), porque `test_db.py` la sobrescribe. `main()` crea `DATA_DIR` si no existe antes de `db.migrate()`. El `crash.log` va a `DATA_DIR`: en una instalación la carpeta del código no es escribible, justo cuando más hace falta ese registro.

**4. PyInstaller en modo carpeta (`--onedir`), con los datos dentro vía `--add-data`.**
`dist/` y `assets/` viajan dentro del paquete y `paths.py` los encuentra por `sys._MEIPASS`; no se copian a mano. Se descarta `--onefile`: descomprime en cada arranque (más lento) y dispara con más frecuencia los falsos positivos de los antivirus. Sin `.spec` en el repo: los argumentos viven en `scripts/package.mjs`, y las salidas van a `build/`, ignorado por git.

**5. Instalación por usuario con Inno Setup.**
`PrivilegesRequired=lowest` e instalación en `%LOCALAPPDATA%\Programs\Ahora`: no pide administrador, no hay problemas de permisos y el usuario puede desinstalar sin elevar. `CloseApplications` cierra la app si está abierta al actualizar. Al desinstalar se borra la entrada `Run\Ahora` del registro (la escribe la propia app al activar el autostart) y no se toca `%LOCALAPPDATA%\Ahora`. El nombre y la versión incluyen "prueba". Inno Setup es una herramienta de la máquina de quien construye, no una dependencia del repo.

**6. Dependencias fijadas (autorizadas por Fredo).**
`pythonnet` y `clr_loader` se fijan en `shell/requirements.txt` a las versiones que hoy tiene el entorno del proyecto (3.1.0 y 0.3.1, a confirmar con `pip freeze`), porque `pywebview` las trae sin fijar y el build debe ser reproducible. PyInstaller va en `shell/requirements-dev.txt` (que incluye `-r requirements.txt`) para que la app en sí no cargue con una herramienta de construcción. Como la prueba previa usó `pythonnet` 3.2.0, el build se vuelve a probar con 3.1.0.

**7. El empaquetado no entra en `npm run ci`.**
Es lento y necesita herramientas externas. Lo que sí entra es `test_paths.py`.

**8. El instalador mata la app antes de tocar archivos (taskkill), además del cierre elegante.**
El cierre elegante vía Restart Manager a veces no termina la app (el teardown de WebView2 se cuelga de forma intermitente: verificado tres veces con log de Inno) y sin red de seguridad la instalación se clava en el diálogo de "no pudo cerrar" o el desinstalador deja archivos bloqueados huérfanos (reproducido: 31 archivos sin desinstalador). El taskkill va en `ssInstall` y `usUninstall`, antes que Restart Manager. No hay estado sin guardar que perder: todo va a SQLite al momento, igual que matar desde el Administrador de tareas.

## Risks / Trade-offs

- [`pythonnet` 3.1.0 congelado no se ha probado] → Es la primera tarea de empaquetado; si falla, la alternativa es fijar 3.2.0 (la que ya funcionó) y actualizar el pin.
- [SmartScreen y antivirus avisan de un `.exe` sin firmar] → Esperado en una versión de prueba; el modo carpeta reduce los falsos positivos. La firma se evalúa en la distribución oficial.
- [WebView2 podría faltar en un Windows 10 viejo] → Windows 11 lo trae; en la máquina limpia se comprueba y, si falta, se documenta el requisito en vez de empaquetar el instalador de WebView2.
- [Existen dos agendas, la de desarrollo y la instalada] → Es intencional y no se migra; se documenta cómo copiar `shell/agenda.db` a `%LOCALAPPDATA%\Ahora` a mano.
- [La carpeta de datos nueva no tiene la protección del repo] → Contiene solo la agenda local del usuario, igual que `shell/agenda.db` hoy.

## Open Questions

- ¿Qué hacer si se instala una versión con un esquema de base de datos más viejo que el de la agenda guardada? No ocurre mientras las migraciones sean solo hacia adelante y se instale siempre una versión más reciente; se decide en la distribución oficial.
