# Tasks

## 1. Lógica de cierre con su test

- [x] 1.1 En `shell/main.py`, añadir `_quitting = threading.Event()` a nivel de módulo y levantarla en `_quit_app()` antes de recorrer `webview.windows`. Verificar con `npm run ci shell` que sigue pasando todo lo existente.
- [x] 1.2 En `shell/main.py`, sacar `on_closing` de `main()` a una función de módulo `make_close_handler(window)` que devuelva el manejador: si `_quitting` está levantada no esconde y devuelve `True`; si no, hace `window.hide()` y devuelve `False`. Registrarlo en `main()` con `window.events.closing += make_close_handler(window)`. Conservar el docstring que explica por qué la X esconde. Verificar que `python -c "import main"` desde `shell/` no falla.
- [x] 1.3 Crear `shell/test_quit.py` (en el estilo de los otros `test_*.py`, con `assert`) con una ventana falsa que solo tenga `hide()`: sin la bandera el manejador llama a `hide()` y devuelve `False`; con la bandera no llama a `hide()` y devuelve `True`; y `_quit_app()` levanta la bandera (con `webview.windows` vacío no destruye nada). Limpiar la bandera con `_quitting.clear()` al terminar. Verificar con `npm run ci shell` que el test pasa y que **falla** si se quita `_quitting.set()` de `_quit_app`.

## 2. Comprobación de punta a punta

- [x] 2.1 Crear `shell/smoke_quit.py` (manual, abre una ventana, no entra en `npm run ci`; mismo estilo que `smoke_test.py`): abre una ventana con `make_close_handler`, lanza `_quit_app()` desde un `threading.Timer` y comprueba que `webview.start()` vuelve en menos de 15 s; si no vuelve, termina con código distinto de cero. Verificar ejecutándolo con PowerShell `Start-Process` (no desde Bash, que mata las ventanas): imprime "OK" y termina. Verificar también que se queda colgado y falla si se quita `_quitting.set()` de `_quit_app`.
- [x] 2.2 Comprobar el escenario del spec "Salir con la ventana escondida": con la app abierta en una copia aislada (base de datos de demostración, sin tocar `shell/agenda.db`), pulsar la X y llamar al manejador de "Salir" de la bandeja (`tray._handle_quit`) desde un hilo; verificar que no queda ningún proceso `python` de esa copia.

## 3. Documentación

- [x] 3.1 Corregir el docstring de `_quit_app` en `shell/main.py`: debe explicar que `destroy()` pasa por el manejador de cierre y por eso hace falta la bandera. Añadir a `CLAUDE.md`, en "Trampas conocidas", que `window.destroy()` dispara `closing` y el manejador de la X lo cancela salvo que `_quitting` esté levantada. Verificar con `npx prettier --check CLAUDE.md`.
- [x] 3.2 En `docs/DESARROLLO.md`, listar `test_quit.py` entre los tests del shell y `smoke_quit.py` junto a `smoke_test.py` como "no entra en `npm run ci`". Verificar con `npx prettier --check docs/DESARROLLO.md`.

## 4. Verificación integrada

- [x] 4.1 Ejecutar `npm run ci` y verificar que queda en verde.
- [x] 4.2 Pedir a Fredo que abra la app real (`npm run app:build`), la cierre con la X, haga clic derecho en el ícono de la bandeja y elija "Salir", y confirme que el ícono desaparece de la bandeja y que no queda `python.exe` en el Administrador de tareas. Repetir con "Salir de Ahora" en Ajustes.
