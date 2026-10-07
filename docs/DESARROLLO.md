# Desarrollo

Todo lo técnico de Ahora: stack, cómo levantarla, cómo está organizada y cómo se prueba. Para la visión del producto, ver [FILOSOFIA.md](FILOSOFIA.md); para ramas y commits, [CONTRIBUTING.md](../CONTRIBUTING.md).

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

## Levantarla

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

`npm run app:dev` es `main.py --dev`. El flag importa: **sin él, si hay un `dist/` de una compilación anterior, la app sirve ese build viejo** y se vería código que ya no es. Con `--dev` se ignora `dist/` y se apunta al dev server sí o sí.

Los tres comandos, según qué quieras abrir:

```bash
npm run app:dev    # contra el dev server (desarrollo, con hot-reload)
npm run app        # contra dist/ si existe; si no, contra el dev server
npm run app:build  # compila y abre la app real
```

## Estructura

```
app-ahora/
├─ src/                      # frontend React
│  ├─ lib/
│  │  ├─ db.ts               # acceso a datos (delega en el shell)
│  │  ├─ pywebviewApi.ts     # el puente hacia Python
│  │  ├─ avisoEngine.ts      # cuándo y cómo avisar
│  │  ├─ zones.ts            # partición de ítems por zona
│  │  ├─ recurrence.ts       # mezcla de ocurrencias con ítems reales
│  │  └─ system.ts           # autostart y cierre de la app
│  ├─ routes/                # Ahora, Semana, Ajustes
│  └─ components/            # incluye la captura rápida (CapturaModal)
├─ shell/                    # el shell de escritorio, en Python
│  ├─ main.py                # ventana, bandeja, y qué servir
│  ├─ db.py                  # esquema y operaciones sobre SQLite
│  ├─ recurrence.py          # en qué días dispara cada regla
│  ├─ autostart.py           # registro de Windows
│  ├─ tray.py                # ícono de bandeja y notificaciones
│  └─ test_*.py              # checks del shell (scripts con assert, no pytest)
├─ scripts/ci.mjs            # `npm run ci`: todo en verde con un comando
├─ assets/icon.ico           # el ícono: ventana, barra de tareas y bandeja (7 tamaños)
├─ public/ahora-*.svg        # el ícono (ahora-icon) y la marca sin fondo (ahora-mark): fuente editable
└─ docs/                     # FILOSOFIA.md (el documento norte) y esta guía
```

### El puente

El frontend **no habla con el sistema operativo**: todo pasa por `window.pywebview.api`, que expone los métodos de `Api` en `shell/main.py`.

```ts
// src/lib/db.ts
import { getApi } from "./pywebviewApi";

const api = await getApi(); // espera al evento pywebviewready
return api.list_items(); // lo resuelve shell/db.py contra SQLite
```

`getApi()` no resuelve de inmediato: pywebview inyecta `window.pywebview` de forma asíncrona, así que el puente espera el evento `pywebviewready`. Por eso cualquier código que use la base tiene que estar detrás de ese `await` — si no, `api` es un objeto vacío y la llamada falla.

Para añadir un método al puente hay que tocar tres sitios: `Api` en `shell/main.py`, la interfaz `PywebviewApi` en `src/lib/pywebviewApi.ts` y, si es de datos, su función en `src/lib/db.ts`.

### El ícono

Un único archivo, `assets/icon.ico`, sirve a la bandeja (`shell/tray.py`) y a la ventana y la barra de tareas (`webview.start(icon=...)` en `shell/main.py`). Tiene que incluir los siete tamaños 16, 24, 32, 48, 64, 128 y 256 px, y `test_tray.py` lo exige.

Las fuentes editables son `public/ahora-icon.svg` (con fondo, también es el favicon) y `public/ahora-mark.svg` (la marca sin fondo). El `.ico` viene pre-renderizado desde ellas: **no hay un script que lo regenere**, así que si se cambia el SVG hay que volver a exportar el `.ico` a mano.

## Tests

Todo se verifica con un comando:

```bash
npm run ci          # lint, vitest, build y los test_*.py del shell
npm run ci shell    # o una sola parte: lint | test | build | shell
```

**Frontend** (Vitest, lógica pura): `npm test` corre todos y `npm run test:watch` queda escuchando.

- `avisoEngine.test.ts` — el motor de avisos: cortesía, al-filo, vencida con techo de reintentos, pospón, seguimiento con techo diario y el back off parcial de "empezada". La lógica más delicada de la app.
- `zones.test.ts` — particionado de zonas, backlog vs seguimiento, días abiertos.
- `parseQuickCapture.test.ts` — el parser de captura rápida.
- `formatTime.test.ts` — formato de fechas (el contrato de hora local).
- `recurrence.test.ts` — merge de ocurrencias y excepciones.

**Shell** (scripts sueltos con `assert`, no pytest; `npm run ci` recoge cualquier `shell/test_*.py` nuevo):

- `test_db.py` — el CRUD completo contra una DB temporal.
- `test_recurrence.py` — el cálculo de ocurrencias.
- `test_autostart.py` — el comando de arranque (lo único testeable sin tocar el registro real).
- `test_tray.py` — que la bandeja tenga lo que necesita y degrade en silencio.
- `test_serve.py` — que el build se sirva bien (ver `shell/main.py`).
- `test_quit.py` — que el manejador de cierre distingue la X de "Salir" (ver `shell/main.py`: `_quitting`).

Los que **no** entran en `npm run ci`, porque abren una ventana:

```bash
shell\.venv\Scripts\python shell\smoke_test.py
shell\.venv\Scripts\python shell\smoke_quit.py
```

`smoke_test.py` es el único que comprueba que las piezas están **pegadas**: que pywebview inyectó `window.pywebview.api`, que los nombres de los métodos existen y que los argumentos y retornos hacen el viaje completo. Los otros pueden pasar todos y la app seguir en blanco. Crea un ítem de prueba contra la agenda real y lo borra al final, así que no lo ejecutes sin querer.

`smoke_quit.py` comprueba que `_quit_app()` termina el proceso de verdad: abre una ventana con el manejador de cierre, lo llama desde un hilo y verifica que `webview.start()` vuelve en menos de 15 segundos. Sin la bandera `_quitting` no vuelve: un vigilante lo detecta a los 15 segundos, imprime el fallo y termina con código 1.

> El smoke test no usa `evaluate_js` para traer resultados, porque no sirve: resuelve la promesa, pero el valor no vuelve (llega un `{}` vacío). En su lugar, el JS pasa cada resultado a `Api.resultado`, un sumidero en Python — que además es la dirección que la app usa de verdad.

## Plataformas soportadas

Por ahora **la línea oficial es Windows**: es donde se compila, se prueba y se usa el alpha.

Es también la única plataforma sin sorpresas: el shell usa el WebView2 de Windows, el autostart escribe en el registro, y la bandeja y las notificaciones salen de la API de Windows que expone `pystray`. En Linux y macOS la app funciona (pywebview las soporta) pero el autostart no hace nada y la bandeja depende de que haya un host de notificaciones del escritorio.

**Linux no está en soporte.** Un intento anterior encontró errores críticos de bandeja y de comportamiento en segundo plano. La causa de fondo sigue siendo la misma —no hay un estándar de bandeja en Linux, cada escritorio tiene el suyo— y la única máquina Linux disponible es de pruebas puntuales, no un entorno de desarrollo real. No se va a anunciar soporte hasta poder desarrollar y depurar esa plataforma en serio.

### Empaquetado

Hay instalador **de prueba** (no distribución oficial): `npm run package` compila la interfaz y empaqueta la app con PyInstaller (modo carpeta) en `build/package/Ahora/Ahora.exe`; `npm run installer` lo envuelve con Inno Setup en `build/installer/Ahora-Setup-prueba.exe`. Las salidas van a `build/`, ignorado por git.

Requiere las dependencias de construcción (PyInstaller no va en el venv de la app):

```bash
shell\.venv\Scripts\pip install -r shell\requirements-dev.txt
```

La app empaquetada guarda sus datos en `%LOCALAPPDATA%\Ahora`, no junto al `.exe`: una actualización no borra la agenda. En desarrollo sigue todo igual (`shell/agenda.db`). Para probar sin tocar nada real, `AHORA_DATA_DIR` apunta los datos a otra carpeta.

Si venís de desarrollo y querés llevarte tu agenda a la instalada, copiá `shell/agenda.db` a `%LOCALAPPDATA%\Ahora\agenda.db` a mano (no hay migración automática, a propósito).

El instalador no está firmado: SmartScreen va a avisar. Es esperado en una versión de prueba.

## Estrategia de ramas por plataforma

`main` es la única fuente de verdad y la línea oficial (Windows). Las diferencias entre sistemas operativos se resuelven **dentro de `main`** — con `sys.platform` en `shell/autostart.py` — no con una rama por plataforma que viva para siempre.

Las ramas tipo `Linux_dev` son **temporales**: sirven para explorar o arreglar algo específico de una plataforma (p. ej. la bandeja y el comportamiento en segundo plano en Linux) sin tocar `main` mientras está roto. Una vez que funciona, se fusiona de vuelta a `main` y se borra. No se mantienen como "ecosistemas paralelos": menos ramas significa menos aislamiento a corto plazo, pero mucha menos deuda de sincronización a largo plazo.

El flujo de ramas, commits y PRs del día a día está en [CONTRIBUTING.md](../CONTRIBUTING.md).
