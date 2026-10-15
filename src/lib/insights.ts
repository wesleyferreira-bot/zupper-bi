import { MEDIDAS } from "@/data/metricas";
import { fmt, fmtDelta } from "./format";

export interface Insight { id: string; icone: "alta" | "baixa" | "alerta" | "info"; texto: string; pergunta: string }

/** Insights deterministas a partir das variacoes ja carregadas: o clique manda a pergunta ao analista. */
export function insightsDeKpis(v: (m: string) => number | null, var_: (m: string) => number | null, rotuloComp: string): Insight[] {
  const out: Insight[] = [];
  for (const m of ["receita_emit", "pedidos_emit", "tarifa_media_emit", "taxa_emissao", "taxa_cancelamento", "pedidos"]) {
    const d = var_(m);
    const x = v(m);
    if (d === null || x === null || Math.abs(d) < 3) continue;
    const med = MEDIDAS[m];
    const sobe = d > 0;
    const bom = med.bom === "neutro" ? null : sobe === (med.bom === "alta");
    out.push({
      id: m,
      icone: bom === null ? "info" : bom ? "alta" : "alerta",
      texto: `${med.rotulo} ${sobe ? "subiu" : "caiu"} ${fmtDelta(Math.abs(d)).replace("+", "")} ${rotuloComp} e está em ${fmt(x, med.formato)}.`,
      pergunta: `Explique por que ${med.rotulo.toLowerCase()} ${sobe ? "subiu" : "caiu"} ${fmtDelta(Math.abs(d)).replace("+", "")} ${rotuloComp}. Quais canais, destinos e tipos de viagem mais contribuíram?`,
    });
  }
  return out.slice(0, 4);
}
