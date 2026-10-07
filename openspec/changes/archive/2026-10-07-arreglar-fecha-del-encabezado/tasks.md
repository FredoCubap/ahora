# Tasks

## 1. Función de formato con su test

- [x] 1.1 Añadir `formatHeaderDate(date: Date): string` a `src/lib/formatTime.ts`: formato `es-ES` con `weekday: "long"`, `day: "numeric"`, `month: "long"` y mayúscula solo en la primera letra del texto. Verificar con `npm test` que sigue pasando todo lo existente.
- [x] 1.2 Añadir en `src/lib/formatTime.test.ts` los casos del spec: miércoles 7 de octubre de 2026 da "Miércoles, 7 de octubre", jueves 15 de octubre de 2026 da "Jueves, 15 de octubre", y "de" y el mes quedan en minúscula. Verificar que `npm test` pasa con los casos nuevos.

## 2. Usarla en la pantalla Ahora

- [x] 2.1 En `src/routes/Ahora.tsx`, eliminar la constante `DATE_LABEL` y la clase `capitalize` del encabezado, y mostrar `formatHeaderDate(new Date())` calculado en cada pintado. Verificar que `npm run ci` queda en verde.
- [x] 2.2 Comprobar en la app real (`npm run app:build`) que el encabezado muestra la fecha de hoy bien escrita, sin "De" en mayúscula ni cero inicial.
