# CLAUDE.md

Guía para agentes que trabajan en este repositorio. Recoge solo lo que no se deduce leyendo el código.

## Proyecto

**Ahora** es una agenda personal de escritorio con voz activa: avisa en el momento justo y se responde en dos segundos. Todo es local: sin servidor, sin cuentas, sin nube. La línea oficial es Windows. El documento norte es `docs/FILOSOFIA.md`: antes de añadir una función, comprueba que no lo contradiga.

- **Shell** (`shell/`, Python): ventana con pywebview (WebView2), bandeja con pystray, SQLite con `sqlite3` de la stdlib y autostart por el registro de Windows.
- **UI** (`src/`): React 19, TypeScript, Vite, Tailwind 4, Zustand y Zod.

## Setup

```bash
npm install
python -m venv shell/.venv
shell\.venv\Scripts\pip install -r shell\requirements.txt
```

## Comandos

```bash
npm run ci          # todo en verde antes de terminar: lint, vitest, build y los test_*.py del shell
npm run ci lint     # o una sola parte: lint | test | build | shell
npm run app         # abre la app real (sirve dist/; si no hay build, cae al dev server)
npm run app:dev     # abre la app contra el dev server (requiere `npm run dev` en otra terminal)
npm run app:build   # compila y abre
npm run format      # Prettier
```

## Estructura (solo lo que no se encuentra a la primera)

- **`shell/main.py`:** punto de entrada y clase `Api`. Cada método público de `Api` queda como `window.pywebview.api.<nombre>` en JS.
- **`shell/db.py`:** esquema, migraciones y todo el CRUD. **`shell/recurrence.py`:** cálculo de las fechas de cada regla.
- **`src/lib/pywebviewApi.ts`:** el puente y su interfaz `PywebviewApi`. **`src/lib/db.ts`:** envuelve el puente para los datos (con validación de Zod).
- **El motor de avisos vive en el frontend** (`src/lib/avisoEngine.ts`, `src/hooks/useAvisoEngine.ts`), no en Python. Python solo notifica cuando se lo piden.
- **`src/store/useAppStore.ts`:** `refresh()` carga todo y combina los ítems reales con las ocurrencias virtuales de las recurrencias.
- **`openspec/`:** cambios y specs de OpenSpec. Se versiona en este repo: el `.gitignore` tiene una excepción (`!openspec/`) porque la regla global de git de Fredo (`~/.config/git/ignore`) lo ignora en el resto de sus proyectos. No la quites.

## Convenciones

- **Método nuevo en el puente:** va en tres sitios — `Api` en `shell/main.py`, la interfaz `PywebviewApi` en `src/lib/pywebviewApi.ts` y, si es de datos, su función en `src/lib/db.ts`. Los nombres son `snake_case` en el puente.
- **Migraciones append-only:** el esquema es la lista `MIGRATIONS` de `shell/db.py` y se aplica según `PRAGMA user_version`. Para cambiar la base, añade un `SCHEMA_V3` (y así); nunca edites uno ya existente.
- **Una sola entidad:** no hay "tipo cita" y "tipo tarea". El comportamiento sale de qué campos de tiempo tiene lleno el ítem.
- **Recurrencias:** la regla es la fuente de verdad y no genera filas. La fila en `item` solo existe como excepción, cuando el usuario toca esa ocurrencia.
- **Código en inglés, texto en español:** identificadores y claves en inglés; comentarios, docstrings, textos de la interfaz y commits en español.

## Trampas conocidas

- **`window.pywebview.api` existe pero está vacío (`{}`)** hasta que dispara `pywebviewready`. No basta con comprobar que `window.pywebview` exista: usa siempre `getApi()` de `pywebviewApi.ts`.
- **Lanzar la ventana desde Bash la mata al instante.** Lánzala con PowerShell `Start-Process`, o desde una terminal normal con `npm run app`.
- **Si existe `dist/`, `npm run app` sirve ese build viejo** y el hot-reload no se ve. Para desarrollar usa `npm run app:dev`.
- **La X de la ventana la esconde, no cierra la app:** sigue viva en bandeja con el motor de avisos. Lo único que termina el proceso es "Salir" (la bandeja o Ajustes). Si la app no arranca, el traceback queda en `shell/crash.log`.
- **`evaluate_js` no devuelve el valor resuelto** de una promesa (llega `{}`). Para comprobar el puente de punta a punta, mira cómo lo resuelve `shell/smoke_test.py`.
- **El pywebview 6.2.1 tiene rota la ruta `/` de su servidor local.** Por eso `main.py` sirve `dist/` con un servidor propio de la stdlib. No lo cambies sin probarlo.
- **Las horas son locales, no UTC.** Las del motor (`fixed_time`, `due_time`, `snoozed_until`, `last_nagged_at`) se guardan en hora local sin zona; usa `toLocalIso` (`src/lib/formatTime.ts`). `created_at` y `completed_at` salen de `datetime('now')` de SQLite, que es UTC, así que no los compares con las anteriores sin convertir.
- **ESLint ignora `shell/` y Prettier no entiende Python:** el código Python no tiene linter ni formateador automático.

## Base de datos

- La base real es `shell/agenda.db`. Está ignorada por git y es la agenda de verdad de quien usa la app.
- **Los `test_*.py` nunca la tocan:** `test_db.py` usa un directorio temporal. Mantén eso en cualquier test nuevo.
- **`shell/smoke_test.py` sí escribe en la agenda real** (crea un ítem y lo borra) y abre una ventana. Por eso no entra en `npm run ci`: no lo ejecutes sin el OK de Fredo. Aplica el protocolo de bases de datos del `CLAUDE.md` global.

## Antes de terminar una tarea

- `npm run ci` en verde.
- El código nuevo del shell lleva su `test_*.py` (el CI recoge solo cualquier `shell/test_*.py` nuevo). El de `src/lib` lleva su `*.test.ts`.
- Probado en la app (`npm run app:dev`) si cambia la interfaz o el comportamiento de los avisos.

## Git

Ramas, PRs y el reparto de trabajo con agentes están en [`CONTRIBUTING.md`](CONTRIBUTING.md): léelo antes de crear una rama. Lo esencial:

- Commits atómicos con el formato `<prefijo>: <verbo en 3ª persona> ...` (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`): minúscula tras los dos puntos, sin punto final, sin paréntesis y como máximo 72 caracteres.
- Si el cambio no es trivial, el body explica el porqué (el qué ya lo cuenta el diff).
- Los commits salen bajo el nombre de Fredo, sin `Co-Authored-By`.
- Se commitea o se hace push solo cuando Fredo lo pide. Los agentes que no son Claude no escriben en git (ver el `CLAUDE.md` global).

## Nunca

- Editar una migración ya existente en `shell/db.py`: crea una nueva.
- Tocar `shell/agenda.db` ni ejecutar `smoke_test.py` sin el OK de Fredo.
- Añadir dependencias a `package.json` o `shell/requirements.txt` sin consultarlo antes.
- Añadir `Co-Authored-By` a los commits.
