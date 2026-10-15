import { Aviao } from "./Aviao";

// Fundo fixo: grade holografica, brilho teal, rotas tracejadas com aviaozinhos em loop e um
// aviao grande em tracado fino. Tudo CSS/SVG, sem canvas, para nao pesar na maquina do cliente.
const ROTAS = [
  { d: "M -50 620 C 300 380, 700 540, 1050 240 S 1500 120, 1700 160", dur: 26, atraso: 0 },
  { d: "M -80 260 C 240 60, 640 320, 980 180 S 1400 380, 1760 300", dur: 34, atraso: -12 },
  { d: "M -40 880 C 380 760, 760 900, 1160 640 S 1560 560, 1800 640", dur: 40, atraso: -22 },
];

export function BackgroundFX() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_78%_-10%,rgba(69,155,172,.34),transparent_60%),radial-gradient(900px_600px_at_-10%_40%,rgba(18,65,90,.55),transparent_60%),linear-gradient(180deg,#04111a,#030d13_60%)]" />
      <div
        className="absolute inset-0 opacity-[.5]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(111,227,247,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(111,227,247,.055) 1px,transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 50% 30%, #000 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, #000 20%, transparent 75%)",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-glow/[.06] to-transparent animate-scan" style={{ animationDuration: "9s" }} />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        {ROTAS.map((r, i) => (
          <path key={i} d={r.d} fill="none" stroke="rgba(111,227,247,.16)" strokeWidth="1.2" strokeDasharray="3 9" />
        ))}
      </svg>
      {ROTAS.map((r, i) => (
        <div
          key={i}
          className="absolute left-0 top-0 h-0 w-0"
          style={{
            offsetPath: `path("${r.d}")`,
            offsetRotate: "auto 90deg",
            animation: `voar ${r.dur}s linear ${r.atraso}s infinite`,
          } as React.CSSProperties}
        >
          <Aviao className="h-7 w-7 -translate-x-1/2 -translate-y-1/2 opacity-70 drop-shadow-[0_0_8px_rgba(111,227,247,.7)]" preenchido />
        </div>
      ))}

      <Aviao className="absolute -right-24 top-24 h-[520px] w-[520px] rotate-[28deg] opacity-[.10] animate-floaty" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,8,12,.7))]" />
    </div>
  );
}
