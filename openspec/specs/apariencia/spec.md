# apariencia Specification

## Purpose
Define cómo se ve la aplicación según la preferencia del usuario, empezando por el tema claro, oscuro o el del sistema.

## Requirements

### Requirement: La preferencia de tema se conserva entre ejecuciones

La aplicación SHALL guardar la preferencia de tema (Claro, Oscuro o Sistema) en el almacenamiento local de la aplicación y SHALL conservarla al cerrar y volver a abrir la aplicación.

#### Scenario: El usuario elige Oscuro y reinicia

- **WHEN** el usuario elige "Oscuro" en Ajustes, cierra la aplicación con "Salir" y la vuelve a abrir
- **THEN** la aplicación se abre en tema oscuro y Ajustes muestra "Oscuro" como la opción elegida

#### Scenario: Primera vez que se abre la aplicación

- **WHEN** el usuario abre la aplicación sin haber elegido nunca un tema
- **THEN** la preferencia es "Sistema"

### Requirement: El tema guardado se aplica antes de pintar la primera pantalla

La aplicación MUST aplicar el tema guardado antes de que se pinte la primera pantalla, en todas las pantallas y no solo en Ajustes, sin mostrar antes el tema del sistema.

#### Scenario: El tema guardado difiere del del sistema

- **WHEN** el sistema operativo está en tema oscuro, la preferencia guardada es "Claro" y se abre la aplicación
- **THEN** la pantalla principal se pinta directamente en tema claro, sin un instante previo en oscuro

#### Scenario: El tema vale para todas las pantallas

- **WHEN** la preferencia guardada es "Oscuro" y el usuario navega entre Ahora, Semana y Ajustes
- **THEN** las tres pantallas se muestran en tema oscuro

### Requirement: Cambiar el tema se aplica de inmediato

Cuando el usuario elija una opción de tema en Ajustes, la aplicación SHALL aplicarla en el mismo momento y guardarla, sin reiniciar.

#### Scenario: El usuario cambia de Claro a Oscuro

- **WHEN** el usuario toca "Oscuro" en Ajustes estando en tema claro
- **THEN** la interfaz pasa a oscuro al instante y la preferencia queda guardada

### Requirement: La opción Sistema sigue al tema del sistema operativo

Con la preferencia "Sistema", la aplicación SHALL mostrar el tema claro u oscuro que tenga activo el sistema operativo.

#### Scenario: El sistema está en oscuro

- **WHEN** la preferencia es "Sistema" y el sistema operativo está en tema oscuro
- **THEN** la aplicación se muestra en tema oscuro

### Requirement: Las bases de datos existentes se actualizan sin perder datos

Al abrir una base de datos creada con una versión anterior, la aplicación MUST conservar todos los datos del usuario y SHALL dejar la preferencia de tema en "Sistema".

#### Scenario: Actualización de una agenda con datos

- **WHEN** se abre una agenda con ítems, reglas y ajustes creada antes de este cambio
- **THEN** todos esos datos siguen intactos y la preferencia de tema es "Sistema"
