# Design

## Context

La aplicación esconde la ventana al pulsar la X: en `shell/main.py`, `main()` registra `window.events.closing += on_closing`, y `on_closing` hace `window.hide()` y devuelve `False`. En pywebview, devolver `False` desde un manejador de `closing` cancela el cierre.

"Salir" (el menú de la bandeja, vía `Tray._handle_quit`, y `Api.quit()` de Ajustes) llama a `_quit_app()`, que recorre `webview.windows` y llama a `window.destroy()`. Ver proposal.md para el síntoma.

## Causa raíz (verificada)

`window.destroy()` no cierra la ventana a la fuerza. En el backend de Windows de pywebview (`webview/platforms/winforms.py`) hace `Form.Close()`, que dispara `FormClosing` → `BrowserView.on_closing` → `self.closing.set()`, que ejecuta **todos** los manejadores registrados. Nuestro `on_closing` es uno de ellos: esconde la ventana y devuelve `False`, y pywebview responde con `args.Cancel = True`. El cierre se cancela, `webview.start()` nunca vuelve y el proceso sigue.

El manejador no puede distinguir "el usuario pulsó la X" de "la aplicación quiere terminar": ambos llegan como el mismo evento. El comentario de `_quit_app` ("Destruir la última ventana es lo que hace que `webview.start()` vuelva") es cierto, pero asume que el cierre no será vetado.

Reproducido en una copia aislada de la app: tras "Salir de Ahora" la ventana pasa a no visible pero los procesos siguen (2 de 2). El botón de Ajustes y el menú de la bandeja fallan igual porque comparten `_quit_app`.

## Goals / Non-Goals

**Goals:**

- Que "Salir" termine el proceso, desde la bandeja y desde Ajustes, con la ventana visible o escondida.
- Que la X siga escondiendo.
- Que el camino de salida tenga un test, porque su ausencia es por qué el fallo llegó a `main`.

**Non-Goals:**

- Cambiar el comportamiento de la X ni del menú de la bandeja.
- Cualquier cambio en el frontend o en la base de datos.

## Decisions

**1. Una bandera `_quitting` (un `threading.Event` a nivel de módulo) que `_quit_app` levanta antes de destruir.**
El manejador de cierre, si la bandera está levantada, devuelve `True` y no esconde nada: el cierre sigue y `webview.start()` vuelve. Si no, hace lo de siempre (esconder y devolver `False`). Es un cambio de unas cinco líneas. **Probada** en una copia aislada: con la bandera, "Salir de Ahora" termina el proceso (2 procesos antes, 0 después), y el mismo manejador que usa la bandeja, invocado desde un hilo aparte, también lo termina.

Alternativas descartadas:

- `os._exit(0)` al salir: termina a la fuerza sin dejar que `finally: tray.stop()` quite el ícono de la bandeja (queda un ícono fantasma) y sin cierre ordenado.
- Quitar el manejador (`window.events.closing -= on_closing`) justo antes de destruir: también funciona, pero obliga a que `_quit_app` conozca la referencia del manejador, que hoy es una función anidada; la bandera no necesita eso.

**2. El manejador de cierre se saca de `main()` a una función de módulo que se construye con la ventana.**
Algo como `make_close_handler(window)`. Hoy es un cierre anidado dentro de `main()` y por eso no se puede probar sin abrir una ventana. Como función de módulo se prueba con una ventana falsa que solo tenga `hide()`.

**3. Dos niveles de prueba.**

- `shell/test_quit.py` (en CI): con una ventana falsa comprueba que sin la bandera el manejador esconde y devuelve `False`, que con la bandera no esconde y devuelve `True`, y que `_quit_app()` levanta la bandera.
- `shell/smoke_quit.py` (manual, abre una ventana, no entra en CI como `smoke_test.py`): abre una ventana con el mismo manejador, llama a `_quit_app()` desde un hilo y comprueba que `webview.start()` vuelve en pocos segundos.

## Risks / Trade-offs

- [La bandera nunca se baja] → No hace falta: tras levantarla el proceso termina. Si algún día "Salir" tuviera que poder cancelarse, habría que bajarla; hoy no es un requisito.
- [Windows al apagarse o cerrar sesión] → El mismo manejador cancela cualquier cierre, incluido el que pide Windows al apagar o cerrar sesión, y podría salir el aviso de que la aplicación impide el apagado. **No se ha verificado** (probarlo apaga el equipo) y queda fuera de este cambio; si se confirma, sería un cambio aparte, que distinga el motivo del cierre.
- [La prueba de punta a punta abre una ventana] → Igual que `smoke_test.py`: se ejecuta a mano y no entra en `npm run ci`.

## Open Questions

- ¿Conviene que "Salir" pida confirmación? Hoy no la pide y no es parte de este cambio; se puede decidir más adelante sin tocar el spec.
