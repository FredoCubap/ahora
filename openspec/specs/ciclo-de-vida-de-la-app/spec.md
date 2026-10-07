# ciclo-de-vida-de-la-app Specification

## Purpose

Define cómo arranca, se esconde y termina Ahora: la aplicación vive en la bandeja del sistema y solo termina cuando el usuario lo pide con "Salir".

## Requirements

### Requirement: La X de la ventana esconde la aplicación en la bandeja

Al cerrar la ventana con la X, la aplicación SHALL esconder la ventana y seguir ejecutándose en la bandeja, con el motor de avisos activo.

#### Scenario: El usuario cierra la ventana con la X

- **WHEN** el usuario pulsa la X de la ventana
- **THEN** la ventana desaparece, el ícono sigue en la bandeja y la aplicación sigue avisando

#### Scenario: El usuario vuelve a abrirla

- **WHEN** la ventana está escondida y el usuario elige "Abrir Ahora" en el menú de la bandeja
- **THEN** la ventana vuelve a mostrarse con la misma información

### Requirement: "Salir" termina la aplicación por completo

La aplicación SHALL terminar de verdad cuando el usuario elige "Salir", sea desde el menú de la bandeja o desde Ajustes, y MUST NOT dejar ningún proceso suyo en ejecución.

#### Scenario: Salir desde el menú de la bandeja

- **WHEN** el usuario hace clic derecho en el ícono de la bandeja y elige "Salir"
- **THEN** la aplicación termina, el ícono desaparece de la bandeja y no queda ningún proceso de Ahora

#### Scenario: Salir desde Ajustes

- **WHEN** el usuario toca "Salir de Ahora" en Ajustes
- **THEN** la aplicación termina del mismo modo

#### Scenario: Salir con la ventana escondida

- **WHEN** la ventana está escondida en la bandeja y el usuario elige "Salir" en su menú
- **THEN** la aplicación termina, sin volver a mostrar la ventana

### Requirement: Tras salir no hay más avisos

Una vez que el usuario ha elegido "Salir", la aplicación MUST NOT lanzar ningún aviso ni notificación hasta que se vuelva a abrir.

#### Scenario: Llega la hora de un ítem después de salir

- **WHEN** el usuario sale de la aplicación y pasa la hora de un ítem con aviso
- **THEN** no se muestra ningún banner, sonido ni notificación del sistema
