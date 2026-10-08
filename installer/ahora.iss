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
; La versión la pasa `npm run installer` con /D. El #ifndef es obligatorio:
; un #define pelado pisaría el valor de la línea de comandos (ISCC procesa
; los /D primero, y la última definición gana).
#ifndef MyAppVersion
  #define MyAppVersion "0.0.0-prueba"
#endif
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

[Code]
// Si la app sigue corriendo al instalar o desinstalar (fácil: la X la esconde
// en vez de cerrarla), se la termina a la fuerza antes de tocar archivos. El
// cierre elegante vía Restart Manager a veces no la termina (el teardown de
// WebView2 se cuelga de forma intermitente) y sin esto la instalación se clava
// en el diálogo de "no pudo cerrar" o el desinstalador deja archivos
// bloqueados huérfanos. No hay estado sin guardar que perder: todo va a
// SQLite al momento (igual que matar desde el Administrador de tareas).
procedure KillApp();
var
  ResultCode: Integer;
begin
  Exec('taskkill.exe', '/F /IM Ahora.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssInstall then
    KillApp();
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
    KillApp();
end;
