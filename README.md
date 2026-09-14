<div align="center">

# Ahora

### Tu agenda no debería esperar a que la abras.

**Ahora** es una agenda personal de escritorio que te habla:
_"esto ahora"_ · _"en 20 minutos, esto"_ · _"esto se te venció"_.

Nada de tableros que consultas. Nada de listas que se pudren.
Solo la pregunta que importa: **¿qué toca ahora?**

<sub>Hecho con Tauri · React · SQLite local · sin servidor · sin cuentas · sin nube</sub>

</div>

---

## Por qué existe

Las agendas normales son pasivas: están ahí *si te acuerdas de abrirlas*. Y en una
oficina, con quince cosas a la vez, no te acuerdas.

**Ahora** invierte eso. Es una voz activa que te da un toque en el momento justo y
te deja responder en dos segundos:

> **Hecho** · **Pospón 10 min** · **Hoy no**

Y como cualquiera que interrumpe demasiado acaba en silencio, **Ahora** se toma en
serio *cuándo* hablar: avisa de poco, avisa bien, y cuando algo se vence te da tres
toques y se rinde con dignidad. Nunca fuera de tu horario laboral.

## Qué es

- 📌 **Agenda + tareas en una.** Una cita ocurre a una hora; una tarea hay que
  terminarla *antes de* una hora. **Ahora** entiende la diferencia sin que tengas
  que elegir "tipo" en ningún menú.
- 🔁 **Tareas recurrentes que no creas a mano.** Defines la regla una vez
  ("revisar correo cada día a las 9") y aparece sola. Si un día no la haces,
  **no se acumula**: mañana hay otra y punto. La culpa acumulada es ansiedad, no
  productividad.
- ⚡ **Crear algo cuesta segundos.** El objetivo es escribir una línea y que la app
  haga el resto.
- 🔒 **Todo local.** Tus datos viven en un SQLite en tu máquina. Cada quien con su
  agenda. No se comparte nada, no hay servidor que se caiga, no hay cuenta que crear.

## Qué NO es

No es un gestor de proyectos. No es una herramienta de equipo. No es control de
horas ni facturación. No es un CRM ni una bandeja de correo. No es tu segundo
cerebro. Hace **una cosa** y la hace sin estorbar.

## La pantalla principal: _Ahora y a continuación_

Una sola lista, ordenada por tiempo, con tres zonas:

```
┌─────────────────────────────────────────┐
│  🔴 VENCIDAS                             │
│     Enviar informe semanal   ·  11:00   │
├─────────────────────────────────────────┤
│  AHORA / PRÓXIMAS 3 H                    │
│     Llamada con proveedor    ·  15:30   │
│     Preparar sala reunión    ·  16:45   │
├─────────────────────────────────────────┤
│  RESTO DE HOY                            │
│     Revisar presupuesto Q4              │
└─────────────────────────────────────────┘
```

En un día normal, sin scroll. La semana, el mes y el backlog están a un clic —
nunca en primer plano.

## Estado del proyecto

🌱 **Fase muy temprana.** El esqueleto (Tauri + React + SQLite) funciona y ya se
pueden crear y listar tareas. En camino:

- [ ] Modelo `item` con tiempos opcionales (cita / tarea / ambos)
- [ ] Motor de avisos con insistencia escalonada y horario laboral
- [ ] Notificaciones nativas del sistema
- [ ] Tareas recurrentes (regla como fuente de verdad)
- [ ] Vista _Ahora y a continuación_
- [ ] Entrada rápida en una línea

## Filosofía

Las decisiones de fondo —qué es, qué se niega a ser, cómo se comportan los avisos
y las recurrentes, y el esquema de datos propuesto— están en
**[docs/FILOSOFIA.md](docs/FILOSOFIA.md)**. Es el documento norte: antes de añadir
una función, se comprueba que no lo contradiga.

## Stack

| Capa        | Tecnología                                  |
|-------------|---------------------------------------------|
| Shell       | [Tauri 2](https://tauri.app) (Rust)         |
| UI          | React 19 + TypeScript + Vite                |
| Estilos     | Tailwind CSS 4 + daisyUI                    |
| Estado      | Zustand · validación con Zod                |
| Datos       | SQLite vía `tauri-plugin-sql` (100 % local) |
| Iconos      | lucide-react                                |

## Desarrollo

Requisitos: [Node.js](https://nodejs.org) 18+ y el
[toolchain de Rust](https://www.rust-lang.org/tools/install) (para Tauri).

```bash
# instalar dependencias
npm install

# app de escritorio en modo desarrollo (hot-reload)
npm run tauri dev

# solo el frontend en el navegador
npm run dev
```

## Compilar

```bash
# genera el instalable para tu sistema operativo en src-tauri/target/release/bundle/
npm run tauri build
```

## Plataformas soportadas

Por ahora **la línea oficial es Windows** — es donde se compila, se prueba y se
distribuye el alpha (`.exe` / NSIS).

**Linux está en estudio, no en soporte.** Hubo una compilación de prueba en
Kubuntu (AppImage) que reveló errores críticos en el tray icon y en el
comportamiento en segundo plano de la app. No se publicarán builds de Linux
hasta tener un entorno físico completo para desarrollar y depurar esa
plataforma como corresponde — de momento la única máquina Linux disponible es
de pruebas puntuales, no un entorno de desarrollo real.

## Estrategia de ramas

`main` es la única fuente de verdad y la línea oficial (Windows). Las
diferencias entre sistemas operativos se resuelven **dentro de `main`** —
`#[cfg(target_os = "...")]` en Rust, archivos `tauri.<os>.conf.json` — no con
una rama por plataforma que viva para siempre.

Las ramas tipo `Linux_dev` son **temporales**: sirven para explorar o arreglar
algo específico de una plataforma (p. ej. el tray icon y el comportamiento en
segundo plano en Linux) sin tocar `main` mientras está roto. Una vez que
funciona, se fusiona de vuelta a `main` y se borra. No se mantienen como
"ecosistemas paralelos" — menos ramas significa menos aislamiento a corto
plazo, pero mucha menos deuda de sincronización a largo plazo.

## Estructura

```
agenda-trabajo/
├─ src/                  # frontend React
│  ├─ App.tsx            # UI principal
│  └─ lib/db.ts          # acceso a SQLite
├─ src-tauri/            # shell nativo en Rust
│  ├─ src/lib.rs         # setup de plugins Tauri
│  └─ tauri.conf.json    # config de la app (ventana, bundle, identificador)
└─ docs/
   └─ FILOSOFIA.md       # el documento norte
```

## Licencia

Proyecto interno. Todos los derechos reservados.
