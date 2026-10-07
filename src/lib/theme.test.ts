import { describe, expect, it } from "vitest";
import indexHtml from "../../index.html?raw";
import { themeAttribute } from "./theme";
import { THEMES } from "./types";

describe("themeAttribute", () => {
  it("claro y oscuro fuerzan su atributo", () => {
    expect(themeAttribute("claro")).toBe("light");
    expect(themeAttribute("oscuro")).toBe("dark");
  });

  it("sistema no fuerza nada: manda el tema del sistema operativo", () => {
    expect(themeAttribute("sistema")).toBeNull();
  });

  it("index.html aplica el mismo atributo que esta función antes del primer pintado", () => {
    // Hay dos caminos que ponen el tema: el script de index.html (arranque) y
    // React (después). Si discreparan, el tema parpadearía al cargar la app.
    for (const choice of THEMES) {
      const attribute = themeAttribute(choice);
      if (attribute) {
        expect(indexHtml).toContain(`theme === "${choice}"`);
        expect(indexHtml).toContain(`setAttribute("data-theme", "${attribute}")`);
      }
    }
  });
});
