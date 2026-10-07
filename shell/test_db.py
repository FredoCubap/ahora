"""Check manual: python test_db.py

Recorre el CRUD completo contra una DB temporal (no la de la app): crear,
completar, saltar, posponer, borrar, archivar, las reglas de recurrencia,
materializar una ocurrencia, y los ajustes.

Usa `tempfile.mkdtemp` en vez de `mktemp`: `mktemp` está deprecado y avisa
del problema de seguridad de adivinar el nombre. Además borra la DB al final
con `addfinalizer` para que no quede si el script falla a mitad de camino.
"""

import os
import shutil
import sqlite3
import tempfile
from datetime import datetime, timedelta

import db

_tmpdir = tempfile.mkdtemp(suffix=".ahora-test")
db.DB_PATH = os.path.join(_tmpdir, "test-agenda.db")
db.migrate()
assert db.list_items() == []

db.add_item({"title": "Probar bridge", "priority": "alta"})
items = db.list_items()
assert len(items) == 1 and items[0]["title"] == "Probar bridge"
item_id = items[0]["id"]

db.complete_item(item_id)
assert db.list_items()[0]["status"] == "hecha"

db.create_recurrence_rule(
    {
        "title": "Diaria",
        "freq": "diaria",
        "interval_n": 1,
        "at_time": "09:00",
        "starts_on": "2026-01-01",
        "is_due": 0,
        "active": 1,
    }
)
rules = db.list_recurrence_rules()
assert len(rules) == 1
rule = rules[0]

new_id = db.materialize_occurrence(rule, "2026-01-02")
assert isinstance(new_id, int)

settings = db.get_settings()
assert settings["work_start"] == "09:00"
db.update_settings({"work_start": "10:00"})
assert db.get_settings()["work_start"] == "10:00"

db.delete_item(item_id)
db.archive_completed()

# --- Archivado automático de citas perdidas (docs/FILOSOFIA.md, "Estados") ---
# El `archivada` de una cita dice "su hora pasó hace más de N minutos sin
# due". Acá va lo que no puede romperse sin que se note en pantalla: que una
# cita perdida sí se archive, que una tarea vencida NO se archive (esa tiene
# que seguir molestando en "Vencidas"), y que una cita que todavía no pasó no
# se toque. Todo con hora local explícita — el corte de db.py es local, así
# que un `datetime('now')` de SQLite (UTC) compararía contra otra zona.
ahora = datetime.now()


def _local_iso(d: datetime) -> str:
    return d.strftime("%Y-%m-%dT%H:%M:%S")


def _crear(titulo: str, **campos) -> str:
    """Crea un ítem y devuelve su título, para poder consultarlo por nombre.

    `add_item` no devuelve el id (el frontend no lo necesita: después refresca
    y la lista viene entera), así que el test busca por título.
    """
    db.add_item({"title": titulo, **campos})
    return titulo


_perdida = _crear(
    "Cita que ya me la perdi",
    fixed_time=_local_iso(ahora - timedelta(minutes=db.AUTO_ARCHIVE_MIN + 30)),
)
_futura = _crear("Cita de mas tarde", fixed_time=_local_iso(ahora + timedelta(hours=2)))
_reciente = _crear("Cita de hace un rato", fixed_time=_local_iso(ahora - timedelta(minutes=5)))
_tarea = _crear("Tarea vencida (esta tiene que seguir molestando)", due_time=_local_iso(ahora - timedelta(hours=3)))

# No se puede assertar el número total: la ocurrencia materializada más arriba
# (2026-01-02 09:00) también es una cita vencida, y archivarla es lo correcto.
# Lo que se verifica es el estado de estos cuatro en concreto.
db.auto_archive_missed_citas()

conn = db._connect()
try:
    estados = dict(
        conn.execute(
            "SELECT title, status FROM item WHERE title LIKE 'Cita%' OR title LIKE 'Tarea%'"
        ).fetchall()
    )
finally:
    conn.close()

assert estados[_perdida] == "archivada", estados
assert estados[_futura] == "pendiente", estados
# Pasó pero hace menos de N: la gracia de "más de N minutos" es no archivar antes.
assert estados[_reciente] == "pendiente", estados
# La clave: con due_time es una tarea vencida, no una cita. Archivarla sacaría
# una fila de "Vencidas" sin avisar, que es justo lo que el doc no quiere.
assert estados[_tarea] == "pendiente", estados

# Y una cita archivada desaparece de list_items... salvo si es excepción de una
# recurrencia: esas tienen que seguir ahí para que la ocurrencia no resucite
# (ver el WHERE de list_items).
visibles = {i["title"] for i in db.list_items()}
assert _perdida not in visibles, "se ve una cita archivada"
assert _futura in visibles, "una cita futura se archivan"
assert _reciente in visibles, "una cita reciente se archivó antes de N"
assert _tarea in visibles, "una tarea vencida se archivó: dejaría de molestar"

# Correrlo dos veces no debe volver a archivar nada: es idempotente.
assert db.auto_archive_missed_citas() == 0, "no es idempotente"

# Migración V3 (tema): una agenda creada en la versión 2, con datos, sube a la 3
# sin perder nada y queda en 'sistema' (docs: openspec "apariencia").
_nueva = db.DB_PATH
db.DB_PATH = os.path.join(_tmpdir, "v2-agenda.db")
_conn = sqlite3.connect(db.DB_PATH)
for _sql in db.MIGRATIONS[:2]:
    _conn.executescript(_sql)
_conn.execute("PRAGMA user_version = 2")
_conn.execute("INSERT INTO item (title) VALUES ('anterior a la V3')")
_conn.execute("UPDATE settings SET work_start = '08:30'")
_conn.commit()
_conn.close()

db.migrate()
_conn = sqlite3.connect(db.DB_PATH)
assert _conn.execute("PRAGMA user_version").fetchone()[0] == len(db.MIGRATIONS) == 3
_conn.close()
assert [i["title"] for i in db.list_items()] == ["anterior a la V3"], "la V3 perdió un ítem"
assert db.get_settings()["work_start"] == "08:30", "la V3 perdió un ajuste"
assert db.get_settings()["theme"] == "sistema", "una agenda vieja debe quedar en 'sistema'"

db.update_settings({"theme": "oscuro"})
assert db.get_settings()["theme"] == "oscuro"
try:
    db.update_settings({"theme": "rosa"})
    raise AssertionError("la base aceptó un tema inválido")
except sqlite3.IntegrityError:
    pass
assert db.get_settings()["theme"] == "oscuro", "un tema inválido pisó el guardado"

db.migrate()  # idempotente: no vuelve a correr la V3 ni toca el tema elegido
assert db.get_settings()["theme"] == "oscuro"
db.DB_PATH = _nueva

shutil.rmtree(_tmpdir, ignore_errors=True)
print("OK: las operaciones de datos andan, y las citas perdidas se archivan solas")
