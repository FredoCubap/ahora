import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

# Esquema de la app. Son las mismas tablas que describe docs/FILOSOFIA.md
# ("Esquema de datos"), con una desviación deliberada: `item.snoozed_until` no
# está en ese documento — se agrega porque "Pospón 10 min" necesita persistir
# el nuevo horario de aviso entre chequeos del motor; sin esta columna el
# aviso volvería a sonar de inmediato.
#
# Las migraciones son append-only: cada una suma algo nuevo y nunca se edita
# una vieja, porque la DB de quien ya usó la app tiene `user_version` = N y solo
# corre las que falten.
DB_PATH = Path(__file__).parent / "agenda.db"

SCHEMA_V1 = """
CREATE TABLE item (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  notes         TEXT,

  fixed_time    TEXT,
  due_time      TEXT,

  priority      TEXT NOT NULL DEFAULT 'media'
                CHECK (priority IN ('baja','media','alta')),
  status        TEXT NOT NULL DEFAULT 'pendiente'
                CHECK (status IN ('pendiente','en_progreso','hecha','saltada','archivada')),

  remind_before_min INTEGER,
  snoozed_until TEXT,

  rule_id       INTEGER REFERENCES recurrence_rule(id) ON DELETE CASCADE,
  occurrence_date TEXT,

  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at  TEXT
);

CREATE TABLE recurrence_rule (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  notes         TEXT,

  freq          TEXT NOT NULL
                CHECK (freq IN ('diaria','semanal','mensual')),
  interval_n    INTEGER NOT NULL DEFAULT 1,
  weekdays      TEXT,
  month_day     INTEGER,

  at_time       TEXT NOT NULL,
  is_due        INTEGER NOT NULL DEFAULT 0,

  priority      TEXT NOT NULL DEFAULT 'media'
                CHECK (priority IN ('baja','media','alta')),
  remind_before_min INTEGER,

  starts_on     TEXT NOT NULL,
  ends_on       TEXT,
  active        INTEGER NOT NULL DEFAULT 1,

  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX ux_item_rule_occurrence
  ON item(rule_id, occurrence_date) WHERE rule_id IS NOT NULL;

CREATE INDEX ix_item_fixed_time ON item(fixed_time) WHERE fixed_time IS NOT NULL;
CREATE INDEX ix_item_due_time   ON item(due_time)   WHERE due_time IS NOT NULL;

CREATE TABLE settings (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  work_start    TEXT NOT NULL DEFAULT '09:00',
  work_end      TEXT NOT NULL DEFAULT '18:00',
  work_days     TEXT NOT NULL DEFAULT '1,2,3,4,5',
  snooze_min    INTEGER NOT NULL DEFAULT 10,
  overdue_retry_min   INTEGER NOT NULL DEFAULT 30,
  overdue_retry_max   INTEGER NOT NULL DEFAULT 3
);

INSERT INTO settings (id) VALUES (1);
"""

# Ítems "en seguimiento" (docs/FILOSOFIA.md, sección "Ítems en seguimiento").
# Un ítem es "en seguimiento" cuando `waiting_on` está relleno y
# `fixed_time`/`due_time` están vacíos: no tiene hora que se pase, así que
# necesita su propio ritmo de aviso en vez del de cortesía/al filo/vencido.
SCHEMA_V2 = """
ALTER TABLE item ADD COLUMN waiting_on TEXT;
ALTER TABLE item ADD COLUMN nag_interval_min INTEGER;
ALTER TABLE item ADD COLUMN last_nagged_at TEXT;
ALTER TABLE item ADD COLUMN nagged_today_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE settings ADD COLUMN seguimiento_interval_min INTEGER NOT NULL DEFAULT 240;
ALTER TABLE settings ADD COLUMN seguimiento_daily_cap INTEGER NOT NULL DEFAULT 3;
"""
# Tema de la interfaz (claro / oscuro / sistema). Vive aquí y no en el
# localStorage del WebView: con pywebview el modo privado lo borra en cada
# arranque, y el puerto aleatorio de la app cambia el origen de todos modos.
# Las bases existentes toman 'sistema', que es el comportamiento de antes.
SCHEMA_V3 = """
ALTER TABLE settings ADD COLUMN theme TEXT NOT NULL DEFAULT 'sistema'
  CHECK (theme IN ('claro','oscuro','sistema'));
"""
MIGRATIONS = [SCHEMA_V1, SCHEMA_V2, SCHEMA_V3]


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def migrate() -> None:
    conn = _connect()
    try:
        version = conn.execute("PRAGMA user_version").fetchone()[0]
        for i in range(version, len(MIGRATIONS)):
            conn.executescript(MIGRATIONS[i])
            conn.execute(f"PRAGMA user_version = {i + 1}")
        conn.commit()
    finally:
        conn.close()


def _rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict]:
    return [dict(r) for r in rows]


# --- Datos: las mismas operaciones que expone el frontend vía src/lib/db.ts ---
# Cada función abre y cierra su propia conexión. A esta escala (una agenda
# personal) el costo es despreciable y evita tener que acordarse de cerrar
# conexiones en el camino de error de cada llamada.


def list_items() -> list[dict]:
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT * FROM item WHERE status != 'archivada' OR rule_id IS NOT NULL "
            "ORDER BY COALESCE(fixed_time, due_time) ASC"
        ).fetchall()
        return _rows_to_dicts(rows)
    finally:
        conn.close()


def add_item(item: dict) -> None:
    conn = _connect()
    try:
        conn.execute(
            """INSERT INTO item
               (title, notes, fixed_time, due_time, priority, status, remind_before_min, waiting_on, nag_interval_min)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                item["title"],
                item.get("notes"),
                item.get("fixed_time"),
                item.get("due_time"),
                item.get("priority", "media"),
                item.get("status", "pendiente"),
                item.get("remind_before_min"),
                item.get("waiting_on"),
                item.get("nag_interval_min"),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def complete_item(item_id: int) -> None:
    conn = _connect()
    try:
        conn.execute(
            "UPDATE item SET status = 'hecha', completed_at = datetime('now') WHERE id = ?",
            (item_id,),
        )
        conn.commit()
    finally:
        conn.close()


def skip_item(item_id: int) -> None:
    conn = _connect()
    try:
        conn.execute("UPDATE item SET status = 'saltada' WHERE id = ?", (item_id,))
        conn.commit()
    finally:
        conn.close()


def start_item(item_id: int) -> None:
    """Marca un ítem como `en_progreso` (docs/FILOSOFIA.md, "Estados").

    Es la única forma de escribir ese estado: hoy está en el enum y en los
    filtros, pero nada lo producía. El efecto está en el motor de avisos
    (back off parcial: saltea cortesía y al-filo, pero si se vence sigue
    molestando).
    """
    conn = _connect()
    try:
        conn.execute("UPDATE item SET status = 'en_progreso' WHERE id = ?", (item_id,))
        conn.commit()
    finally:
        conn.close()


def unstart_item(item_id: int) -> None:
    """Vuelve un ítem de `en_progreso` a `pendiente`.

    Es el deshacer del toggle: con back off parcial, un misclick dejaría un ítem
    sin avisos de cortesía, y sin esto no hay forma de recuperarlo.
    """
    conn = _connect()
    try:
        conn.execute("UPDATE item SET status = 'pendiente' WHERE id = ?", (item_id,))
        conn.commit()
    finally:
        conn.close()


def snooze_item(item_id: int, snoozed_until_iso: str) -> None:
    # La hora ya viene calculada en local (mismo criterio que hoy: JS/TS
    # calcula "ahora + N minutos" en horario local antes de mandarla).
    conn = _connect()
    try:
        conn.execute(
            "UPDATE item SET snoozed_until = ? WHERE id = ?", (snoozed_until_iso, item_id)
        )
        conn.commit()
    finally:
        conn.close()


def record_seguimiento_nag(item_id: int, nagged_at_iso: str, nagged_today_count: int) -> None:
    conn = _connect()
    try:
        conn.execute(
            "UPDATE item SET last_nagged_at = ?, nagged_today_count = ? WHERE id = ?",
            (nagged_at_iso, nagged_today_count, item_id),
        )
        conn.commit()
    finally:
        conn.close()


def delete_item(item_id: int) -> None:
    conn = _connect()
    try:
        conn.execute("DELETE FROM item WHERE id = ?", (item_id,))
        conn.commit()
    finally:
        conn.close()


def archive_completed() -> None:
    conn = _connect()
    try:
        conn.execute("UPDATE item SET status = 'archivada' WHERE status IN ('hecha', 'saltada')")
        conn.commit()
    finally:
        conn.close()


# Cuánto se deja pasar una cita antes de archivarla sola. docs/FILOSOFIA.md dice
# "más de N minutos" sin fijar N; una hora es un rato en el que todavía se puede
# haber llegado tarde a algo, y pasado eso la cita ya no vuelve.
AUTO_ARCHIVE_MIN = 60


def auto_archive_missed_citas() -> int:
    """Archiva sola las citas cuya hora ya pasó (docs/FILOSOFIA.md, "Estados").

    `archivada` — "cita cuya hora pasó hace más de N minutos sin due. Fuera de la
    vista". Lo segundo ya lo cumple `zonifyToday` en el frontend, y lo cumple
    *por la hora*, no por el estado: una cita pasada no sale en ninguna zona ni
    la archiva nadie. Esta función es la otra mitad de lo que dice el documento.

    Sin esto, una cita perdida se queda en `pendiente` para siempre — y
    `pendiente` significa "cosa por hacer", que es mentira para algo que ya
    pasó. Se acumulan filas muertas que la UI esconde bien pero que la DB
    arrastra días, y que "Vaciar completadas" nunca toca (ese solo mira
    `hecha`/`saltada`).

    Solo citas: una con `due_time` es una tarea vencida, y esa sí se queda
    molestando en "Vencidas" a propósito, con sus reintentos.

    Devuelve cuántas archivó, para que los checks puedan assertar.
    """
    # El corte va en hora local y con el mismo formato que `fixed_time`
    # (`toLocalIso` en src/lib/formatTime.ts: "YYYY-MM-DDTHH:MM:SS", sin offset).
    # Así la comparación es de strings y acierta, porque todos los valores
    # comparten formato. Armarlo con `datetime('now')` de SQLite sería comparar
    # hora local contra UTC — el mismo error que ya le cobró a `created_at`.
    cutoff = (datetime.now() - timedelta(minutes=AUTO_ARCHIVE_MIN)).strftime(
        "%Y-%m-%dT%H:%M:%S"
    )
    conn = _connect()
    try:
        cur = conn.execute(
            """UPDATE item SET status = 'archivada'
               WHERE status IN ('pendiente', 'en_progreso')
                 AND due_time IS NULL
                 AND fixed_time IS NOT NULL
                 AND fixed_time < ?""",
            (cutoff,),
        )
        conn.commit()
        return cur.rowcount
    finally:
        conn.close()


def list_recurrence_rules() -> list[dict]:
    conn = _connect()
    try:
        rows = conn.execute("SELECT * FROM recurrence_rule WHERE active = 1").fetchall()
        return _rows_to_dicts(rows)
    finally:
        conn.close()


def create_recurrence_rule(rule: dict) -> None:
    conn = _connect()
    try:
        conn.execute(
            """INSERT INTO recurrence_rule
               (title, notes, freq, interval_n, weekdays, month_day, at_time, is_due,
                priority, remind_before_min, starts_on, ends_on, active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                rule["title"],
                rule.get("notes"),
                rule["freq"],
                rule.get("interval_n", 1),
                rule.get("weekdays"),
                rule.get("month_day"),
                rule["at_time"],
                rule.get("is_due", 0),
                rule.get("priority", "media"),
                rule.get("remind_before_min"),
                rule["starts_on"],
                rule.get("ends_on"),
                rule.get("active", 1),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def materialize_occurrence(rule: dict, date: str) -> int:
    when = f"{date}T{rule['at_time']}"
    is_due = rule.get("is_due")
    conn = _connect()
    try:
        cur = conn.execute(
            """INSERT INTO item
               (title, notes, fixed_time, due_time, priority, status, remind_before_min, rule_id, occurrence_date)
               VALUES (?, ?, ?, ?, ?, 'pendiente', ?, ?, ?)""",
            (
                rule["title"],
                rule.get("notes"),
                None if is_due else when,
                when if is_due else None,
                rule.get("priority", "media"),
                rule.get("remind_before_min"),
                rule["id"],
                date,
            ),
        )
        conn.commit()
        if cur.lastrowid is None:
            raise RuntimeError("no se pudo materializar la ocurrencia: la DB no devolvió un id")
        return cur.lastrowid
    finally:
        conn.close()


def get_settings() -> dict:
    conn = _connect()
    try:
        row = conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()
        return dict(row)
    finally:
        conn.close()


def update_settings(partial: dict) -> None:
    entries = [(k, v) for k, v in partial.items() if v is not None]
    if not entries:
        return
    # Los nombres de columna vienen de las keys de Settings (tipado en TS del
    # lado del caller), igual que en la versión Tauri — mismo límite de
    # confianza que ya tenía el código original.
    set_clause = ", ".join(f"{key} = ?" for key, _ in entries)
    values = [v for _, v in entries]
    conn = _connect()
    try:
        conn.execute(f"UPDATE settings SET {set_clause} WHERE id = 1", values)
        conn.commit()
    finally:
        conn.close()
