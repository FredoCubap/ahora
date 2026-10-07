# Design

## Context

El encabezado de `src/routes/Ahora.tsx` toma su texto de una constante de módulo (`DATE_LABEL`), formateada con `Intl.DateTimeFormat("es-ES", { weekday: "long", day: "2-digit", month: "long" })`, y la pinta dentro de un `<div>` con la clase de Tailwind `capitalize`. Esa clase aplica `text-transform: capitalize`, que pone mayúscula a **cada palabra**, de ahí el "De Octubre". Ver proposal.md para la motivación.

`src/lib/formatTime.ts` ya agrupa las funciones puras de formato de fecha (`toLocalIso`, `formatHM`, `formatRelative`) y tiene su test en `formatTime.test.ts`.

## Goals / Non-Goals

**Goals:**

- Que la fecha salga como "Miércoles, 7 de octubre" y refleje el día en que se pinta la pantalla.
- Que el formato quede en una función pura con test, siguiendo el patrón de `formatTime.ts`.

**Non-Goals:**

- Hacer que la pantalla se repinte sola al cambiar de día. Hoy ninguna pantalla se refresca con el paso del tiempo (el motor de avisos corre cada 20 s pero no toca el estado de la interfaz); eso es un cambio aparte.
- Tocar la pantalla _Semana_: sus textos ya están bien (su `capitalize` actúa sobre una sola palabra).

## Decisions

**1. Función pura `formatHeaderDate(date: Date): string` en `src/lib/formatTime.ts`.**
Devuelve el texto ya listo. Se descarta dejar el formateo en el componente porque no se podría testear sin montar React, y el error que se corrige es justamente de formato.

**2. La mayúscula inicial se pone en JavaScript, no con CSS.**
`Intl` devuelve "miércoles, 7 de octubre"; la función sube la primera letra con `toLocaleUpperCase("es")`. Se descarta mantener `capitalize` de CSS porque no distingue la primera palabra del resto, y se descarta `first-letter:uppercase` porque deja el texto del DOM en minúscula (peor para lectores de pantalla y para tests).

**3. Día sin cero inicial (`day: "numeric"`).**
Es el mismo criterio que ya usa _Semana_ ("5 – 11 de octubre") y evita "07". Es un cambio observable, por eso está en el spec.

**4. La función se llama dentro del componente, en cada pintado.**
Se elimina la constante de módulo. Formatear una fecha cuesta microsegundos, así que no hace falta memoizar. Con esto el texto es siempre el del día en que la pantalla se pinta.

## Risks / Trade-offs

- [El texto sigue sin cambiar solo a medianoche] → Es una limitación conocida y declarada como fuera de alcance; el requisito del spec habla de "al pintar la pantalla", no de repintado automático.
- [El formato depende del `Intl` del WebView2 instalado] → `es-ES` está soportado desde hace años; el test fija el resultado esperado y avisaría si cambiara.
