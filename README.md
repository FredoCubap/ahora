<div align="center">

# Ahora

### Tu agenda no debería esperar a que la abras.

**Ahora** es una agenda personal de escritorio que te habla:
_"esto ahora"_ · _"en 20 minutos, esto"_ · _"esto se te venció"_.

Nada de tableros que consultas. Nada de listas que se pudren.
Solo la pregunta que importa: **¿qué toca ahora?**

<sub>Hecho con Python · pywebview · React · SQLite local · sin servidor · sin cuentas · sin nube</sub>

</div>

---

## Por qué existe

Las agendas normales son pasivas: están ahí _si te acuerdas de abrirlas_. Y en una
oficina, con quince cosas a la vez, no te acuerdas.

**Ahora** invierte eso. Es una voz activa que te da un toque en el momento justo y
te deja responder en dos segundos:

> **Hecho** · **Pospón 10 min** · **Hoy no**

Y como cualquiera que interrumpe demasiado acaba en silencio, **Ahora** se toma en
serio _cuándo_ hablar: avisa de poco, avisa bien, y cuando algo se vence te da tres
toques y se rinde con dignidad. Nunca fuera de tu horario laboral.

## Qué es

- 📌 **Agenda + tareas en una.** Una cita ocurre a una hora; una tarea hay que
  terminarla _antes de_ una hora. **Ahora** entiende la diferencia sin que tengas
  que elegir "tipo" en ningún menú.
- 🔁 **Tareas recurrentes que no creas a mano.** Defines la regla una vez
  ("revisar correo cada día a las 9") y aparece sola. Si un día no la haces,
  **no se acumula**: mañana hay otra y punto. La culpa acumulada es ansiedad, no
  productividad.
- ⚡ **Crear algo cuesta segundos.** El objetivo es escribir una línea y que la app
  haga el resto.
- 🔒 **Todo local.** Tus datos viven en un SQLite en tu máquina. Cada quien con su
  agenda. No se comparte nada, no hay servidor que se caiga, no hay cuenta que crear.

## Qué NO es

No es un gestor de proyectos. No es una herramienta de equipo. No es control de
horas ni facturación. No es un CRM ni una bandeja de correo. No es tu segundo
cerebro. Hace **una cosa** y la hace sin estorbar.

## La pantalla principal: _Ahora y a continuación_

Una sola lista, ordenada por tiempo, con tres zonas:

```
┌─────────────────────────────────────────┐
│  🔴 VENCIDAS                             │
│     Enviar informe semanal   ·  11:00   │
├─────────────────────────────────────────┤
│  AHORA / PRÓXIMAS 3 H                    │
│     Llamada con proveedor    ·  15:30   │
│     Preparar sala reunión    ·  16:45   │
├─────────────────────────────────────────┤
│  RESTO DE HOY                            │
│     Revisar presupuesto Q4              │
└─────────────────────────────────────────┘
```

En un día normal, sin scroll. La semana, el mes y el backlog están a un clic —
nunca en primer plano.

## Estado del proyecto

🌱 **Alpha funcional.** Todo lo que describe este README anda hoy:

- ✅ Modelo `item` con tiempos opcionales (cita / tarea / ambos)
- ✅ Motor de avisos con insistencia escalonada y horario laboral
- ✅ Notificaciones nativas del sistema (vía bandeja)
- ✅ Tareas recurrentes (regla como fuente de verdad)
- ✅ Vista _Ahora y a continuación_
- ✅ Entrada rápida en una línea
- ✅ Ítems "en seguimiento" y su zona colapsada
- ✅ Ventana en bandeja, "Iniciar con el sistema", "Salir"
- ✅ `en_progreso` ("Empezar" en el menú ⋯) con back off parcial de avisos
- ✅ Tests de frontend (Vitest) y del shell

Lo que falta:

- ⬜ **Instalador distribuible.** No hay pipeline de empaquetado: la app se
  lanza con `npm run app`. Ver [Plataformas](#plataformas-soportadas).

## Filosofía

Las decisiones de fondo —qué es, qué se niega a ser, cómo se comportan los avisos
y las recurrentes, y el esquema de datos propuesto— están en
**[docs/FILOSOFIA.md](docs/FILOSOFIA.md)**. Es el documento norte: antes de añadir
una función, se comprueba que no lo contradiga.

## Stack

| Capa    | Tecnología                                                   |
| ------- | ------------------------------------------------------------ |
| Shell   | [pywebview](https://pywebview.flowrl.com) (Python)           |
| Ventana | WebView2 de Windows (Edge, ya en el sistema)                 |
| UI      | React 19 + TypeScript + Vite                                 |
| Estilos | Tailwind CSS 4 · fuentes vendorizadas (Nunito + Karla)       |
| Estado  | Zustand · validación con Zod                                 |
| Datos   | SQLite (100 % local, vía `sqlite3` de la stdlib)             |
| Sistema | Registro de Windows (autostart) · pystray (bandeja y avisos) |
| Iconos  | lucide-react                                                 |

## Desarrollo

Requisitos: [Node.js](https://nodejs.org) 20+ y [Python](https://python.org) 3.11+.

```bash
# dependencias del frontend
npm install

# dependencias del shell (una sola vez)
python -m venv shell/.venv
shell\.venv\Scripts\pip install -r shell\requirements.txt
```

Y después, dos terminales:

```bash
# 1. el frontend, con hot-reload (http://localhost:1420)
npm run dev

# 2. la app de escritorio, contra ese dev server
npm run app:dev
```

`npm run app:dev` es `main.py --dev`. El flag importa: **sin él, si hay un
`dist/` de una compilación anterior, la app sirve ese build viejo** y se vería
código que ya no es. Con `--dev` se ignora `dist/` y se apunta al dev server sí
o sí.

Los tres comandos, según qué quieras abrir:

```bash
npm run app:dev    # contra el dev server (desarrollo, con hot-reload)
npm run app        # contra dist/ si existe; si no, contra el dev server
npm run app:build  # compila y abre la app real
```

## Plataformas soportadas

Por ahora **la línea oficial es Windows** — es donde se compila, se prueba y se
usa el alpha.

Es también la única plataforma sin sorpresas: el shell usa el WebView2 de
Windows, el autostart escribe en el registro, y la bandeja y las notificaciones
salen de la API de Windows que expone `pystray`. En Linux y macOS la app
funciona (pywebview las soporta) pero el autostart no hace nada y la bandeja
depende de que haya un host de notificaciones del escritorio.

**Linux no está en soporte.** Un intento anterior encontró errores críticos de
bandeja y de comportamiento en segundo plano. La causa de fondo sigue siendo la
misma —no hay un estándar de bandeja en Linux, cada escritorio tiene el suyo— y
la única máquina Linux disponible es de pruebas puntuales, no un entorno de
desarrollo real. No se va a anunciar soporte hasta poder desarrollar y depurar
esa plataforma en serio.

### Empaquetado

**No hay instalador todavía.** No se compila un `.exe` distribuible: la app se
lanza desde el código con `npm run app`.

Lo que falta para llegar ahí, y que conviene saber antes de intentarlo:

- [PyInstaller](https://pyinstaller.org) (o similar) para armar el ejecutable.
- Incluir `assets/icon.ico` y `shell/` en el bundle.
- Verificar que `pystray` y WebView2 funcionen desde un ejecutable empaquetado,
  no desde un venv.
- Decidir si el `.exe` lleva WebView2 embebido (más pesado, funciona en
  máquinas sin él) o lo da por supuesto (Windows 10/11 ya lo trae).

Es trabajo de verdad, no un comando que falte. Por eso está listado arriba
como pendiente y no escondido en un `npm run build`.

## Estrategia de ramas

`main` es la única fuente de verdad y la línea oficial (Windows). Las
diferencias entre sistemas operativos se resuelven **dentro de `main`** — con
`sys.platform` en `shell/autostart.py` — no con una rama por plataforma que
viva para siempre.

Las ramas tipo `Linux_dev` son **temporales**: sirven para explorar o arreglar
algo específico de una plataforma (p. ej. la bandeja y el comportamiento en
segundo plano en Linux) sin tocar `main` mientras está roto. Una vez que
funciona, se fusiona de vuelta a `main` y se borra. No se mantienen como
"ecosistemas paralelos" — menos ramas significa menos aislamiento a corto
plazo, pero mucha menos deuda de sincronización a largo plazo.

## Estructura

```
app-ahora/
├─ src/                      # frontend React
│  ├─ lib/
│  │  ├─ db.ts               # acceso a datos (delega en el shell)
│  │  ├─ pywebviewApi.ts     # el puente hacia Python
│  │  ├─ avisoEngine.ts      # cuándo y cómo avisar
│  │  ├─ zones.ts            # partición de ítems por zona
│  │  └─ system.ts           # autostart y cierre de la app
│  └─ routes/                # Ahora, Semana, Mes, Ajustes, Captura
├─ shell/                    # el shell de escritorio, en Python
│  ├─ main.py                # ventana, bandeja, y qué servir
│  ├─ db.py                  # esquema y operaciones sobre SQLite
│  ├─ recurrence.py          # en qué días dispara cada regla
│  ├─ autostart.py           # registro de Windows
│  ├─ tray.py                # ícono de bandeja y notificaciones
│  └─ test_*.py              # checks manuales (no pytest)
├─ assets/icon.ico           # ícono de la app y de la bandeja
└─ docs/FILOSOFIA.md         # el documento norte
```

### El puente

El frontend **no habla con el sistema operativo**: no hay `@tauri-apps/*` ni
llamadas directas a la base. Todo pasa por `window.pywebview.api`, que expone
los métodos de `Api` en `shell/main.py`.

```ts
// src/lib/db.ts
import { getApi } from "./pywebviewApi";

const api = await getApi(); // espera al evento pywebviewready
return api.list_items(); // lo resuelve shell/db.py contra SQLite
```

`getApi()` no resuelve de inmediato: pywebview inyecta `window.pywebview` de
forma asíncrona, así que el puente espera el evento `pywebviewready`. Por eso
cualquier código que use la base tiene que estar detrás de ese `await` — si no,
`api` es un objeto vacío y la llamada falla.

## Tests

**Frontend** (Vitest, lógica pura):

```bash
npm test            # corre todos
npm run test:watch  # modo watch
```

- `avisoEngine.test.ts` — el motor de avisos: cortesía, al-filo, vencida con
  techo de reintentos, pospón, seguimiento con techo diario, y el back off
  parcial de "empezada". La lógica más delicada de la app.
- `zones.test.ts` — particionado de zonas, backlog vs seguimiento, días abiertos.
- `parseQuickCapture.test.ts` — el parser de captura rápida.
- `formatTime.test.ts` — formato de fechas (el contrato de hora local).
- `recurrence.test.ts` — merge de ocurrencias y excepciones.

**Shell** (scripts sueltos con `assert`, no pytest):

```bash
cd shell
for t in test_*.py; do .venv\Scripts\python $t || break; done
```

- `test_db.py` — el CRUD completo contra una DB temporal.
- `test_recurrence.py` — el cálculo de ocurrencias.
- `test_autostart.py` — el comando de arranque (lo único testeable sin tocar el
  registro real).
- `test_serve.py` — que el build se sirva bien (ver `shell/main.py`).

Y uno que abre una ventana:

```bash
.venv\Scripts\python smoke_test.py
```

`smoke_test.py` es el único que comprueba que las piezas están **pegadas**: que
pywebview inyectó `window.pywebview.api`, que los nombres de los métodos existen
y que los argumentos y retornos hacen el viaje completo. Los otros pueden
pasar todos y la app seguir en blanco. Crea un ítem de prueba contra la DB real
y lo borra al final.

> El smoke test no usa `evaluate_js` para traer resultados, porque no sirve:
> resolves the promise but the value doesn't come back (you get an empty `{}`).
> Instead, the JS passes each result to `Api.resultado`, a sink in Python —
> which is also the direction the app actually uses.

## Licencia

Proyecto interno. Todos los derechos reservados.
