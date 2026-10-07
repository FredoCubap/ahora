# Proposal

## Why

"Salir" no cierra la aplicación. Ni el de la bandeja (clic derecho en el ícono → "Salir") ni el botón "Salir de Ahora" de Ajustes: la ventana desaparece, pero el proceso sigue vivo, con el ícono en la bandeja y el motor de avisos corriendo. La única forma de cerrar la app es matar `python.exe` desde el Administrador de tareas. Fredo lo encontró probando el ícono nuevo.

La causa está verificada (ver design.md): "Salir" pide cerrar la ventana, pero el manejador que hace que la X solo esconda la ventana intercepta ese cierre y lo cancela, porque no distingue "el usuario pulsó la X" de "la app quiere terminar".

## What Changes

- "Salir" (bandeja y Ajustes) termina el proceso de verdad: desaparece la ventana, el ícono de la bandeja y el motor de avisos.
- La X de la ventana sigue escondiéndola en la bandeja, como hasta ahora.
- El manejador de cierre pasa a saber cuándo la app está saliendo y deja pasar ese cierre.
- Se añade un test de la lógica de cierre (entra en `npm run ci`) y una comprobación de punta a punta que abre una ventana (como `smoke_test.py`, no entra en CI), porque nada probaba el camino de salida y por eso el fallo llegó a `main`.

## Capabilities

### New Capabilities

- `ciclo-de-vida-de-la-app`: cómo arranca, se esconde y termina Ahora. Este cambio fija que la X esconde y "Salir" termina; el arranque con el sistema (`--hidden`) puede incorporarse después.

### Modified Capabilities

<!-- Ninguna: openspec/specs/ no tiene capacidades previas. -->

## Impact

- `shell/main.py`: `_quit_app` y el manejador de cierre de la ventana (hoy una función anidada en `main()`).
- `shell/test_quit.py` (nuevo, en CI) y `shell/smoke_quit.py` (nuevo, manual).
- `CLAUDE.md` y `docs/DESARROLLO.md`: la trampa y los tests nuevos.
- Sin dependencias nuevas, sin cambios en el frontend ni en la base de datos.
- Fuera de alcance, pero anotado en design.md: qué hace el manejador de cierre cuando Windows se apaga o se cierra la sesión.
