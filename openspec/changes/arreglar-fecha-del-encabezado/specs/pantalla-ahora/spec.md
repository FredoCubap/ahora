# Spec Delta

## Purpose

Describe lo que muestra la pantalla principal "Ahora y a continuación", la que responde a la pregunta de qué toca en las próximas horas.

## ADDED Requirements

### Requirement: La fecha del encabezado se escribe como una fecha en español

El encabezado de la pantalla principal SHALL mostrar la fecha de hoy con el formato `<día de la semana>, <día> de <mes>`, con mayúscula solo en la primera letra del texto y sin cero inicial en el día.

#### Scenario: Día de un solo dígito

- **WHEN** hoy es miércoles 7 de octubre de 2026
- **THEN** el encabezado muestra "Miércoles, 7 de octubre"

#### Scenario: Día de dos dígitos

- **WHEN** hoy es jueves 15 de octubre de 2026
- **THEN** el encabezado muestra "Jueves, 15 de octubre"

#### Scenario: El mes no lleva mayúscula

- **WHEN** el encabezado muestra cualquier fecha
- **THEN** la palabra "de" y el nombre del mes aparecen en minúscula

### Requirement: La fecha del encabezado corresponde al día actual al pintar la pantalla

El encabezado MUST calcular la fecha a partir del día actual cada vez que la pantalla se pinta, y no a partir del día en que arrancó la aplicación.

#### Scenario: La aplicación lleva abierta desde ayer

- **WHEN** la aplicación arrancó ayer, sigue abierta en la bandeja y la pantalla principal se vuelve a pintar hoy
- **THEN** el encabezado muestra la fecha de hoy y no la de ayer
