import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate(-1)}
        aria-label="Volver"
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: 30, height: 30, background: "var(--ahora-chip-bg)" }}
      >
        <ChevronLeft size={15} color="var(--ahora-text-muted)" strokeWidth={2.2} />
      </button>
      <div className="flex flex-col gap-0.5">
        <h1 className="font-display font-extrabold text-[22px]" style={{ color: "var(--ahora-text)" }}>
          {title}
        </h1>
        {subtitle && (
          <div className="text-xs" style={{ color: "var(--ahora-text-muted)" }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
