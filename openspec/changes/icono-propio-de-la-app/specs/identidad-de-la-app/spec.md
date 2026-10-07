# Spec Delta

## Purpose

Define cómo se presenta Ahora en el sistema operativo: el ícono que identifica a la aplicación en su ventana, en la barra de tareas y en la bandeja.

## ADDED Requirements

### Requirement: La aplicación usa su ícono propio en todo el sistema

La aplicación SHALL mostrar el ícono de Ahora en la ventana, en la barra de tareas y en la bandeja del sistema, y MUST NOT mostrar el ícono de otra herramienta (Python, Tauri o Vite).

#### Scenario: La ventana está abierta

- **WHEN** el usuario abre Ahora
- **THEN** la barra de título de la ventana y el botón de la barra de tareas muestran el ícono de Ahora

#### Scenario: La aplicación vive en la bandeja

- **WHEN** el usuario cierra la ventana con la X y la aplicación sigue activa en la bandeja
- **THEN** el ícono de la bandeja es el de Ahora

#### Scenario: Llega un aviso

- **WHEN** la aplicación lanza una notificación del sistema
- **THEN** la notificación sale desde el ícono de Ahora en la bandeja

### Requirement: El ícono es nítido en los tamaños pequeños

El ícono SHALL incluir versiones propias para los tamaños que usa Windows (16, 24, 32, 48, 64, 128 y 256 píxeles), de modo que se vea definido en la bandeja y en la barra de tareas.

#### Scenario: Bandeja en una pantalla de densidad normal

- **WHEN** Windows dibuja el ícono de la bandeja a 16 o 32 píxeles
- **THEN** usa la versión diseñada para ese tamaño y la forma de la "A" se distingue sin bordes borrosos

### Requirement: El proyecto no incluye logos de otras herramientas

Los recursos de la aplicación MUST NOT incluir el logo de Tauri ni el de Vite, para que ninguno pueda aparecer como ícono de Ahora.

#### Scenario: Se revisan los recursos públicos

- **WHEN** se revisa el contenido de `public/` y del favicon de la página
- **THEN** solo aparecen recursos de Ahora
