import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import clsx from "clsx";
import { MEDIDAS } from "@/data/metricas";
import { fmt, fmtDelta, compacto } from "@/lib/format";
import { Card, Dica, Skel } from "./base";

interface Props {
  medida: string;
  valor: number | null;
  variacao: number | null;
  carregando?: boolean;
  serie?: number[];
  destaque?: boolean;
  onClick?: () => void;
  rotulo?: string;
  formato?: import("@/lib/format").Formato;
}

/** Cor da variacao respeita o sentido da metrica: cancelamento subindo e ruim. */
function tom(m: string, v: number | null) {
  if (v === null || Math.abs(v) < 0.05) return "neutro";
  const bom = MEDIDAS[m]?.bom ?? "alta";
  if (bom === "neutro") return "info";
  return (v > 0) === (bom === "alta") ? "bom" : "ruim";
}

export function Kpi({ medida, valor, variacao, carregando, serie, destaque, onClick, rotulo, formato }: Props) {
  const m = { ...MEDIDAS[medida], ...(formato ? { formato } : {}) };
  const t = tom(medida, variacao);
  const grande = destaque ? (m.formato === "brl0" || m.formato === "brl" ? compacto(valor, true) : fmt(valor, m.formato)) : fmt(valor, m.formato);
  const Icone = variacao === null || Math.abs(variacao) < 0.05 ? Minus : variacao > 0 ? ArrowUpRight : ArrowDownRight;
  const cor = { bom: "text-mata", ruim: "text-alerta", neutro: "text-muted-foreground", info: "text-glow" }[t];
  return (
    <Card hover={!!onClick} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => { if (onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(); } }}
      className={clsx("flex min-h-[132px] flex-col justify-between overflow-hidden", onClick && "cursor-pointer", destaque && "min-h-[184px]")}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zup-200/80">
        <span>{rotulo ?? m.rotulo}</span>
        <Dica texto={`${m.definicao} Fonte: ${m.origem}.`} />
      </div>
      <div className={clsx("relative z-10 mt-2", destaque && "pb-9")}>
        {carregando ? (
          <Skel className="h-10 w-40" />
        ) : (
          <div className={clsx("num font-extrabold leading-none text-white text-glow", destaque ? "text-[clamp(28px,2.6vw,40px)] whitespace-nowrap" : "text-[28px] whitespace-nowrap")}>{grande}</div>
        )}
        <div className={clsx("mt-2 flex items-center gap-1 text-[12px] font-semibold", cor)}>
          {carregando ? <Skel className="h-4 w-24" /> : (<><Icone className="h-3.5 w-3.5" />{fmtDelta(variacao)}<span className="whitespace-nowrap font-medium text-muted-foreground">vs. comp.</span></>)}
        </div>
      </div>
      {serie && serie.length > 1 && !carregando && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 opacity-60">
          <ResponsiveContainer>
            <AreaChart data={serie.map((v, i) => ({ i, v }))} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`sp-${medida}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#6fe3f7" stopOpacity=".38" />
                  <stop offset="1" stopColor="#6fe3f7" stopOpacity="0" />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="#6fe3f7" strokeWidth={1.6} fill={`url(#sp-${medida})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
