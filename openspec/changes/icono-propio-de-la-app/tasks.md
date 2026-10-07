# Tasks

## 1. Recursos del ícono

- [ ] 1.1 Ampliar `shell/test_tray.py` para que exija que `assets/icon.ico` contenga las resoluciones 16, 24, 32, 48, 64, 128 y 256 px. Verificar que el test falla con el `.ico` actual (el de Tauri, al que le falta la de 128) y anotar el resultado.
- [ ] 1.2 Reemplazar `assets/icon.ico` por `ahora-icon.ico` del pack. Verificar con `npm run ci shell` que `test_tray.py` pasa con las resoluciones nuevas.
- [ ] 1.3 Copiar `ahora-icon.svg` y `ahora-mark.svg` del pack a `public/`. Verificar que ambos son SVG válidos y sin scripts ni referencias externas (`grep -iE "script|href|http"` solo debe encontrar el `xmlns`).
- [ ] 1.4 Borrar `public/tauri.svg` y `public/vite.svg`, y apuntar el favicon de `index.html` a `/ahora-icon.svg`. Verificar con `npm run build` que `dist/` contiene `ahora-icon.svg` y ya no `tauri.svg` ni `vite.svg`, y que ningún archivo del repo los referencia.

## 2. Ventana y barra de tareas

- [ ] 2.1 En `shell/main.py`, pasar `icon=str(tray_mod.ICON_PATH)` a `webview.start(...)`. Verificar con una copia aislada de la app (base de datos de demostración, sin tocar `shell/agenda.db`) y una captura de la ventana que la barra de título muestra el ícono de Ahora y no el de Python.
- [ ] 2.2 Capturar la barra de tareas con la ventana abierta y comprobar que el botón de Ahora muestra el ícono propio. Si sigue mostrando el de Python, fijar un AppUserModelID explícito al arrancar y repetir la captura.

## 3. Documentación

- [ ] 3.1 En `README.md`, mostrar `public/ahora-icon.svg` en el encabezado y quitar "Ícono propio" de la lista "Lo que falta". Verificar que la imagen resuelve (el archivo existe) y que `npx prettier --check README.md` pasa.
- [ ] 3.2 En `docs/DESARROLLO.md`, actualizar la estructura (`public/*.svg` y `assets/icon.ico`) y anotar que el `.ico` viene pre-renderizado y no hay script que lo regenere desde el SVG. Verificar que `npx prettier --check docs/DESARROLLO.md` pasa.

## 4. Verificación integrada

- [ ] 4.1 Ejecutar `npm run ci` y verificar que queda en verde.
- [ ] 4.2 Pedir a Fredo que abra la app real, la cierre con la X y confirme a ojo que el ícono de la bandeja (y el de una notificación) es el de Ahora. Si aún se ve el anterior, reiniciar la app antes de darlo por fallido.
