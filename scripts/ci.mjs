// Corre en local todo lo que tiene que estar en verde antes de dar algo por terminado.
// Uso: npm run ci [lint|test|build|shell]
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHELL_DIR = join(ROOT, "shell");
const PYTHON = join(SHELL_DIR, ".venv", "Scripts", "python.exe");

const run = (command, cwd = ROOT) =>
  spawnSync(command, { cwd, shell: true, stdio: "inherit" }).status === 0;

// Un job devuelve true si pasó. `shell` va después de `build` porque
// test_serve.py sirve el dist/ recién compilado.
const jobs = {
  lint: () => run("npm run lint"),
  test: () => run("npm test"),
  build: () => run("npm run build"),
  shell: () => {
    if (!existsSync(PYTHON)) {
      console.error(
        "No existe shell/.venv. Crealo con:\n" +
          "  python -m venv shell/.venv\n" +
          "  shell\\.venv\\Scripts\\pip install -r shell\\requirements.txt",
      );
      return false;
    }
    // smoke_test.py no entra: abre la ventana y escribe en la agenda real.
    const tests = readdirSync(SHELL_DIR)
      .filter((f) => /^test_.*\.py$/.test(f))
      .sort();
    return tests.map((t) => run(`"${PYTHON}" ${t}`, SHELL_DIR)).every(Boolean);
  },
};

const requested = process.argv[2];
if (requested && !jobs[requested]) {
  console.error(`Job desconocido: ${requested}. Opciones: ${Object.keys(jobs).join(", ")}`);
  process.exit(1);
}

const failed = [];
for (const name of requested ? [requested] : Object.keys(jobs)) {
  console.log(`\n══ ${name} ══`);
  if (!jobs[name]()) failed.push(name);
}

console.log(failed.length ? `\n✗ Fallaron: ${failed.join(", ")}` : "\n✓ Todo en verde");
process.exit(failed.length ? 1 : 0);
