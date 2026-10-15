import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import clsx from "clsx";
import { fmt, compacto, type Formato } from "@/lib/format";

const TT = { background: "rgba(5,22,31,.96)", border: "1px solid rgba(111,227,247,.35)", borderRadius: 12, color: "#e8f7fa", fontSize: 12, boxShadow: "0 12px 40px -12px rgba(0,0,0,.8)" } as const;

export interface PontoSerie { x: string; rotulo?: string; [k: string]: string | number | null | undefined }

export function Serie({ dados, series, formato, altura = 260, eixoMoeda = false }: {
  dados: PontoSerie[];
  series: { chave: string; nome: string; cor: string; tracejada?: boolean; tipo?: "area" | "linha" | "barra"; eixo?: "e" | "d"; formato?: Formato }[];
  formato: Formato;
  altura?: number;
  eixoMoeda?: boolean;
}) {
  const duplo = series.some((s) => s.eixo === "d");
  return (
    <div style={{ height: altura }} className="w-full">
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 8, right: duplo ? 8 : 8, bottom: 0, left: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.chave} id={`g-${s.chave}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={s.cor} stopOpacity=".38" />
                <stop offset="1" stopColor={s.cor} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="rotulo" tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis yAxisId="e" tickLine={false} axisLine={false} width={56} tickFormatter={(v) => compacto(v, eixoMoeda)} />
          {duplo && <YAxis yAxisId="d" orientation="right" tickLine={false} axisLine={false} width={44} tickFormatter={(v) => compacto(v)} />}
          <Tooltip contentStyle={TT} labelStyle={{ color: "#6fe3f7", fontWeight: 700 }} cursor={{ stroke: "rgba(111,227,247,.35)" }}
            formatter={(v: number, n: string) => { const s = series.find((x) => x.nome === n); return [fmt(v, s?.formato ?? formato), n]; }} />
          {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#8db3bd" }} />}
          {series.map((s) =>
            s.tipo === "barra" ? (
              <Bar isAnimationActive={false} key={s.chave} yAxisId={s.eixo ?? "e"} dataKey={s.chave} name={s.nome} fill={s.cor} fillOpacity={0.55} radius={[4, 4, 0, 0]} />
            ) : s.tipo === "linha" || s.tracejada ? (
              <Line isAnimationActive={false} key={s.chave} yAxisId={s.eixo ?? "e"} type="monotone" dataKey={s.chave} name={s.nome} stroke={s.cor} strokeWidth={s.tracejada ? 1.6 : 2.2}
                strokeDasharray={s.tracejada ? "5 5" : undefined} dot={false} connectNulls />
            ) : (
              <Area isAnimationActive={false} key={s.chave} yAxisId={s.eixo ?? "e"} type="monotone" dataKey={s.chave} name={s.nome} stroke={s.cor} strokeWidth={2.4} fill={`url(#g-${s.chave})`} dot={false} connectNulls />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface ItemRank { nome: string; rotulo?: string; valor: number; extra?: string; cor?: string; sub?: string }

/** Ranking em barras horizontais, clicavel: o clique vira filtro cruzado na tela inteira. */
export function Ranking({ itens, formato, ativos = [], onClick, max, vazio = "Sem dados", dense = false }: {
  itens: ItemRank[]; formato: Formato; ativos?: string[]; onClick?: (nome: string) => void; max?: number; vazio?: string; dense?: boolean;
}) {
  if (!itens.length) return <div className="py-6 text-center text-sm text-muted-foreground">{vazio}</div>;
  const topo = max ?? Math.max(...itens.map((i) => i.valor), 1);
  const temAtivo = ativos.length > 0;
  return (
    <ul className={clsx("space-y-1.5", dense && "space-y-1")}>
      {itens.map((i) => {
        const on = ativos.includes(i.nome);
        return (
          <li key={i.nome}>
            <button type="button" disabled={!onClick} onClick={() => onClick?.(i.nome)}
              className={clsx("group relative block w-full overflow-hidden rounded-xl border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow",
                on ? "border-glow/70 bg-glow/10" : "border-transparent hover:border-glow/30 hover:bg-glow/5", temAtivo && !on && "opacity-55", !onClick && "cursor-default")}>
              <div className="absolute inset-y-0 left-0 rounded-xl opacity-25 transition-all" style={{ width: `${Math.max(2, (i.valor / topo) * 100)}%`, background: i.cor ?? "#6fe3f7" }} />
              <div className="relative flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-white">{i.rotulo ?? i.nome}</div>
                  {i.sub && <div className="truncate text-[11px] text-muted-foreground">{i.sub}</div>}
                </div>
                <div className="shrink-0 text-right">
                  <div className="num text-[13px] font-bold text-white">{fmt(i.valor, formato)}</div>
                  {i.extra && <div className="text-[11px] text-muted-foreground">{i.extra}</div>}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Colunas({ dados, chave, nome, cor = "#6fe3f7", formato, altura = 200 }: { dados: { rotulo: string; [k: string]: string | number }[]; chave: string; nome: string; cor?: string; formato: Formato; altura?: number }) {
  return (
    <div style={{ height: altura }}>
      <ResponsiveContainer>
        <BarChart data={dados} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="rotulo" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => compacto(v)} />
          <Tooltip contentStyle={TT} cursor={{ fill: "rgba(111,227,247,.06)" }} formatter={(v: number) => [fmt(v, formato), nome]} />
          <Bar isAnimationActive={false} dataKey={chave} fill={cor} fillOpacity={0.75} radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
