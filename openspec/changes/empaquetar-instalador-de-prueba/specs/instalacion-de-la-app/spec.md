# Spec Delta

## Purpose

Define cómo se instala, actualiza y desinstala Ahora en Windows, y dónde guarda los datos del usuario una vez instalada.

## ADDED Requirements

### Requirement: Los datos del usuario viven fuera de la carpeta de instalación

La aplicación instalada SHALL guardar la agenda y el registro de errores en `%LOCALAPPDATA%\Ahora`, y MUST NOT escribir datos dentro de su carpeta de instalación.

#### Scenario: Primer arranque tras instalar

- **WHEN** el usuario abre Ahora recién instalada
- **THEN** la agenda se crea en `%LOCALAPPDATA%\Ahora` y la carpeta de instalación no contiene ningún dato del usuario

#### Scenario: Ejecución desde el código

- **WHEN** la aplicación se ejecuta desde el repositorio, sin empaquetar
- **THEN** sigue usando `shell/agenda.db`, como hasta ahora

### Requirement: Actualizar o reinstalar conserva la agenda

Instalar una versión nueva sobre una existente MUST conservar todos los datos del usuario.

#### Scenario: Se instala otra versión encima

- **WHEN** el usuario con ítems guardados ejecuta un instalador más reciente
- **THEN** la aplicación se actualiza, se cierra antes si estaba abierta, y los ítems siguen en su sitio

### Requirement: Desinstalar quita la aplicación y conserva los datos

Al desinstalar, el sistema SHALL eliminar la aplicación y su entrada de inicio automático, y MUST NOT borrar la agenda.

#### Scenario: El usuario desinstala Ahora

- **WHEN** el usuario desinstala Ahora, que tenía el inicio con el sistema activado
- **THEN** la carpeta de instalación desaparece, Ahora ya no arranca al iniciar sesión y `%LOCALAPPDATA%\Ahora` conserva la agenda

### Requirement: La instalación no requiere permisos de administrador

El instalador SHALL poder ejecutarse con un usuario normal, sin elevar permisos.

#### Scenario: Usuario sin permisos de administrador

- **WHEN** un usuario estándar ejecuta el instalador
- **THEN** la instalación termina sin pedir credenciales de administrador

### Requirement: El instalador se identifica como versión de prueba

El instalador SHALL mostrar en su nombre de archivo y en su versión que es una versión de prueba, para que no se confunda con una distribución oficial.

#### Scenario: Se genera el instalador

- **WHEN** se construye el instalador
- **THEN** el archivo se llama `Ahora-Setup-prueba.exe` y su versión incluye la palabra "prueba"
