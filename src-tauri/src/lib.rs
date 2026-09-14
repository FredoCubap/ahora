use chrono::{Datelike, Duration, NaiveDate};
use serde::{Deserialize, Serialize};
use tauri_plugin_sql::{Migration, MigrationKind};

// Esquema tomado de docs/FILOSOFIA.md ("Esquema de datos (propuesto)").
// Desviación deliberada: `item.snoozed_until` no está en ese documento — se
// agrega porque "Pospón 10 min" necesita persistir el nuevo horario de aviso
// entre chequeos del motor; sin esta columna el aviso volvería a sonar de inmediato.
const SCHEMA_V1: &str = r#"
DROP TABLE IF EXISTS tasks;

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

  -- No documentado en FILOSOFIA.md: horario al que se pospuso el próximo aviso.
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
"#;

fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "item_recurrence_rule_settings",
        sql: SCHEMA_V1,
        kind: MigrationKind::Up,
    }]
}

// --- Primer comando Rust real de la app ---
//
// Hasta acá, todo el CRUD lo maneja el plugin SQL directo desde el
// frontend (ver src/lib/db.ts). Esto es distinto: es lógica de negocio
// (calcular fechas de una regla de recurrencia) que no tiene sentido
// escribir dos veces, así que vive en Rust y el frontend se la pide con
// `invoke("expand_recurrences", ...)`.

/// Una fila de la tabla `recurrence_rule`, tal como la manda el frontend
/// (que ya la leyó con `db.select`). `#[derive(Deserialize)]` le dice a
/// serde cómo convertir el JSON que llega desde JS en este struct — cada
/// campo debe existir en el JSON con el mismo nombre y un tipo compatible.
/// `Option<T>` es el "puede no estar" de Rust: en SQL son columnas NULL.
#[derive(Deserialize)]
struct RecurrenceRule {
    id: i64,
    freq: String,
    interval_n: i64,
    weekdays: Option<String>,
    month_day: Option<i64>,
    at_time: String,
    starts_on: String,
    ends_on: Option<String>,
    // SQLite no tiene booleano real: `active` llega como 0 o 1 (INTEGER).
    active: i64,
}

/// Una ocurrencia calculada: "la regla `rule_id` cae el día `date` a las
/// `at_time`". `#[derive(Serialize)]` es lo inverso de Deserialize: le dice
/// a serde cómo convertir ESTE struct de vuelta a JSON para mandárselo al
/// frontend.
#[derive(Serialize)]
struct Occurrence {
    rule_id: i64,
    date: String,
    at_time: String,
}

/// Convierte "YYYY-MM-DD" en una fecha real de chrono. Devuelve `Result`
/// porque el texto podría venir mal formado — en Rust los errores
/// recuperables se modelan como valores (`Ok`/`Err`), no con excepciones.
/// El `?` en quien llama a esta función propaga el `Err` automáticamente.
fn parse_date(s: &str) -> Result<NaiveDate, String> {
    NaiveDate::parse_from_str(s, "%Y-%m-%d").map_err(|e| format!("fecha inválida '{s}': {e}"))
}

/// chrono numera lunes=0..domingo=6; acá usamos 1=lunes..7=domingo (como en
/// `settings.work_days`), así que solo hay que sumar 1.
fn iso_weekday(d: NaiveDate) -> i64 {
    d.weekday().num_days_from_monday() as i64 + 1
}

/// El último día del mes `month` de `year` (28/29/30/31) — necesario para
/// las reglas mensuales ancladas a un día que no existe en todos los meses
/// (ej. "el 31 de cada mes").
fn last_day_of_month(year: i32, month: u32) -> u32 {
    let (next_year, next_month) = if month == 12 { (year + 1, 1) } else { (year, month + 1) };
    NaiveDate::from_ymd_opt(next_year, next_month, 1)
        .expect("mes válido")
        .pred_opt()
        .expect("el día 1 siempre tiene un día anterior")
        .day()
}

/// Calcula todas las fechas en las que dispara UNA regla, dentro de
/// `[from, to]`. `&RecurrenceRule` es una referencia — tomamos prestada la
/// regla para leerla, sin volvernos dueños de ella (así quien llama la
/// sigue teniendo disponible después).
fn expand_rule(rule: &RecurrenceRule, from: NaiveDate, to: NaiveDate) -> Result<Vec<Occurrence>, String> {
    if rule.active == 0 {
        return Ok(vec![]);
    }

    let starts_on = parse_date(&rule.starts_on)?;
    let ends_on = rule.ends_on.as_deref().map(parse_date).transpose()?;
    let interval = rule.interval_n.max(1);

    let range_start = from.max(starts_on);
    let range_end = match ends_on {
        Some(e) => to.min(e),
        None => to,
    };
    if range_start > range_end {
        return Ok(vec![]);
    }

    let mut out = Vec::new();

    match rule.freq.as_str() {
        "diaria" => {
            let mut d = starts_on;
            while d <= range_end {
                if d >= range_start {
                    out.push(Occurrence {
                        rule_id: rule.id,
                        date: d.format("%Y-%m-%d").to_string(),
                        at_time: rule.at_time.clone(),
                    });
                }
                d += Duration::days(interval);
            }
        }
        "semanal" => {
            let weekdays: Vec<i64> = rule
                .weekdays
                .as_deref()
                .unwrap_or("")
                .split(',')
                .filter_map(|s| s.trim().parse::<i64>().ok())
                .collect();
            if weekdays.is_empty() {
                return Ok(vec![]);
            }
            let mut d = range_start;
            while d <= range_end {
                let weeks_since_start = (d - starts_on).num_days() / 7;
                if weeks_since_start % interval == 0 && weekdays.contains(&iso_weekday(d)) {
                    out.push(Occurrence {
                        rule_id: rule.id,
                        date: d.format("%Y-%m-%d").to_string(),
                        at_time: rule.at_time.clone(),
                    });
                }
                d += Duration::days(1);
            }
        }
        "mensual" => {
            let day = rule.month_day.unwrap_or(1).clamp(1, 31);
            let mut year = starts_on.year();
            let mut month = starts_on.month() as i32;
            loop {
                let actual_day = (day as u32).min(last_day_of_month(year, month as u32));
                let candidate = NaiveDate::from_ymd_opt(year, month as u32, actual_day)
                    .ok_or_else(|| format!("fecha inválida generada: {year}-{month}-{actual_day}"))?;
                if candidate > range_end {
                    break;
                }
                if candidate >= range_start {
                    out.push(Occurrence {
                        rule_id: rule.id,
                        date: candidate.format("%Y-%m-%d").to_string(),
                        at_time: rule.at_time.clone(),
                    });
                }
                month += interval as i32;
                year += (month - 1).div_euclid(12);
                month = (month - 1).rem_euclid(12) + 1;
            }
        }
        other => return Err(format!("frecuencia desconocida: {other}")),
    }

    Ok(out)
}

/// El comando que el frontend invoca. `Vec<RecurrenceRule>` porque puede
/// haber varias reglas activas; se expande cada una y se juntan los
/// resultados. `Result<Vec<Occurrence>, String>` del lado de Tauri: si
/// devolvemos `Err`, en JS eso llega como una promesa rechazada.
#[tauri::command]
fn expand_recurrences(rules: Vec<RecurrenceRule>, from: String, to: String) -> Result<Vec<Occurrence>, String> {
    let from = parse_date(&from)?;
    let to = parse_date(&to)?;
    let mut all = Vec::new();
    for rule in &rules {
        all.extend(expand_rule(rule, from, to)?);
    }
    Ok(all)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:agenda.db", migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![expand_recurrences])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
