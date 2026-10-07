# Tasks

## 1. Base de datos

- [ ] 1.1 En `shell/db.py`, añadir `SCHEMA_V3` (`ALTER TABLE settings ADD COLUMN theme TEXT NOT NULL DEFAULT 'sistema' CHECK (theme IN ('claro','oscuro','sistema'))`) y agregarlo al final de `MIGRATIONS`, sin editar `SCHEMA_V1` ni `SCHEMA_V2`. Verificar con `npm run ci shell`.
- [ ] 1.2 En `shell/test_db.py`, comprobar que una base en la versión 2 con ítems, reglas y ajustes sube a la 3 sin perder datos y con `theme = 'sistema'`; que `update_settings({"theme": "oscuro"})` se guarda; y que `update_settings({"theme": "rosa"})` lanza `sqlite3.IntegrityError`. Verificar que el test usa un directorio temporal y que `npm run ci shell` pasa.
- [ ] 1.3 Añadir `theme` a la tabla `settings` del esquema de `docs/FILOSOFIA.md`. Verificar que el documento lo muestra junto a las demás columnas de `settings`.

## 2. Arranque sin parpadeo

- [ ] 2.1 En `shell/main.py`, añadir una función pura que agregue `?theme=<valor>` a la URL (válida para el build servido y para el dev server) y usarla en `main()` con `db.get_settings()["theme"]` después de `db.migrate()`. Verificar con un test en `shell/` (`test_*.py`) que cubra las dos URLs y que `npm run ci shell` lo recoge.
- [ ] 2.2 En `index.html`, añadir un script en línea, antes del módulo de React, que lea `?theme=` y ponga `data-theme="light"` o `"dark"` en `<html>` (nada con `sistema` o sin parámetro). Verificar con `npm run build` que el script queda en `dist/index.html`.

## 3. Frontend

- [ ] 3.1 En `src/lib/types.ts`, añadir `theme` (`"claro" | "oscuro" | "sistema"`) a `settingsSchema` y exportar el tipo `ThemeChoice` desde ahí. Actualizar los objetos `Settings` de prueba (p. ej. `src/lib/avisoEngine.test.ts`) con `theme: "sistema"`. Verificar con `npx tsc --noEmit` y `npm test`.
- [ ] 3.2 Crear en `src/lib/` la función pura `themeAttribute(choice)` (`"claro"` a `"light"`, `"oscuro"` a `"dark"`, `"sistema"` a `null`) con su test de vitest. Verificar que `npm test` pasa con los casos nuevos.
- [ ] 3.3 Reescribir `src/hooks/useTheme.ts` para que `choice` salga de `settings.theme` del store y `setChoice` aplique el atributo de inmediato y persista con `updateSettings({ theme })`, sin `localStorage`. Añadir en `src/App.tsx` el efecto que aplica el atributo cuando `settings.theme` cambia. `Ajustes.tsx` no debe cambiar de aspecto. Verificar con `npm run ci`.

## 4. Verificación integrada

- [ ] 4.1 Con una copia aislada de la app y una base de datos de demostración (sin tocar `shell/agenda.db`), comprobar los escenarios del spec: elegir Oscuro, "Salir" y volver a abrir deja la app en oscuro; con el sistema en oscuro y "Claro" guardado, la primera pantalla se pinta en claro sin pasar por oscuro; el tema vale en Ahora, Semana y Ajustes.
- [ ] 4.2 Antes de usar la app con la agenda real, respaldar `shell/agenda.db` con el OK de Fredo y comprobar que abre sin perder datos y con la preferencia en "Sistema".
