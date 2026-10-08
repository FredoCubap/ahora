# Design

## Context

El shell (`shell/main.py`) mantiene la ventana viva en bandeja; el motor de avisos y la captura (`CapturaModal`) viven en el frontend. Los ajustes del usuario están en la fila única de `settings`, con esquema append-only (`MIGRATIONS` en `shell/db.py`).

## Goals / Non-Goals

**Goals:**

- Abrir la captura desde cualquier aplicación, incluso con la ventana escondida.
- Que un conflicto de atajo nunca impida arrancar.

**Non-Goals:**

- Atajos globales para otras acciones.
- Grabar la combinación pulsando teclas: la tecla Windows no llega al WebView, así que se escribe como texto.
- Soporte fuera de Windows: en otras plataformas el atajo queda inactivo con motivo "no disponible".

## Decisions

**1. `RegisterHotKey` con `ctypes`, en un hilo con su bucle de mensajes.**
`RegisterHotKey` asocia el atajo al hilo que lo registra y Windows entrega `WM_HOTKEY` a la cola de ese hilo, así que el registro, el bucle `GetMessage` y el `UnregisterHotKey` ocurren en el mismo hilo (daemon). Para reconfigurar o parar se le envía `WM_QUIT` con `PostThreadMessage`. Alternativas descartadas: una librería de terceros (la regla es no añadir dependencias sin consultar) y `pynput` (engancha el teclado entero con un hook, más invasivo que registrar una sola combinación).

**2. La combinación se guarda como texto legible (`Win+Alt+A`) y se valida en el shell.**
`hotkey.parse_combination` la convierte en modificadores y código de tecla virtual (letras, dígitos, F1–F12) y exige al menos un modificador. Una combinación inválida se rechaza sin tocar la guardada. Se añade `MOD_NOREPEAT` para que mantener pulsado no dispare en ráfaga.

**3. Estado del atajo: activo o inactivo con motivo.**
`start()` devuelve el estado `{active, reason}`; `reason` es `None`, `"ocupado"`, `"invalida"` o `"no disponible"`. Un fallo de `RegisterHotKey` (error 1409, atajo ocupado) deja la app corriendo con el atajo inactivo. Ajustes lo lee con `get_hotkey_status`. El registro ocurre en el hilo, así que `start()` espera su resultado con un `threading.Event` y un tiempo máximo.

**4. Señal al frontend con un evento DOM.**
Al dispararse, el shell trae la ventana al frente y ejecuta `window.dispatchEvent(new CustomEvent("ahora:captura"))` con `evaluate_js`. `App.tsx` escucha el evento y abre la captura. Alternativa descartada: que el frontend sondee el shell (latencia y trabajo constante).

**5. "Restaurar el estado previo" lo lleva el shell.**
pywebview no expone si la ventana está visible, así que `main.py` lleva una bandera propia (`_window_hidden`) que se actualiza al esconder (la X, el arranque con `--hidden`) y al mostrar. Al disparar el atajo se recuerda si estaba escondida; cuando la captura se cierra, el frontend llama a `captura_closed()` y, si estaba escondida, la ventana se vuelve a esconder. Esto aplica tanto a `Escape` como a guardar el ítem: capturar y volver al trabajo.

**6. Migración `SCHEMA_V4`.**
`hotkey_enabled INTEGER NOT NULL DEFAULT 1 CHECK (hotkey_enabled IN (0,1))` y `hotkey_combination TEXT NOT NULL DEFAULT 'Win+Alt+A'`. Activo por defecto, porque la función es el objetivo del cambio; el usuario lo apaga en Ajustes.

**7. `configure_hotkey(enabled, combination)` en `Api`.**
Valida, re-registra y solo entonces guarda; devuelve el estado. Así Ajustes nunca guarda una combinación que no se pudo registrar por inválida; si está ocupada se guarda igualmente (puede liberarse luego) y se muestra el motivo.

## Risks / Trade-offs

- [Windows puede negar el primer plano a una ventana que no es la activa] → Pulsar el atajo cuenta como entrada del usuario y suele conceder el primer plano; si no, la ventana se muestra igual y parpadea en la barra de tareas. Se comprueba a mano en Windows.
- [`Win+Alt+A` puede estar tomada por otra aplicación] → Es el caso previsto: se degrada y Ajustes lo indica.
- [No se puede probar el registro real en Linux] → Los tests cubren el parseo, la degradación y el ciclo de vida con el módulo de Windows simulado; el registro real se comprueba a mano en Windows.
