/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * El shell Python (shell/main.py) carga la app de una de dos formas: el build
 * de `dist/` si existe, o este dev server. El puerto es fijo porque el shell lo
 * tiene hardcodeado (ver DEV_URL) y porque `strictPort` hace fallar ruidoso en
 * vez de cambiar de puerto solo y dejar al shell apuntando al lugar equivocado.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 1420,
    strictPort: true,
  },

  // Los tests cubren la lógica pura (motor de avisos, zonas, captura rápida,
  // formato de fechas, merge de recurrencias). No tocan el store ni los
  // componentes: esos necesitan mock de DOM y de pywebview, y la lógica pura es
  // la que tiene bugs que no se ven en la UI.
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
