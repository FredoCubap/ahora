; Instalador de PRUEBA de Ahora (no distribución oficial).
;
; Lo construye `npm run installer`, que pasa AppVersion y OutputDir. Se instala
; por usuario, sin administrador: `PrivilegesRequired=lowest` y la app va a
; %LOCALAPPDATA%\Programs\Ahora. Al desinstalar se borra la entrada de inicio
; automático que la propia app escribe (Run\Ahora), pero la agenda en
; %LOCALAPPDATA%\Ahora se conserva a propósito.
;
; Requiere Inno Setup 6+ en la máquina (no es dependencia del repo).

#define MyAppName "Ahora"
#define MyAppVersion "0.0.0-prueba"
#define MyAppPublisher "FredoCubap"
#define MyOutputBaseFilename "Ahora-Setup-prueba"

[Setup]
AppId={{3BC5A30D-EF4A-4691-AA60-1D8E4C0D78F5}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
; Sin firma: SmartScreen va a avisar. Esperado en una versión de prueba.
PrivilegesRequired=lowest
DefaultDirName={localappdata}\Programs\{#MyAppName}
DisableProgramGroupPage=yes
; 64 bits, como el .exe que produce PyInstaller en esta máquina.
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Al actualizar con la app abierta, la cierra antes en vez de fallar.
CloseApplications=yes
; Ícono del asistente (el mismo de la app).
SetupIconFile=..\assets\icon.ico
; Salida (la fija `npm run installer` con /D).
OutputDir=..\build\installer
OutputBaseFilename={#MyOutputBaseFilename}
Compression=lzma
SolidCompression=yes

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear un acceso directo en el escritorio"; GroupDescription: "Accesos directos:"; Flags: unchecked

[Files]
; Todo lo que produjo `npm run package` (modo carpeta de PyInstaller).
Source: "..\build\package\Ahora\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\Ahora.exe"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\Ahora.exe"; Tasks: desktopicon

[Registry]
; La entrada Run\Ahora la escribe la propia app al activar el autostart (no el
; instalador), así que acá no se crea nada: solo se declara para BORRARLA al
; desinstalar. La agenda en %LOCALAPPDATA%\Ahora no se toca nunca.
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: none; ValueName: "Ahora"; Flags: uninsdeletevalue

[Run]
; Abrirla al terminar de instalar, sin elevar.
Filename: "{app}\Ahora.exe"; Description: "Abrir Ahora"; Flags: nowait postinstall skipifsilent shellexec
