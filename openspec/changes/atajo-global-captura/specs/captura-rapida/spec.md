# Spec Delta

## Purpose

Define cómo se invoca y se cierra la captura rápida de un ítem, incluido el atajo global del sistema.

## ADDED Requirements

### Requirement: Un atajo global abre la captura rápida

La aplicación SHALL registrar un atajo global de Windows, por defecto `Win+Alt+A`, que desde cualquier aplicación traiga Ahora al frente y abra la captura rápida con el cursor en el campo de texto, sin clic adicional. MUST funcionar con la ventana escondida en la bandeja.

#### Scenario: Atajo con la ventana en la bandeja

- **WHEN** la ventana está escondida en la bandeja y el usuario pulsa el atajo desde otra aplicación
- **THEN** la ventana aparece al frente, la captura rápida está abierta y lo que el usuario teclee va al campo de texto

#### Scenario: Atajo con la ventana visible

- **WHEN** la ventana está visible en segundo plano y el usuario pulsa el atajo
- **THEN** la ventana pasa al frente y se abre la captura rápida

### Requirement: Cerrar la captura devuelve la ventana a su estado previo

Cuando la captura se abrió con el atajo y estaba la ventana escondida, la aplicación SHALL volver a esconderla al cerrar la captura, sea con `Escape` o al guardar el ítem. `Escape` SHALL cancelar la captura sin guardar nada.

#### Scenario: Escape con la ventana que estaba en la bandeja

- **WHEN** el usuario abrió la captura con el atajo desde la bandeja y pulsa `Escape`
- **THEN** no se crea ningún ítem y la ventana vuelve a esconderse

#### Scenario: Escape con la ventana que ya estaba visible

- **WHEN** la ventana estaba visible, el usuario abrió la captura con el atajo y pulsa `Escape`
- **THEN** la captura se cierra y la ventana sigue visible

### Requirement: El atajo se configura y se desactiva desde Ajustes

Ajustes SHALL permitir activar o desactivar el atajo y cambiar su combinación, y la aplicación SHALL conservar ambas elecciones entre arranques. Una combinación inválida MUST rechazarse sin cambiar la guardada.

#### Scenario: El usuario desactiva el atajo

- **WHEN** el usuario apaga el atajo en Ajustes
- **THEN** pulsar la combinación ya no hace nada y, tras reiniciar, sigue apagado

#### Scenario: El usuario cambia la combinación

- **WHEN** el usuario escribe `Ctrl+Alt+N` en Ajustes
- **THEN** el nuevo atajo abre la captura, el anterior deja de hacerlo y la elección sobrevive al reinicio

#### Scenario: Combinación inválida

- **WHEN** el usuario escribe una combinación sin modificador, como `A`
- **THEN** Ajustes la rechaza y el atajo anterior sigue activo

### Requirement: Un atajo ocupado nunca impide arrancar

Si otra aplicación ya usa la combinación, la aplicación MUST arrancar con normalidad sin mostrar ningún error, dejar el atajo inactivo e indicar el motivo en Ajustes.

#### Scenario: La combinación está ocupada

- **WHEN** otra aplicación tiene registrada la combinación y se abre Ahora
- **THEN** Ahora arranca con normalidad y Ajustes indica que el atajo está ocupado por otra aplicación

### Requirement: Las bases de datos existentes se actualizan sin perder datos

Al abrir una base creada con una versión anterior, la aplicación MUST conservar todos los datos y SHALL dejar el atajo activo con la combinación `Win+Alt+A`.

#### Scenario: Actualización de una agenda con datos

- **WHEN** se abre una agenda con ítems, reglas y ajustes creada antes de este cambio
- **THEN** los datos siguen intactos y el atajo está activo con `Win+Alt+A`
