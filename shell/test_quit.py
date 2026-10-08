"""Check manual: python test_quit.py

Verifica la lógica de cierre sin abrir ninguna ventana. Un solo manejador con
la razón a la vista (`main.make_close_handler`): la X esconde, todo lo demás
pasa.

El contexto que justifica cada caso:

- Sin este manejador, cerrar la ventana mataría el proceso y con él el motor
  de avisos. Con él pero vetando todo (como hacía la primera versión), "Salir"
  no terminaba, el instalador mostraba "no pudo cerrar las aplicaciones" y
  desinstalar con la app corriendo dejaba archivos huérfanos sin desinstalador.
- `CloseMainWindow` de PowerShell (y "Finalizar tarea") llega como
  `TaskManagerClosing`, no como `UserClosing`: también pasa, que es lo
  correcto. Para simular la X de verdad hay que mandar `WM_SYSCOMMAND` con
  `SC_CLOSE` (verificado a mano con sonda Win32).
- Suscribir por `window.events.closing` de pywebview veta `WM_QUERYENDSESSION`
  (verificado con sonda: sin esa suscripción la query se acepta, con ella se
  veta). Por eso el manejador va directo al Form y `main()` nunca toca
  `events.closing`.
"""

import main

# `System` existe tras `import clr` más la referencia a WinForms (igual que
# hace pywebview).
import clr  # noqa: F401

clr.AddReference("System.Windows.Forms")
from System.Windows.Forms import CloseReason


class _FakeWindow:
    def __init__(self):
        self.hidden = 0

    def hide(self):
        self.hidden += 1


class _FakeArgs:
    def __init__(self, reason):
        self.CloseReason = reason
        self.Cancel = False


# 1. La X esconde y cancela (sin bandera).
main._quitting.clear()
falsa = _FakeWindow()
manejador = main.make_close_handler(falsa)
assert manejador is not None, "en Windows el manejador debe existir"
manejador(None, _FakeArgs(CloseReason.UserClosing))
assert falsa.hidden == 1, "la X debe esconder la ventana"
print("   ok  X del usuario: esconde y cancela")

# 2. Con la bandera ("Salir") pasa TODO, incluso la X: `destroy()` desde otro
#    hilo llega con motivo `UserClosing` igual que la X, así que la razón sola
#    no distingue y hace falta la bandera. Se limpia al terminar porque es
#    global al módulo.
main._quitting.set()
try:
    otra = _FakeWindow()
    args = _FakeArgs(CloseReason.UserClosing)
    args.Cancel = True
    main.make_close_handler(otra)(None, args)
    assert args.Cancel is False, "con la bandera hasta la X debe pasar"
    assert otra.hidden == 0, "con la bandera no se esconde"
    print("   ok  con la bandera (Salir): pasa sin esconder")
finally:
    main._quitting.clear()

# 3. `_quit_app()` levanta la bandera. Con `webview.windows` vacío no hay nada
#    que destruir, así que no abre ni cierra nada de verdad.
assert main._quitting.is_set() is False
main._quit_app()
assert main._quitting.is_set() is True, "_quit_app() debe levantar _quitting"
main._quitting.clear()
print("   ok  _quit_app() levanta la bandera")

# 2. El sistema pasa (apagado, reinicio, instalador) y lo programático también
#    (`destroy()` de "Salir" cierra con motivo None). `CloseReason.None` no se
#    puede escribir con punto en Python (`None` es palabra reservada): se lee
#    con getattr, que es lo que vale en tiempo de ejecución también.
motivos_que_pasan = [
    CloseReason.WindowsShutDown,
    CloseReason.ApplicationExitCall,
    CloseReason.TaskManagerClosing,
    CloseReason.FormOwnerClosing,
    CloseReason.MdiFormClosing,
    getattr(CloseReason, "None"),
]
for motivo in motivos_que_pasan:
    args = _FakeArgs(motivo)
    args.Cancel = True  # el veto que habría que levantar
    main.make_close_handler(_FakeWindow())(None, args)
    assert args.Cancel is False, f"motivo {motivo} debe pasar"
print("   ok  sistema y programático: pasan (incluido TaskManager)")

# 3. La suscripción espera al Form y a su handle. `window.native` se asigna
#    antes de que la ventana exista, y suscribir sin handle pierde la carrera
#    a veces sí y a veces no (intermitente). Se prueba `_try_subscribe`
#    directo, sin hilos: sin Form, con Form sin handle, y con handle.


class _FakeEvents:
    def __init__(self):
        self.handlers = []

    def __iadd__(self, h):
        self.handlers.append(h)
        return self


class _FakeForm:
    def __init__(self):
        self.FormClosing = _FakeEvents()
        self._handle = False

    @property
    def IsHandleCreated(self):
        return self._handle


class _FakeWindow2:
    def __init__(self, form):
        self.native = form


assert main._try_subscribe(_FakeWindow2(None), manejador) is False
print("   ok  sin Form: no suscribe")

form = _FakeForm()
ventana = _FakeWindow2(form)
assert main._try_subscribe(ventana, manejador) is False
assert form.FormClosing.handlers == [], "suscribió sin handle (ahí pierde la carrera)"
print("   ok  con Form sin handle: no suscribe")

form._handle = True
assert main._try_subscribe(ventana, manejador) is True
assert len(form.FormClosing.handlers) == 1, "no suscribió con handle listo"
print("   ok  con handle: suscribe")

print("OK: la X esconde y todo lo demás pasa")
