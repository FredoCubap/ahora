// Empaqueta la app con PyInstaller (modo carpeta).
// Uso: npm run package
// Requiere: shell\.venv\Scripts\pip install -r shell\requirements-dev.txt
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHELL_DIR = join(ROOT, "shell");
const PYTHON = join(SHELL_DIR, ".venv", "Scripts", "python.exe");
const EXE = join(ROOT, "build", "package", "Ahora", "Ahora.exe");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!existsSync(PYTHON)) {
  fail(
    "No existe shell/.venv. Crealo con:\n" +
      "  python -m venv shell/.venv\n" +
      "  shell\\.venv\\Scripts\\pip install -r shell\\requirements-dev.txt",
  );
}

// PyInstaller resuelve las rutas relativas respecto al .spec, no respecto a
// donde se lo invoca: por eso todo va absoluto. Las salidas van a build/,
// ignorado por git.
const check = spawnSync(`"${PYTHON}" -m PyInstaller --version`, { shell: true });
if (check.status !== 0) {
  fail(
    "PyInstaller no está instalado en shell/.venv. Instalalo con:\n" +
      "  shell\\.venv\\Scripts\\pip install -r shell\\requirements-dev.txt",
  );
}

if (
  spawnSync("npm run build", { cwd: ROOT, shell: true, stdio: "inherit" }).status !== 0
) {
  fail("Falló npm run build: no se empaqueta sin la interfaz compilada.");
}

const args = [
  "--noconfirm",
  "--clean",
  "--windowed",
  "--name Ahora",
  `--icon "${join(ROOT, "assets", "icon.ico")}"`,
  `--paths "${join(ROOT, "shell")}"`,
  `--add-data "${join(ROOT, "dist")};dist"`,
  `--add-data "${join(ROOT, "assets")};assets"`,
  `--distpath "${join(ROOT, "build", "package")}"`,
  `--workpath "${join(ROOT, "build", "work")}"`,
  `--specpath "${join(ROOT, "build")}"`,
  `"${join(SHELL_DIR, "main.py")}"`,
].join(" ");

if (
  spawnSync(`"${PYTHON}" -m PyInstaller ${args}`, {
    cwd: ROOT,
    shell: true,
    stdio: "inherit",
  }).status !== 0
) {
  fail("Falló PyInstaller.");
}

if (!existsSync(EXE)) {
  fail(`PyInstaller terminó pero no está ${EXE}: algo cambió en sus salidas.`);
}

console.log(`\n✓ Empaquetado en ${EXE}`);
