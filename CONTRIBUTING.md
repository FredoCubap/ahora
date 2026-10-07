# Cómo contribuir

Flujo corto y sin ceremonias:

```
Cambio de OpenSpec → rama desde main → commits → npm run ci → PR a main → review → merge
```

---

## 1. Referencia

Un cambio que tiene spec en `openspec/changes/` se referencia por **el nombre de ese cambio** (por ejemplo `personalizacion-interfaz`). Aparece en la rama y en el PR.

Los arreglos chicos y el mantenimiento (`fix`, `docs`, `chore`) no necesitan cambio de OpenSpec ni referencia.

### Antes de crear la rama, planifica

Haz un esbozo de cinco minutos: nombre de la rama, commits previstos y si el trabajo cabe en [500 líneas](#tamaño-un-pr-debe-no-superar-500-líneas-cambiadas). Si no cabe, decide ya cómo dividirlo en varios PRs, no al final.

---

## 2. Ramas

```
<prefijo>/<nombre-del-cambio-o-descripcion-breve>
```

| Origen                  | Ejemplo                         |
| ----------------------- | ------------------------------- |
| Cambio de OpenSpec      | `feat/personalizacion-interfaz` |
| Arreglo o mantenimiento | `fix/fuentes-no-cargan`         |

- Se crea desde `main` actualizado. Una rama por cambio.
- Prefijo: el mismo que el del cambio principal (ver [prefijos](#prefijos)).
- Todo en minúsculas, kebab-case y **ASCII**: sin tildes, sin `ñ` y sin espacios, ni guion final.
- La rama se borra al mergear el PR.

### Conflictos con `main`

La rama se mantiene al día con **rebase**, no con merge. Así el PR solo contiene sus commits.

```bash
git fetch origin
git rebase origin/main
# en cada conflicto: edita los ficheros, git add <ficheros> y git rebase --continue
git push --force-with-lease
```

- Si te lías a mitad de un rebase, `git rebase --abort` te devuelve al punto de partida.
- Usa siempre `--force-with-lease`, nunca `--force`.
- Nunca hagas rebase ni push forzado de `main`.

---

## 3. Commits

### Atómicos y en orden

- **Un commit, un cambio lógico.** No mezcles en el mismo commit un refactor, un fix y una funcionalidad. Si cabe en un solo commit, que sea uno.
- **Orden:** primero la preparación (refactors y cambios de estructura), después la funcionalidad y al final los tests o docs, si van aparte.

### Título

```
<prefijo>: <descripcion>
```

- Verbo en tercera persona singular del presente: _agrega_, _corrige_, _elimina_. Nunca en infinitivo (_agregar_) ni en participio (_agregado_).
- Minúscula tras los dos puntos y sin punto final.
- Se permiten tildes y `ñ`.
- Sin paréntesis. Si hace falta aclarar algo, va en el body.
- Máximo 72 caracteres.
- No se referencia el cambio de OpenSpec: esa referencia ya está en la rama y en el PR.
- Prohibidos los títulos vacíos de contenido: `Update X.tsx`, `correcciones`, `cambios`, `wip`.
- Los commits salen bajo el nombre de quien los hace, sin `Co-Authored-By`.

### Prefijos

| Prefijo    | Uso                                                  |
| ---------- | ---------------------------------------------------- |
| `feat`     | Funcionalidad nueva o cambio visible para el usuario |
| `fix`      | Corrección de un error                               |
| `refactor` | Cambio interno sin cambio de comportamiento          |
| `test`     | Solo tests                                           |
| `docs`     | Solo documentación                                   |
| `chore`    | Dependencias, configuración, tooling                 |

### Body

**Obligatorio si el cambio no es trivial.** Explica el **porqué** (el qué ya lo cuenta el diff). Va separado del título por una línea en blanco y con líneas de 72 caracteres como máximo.

```
chore: vendoriza las fuentes Nunito y Karla

La app es 100 % local y no debe depender de Google Fonts para
verse bien: sin internet caía a la fuente del sistema.
```

---

## 4. Pull Requests

### Título

```
<Verbo en 3ª persona> <descripcion funcional>, rel <nombre-del-cambio>
```

- Mayúscula inicial, sin prefijo `feat:`/`fix:` y sin paréntesis.
- El `, rel <nombre-del-cambio>` solo va cuando hay cambio de OpenSpec.

```
Agrega la personalización de colores por usuario, rel personalizacion-interfaz
Corrige la carga de las fuentes sin internet
```

### Descripción

La plantilla [`.github/pull_request_template.md`](.github/pull_request_template.md) se carga sola al abrir el PR. Hay que rellenar todas sus secciones.

### Tamaño: un PR **debe** no superar 500 líneas cambiadas

Es una guía, no un bloqueo: un PR más grande no se rechaza por eso, pero sí tiene que estar justificado. Un PR pequeño se revisa antes y mejor.

- Se cuentan las líneas añadidas más las eliminadas.
- **No cuentan** los lockfiles, los tests, las fuentes ni los archivos generados.
- Si vas a superar el límite, divide el trabajo: refactor previo en un PR aparte, o la funcionalidad por pasos.
- Si dividirlo no tiene sentido, explica el motivo en la sección **Tamaño** del PR.

Para medirlo:

```bash
git diff --shortstat origin/main...HEAD -- . \
  ':(exclude,glob)**/package-lock.json' ':(exclude,glob)**/*.test.ts' \
  ':(exclude,glob)shell/test_*.py' ':(exclude,glob)public/fonts/**'
```

### Antes de pedir review

- `npm run ci` pasa en local (lint, tests del frontend, build y tests del shell). Los PRs no tienen CI automático.
- Lo has probado en la app (`npm run app:dev`) si cambia la interfaz o los avisos.

### Review y merge

- Nadie mergea su propio PR sin que otra persona o agente lo haya revisado. Fredo decide el merge.
- Las correcciones pedidas en la review se suben como commits nuevos en la misma rama.
- El merge se hace con **merge commit**. Por eso cada commit de la rama tiene que cumplir las reglas de la sección 3.
- Tras mergear, se borra la rama.

---

## 5. Trabajo con agentes

Ahora se desarrolla entre Fredo, Claude y OpenCode.

- **Fredo y Claude dirigen:** deciden el cambio, escriben la propuesta de OpenSpec y revisan.
- **OpenCode implementa:** aplica las tareas de `tasks.md` del cambio (`/opsx-apply`).
- **Claude revisa** el diff y corre `npm run ci` antes de dar algo por terminado.
- **Git lo escriben solo Fredo o Claude**, y solo cuando Fredo lo pide. OpenCode no hace commits, ni push, ni crea ramas.
- **Nada toca `shell/agenda.db`** (la agenda real) sin el OK de Fredo. Ver `CLAUDE.md`.

---

## 6. `main`

- Los cambios con spec y los `fix` entran por PR. El mantenimiento menor (`docs`, `chore`) puede ir directo mientras el proyecto tenga un solo mantenedor.
- Nunca se hace rebase ni push forzado de `main`.
