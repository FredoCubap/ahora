# Tasks

## 1. Base de datos

- [ ] 1.1 En `shell/db.py`, añadir `SCHEMA_V4` (`hotkey_enabled` y `hotkey_combination` en `settings`, con sus defaults y `CHECK`) y agregarlo al final de `MIGRATIONS`, sin editar los anteriores. Verificar con `npm run ci shell`.
- [ ] 1.2 En `shell/test_db.py`, comprobar que una base en la versión 3 con datos sube a la 4 sin perder nada y con el atajo activo en `Win+Alt+A`, y que `hotkey_enabled = 2` lanza `sqlite3.IntegrityError`. Verificar que usa directorio temporal.
- [ ] 1.3 Añadir las dos columnas a la tabla `settings` del esquema de `docs/FILOSOFIA.md`.

## 2. Atajo en el shell

- [ ] 2.1 Crear `shell/hotkey.py` con `parse_combination`, la clase del atajo (hilo con bucle de mensajes, `start`, `stop`, estado con motivo) y degradación en silencio si no es Windows o el atajo está ocupado.
- [ ] 2.2 Crear `shell/test_hotkey.py`: parseo válido e inválido, y registro, desregistro y atajo ocupado con el módulo de Windows simulado. Verificar con `npm run ci shell`.
- [ ] 2.3 En `shell/main.py`: arrancar el atajo con los ajustes guardados, traer la ventana al frente y disparar `ahora:captura`, llevar la bandera de ventana escondida, y exponer `configure_hotkey`, `get_hotkey_status` y `captura_closed` en `Api`. Probar la lógica de estado previo en un test con ventana falsa.

## 3. Frontend

- [ ] 3.1 En `src/lib/types.ts`, añadir `hotkey_enabled` y `hotkey_combination` a `settingsSchema` y actualizar los `Settings` de prueba.
- [ ] 3.2 En `src/lib/pywebviewApi.ts` y `src/lib/system.ts`, añadir `configure_hotkey`, `get_hotkey_status` y `captura_closed`.
- [ ] 3.3 En `src/App.tsx`, abrir la captura al recibir `ahora:captura` y avisar al shell al cerrarla. En `CapturaModal.tsx`, cerrar con `Escape`.
- [ ] 3.4 En `src/routes/Ajustes.tsx`, añadir el toggle y el campo de combinación con el motivo si está inactivo, siguiendo el patrón del autostart. Test de vitest de la lógica pura del estado mostrado.

## 4. Verificación integrada

- [ ] 4.1 `npm run ci` en verde.
- [ ] 4.2 En Windows, con una copia aislada y una base de demostración (sin tocar `shell/agenda.db`), comprobar los escenarios del spec: atajo con la ventana en bandeja, `Escape` que la devuelve a la bandeja, cambio y desactivación en Ajustes, y atajo ocupado.
- [ ] 4.3 Antes de usar la agenda real, respaldar `shell/agenda.db` con el OK de Fredo.
