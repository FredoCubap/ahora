// Construye el instalador de PRUEBA con Inno Setup.
// Uso: npm run installer (después de npm run package)
// Requiere Inno Setup 6+ instalado en la máquina (no es dependencia del repo).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ISS = join(ROOT, "installer", "ahora.iss");
const EXE = join(ROOT, "build", "package", "Ahora", "Ahora.exe");
const SETUP = join(ROOT, "build", "installer", "Ahora-Setup-prueba.exe");

function fail(message) {
  console.error(message);
  process.exit(1);
}

// La versión sale de package.json con "-prueba" agregado: es el artefacto lo
// que es de prueba, no el código (package.json sigue en 0.1.0).
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
const version = `${pkg.version}-prueba`;

if (!existsSync(EXE)) {
  fail(
    `No está ${EXE}. Genera el empaquetado primero con:\n  npm run package`,
  );
}

function findIscc() {
  const where = spawnSync("where ISCC.exe", { shell: true });
  if (where.status === 0) {
    return where.stdout.toString().split(/\r?\n/)[0].trim();
  }
  const defaults = [
    "C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe",
    "C:\\Program Files\\Inno Setup 6\\ISCC.exe",
  ];
  return defaults.find((p) => existsSync(p));
}

const iscc = findIscc();
if (!iscc) {
  fail(
    "ISCC.exe no encontrado. Instalá Inno Setup 6+ desde\n" +
      "  https://jrsoftware.org/isdl.php\n" +
      "y volvé a correr npm run installer.",
  );
}

if (
  spawnSync(`"${iscc}" /DMyAppVersion=${version} "${ISS}"`, {
    cwd: ROOT,
    shell: true,
    stdio: "inherit",
  }).status !== 0
) {
  fail("Falló ISCC.");
}

if (!existsSync(SETUP)) {
  fail(`ISCC terminó pero no está ${SETUP}: algo cambió en sus salidas.`);
}

console.log(`\n✓ Instalador en ${SETUP} (versión ${version}, sin firmar)`);
