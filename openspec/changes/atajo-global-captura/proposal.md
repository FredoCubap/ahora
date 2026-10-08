# Proposal

## Why

El Principio 6 de `docs/FILOSOFIA.md` promete que crear algo cuesta segundos. Hoy esa promesa solo se cumple con la ventana de Ahora en primer plano o tras buscar el ícono de la bandeja con el ratón. Las interrupciones nacen mientras se trabaja en otra aplicación (correo, navegador, hoja de cálculo), y cambiar de ventana para anotarlas rompe el flujo y mata el hábito de capturar al vuelo.

Issue: https://github.com/FredoCubap/ahora/issues/5

## What Changes

- Un **atajo global** de Windows (por defecto `Win+Alt+A`) que, desde cualquier aplicación, trae Ahora al frente y abre la captura rápida con el cursor ya en el campo de texto.
- `Escape` cancela la captura y, si la ventana estaba escondida en la bandeja, la vuelve a esconder.
- Ajustes permite **activar o desactivar** el atajo y **cambiar la combinación**; la elección se conserva entre arranques.
- Si otra aplicación ya tiene el atajo, Ahora arranca igual: no registra nada y Ajustes lo indica.
- El atajo solo abre la app: no emite ningún aviso (Principio 1).

## Capabilities

### New Capabilities

- `captura-rapida`: cómo se invoca y se cierra la captura rápida de un ítem. Este cambio fija el atajo global; la captura en sí (parseo del texto, campos) no cambia.

### Modified Capabilities

<!-- Ninguna: la captura rápida no tenía spec previo. -->

## Impact

- `shell/hotkey.py` (nuevo): registro del atajo con `ctypes` y bucle de mensajes en un hilo propio. Sin dependencias nuevas.
- `shell/db.py`: migración `SCHEMA_V4` (columnas `hotkey_enabled` y `hotkey_combination` en `settings`).
- `shell/main.py`: arranca el atajo, trae la ventana al frente, avisa al frontend y expone `configure_hotkey` y `get_hotkey_status` en `Api`.
- `src/App.tsx`, `src/components/CapturaModal.tsx`: abren la captura al recibir la señal y cierran con `Escape`.
- `src/routes/Ajustes.tsx`, `src/lib/system.ts`, `src/lib/pywebviewApi.ts`, `src/lib/types.ts`: control de Ajustes y puente.
- `docs/FILOSOFIA.md`: columnas nuevas de `settings`.
- Toca el esquema de la base de datos: antes de probarlo con datos reales conviene respaldar `shell/agenda.db`, con el OK de Fredo.
