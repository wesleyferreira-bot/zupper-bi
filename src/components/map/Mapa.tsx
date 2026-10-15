import { useMemo, useState } from "react";
import { geoContains, geoMercator, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import land from "world-atlas/land-110m.json";
import paises from "world-atlas/countries-110m.json";
import { AEROPORTOS, cidade } from "@/data/aeroportos";



export interface PontoMapa { codigo: string; valor: number; rotulo?: string; detalhe?: string }
export interface RotaMapa { o: string; d: string; valor: number; detalhe?: string }
export type Modo = "brasil" | "mundo";

const LARGURA = 1000;
const ALTURA: Record<Modo, number> = { brasil: 760, mundo: 540 };

// Mapa de pontos (estetica holografica): o continente e desenhado como grade de pontos,
// aeroportos viram marcadores clicaveis e as rotas, arcos com aviaozinhos em movimento.
export function Mapa({ modo, pontos, rotas, ativos, onPonto, onRota, formatar }: {
  modo: Modo; pontos: PontoMapa[]; rotas: RotaMapa[]; ativos: string[];
  onPonto: (codigo: string) => void; onRota: (o: string, d: string) => void;
  formatar: (v: number) => string;
}) {
  const H = ALTURA[modo];
  const [dica, setDica] = useState<{ x: number; y: number; titulo: string; linhas: string[] } | null>(null);

  const { proj, brasil, base } = useMemo(() => {
    const terra: any = feature(land as any, (land as any).objects.land);
    const todos: any = feature(paises as any, (paises as any).objects.countries);
    const br = todos.features.find((f: any) => String(f.id) === "076");
    if (modo === "brasil") {
      const p = geoMercator().fitExtent([[40, 20], [LARGURA - 40, H - 20]], br);
      return { proj: p, brasil: br, base: terra };
    }
    const p = geoNaturalEarth1().fitExtent([[10, 10], [LARGURA - 10, H - 10]], { type: "Sphere" } as any);
    return { proj: p, brasil: br, base: terra };
  }, [modo, H]);

  // grade de pontos: calculada uma vez por modo (geoContains e a parte cara)
  const { dEstrangeiro, dBrasil } = useMemo(() => {
    const passo = modo === "brasil" ? 0.55 : 2.6;
    const lat0 = modo === "brasil" ? -36 : -58, lat1 = modo === "brasil" ? 8 : 80;
    const lon0 = modo === "brasil" ? -78 : -180, lon1 = modo === "brasil" ? -26 : 180;
    let e = "", b = "";
    for (let lat = lat0; lat <= lat1; lat += passo) {
      for (let lon = lon0; lon <= lon1; lon += passo / Math.max(0.35, Math.cos((lat * Math.PI) / 180) * (modo === "mundo" ? 1 : 0.9))) {
        if (!geoContains(base, [lon, lat])) continue;
        const xy = proj([lon, lat]);
        if (!xy || xy[0] < -5 || xy[0] > LARGURA + 5 || xy[1] < -5 || xy[1] > H + 5) continue;
        const seg = `M${xy[0].toFixed(1)} ${xy[1].toFixed(1)}h0`;
        if (modo === "brasil" && geoContains(brasil, [lon, lat])) b += seg; else e += seg;
      }
    }
    return { dEstrangeiro: e, dBrasil: b };
  }, [modo, proj, base, brasil, H]);

  const caminho = useMemo(() => geoPath(proj), [proj]);

  const marcadores = useMemo(() => {
    const max = Math.max(...pontos.map((p) => p.valor), 1);
    return pontos.filter((p) => AEROPORTOS[p.codigo]).map((p) => {
      const [, lat, lng] = AEROPORTOS[p.codigo];
      const xy = proj([lng, lat]);
      return xy ? { ...p, x: xy[0], y: xy[1], r: 4 + Math.sqrt(p.valor / max) * (modo === "brasil" ? 17 : 12) } : null;
    }).filter(Boolean) as (PontoMapa & { x: number; y: number; r: number })[];
  }, [pontos, proj, modo]);

  const arcos = useMemo(() => {
    const max = Math.max(...rotas.map((r) => r.valor), 1);
    return rotas.filter((r) => AEROPORTOS[r.o] && AEROPORTOS[r.d] && r.o !== r.d).map((r, i) => {
      const a = proj([AEROPORTOS[r.o][2], AEROPORTOS[r.o][1]]), b = proj([AEROPORTOS[r.d][2], AEROPORTOS[r.d][1]]);
      if (!a || !b) return null;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const dist = Math.hypot(dx, dy);
      const alt = Math.min(dist * 0.28, 150);
      const cx = mx - (dy / (dist || 1)) * alt * (dx >= 0 ? 1 : -1), cy = my + (dx / (dist || 1)) * alt * (dx >= 0 ? 1 : -1) - alt * 0.2;
      return { ...r, id: `arco-${i}`, d: `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`, peso: 0.6 + (r.valor / max) * 2.4, dur: 5 + (i % 5) * 1.3 };
    }).filter(Boolean) as (RotaMapa & { id: string; d: string; peso: number; dur: number })[];
  }, [rotas, proj]);

  const temAtivo = ativos.length > 0;
  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${LARGURA} ${H}`} className="block h-auto w-full" role="img" aria-label={modo === "brasil" ? "Mapa do Brasil com aeroportos e rotas" : "Mapa-múndi com aeroportos e rotas"}>
        <defs>
          <radialGradient id="mk" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#c9f6ff" stopOpacity=".95" /><stop offset="1" stopColor="#6fe3f7" stopOpacity=".15" /></radialGradient>
          <filter id="blur"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        {modo === "mundo" && <path d={caminho({ type: "Sphere" } as any) ?? ""} fill="rgba(6,30,42,.35)" stroke="rgba(111,227,247,.18)" />}
        {modo === "brasil" && <path d={caminho(brasil) ?? ""} fill="rgba(69,155,172,.07)" stroke="rgba(111,227,247,.35)" strokeWidth="1.2" />}
        <path d={dEstrangeiro} stroke="rgba(111,227,247,.22)" strokeWidth={modo === "brasil" ? 2.6 : 2.4} strokeLinecap="round" fill="none" />
        {modo === "brasil" && <path d={dBrasil} stroke="rgba(111,227,247,.55)" strokeWidth="3" strokeLinecap="round" fill="none" />}

        {arcos.map((a) => {
          const on = ativos.includes(a.o) || ativos.includes(a.d);
          return (
            <g key={a.id} opacity={temAtivo && !on ? 0.25 : 1}>
              <path id={a.id} d={a.d} fill="none" stroke="#6fe3f7" strokeOpacity=".55" strokeWidth={a.peso} strokeDasharray="2 6" strokeLinecap="round" />
              <path d={a.d} fill="none" stroke="transparent" strokeWidth="16" style={{ cursor: "pointer" }}
                onClick={() => onRota(a.o, a.d)}
                onMouseMove={(e) => { const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setDica({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, titulo: `${a.o} → ${a.d}`, linhas: [`${cidade(a.o)} → ${cidade(a.d)}`, formatar(a.valor), ...(a.detalhe ? [a.detalhe] : [])] }); }}
                onMouseLeave={() => setDica(null)} />
              <g style={{ cursor: "pointer" }} onClick={() => onRota(a.o, a.d)}>
                <g>
                  <animateMotion dur={`${a.dur}s`} repeatCount="indefinite" rotate="auto"><mpath href={`#${a.id}`} /></animateMotion>
                  <g transform="rotate(90)"><path d="M0 -9C1.2 -9 1.6 -6 1.6 -3L1.6 2L9 6L9 7.5L1.6 5.5L1.6 9L3.4 10.6L3.4 11.6L0 10.8L-3.4 11.6L-3.4 10.6L-1.6 9L-1.6 5.5L-9 7.5L-9 6L-1.6 2L-1.6 -3C-1.6 -6 -1.2 -9 0 -9Z" fill="#e8fbff" stroke="#6fe3f7" strokeWidth=".6" /></g>
                </g>
              </g>
            </g>
          );
        })}

        {marcadores.map((m) => {
          const on = ativos.includes(m.codigo);
          return (
            <g key={m.codigo} opacity={temAtivo && !on ? 0.55 : 1} style={{ cursor: "pointer" }} tabIndex={0} role="button" aria-label={`${m.codigo} ${cidade(m.codigo)}: ${formatar(m.valor)}`}
              onClick={() => onPonto(m.codigo)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPonto(m.codigo)}
              onMouseEnter={() => setDica({ x: (m.x / LARGURA) * 100, y: (m.y / H) * 100, titulo: `${m.codigo} · ${cidade(m.codigo)}`, linhas: [formatar(m.valor), ...(m.detalhe ? [m.detalhe] : [])] })}
              onMouseLeave={() => setDica(null)}>
              <circle cx={m.x} cy={m.y} r={m.r * 1.8} fill="url(#mk)" opacity=".5" />
              <circle cx={m.x} cy={m.y} r={m.r * 0.55} fill={on ? "#f5c542" : "#6fe3f7"} stroke="#fff" strokeWidth={on ? 2 : 1} />
              {m.r > 9 && <text x={m.x} y={m.y - m.r * 0.55 - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="#e8f7fa" stroke="rgba(3,13,19,.8)" strokeWidth="3" paintOrder="stroke">{m.codigo}</text>}
            </g>
          );
        })}
      </svg>
      {dica && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-glow/40 bg-ink-900/95 px-3 py-2 text-xs shadow-holo backdrop-blur" style={{ left: `${dica.x}%`, top: `calc(${dica.y}% - 14px)` }}>
          <div className="font-bold text-white">{dica.titulo}</div>
          {dica.linhas.map((l, i) => <div key={i} className="text-zup-100">{l}</div>)}
          <div className="mt-1 text-[10px] uppercase tracking-wider text-glow">clique para filtrar</div>
        </div>
      )}
    </div>
  );
}

