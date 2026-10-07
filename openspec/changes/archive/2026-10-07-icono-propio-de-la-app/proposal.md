# Proposal

## Why

Ahora todavía no tiene cara propia en el sistema. La bandeja muestra el logo por defecto de Tauri (`assets/icon.ico` es una copia del que traía `src-tauri/`), la barra de título y la barra de tareas muestran el ícono de Python (pywebview, sin un ícono explícito, extrae el de `python.exe`), y el proyecto arrastra dos logos de otras herramientas en `public/` (`tauri.svg` y `vite.svg`). Para una app que vive en la bandeja y avisa, el ícono es lo que el usuario ve todo el día. Fredo ya tiene el ícono definitivo (un pack con SVG y `.ico`), así que ahora es cuando ponerlo.

## What Changes

- El ícono de Ahora (una "A" geométrica con una flecha ámbar) reemplaza al de Tauri en la bandeja y en las notificaciones.
- La ventana y la barra de tareas muestran el mismo ícono, en vez del de Python.
- Los SVG del pack (el ícono completo y la marca sin fondo) entran al repo como fuente editable, para la futura personalización de la interfaz.
- Se eliminan `public/tauri.svg` y `public/vite.svg`, y el favicon de `index.html` pasa a ser el ícono de Ahora.
- El README muestra el ícono en el encabezado, y deja de listar "ícono propio" como pendiente.
- Se amplía el test de la bandeja para que exija las resoluciones que Windows necesita.

No cambia ningún dato, ninguna pantalla ni el comportamiento de los avisos.

## Capabilities

### New Capabilities

- `identidad-de-la-app`: cómo se presenta Ahora en el sistema operativo (la ventana, la barra de tareas y la bandeja). Este cambio fija el requisito del ícono propio; la personalización del ícono por usuario se añade a esta misma capacidad más adelante.

### Modified Capabilities

<!-- Ninguna: openspec/specs/ no tiene capacidades previas. -->

## Impact

- `assets/icon.ico`: se reemplaza por el del pack (mismo nombre, así que `shell/tray.py` no cambia).
- `shell/main.py`: pasa el ícono a `webview.start(...)` para la ventana.
- `shell/test_tray.py`: exige los siete tamaños del spec (16, 24, 32, 48, 64, 128 y 256 px); al ícono de Tauri le falta el de 128.
- `public/`: entran `ahora-icon.svg` y `ahora-mark.svg`; salen `tauri.svg` y `vite.svg`.
- `index.html`, `README.md`, `docs/DESARROLLO.md`: favicon y documentación.
- Sin dependencias nuevas.
- Fuera de alcance: recolorear el ícono desde la app (pertenece al cambio de personalización), regenerar el `.ico` a partir del SVG (el pack ya trae el `.ico` renderizado) y el ícono del instalador, que no existe todavía.
