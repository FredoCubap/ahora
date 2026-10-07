# Design

## Context

Hoy hay tres sitios donde el sistema muestra un ícono de Ahora, y los tres están mal por razones distintas:

- **Bandeja y notificaciones:** `shell/tray.py` carga `assets/icon.ico` con Pillow. Ese archivo es una copia del ícono por defecto de Tauri.
- **Ventana y barra de tareas:** `main.py` llama a `webview.start(debug=False)` sin ícono. En Windows, pywebview (`platforms/winforms.py`) cae a extraer el ícono de `sys.executable`, es decir el de Python.
- **Favicon y `public/`:** `index.html` apunta a `/vite.svg`, y `public/` guarda `tauri.svg` sin uso.

El pack de Fredo trae `ahora-icon.svg` (con fondo), `ahora-mark.svg` (sin fondo) y `ahora-icon.ico` con siete resoluciones (16 a 256). Ver proposal.md para la motivación.

## Goals / Non-Goals

**Goals:**

- Un único ícono, el de Ahora, en bandeja, ventana, barra de tareas y favicon.
- Dejar los SVG en el repo como fuente editable para la personalización futura.

**Non-Goals:**

- Recolorear el ícono desde la app o generarlo en caliente: eso pertenece al cambio de personalización, que decidirá cómo rasterizar (ver Open Questions).
- Regenerar el `.ico` desde el SVG: el pack ya lo trae renderizado.
- El ícono del instalador y del `.exe`: todavía no hay empaquetado.

## Decisions

**1. El `.ico` conserva su nombre y su ruta (`assets/icon.ico`).**
`tray.ICON_PATH` ya apunta ahí, así que la bandeja cambia sin tocar código y `test_tray.py` sigue siendo la red de seguridad. Se descarta renombrarlo a `ahora-icon.ico`: obligaría a tocar el shell, el test y la documentación a cambio de nada.

**2. La ventana recibe el mismo archivo con `webview.start(icon=...)`.**
La documentación de pywebview dice que `icon` solo vale en GTK y Qt, pero el código de Windows de la versión que usamos (6.2.1, fijada en `requirements.txt`) sí lo aplica a `Form.Icon` cuando el archivo existe. Se usa `tray.ICON_PATH` como única fuente, para que bandeja y ventana no puedan divergir. Alternativa descartada: poner `window.native.Icon` a mano desde un hilo de UI; es más código y más frágil que un parámetro que ya existe.

**3. Los SVG viven en `public/`, no en `assets/`.**
Vite sirve y empaqueta `public/` tal cual, así el favicon y, más adelante, un componente de React pueden usarlos sin copiar archivos. `assets/` queda para lo que consume el shell (el `.ico`). El README también los referencia desde ahí.

**4. El favicon es `ahora-icon.svg` (con fondo), no la marca.**
En una pestaña de navegador (solo se ve con `npm run dev`) la marca sin fondo desaparece sobre fondos claros; el ícono con su cuadrado oscuro se ve siempre.

**5. El test de la bandeja exige las resoluciones, no solo "alguna chica".**
`test_tray.py` hoy acepta cualquier `.ico` con una resolución de 32 o menos. Pasa a exigir los siete tamaños del spec (16, 24, 32, 48, 64, 128 y 256). Así el test distingue el ícono nuevo del de Tauri, al que le falta el de 128, y nadie puede volver a poner un `.ico` incompleto sin enterarse.

## Risks / Trade-offs

- [Windows cachea íconos de bandeja y de barra de tareas, así que tras el cambio puede seguir viéndose el anterior] → Reiniciar la app (y, si hiciera falta, el Explorador de Windows) antes de dar la comprobación visual por fallida.
- [La barra de tareas agrupa por proceso, y podría seguir mostrando el ícono de Python aunque la ventana ya tenga el suyo] → Se comprueba con una captura de la barra de tareas; si pasa, se fija un identificador de aplicación explícito (AppUserModelID) y se repite. Está como pregunta abierta porque solo se sabe al probar.
- [El parámetro `icon` de Windows no está documentado] → La versión está fijada y la comprobación visual de la ventana forma parte de las tareas; si una versión futura de pywebview lo ignorara, esa comprobación lo detectaría.

## Open Questions

- ¿Cómo se rasteriza el ícono cuando el usuario cambie los colores? Hay que elegir entre sumar una dependencia que lea SVG (por ejemplo `cairosvg`), dibujar los trazos con Pillow o pre-renderizar un conjunto de variantes. No afecta a este cambio y se decide en el de personalización.
