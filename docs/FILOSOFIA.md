# Agenda de Trabajo — Filosofía y principios

> Documento norte. Antes de añadir una función, comprobar que no contradice esto.
> Si una decisión de producto choca con un principio, se discute el principio primero.

## Qué es

Una **agenda personal con voz activa**. No es un tablero que consultas: es algo que
te habla. "Oye, esto ahora." "En 20 minutos, esto otro." "Esto se te venció."

Cada persona tiene la suya. No se comparte nada. No hay servidor, no hay cuentas.
Los datos viven en SQLite local en la máquina del usuario.

## Qué NO es

- No es un gestor de proyectos (nada de dependencias, subtareas, diagramas de Gantt).
- No es una herramienta de equipo (no hay asignar, comentar, compartir).
- No es un control de horas ni facturación.
- No es un CRM ni una bandeja de correo.
- No es un segundo cerebro / wiki. Notas largas van en otro sitio.

## Principios

### 1. La app tiene voz activa, y por eso tiene que acertar
Interrumpir es un privilegio caro. Una app que avisa de algo irrelevante o a
destiempo se silencia en tres días y no vuelve. **Mejor avisar de menos y bien.**
Ante la duda, no sonar.

### 2. El "ahora" es el centro de gravedad
La pantalla principal responde a una sola pregunta: *¿qué toca en las próximas
horas?* No es una parrilla de tarjetas. En un día normal no debería tener scroll.
La semana, el mes y el backlog están a un clic, nunca en primer plano.

### 3. Cada aviso se responde en dos segundos
Todo aviso ofrece siempre las mismas tres acciones:

`Hecho` · `Pospón 10 min` · `Hoy no`

Si un aviso aparece y el usuario no puede actuar de inmediato, la fricción mata
el hábito.

### 4. La insistencia tiene techo
Los avisos escalan y luego se rinden con dignidad:

- **Cortesía:** una vez, X minutos antes (configurable por ítem).
- **Al filo:** una vez, a la hora exacta.
- **Vencido (solo tareas):** reintenta cada 30 min, **máximo 3 veces**. Después
  calla. La tarea sigue visible en rojo, pero ya no grita.
- Nunca suena fuera del horario laboral definido en Ajustes.

El reintento infinito es exactamente lo que hace que la gente mate la app.

### 5. El pasado no perdonado no es carga
Las tareas recurrentes **no se acumulan**. Si ayer no revisaste el correo, hoy no
tienes dos "revisar correo": tienes el de hoy y punto. La culpa acumulada es
ansiedad, no productividad.

### 6. Crear algo cuesta segundos, no un formulario
El objetivo es escribir una línea ("Llamar a Juan mañana 15:00") y que la app
haga el resto. El modal completo existe para el caso raro, no para el común.

### 7. Una sola entidad
No hay "tipo evento" vs "tipo tarea" que el usuario elija. Hay un ítem, y su
comportamiento sale de qué campos de tiempo tiene llenos (ver esquema).

### 8. Seguimiento no es urgencia
Hay pendientes que no dependen solo de ti — esperas a que un tercero responda o
resuelva (Google, un proveedor, un compañero) — y lo que necesitas no es una
fecha límite, es **no perder el hilo**. Eso es un tono distinto al de "vencida":
más espaciado, sin rojo, sin alarma. Ver [Ítems en seguimiento](#ítems-en-seguimiento).

## El modelo de tiempo

Un ítem puede tener uno de estos dos campos, los dos, o —raro— ninguno:

| Campo         | Significado                          | Si pasa la hora                         |
|---------------|--------------------------------------|----------------------------------------|
| `fixed_time`  | Ocurre a esta hora (una cita)        | A los N min se archiva solo            |
| `due_time`    | Hay que terminar antes de esta hora  | Sube a "vencida", se queda molestando  |

- Solo `fixed_time` → se comporta como cita.
- Solo `due_time` → se comporta como tarea con fecha límite.
- Ambos → tarea con ventana (empieza a las X, debe estar lista a las Y).
- Ninguno → tarea "algún día", nunca genera avisos, vive en el backlog.

## Recurrencia

**La regla es la fuente de verdad. La instancia solo existe si pasa algo con ella.**

- `recurrence_rule` guarda el patrón (qué, cada cuánto, a qué hora, hasta cuándo).
- La app calcula al vuelo la ocurrencia de hoy/mañana. No materializa filas.
- Se crea una fila en `item` **solo** cuando el usuario toca esa ocurrencia:
  la completa, la salta ("Hoy no") o la mueve. Esa fila es una *excepción*.
- El histórico de cumplimiento se lee de las excepciones. Es justo lo que
  queremos medir.

"Hoy no" sobre una recurrente = salta solo esa ocurrencia, sin tocar la regla.

## Ítems en seguimiento

Ejemplo real: cambiar el teléfono de recuperación de la cuenta de Google de la
empresa y esperar a que Google lo dé por bueno. No es una tarea con fecha límite
(no la controlas), no es una cita (no ocurre a una hora), y no es "olvido" — es
**no perder el hilo** de algo que sigue abierto hasta que llega una señal externa
de cierre.

- **No usa `fixed_time` ni `due_time`.** Un ítem es "en seguimiento" cuando tiene
  `waiting_on` relleno y esos dos campos vacíos — sigue siendo la misma entidad
  `item` del principio 7, no una tabla aparte.
- **`waiting_on`** es el contexto en texto libre: "esperando a: Google —
  verificación de teléfono nuevo". Es lo que el aviso te recuerda, para no tener
  que releer notas.
- **Días abiertos, no vergüenza.** La antigüedad sale de `created_at` — se
  muestra como dato ("llevas 6 días con esto"), nunca como regaño.
- **Avisa espaciado, no agresivo.** Por defecto una vez al día
  (`settings.seguimiento_interval_min`), overrideable por ítem. Sigue teniendo
  **techo diario** (`settings.seguimiento_daily_cap`) — el principio 4 aplica
  igual aquí: aunque no tenga fecha, si suena sin parar se acaba silenciando.
- **Se cierra con una sola acción: `Resuelto`.** No hay "Hoy no" ni "Pospón" —
  no es algo que se reprograma, es algo que existe tal cual hasta que se cierra
  (`status = 'hecha'`, igual que cualquier otro ítem).
- **Nunca compite visualmente con lo urgente.** "Vencida" es roja porque se pasó
  una hora; "en seguimiento" no tiene hora que se pase, así que no lleva rojo ni
  alarma — ver [Vista principal](#vista-principal-ahora-y-a-continuación).

## Esquema de datos (propuesto)

```sql
-- Un ítem: cita, tarea, o excepción de una recurrente.
CREATE TABLE item (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  notes         TEXT,

  fixed_time    TEXT,            -- ISO 8601. Hora a la que ocurre (cita).
  due_time      TEXT,            -- ISO 8601. Hora límite para terminar (tarea).

  priority      TEXT NOT NULL DEFAULT 'media'   -- 'baja' | 'media' | 'alta'
                CHECK (priority IN ('baja','media','alta')),
  status        TEXT NOT NULL DEFAULT 'pendiente' -- ver abajo
                CHECK (status IN ('pendiente','en_progreso','hecha','saltada','archivada')),

  -- Aviso de cortesía: minutos antes de la hora relevante. NULL = sin cortesía.
  remind_before_min INTEGER,

  -- Ítem "en seguimiento": contexto de a qué/quién se espera. Si está relleno
  -- y fixed_time/due_time están vacíos, el ítem se comporta como seguimiento
  -- (ver sección "Ítems en seguimiento"), no como tarea ni cita.
  waiting_on    TEXT,
  -- Cada cuántos minutos insiste un ítem en seguimiento. NULL = usa el
  -- default de settings.seguimiento_interval_min.
  nag_interval_min   INTEGER,
  last_nagged_at     TEXT,
  -- Cuántas veces avisó hoy; se resetea cuando cambia la fecha de last_nagged_at.
  nagged_today_count INTEGER NOT NULL DEFAULT 0,

  -- Vínculo a la regla, si este ítem es una excepción de una recurrente.
  rule_id       INTEGER REFERENCES recurrence_rule(id) ON DELETE CASCADE,
  -- Fecha (YYYY-MM-DD) de la ocurrencia que esta fila representa.
  occurrence_date TEXT,

  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at  TEXT
);

CREATE UNIQUE INDEX ux_item_rule_occurrence
  ON item(rule_id, occurrence_date) WHERE rule_id IS NOT NULL;

CREATE INDEX ix_item_fixed_time ON item(fixed_time) WHERE fixed_time IS NOT NULL;
CREATE INDEX ix_item_due_time   ON item(due_time)   WHERE due_time IS NOT NULL;


-- La regla de una tarea recurrente. Fuente de verdad; no genera filas por sí sola.
CREATE TABLE recurrence_rule (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  notes         TEXT,

  -- Patrón. Empezamos simple; se amplía cuando haga falta.
  freq          TEXT NOT NULL    -- 'diaria' | 'semanal' | 'mensual'
                CHECK (freq IN ('diaria','semanal','mensual')),
  interval_n    INTEGER NOT NULL DEFAULT 1,   -- cada N (días/semanas/meses)
  weekdays      TEXT,            -- CSV '1,2,3,4,5' (lunes=1) para freq semanal
  month_day     INTEGER,         -- día del mes para freq mensual

  at_time       TEXT NOT NULL,   -- 'HH:MM' hora local de la ocurrencia
  is_due        INTEGER NOT NULL DEFAULT 0,   -- 0: la hora es fixed_time; 1: es due_time

  priority      TEXT NOT NULL DEFAULT 'media'
                CHECK (priority IN ('baja','media','alta')),
  remind_before_min INTEGER,

  starts_on     TEXT NOT NULL,   -- YYYY-MM-DD
  ends_on       TEXT,            -- YYYY-MM-DD, NULL = sin fin
  active        INTEGER NOT NULL DEFAULT 1,

  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);


-- Ajustes globales (una sola fila).
CREATE TABLE settings (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  work_start    TEXT NOT NULL DEFAULT '09:00',
  work_end      TEXT NOT NULL DEFAULT '18:00',
  work_days     TEXT NOT NULL DEFAULT '1,2,3,4,5',
  snooze_min    INTEGER NOT NULL DEFAULT 10,
  overdue_retry_min   INTEGER NOT NULL DEFAULT 30,
  overdue_retry_max   INTEGER NOT NULL DEFAULT 3,

  -- Defaults para ítems "en seguimiento" (ver sección dedicada).
  -- Cada 4h, máx. 3 avisos/día, salvo que el ítem lo sobreescriba.
  seguimiento_interval_min INTEGER NOT NULL DEFAULT 240,
  seguimiento_daily_cap    INTEGER NOT NULL DEFAULT 3
);
```

### Estados

- `pendiente` — por defecto.
- `en_progreso` — el usuario la marcó como empezada.
- `hecha` — completada. `completed_at` se rellena.
- `saltada` — "Hoy no" sobre una recurrente. Cuenta como excepción en el histórico.
- `archivada` — cita cuya hora pasó hace más de N minutos sin due. Fuera de la vista.

### El motor de avisos (lógica, no tabla)

Un proceso que corre cada minuto mientras la app está abierta:

1. Para cada regla activa, calcula si hay ocurrencia hoy y a qué hora.
2. Junta esas ocurrencias virtuales con los `item` reales de hoy.
3. Por cada uno decide si toca sonar:
   - cortesía (`remind_before_min` antes de la hora), una vez;
   - al filo (a la hora), una vez;
   - vencido (`due_time` pasado), cada `overdue_retry_min`, hasta `overdue_retry_max`;
   - **en seguimiento** (`waiting_on` relleno, sin `fixed_time`/`due_time`): si
     pasaron `nag_interval_min` desde `last_nagged_at` **y** `nagged_today_count`
     no llegó a `seguimiento_daily_cap`, avisa y suma 1 al contador. El contador
     se resetea a 0 en el primer aviso de un día distinto al de `last_nagged_at`.
4. Nunca suena fuera de `work_start`–`work_end` ni en días fuera de `work_days`.
5. Lo ya notificado se recuerda en memoria (o en una tabla `notification_log`
   si queremos que sobreviva a reinicios — decidir cuando lleguemos).

## Vista principal: "Ahora y a continuación"

Lista vertical única, ordenada por hora, con estas zonas:

1. **Vencidas** — rojo, arriba, solo si las hay.
2. **Ahora / próximas 3 h** — grande, es el foco.
3. **Resto de hoy** — compacto.
4. **En seguimiento** — al final, colapsada por defecto, color neutro (nunca
   rojo). Cada fila muestra el título, `waiting_on` y los días abiertos. No
   compite por atención con lo urgente: es información de fondo que está ahí
   si la buscas, no algo que salta a la vista. Solo se expande de entrada si
   la lista de arriba está vacía.

Mañana, la semana y el backlog viven en otra ruta.

## Estado actual vs esta filosofía

La migración de `tasks` a `item` / `recurrence_rule` / `settings` ya se hizo
(ver `src-tauri/src/lib.rs`), junto con el cálculo de ocurrencias de reglas
recurrentes y un motor de avisos en el frontend. Detalles de implementación y
gaps pendientes se llevan en el chat de backend, no aquí.

Pendiente de aterrizar de este documento, lo más reciente primero:

- `waiting_on`, `nag_interval_min`, `last_nagged_at`, `nagged_today_count` en
  `item`, y `seguimiento_interval_min` / `seguimiento_daily_cap` en `settings`
  — nada de esto existe todavía en el esquema real.
- La zona "En seguimiento" de la vista principal, colapsada y neutra.

Estas son tareas de implementación, no de filosofía. Se abordan cuando toque
(el schema/motor en el chat de backend; la zona visual, aquí).
```
