"""Check manual: python test_recurrence.py

Verifica el cálculo de ocurrencias: diaria/semanal/mensual, con `interval_n`,
acotado por `starts_on`/`ends_on`, y que las reglas inactivas o ya terminadas
no generen nada. Son los casos que rompen en silencio si el cálculo cambia.
"""

from recurrence import expand_recurrences

# Diaria, cada 2 días, sin fin.
daily = {
    "id": 1,
    "freq": "diaria",
    "interval_n": 2,
    "weekdays": None,
    "month_day": None,
    "at_time": "09:00",
    "starts_on": "2026-01-01",
    "ends_on": None,
    "active": 1,
}
out = expand_recurrences([daily], "2026-01-01", "2026-01-07")
assert [o["date"] for o in out] == ["2026-01-01", "2026-01-03", "2026-01-05", "2026-01-07"], out

# Semanal, lunes y jueves (iso: lunes=1, jueves=4), desde un miércoles.
weekly = {
    "id": 2,
    "freq": "semanal",
    "interval_n": 1,
    "weekdays": "1,4",
    "month_day": None,
    "at_time": "10:00",
    "starts_on": "2026-01-07",  # miércoles
    "ends_on": None,
    "active": 1,
}
out = expand_recurrences([weekly], "2026-01-01", "2026-01-31")
assert out[0]["date"] == "2026-01-08", out  # el jueves siguiente al starts_on
assert "2026-01-12" in [o["date"] for o in out]  # lunes siguiente

# Mensual, día 31, cruzando febrero (28 días en 2026, no bisiesto) y meses
# más cortos — debe clampear al último día real de cada mes.
monthly = {
    "id": 3,
    "freq": "mensual",
    "interval_n": 1,
    "weekdays": None,
    "month_day": 31,
    "at_time": "12:00",
    "starts_on": "2026-01-31",
    "ends_on": None,
    "active": 1,
}
out = expand_recurrences([monthly], "2026-01-01", "2026-04-30")
dates = [o["date"] for o in out]
assert dates == ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"], dates

# Regla inactiva no genera nada.
inactive = dict(daily, active=0)
assert expand_recurrences([inactive], "2026-01-01", "2026-01-31") == []

# Regla que ya terminó (ends_on antes del rango) no genera nada.
ended = dict(daily, ends_on="2025-12-31")
assert expand_recurrences([ended], "2026-01-01", "2026-01-31") == []

print("OK: las ocurrencias se calculan como deben")
