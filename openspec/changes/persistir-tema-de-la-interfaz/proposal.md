# Proposal

## Why

La preferencia de tema (Claro / Oscuro / Sistema) no sobrevive a un reinicio y, aunque sobreviviera, solo se aplicaría al abrir Ajustes. Hoy se guarda en `localStorage`, y eso no funciona en esta app por dos motivos independientes:

- pywebview arranca por defecto en modo privado, que no conserva `localStorage` entre ejecuciones.
- La app se sirve desde un puerto aleatorio en cada arranque, y `localStorage` es por origen: cada arranque sería un origen distinto aunque se desactivara el modo privado.

Además, el tema solo se aplica desde el hook que usa la pantalla Ajustes, así que en la pantalla principal manda siempre el tema del sistema operativo. Con el sistema en oscuro, elegir "Claro" no se nota hasta entrar a Ajustes, y se pierde al cerrar la app.

Se arregla ahora porque la personalización de la interfaz por usuario es el siguiente paso del producto, y necesita una base de preferencias que de verdad se conserve.

## What Changes

- La preferencia de tema pasa a guardarse en la base de datos local, junto al resto de los ajustes (nueva columna `theme` en `settings`, con una migración nueva; las bases de datos existentes quedan en "Sistema").
- El tema guardado se aplica en todas las pantallas desde el primer pintado, sin pasar antes por el tema del sistema.
- Cambiar el tema en Ajustes se aplica al instante y se guarda.
- Se elimina el uso de `localStorage` para el tema.

## Capabilities

### New Capabilities

- `apariencia`: cómo se ve la app según la preferencia del usuario. Este cambio fija el requisito del tema claro/oscuro/sistema y que se conserve; la personalización por usuario que viene después (colores, etc.) se añade a esta misma capacidad.

### Modified Capabilities

<!-- Ninguna: openspec/specs/ está vacío, no hay capacidades previas. -->

## Impact

- `shell/db.py`: migración `SCHEMA_V3` (columna `theme` en `settings`). Migración nueva, sin tocar las existentes.
- `shell/main.py`: lee el tema guardado al arrancar y lo pasa a la página.
- `index.html`: aplica el tema antes de que React pinte.
- `src/lib/types.ts`, `src/hooks/useTheme.ts`, `src/App.tsx`, `src/routes/Ajustes.tsx`: el tema pasa a vivir en `settings` del store.
- `src/lib/avisoEngine.test.ts` y tests del shell: los objetos `Settings` de prueba ganan el campo nuevo; se añaden tests de la migración.
- Sin dependencias nuevas. Toca el esquema de la base de datos, así que antes de probarlo con datos reales conviene respaldar `shell/agenda.db`.
