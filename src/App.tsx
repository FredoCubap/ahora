import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useAppStore } from "./store/useAppStore";
import { applyTheme } from "./lib/theme";
import { Ahora } from "./routes/Ahora";
import { Semana } from "./routes/Semana";
import { Ajustes } from "./routes/Ajustes";
import { AvisoBanner } from "./components/AvisoBanner";
import { CapturaModal } from "./components/CapturaModal";
import { BottomNav } from "./components/BottomNav";

function App() {
  const refresh = useAppStore((s) => s.refresh);
  const [capturaOpen, setCapturaOpen] = useState(false);
  const location = useLocation();
  // Ajustes se navega "hacia adentro" (con flecha de volver en el Header),
  // no es una pestaña más — por eso no lleva ni la barra inferior ni el "+".
  const showChrome = location.pathname !== "/ajustes";

  useEffect(() => {
    refresh();
  }, [refresh]);

  // El script de index.html ya puso el tema guardado antes del primer pintado;
  // esto cubre cuando la página se abre sin ese parámetro (p. ej. contra el dev
  // server) y mantiene el atributo en sintonía con `settings` de ahí en más.
  const theme = useAppStore((s) => s.settings?.theme);
  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);

  return (
    <div className="min-h-screen flex justify-center" style={{ background: "var(--ahora-bg)" }}>
      <div className="w-full max-w-[480px] min-h-screen relative">
        <Routes>
          <Route path="/" element={<Ahora />} />
          <Route path="/semana" element={<Semana />} />
          <Route path="/ajustes" element={<Ajustes />} />
        </Routes>

        {showChrome && <BottomNav onAdd={() => setCapturaOpen(true)} />}

        <CapturaModal isOpen={capturaOpen} onClose={() => setCapturaOpen(false)} />
        <AvisoBanner />
      </div>
    </div>
  );
}

export default App;
