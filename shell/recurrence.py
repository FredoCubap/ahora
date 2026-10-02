"""Cálculo de las fechas en que dispara cada regla de recurrencia.

La regla es la fuente de verdad y **no genera filas**: esto calcula, al vuelo,
en qué días cae cada regla dentro de un rango. El frontend las usa para mostrar
las ocurrencias como ítems virtuales; la fila en `item` solo se crea cuando el
usuario toca esa ocurrencia (la completa, la salta o la pospone) — esa fila es
la "excepción" de la que habla docs/FILOSOFIA.md.

Por eso `from`/`to` importan: se expande solo la ventana que se va a mostrar
(semana entrante, mes, etc.), nunca el histórico entero.
"""

import calendar
from datetime import date, datetime, timedelta


def _parse_date(s: str) -> date:
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError as e:
        raise ValueError(f"fecha inválida '{s}': {e}") from e


def _iso_weekday(d: date) -> int:
    # Python: lunes=0..domingo=6. Igual que en Rust, sumamos 1 para que
    # coincida con settings.work_days (1=lunes..7=domingo).
    return d.weekday() + 1


def _last_day_of_month(year: int, month: int) -> int:
    return calendar.monthrange(year, month)[1]


def _expand_rule(rule: dict, frm: date, to: date) -> list[dict]:
    if not rule.get("active"):
        return []

    starts_on = _parse_date(rule["starts_on"])
    ends_on = _parse_date(rule["ends_on"]) if rule.get("ends_on") else None
    interval = max(rule.get("interval_n", 1), 1)

    range_start = max(frm, starts_on)
    range_end = min(to, ends_on) if ends_on else to
    if range_start > range_end:
        return []

    rule_id = rule["id"]
    at_time = rule["at_time"]
    freq = rule["freq"]
    out: list[dict] = []

    if freq == "diaria":
        d = starts_on
        while d <= range_end:
            if d >= range_start:
                out.append({"rule_id": rule_id, "date": d.isoformat(), "at_time": at_time})
            d += timedelta(days=interval)

    elif freq == "semanal":
        weekdays = []
        for part in (rule.get("weekdays") or "").split(","):
            part = part.strip()
            if part:
                try:
                    weekdays.append(int(part))
                except ValueError:
                    pass
        if not weekdays:
            return []
        d = range_start
        while d <= range_end:
            weeks_since_start = (d - starts_on).days // 7
            if weeks_since_start % interval == 0 and _iso_weekday(d) in weekdays:
                out.append({"rule_id": rule_id, "date": d.isoformat(), "at_time": at_time})
            d += timedelta(days=1)

    elif freq == "mensual":
        day = min(max(rule.get("month_day") or 1, 1), 31)
        year = starts_on.year
        month0 = starts_on.month - 1  # 0-indexado, para que el módulo dé siempre >= 0
        while True:
            month = month0 % 12 + 1
            actual_year = year + month0 // 12
            actual_day = min(day, _last_day_of_month(actual_year, month))
            candidate = date(actual_year, month, actual_day)
            if candidate > range_end:
                break
            if candidate >= range_start:
                out.append(
                    {"rule_id": rule_id, "date": candidate.isoformat(), "at_time": at_time}
                )
            month0 += interval

    else:
        raise ValueError(f"frecuencia desconocida: {freq}")

    return out


def expand_recurrences(rules: list[dict], frm: str, to: str) -> list[dict]:
    frm_d = _parse_date(frm)
    to_d = _parse_date(to)
    out: list[dict] = []
    for rule in rules:
        out.extend(_expand_rule(rule, frm_d, to_d))
    return out
