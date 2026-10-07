"""Check manual: python test_quit.py

Verifica la lógica de cierre sin abrir ninguna ventana: el manejador que
construye `make_close_handler` se prueba con una ventana falsa que solo tiene
`hide()`.

Lo que importa verificar, y por qué existe este test: "Salir" llama a
`window.destroy()`, pero `destroy()` no cierra a la fuerza — dispara el evento
`closing`, que ejecuta el mismo manejador de la X. Ese manejador esconde la
ventana y cancela el cierre, así que sin la bandera `_quitting` "Salir" no
termina el proceso nunca. Nada probaba el camino de salida y por eso el fallo
llegó a `main`.

Tres casos:
1. Sin la bandera: el manejador esconde (`hide()`) y devuelve False (cancela).
2. Con la bandera: no esconde y devuelve True (deja pasar el cierre).
3. `_quit_app()` levanta la bandera (con `webview.windows` vacío no destruye
   nada, así que es seguro llamarla acá).
"""

import main


class _FakeWindow:
    """Lo único del contrato que usa el manejador: `hide()`."""

    def __init__(self):
        self.hidden = 0

    def hide(self):
        self.hidden += 1


# 1. Sin la bandera: esconde y cancela.
main._quitting.clear()
falsa = _FakeWindow()
manejador = main.make_close_handler(falsa)
assert manejador() is False, "sin _quitting debe devolver False (cancelar)"
assert falsa.hidden == 1, "sin _quitting debe esconder la ventana"
print("   ok  sin la bandera: hide() + False")

# 2. Con la bandera: no esconde y deja pasar.
main._quitting.set()
try:
    otra = _FakeWindow()
    assert main.make_close_handler(otra)() is True, "con _quitting debe devolver True"
    assert otra.hidden == 0, "con _quitting no debe esconder"
    print("   ok  con la bandera: sin hide() + True")
finally:
    # La bandera es global al módulo: si quedara levantada, el manejador real
    # dejaría pasar el próximo cierre. Se baja siempre, falle o no el test.
    main._quitting.clear()

# 3. `_quit_app()` levanta la bandera. Con `webview.windows` vacío no hay nada
# que destruir, así que no abre ni cierra nada de verdad.
assert main._quitting.is_set() is False
main._quit_app()
assert main._quitting.is_set() is True, "_quit_app() debe levantar _quitting"
main._quitting.clear()
print("   ok  _quit_app() levanta la bandera")

print("OK: la lógica de cierre distingue la X de Salir")
