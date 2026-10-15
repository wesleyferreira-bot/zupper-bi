import type { CSSProperties } from "react";

// Aviao em vista de cima, tracado fino (estetica de painel holografico).
export const CAMINHO_AVIAO =
  "M100 8C106 8 109 20 109 40L109 92L188 128L188 140L109 118L109 160L128 176L128 186L100 178L72 186L72 176L91 160L91 118L12 140L12 128L91 92L91 40C91 20 94 8 100 8Z";

export function Aviao({ className, style, preenchido = false }: { className?: string; style?: CSSProperties; preenchido?: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id="av-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9f8ff" />
          <stop offset="1" stopColor="#459bac" />
        </linearGradient>
      </defs>
      <path d={CAMINHO_AVIAO} fill={preenchido ? "url(#av-g)" : "rgba(111,227,247,.06)"} stroke="#6fe3f7" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M100 22L100 150M91 100L30 128M109 100L170 128" stroke="#6fe3f7" strokeOpacity=".45" strokeWidth="1.2" fill="none" />
      <circle cx="100" cy="30" r="2.2" fill="#fff" />
    </svg>
  );
}

export function Logo({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative grid h-9 w-9 place-items-center rounded-xl border border-glow/30 bg-ink-800/80 shadow-neon">
        <Aviao className="h-6 w-6 rotate-45" preenchido />
      </div>
      {!compacto && (
        <div className="leading-none">
          <div className="text-[17px] font-extrabold tracking-[0.18em] text-white">ZUPPER</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-glow/80">BI 2.0 · AI</div>
        </div>
      )}
    </div>
  );
}
