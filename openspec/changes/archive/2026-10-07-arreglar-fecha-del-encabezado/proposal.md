# Proposal

## Why

El encabezado de la pantalla principal muestra la fecha mal escrita: "Miércoles, 07 De Octubre", con "De" en mayúscula y un cero inicial en el día. Además la fecha se calcula una sola vez al cargar el módulo, así que una app que vive días en la bandeja (que es su uso normal) enseña la fecha del día en que arrancó, no la de hoy.

## What Changes

- El texto de la fecha del encabezado de _Ahora_ pasa a escribirse como cualquier fecha en español: solo la primera letra en mayúscula ("Miércoles, 7 de octubre").
- La fecha se calcula al pintar la pantalla, no al cargar el módulo, para que refleje el día actual.
- Se quita el cero inicial del día, igual que ya hace la pantalla _Semana_ ("5 – 11 de octubre").
- Se añade un test de la función que formatea la fecha, porque hoy no existe ninguno.

No cambia ningún dato ni la base de datos.

## Capabilities

### New Capabilities

- `pantalla-ahora`: lo que muestra la pantalla principal "Ahora y a continuación". Este cambio solo fija el requisito de la fecha del encabezado; el resto del comportamiento de la pantalla (zonas, seguimiento) sigue descrito en `docs/FILOSOFIA.md` y puede incorporarse a este spec más adelante.

### Modified Capabilities

<!-- Ninguna: openspec/specs/ está vacío, no hay capacidades previas. -->

## Impact

- `src/routes/Ahora.tsx`: la constante `DATE_LABEL` (calculada al importar el módulo) y la clase CSS `capitalize` del encabezado, que pone mayúscula a cada palabra.
- `src/lib/formatTime.ts` y su test: lugar natural para la nueva función de formato.
- Sin dependencias nuevas, sin cambios en `shell/`.
- Fuera de alcance: que la pantalla se vuelva a pintar sola cuando cambia el día mientras la ventana está oculta. Hoy ninguna pantalla se refresca con el paso del tiempo; eso merece su propio cambio.
