# Design

## Context

Hoy el tema vive en el hook `useTheme` (`src/hooks/useTheme.ts`), que lee y escribe `localStorage` y aplica `data-theme` en `<html>`. Solo `Ajustes.tsx` lo usa, y `tokens.css` decide el tema por `prefers-color-scheme` cuando `<html>` no tiene `data-theme`. Ver proposal.md para por qué `localStorage` no sirve aquí.

El resto de los ajustes del usuario ya viven en la tabla `settings` (una sola fila), llegan al frontend en `useAppStore().settings` y se cambian con `updateSettings`. El esquema es append-only: `MIGRATIONS` en `shell/db.py` aplicada según `PRAGMA user_version`.

## Goals / Non-Goals

**Goals:**

- Que la preferencia sobreviva al reinicio y se aplique en todas las pantallas desde el primer pintado.
- Que el tema tenga el mismo hogar que los demás ajustes, para que la personalización por usuario futura se sume ahí.

**Non-Goals:**

- Nuevas opciones de personalización (colores de acento, etc.): vienen después y se apoyarán en esto.
- El color de fondo de la ventana nativa antes de que cargue la página (ver Risks).

## Decisions

**1. Columna `theme` en `settings`, vía una migración nueva `SCHEMA_V3`.**
`ALTER TABLE settings ADD COLUMN theme TEXT NOT NULL DEFAULT 'sistema' CHECK (theme IN ('claro','oscuro','sistema'))`. La fila existente toma `'sistema'` (comprobado en la versión de SQLite del proyecto) y el `CHECK` impide que llegue un valor inválido. No se editan `SCHEMA_V1` ni `SCHEMA_V2`. Alternativas descartadas: `localStorage` con modo no privado y puerto fijo (frágil: un puerto fijo choca si hay dos copias, y mantiene una segunda fuente de verdad fuera de la base); un archivo JSON aparte (otra fuente de verdad más que respaldar).

**2. El tema guardado viaja a la página en la URL de arranque.**
`main.py` lee `settings.theme` tras migrar y abre la ventana en `<url>/?theme=<valor>`; un script en línea al principio de `index.html` lee ese parámetro y pone `data-theme` en `<html>` antes de que React pinte. Con `sistema` no pone nada y sigue mandando `prefers-color-scheme`. Va antes del `#` de `HashRouter`, así que no interfiere con las rutas. Alternativas descartadas: aplicar el tema cuando React recibe `settings` (hay un parpadeo con el tema equivocado, que el spec prohíbe); ocultar la interfaz hasta tener `settings` (la ventana se vería en blanco); pedir el tema al puente desde el script (es asíncrono, también parpadea).

**3. Después del arranque, `settings.theme` del store es la fuente de verdad.**
Un efecto en `App.tsx` aplica `data-theme` cada vez que `settings.theme` cambia; cubre también cuando la página se abre sin el parámetro (por ejemplo contra el dev server). `setChoice` aplica el atributo de inmediato y luego persiste con `updateSettings({ theme })`, para que el cambio se vea al instante aunque la escritura tarde.

**4. La traducción tema → atributo es una función pura.**
`themeAttribute("claro" | "oscuro" | "sistema")` devuelve `"light"`, `"dark"` o `null`, en `src/lib/`, con su test; igual, el armado de la URL en `main.py` es una función pura con su test. Así lo importante se verifica sin abrir ventanas.

**5. Se elimina `localStorage`.**
No se migra el valor viejo: nunca llegó a persistir, así que nadie tiene una preferencia guardada que rescatar.

## Risks / Trade-offs

- [Cambia el esquema de la base de datos real] → Es append-only y con valor por defecto, y un test comprueba que una base en la versión 2 con datos sube a la 3 sin perder nada. Antes de probar con la agenda real se respalda `shell/agenda.db`, con el OK de Fredo.
- [La ventana nativa puede verse un instante en blanco antes de que cargue la página] → Ya ocurre hoy y es independiente de este cambio; se podría resolver con el color de fondo de la ventana, anotado como pregunta abierta.
- [Dos caminos aplican el tema (el parámetro de arranque y el efecto de React)] → Ambos leen la misma fila de `settings` y usan la misma traducción, así que no pueden discrepar; el efecto solo corrige el caso sin parámetro.

## Open Questions

- ¿Fijar el `background_color` de la ventana según el tema guardado para evitar el instante en blanco? Se puede decidir más adelante sin cambiar el spec ni las tareas de este cambio.
