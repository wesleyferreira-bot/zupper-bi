import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, Chip, Erro, Skel, Titulo, Vazio, estiloCampo, Campo } from "@/components/ui/base";
import { Serie, type PontoSerie } from "@/components/ui/Graficos";
import { useConsulta } from "@/hooks/useDados";
import { useFiltros } from "@/state/Filtros";
import { useAnalista } from "@/state/Analista";
import { useRegistrarTela } from "@/state/Tela";
import { DIMENSOES, MEDIDAS, MEDIDAS_ANALISE } from "@/data/metricas";
import { corCanal } from "@/data/canais";
import { cidade } from "@/data/aeroportos";
import { compacto, fmt, num } from "@/lib/format";
import type { Filtros } from "@/lib/api";

const DIMS = [...Object.keys(DIMENSOES), "trimestre"].filter((d, i, a) => a.indexOf(d) === i);
const ROTULO_DIM = { ...Object.fromEntries(Object.entries(DIMENSOES).map(([k, v]) => [k, v.rotulo])), trimestre: "Trimestre" } as Record<string, string>;
const TEMPO = ["dia", "semana", "mes", "trimestre", "ano", "dia_semana"];
const FILTRAVEIS = ["canal", "grupo_canal", "tipo", "origem", "destino", "rota"];
const PALETA = ["#6fe3f7", "#f5c542", "#7bc74d", "#b38cff", "#ff9f5a", "#4d9bff", "#ff6fae", "#5ee0c4"];
type Vis = "tabela" | "barras" | "linhas" | "calor";

export default function Analise() {
  const { periodo, filtros, alternar } = useFiltros();
  const { perguntar } = useAnalista();
  const [d1, setD1] = useState("canal");
  const [d2, setD2] = useState<string>("");
  const [meds, setMeds] = useState<string[]>(["receita_emit", "pedidos_emit"]);
  const [vis, setVis] = useState<Vis>("barras");
  const [limite, setLimite] = useState(15);

  const dims = d2 ? [d1, d2] : [d1];
  const ordemMed = meds[0];
  const q = useConsulta(meds.length ? {
    medidas: meds, dims, ini: periodo.ini, fim: periodo.fim, filtros, limite: d2 ? 600 : Math.max(limite, TEMPO.includes(d1) ? 400 : limite),
    ordem: TEMPO.includes(d1) ? `${d1} asc` : `${ordemMed} desc`,
  } : null);
  const linhas = q.data ?? [];

  const rotuloValor = (dim: string, v: unknown) => {
    const s = String(v ?? "—");
    if (dim === "origem" || dim === "destino") return `${s} · ${cidade(s)}`;
    return s;
  };
  const alternarMed = (m: string) => setMeds((x) => (x.includes(m) ? x.filter((i) => i !== m) : x.length >= 4 ? x : [...x, m]));

  // Para duas dimensoes: pivot (linhas = d1, colunas = d2 mais relevantes), valor = primeira medida
  const pivot = useMemo(() => {
    if (!d2) return null;
    const tot1 = new Map<string, number>(), tot2 = new Map<string, number>();
    for (const r of linhas) {
      tot1.set(String(r[d1]), (tot1.get(String(r[d1])) ?? 0) + num(r[ordemMed]));
      tot2.set(String(r[d2]), (tot2.get(String(r[d2])) ?? 0) + num(r[ordemMed]));
    }
    const ordena = (m: Map<string, number>, tempo: boolean, n: number) => {
      const ks = [...m.keys()];
      return tempo ? ks.sort().slice(-n) : ks.sort((a, b) => (m.get(b) ?? 0) - (m.get(a) ?? 0)).slice(0, n);
    };
    const linhasK = ordena(tot1, TEMPO.includes(d1), 14), colsK = ordena(tot2, TEMPO.includes(d2), 10);
    const val = new Map(linhas.map((r) => [`${r[d1]}||${r[d2]}`, num(r[ordemMed])]));
    const max = Math.max(...[...val.values()], 1);
    return { linhasK, colsK, val, max };
  }, [linhas, d1, d2, ordemMed]);

  useRegistrarTela(linhas.length ? {
    pagina: "analise", titulo: `Análise livre: ${meds.map((m) => MEDIDAS[m].curto).join(", ")} por ${dims.map((d) => ROTULO_DIM[d]).join(" × ")}`,
    resumo: { periodo, filtros, dimensoes: dims, medidas: meds, linhas: linhas.slice(0, 25) },
  } : null);

  const primeiras = linhas.slice(0, limite);
  const fmtM = (m: string, v: unknown) => fmt(v, MEDIDAS[m].formato);
  const clicavel = !d2 && FILTRAVEIS.includes(d1);
  const dadosBarras = primeiras.map((r) => ({ rotulo: rotuloValor(d1, r[d1]), ...Object.fromEntries(meds.map((m) => [m, num(r[m])])), nome: String(r[d1]) }));

  const dadosLinha: PontoSerie[] = useMemo(() => {
    if (d2) {
      const m = new Map<string, PontoSerie>();
      for (const r of linhas) { const x = String(r[d1]); const o = m.get(x) ?? { x, rotulo: x }; o[String(r[d2])] = num(r[ordemMed]); m.set(x, o); }
      return [...m.values()];
    }
    return linhas.map((r) => ({ x: String(r[d1]), rotulo: String(r[d1]), ...Object.fromEntries(meds.map((m) => [m, num(r[m])])) }));
  }, [linhas, d1, d2, meds, ordemMed]);
  const seriesLinha = d2
    ? (pivot?.colsK ?? []).map((c, i) => ({ chave: c, nome: c, cor: corCanal(c, i) !== "#6fe3f7" || i === 0 ? corCanal(c, i) : PALETA[i % 8], tipo: "linha" as const }))
    : meds.map((m, i) => ({ chave: m, nome: MEDIDAS[m].curto, cor: PALETA[i], tipo: "linha" as const, eixo: (i > 0 && MEDIDAS[m].formato !== MEDIDAS[meds[0]].formato ? "d" : "e") as "e" | "d" }));

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid gap-4 md:grid-cols-4">
          <Campo rotulo="Analisar por">
            <select value={d1} onChange={(e) => { setD1(e.target.value); if (e.target.value === d2) setD2(""); }} className={estiloCampo}>
              {DIMS.map((d) => <option key={d} value={d}>{ROTULO_DIM[d]}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Cruzar com (opcional)">
            <select value={d2} onChange={(e) => setD2(e.target.value)} className={estiloCampo}>
              <option value="">Nenhum</option>
              {DIMS.filter((d) => d !== d1).map((d) => <option key={d} value={d}>{ROTULO_DIM[d]}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Mostrar">
            <div className="flex flex-wrap gap-1.5">
              {(["barras", "linhas", "tabela", "calor"] as Vis[]).map((v) => (
                <Chip key={v} ativo={vis === v} onClick={() => setVis(v)}>{{ barras: "Barras", linhas: "Linhas", tabela: "Tabela", calor: "Mapa de calor" }[v]}</Chip>
              ))}
            </div>
          </Campo>
          <Campo rotulo="Linhas exibidas">
            <select value={limite} onChange={(e) => setLimite(Number(e.target.value))} className={estiloCampo}>{[8, 15, 30, 60].map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </Campo>
        </div>
        <div className="mt-4">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Medidas (até 4; a primeira ordena)</span>
          <div className="flex flex-wrap gap-1.5">
            {MEDIDAS_ANALISE.map((m) => <Chip key={m} ativo={meds.includes(m)} onClick={() => alternarMed(m)}>{MEDIDAS[m].curto}</Chip>)}
          </div>
        </div>
      </Card>

      {q.error && <Erro mensagem={(q.error as Error).message} onTentar={() => q.refetch()} />}
      {!meds.length ? <Vazio titulo="Escolha ao menos uma medida" texto="Selecione acima o que quer medir." /> : (
        <Card>
          <Titulo dica={meds.map((m) => `${MEDIDAS[m].rotulo}: ${MEDIDAS[m].definicao}`).join(" ")}
            extra={linhas.length > 0 ? (
              <button type="button" onClick={() => perguntar(`Analise este recorte: ${meds.map((m) => MEDIDAS[m].rotulo).join(", ")} por ${dims.map((d) => ROTULO_DIM[d]).join(" e ")}, de ${periodo.ini} a ${periodo.fim}. O que se destaca e o que eu deveria investigar?`, { via: "insight", falar: true })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-glow/30 bg-glow/10 px-2.5 py-1.5 text-[11px] font-bold normal-case tracking-normal text-white hover:bg-glow/20"><Sparkles className="h-3.5 w-3.5 text-glow" />Pedir análise</button>
            ) : undefined}>
            {meds.map((m) => MEDIDAS[m].curto).join(" · ")} por {dims.map((d) => ROTULO_DIM[d]).join(" × ")}
          </Titulo>
          {q.isLoading ? <Skel className="h-[340px]" /> : !linhas.length ? <Vazio /> : (
            <>
              {vis === "barras" && !d2 && (
                <div style={{ height: Math.max(300, Math.min(primeiras.length, 30) * 30 * (meds.length > 1 ? 1.5 : 1)) }}>
                  <ResponsiveContainer>
                    <BarChart data={dadosBarras} layout={TEMPO.includes(d1) ? "horizontal" : "vertical"} margin={{ top: 4, right: 16, bottom: 0, left: 10 }}>
                      <CartesianGrid horizontal={!TEMPO.includes(d1)} vertical={TEMPO.includes(d1) ? false : true} />
                      {TEMPO.includes(d1) ? (<><XAxis dataKey="rotulo" tickLine={false} axisLine={false} /><YAxis tickFormatter={(v) => compacto(v)} tickLine={false} axisLine={false} width={50} /></>)
                        : (<><XAxis type="number" tickFormatter={(v) => compacto(v)} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="rotulo" width={150} tickLine={false} axisLine={false} /></>)}
                      <Tooltip contentStyle={{ background: "rgba(5,22,31,.96)", border: "1px solid rgba(111,227,247,.35)", borderRadius: 12, color: "#e8f7fa", fontSize: 12 }} cursor={{ fill: "rgba(111,227,247,.06)" }}
                        formatter={(v: number, n: string) => { const id = meds.find((m) => MEDIDAS[m].curto === n) ?? meds[0]; return [fmtM(id, v), n]; }} />
                      {meds.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
                      {meds.map((m, i) => (
                        <Bar isAnimationActive={false} key={m} dataKey={m} name={MEDIDAS[m].curto} fill={PALETA[i]} fillOpacity={0.8} radius={4}
                          cursor={clicavel ? "pointer" : undefined} onClick={(d: any) => { if (clicavel && d?.nome) alternar(d1 as keyof Filtros, d.nome); }} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {(vis === "linhas" || (vis === "barras" && d2)) && (
                <Serie dados={dadosLinha} formato={MEDIDAS[ordemMed].formato} eixoMoeda={MEDIDAS[ordemMed].formato.startsWith("brl")} series={seriesLinha} altura={340} />
              )}
              {vis === "calor" && (
                !pivot ? <div className="py-8 text-center text-sm text-muted-foreground">O mapa de calor precisa de duas dimensões. Escolha “Cruzar com”.</div> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] border-separate border-spacing-1 text-[12px]">
                      <thead><tr><th />{pivot.colsK.map((c) => <th key={c} className="px-1 py-1 text-center font-semibold text-zup-100">{rotuloValor(d2, c)}</th>)}</tr></thead>
                      <tbody>{pivot.linhasK.map((l) => (
                        <tr key={l}><th className="whitespace-nowrap pr-2 text-right font-semibold text-white">{rotuloValor(d1, l)}</th>
                          {pivot.colsK.map((c) => {
                            const v = pivot.val.get(`${l}||${c}`);
                            const a = v ? 0.08 + 0.8 * (v / pivot.max) : 0;
                            return <td key={c} title={`${l} × ${c}: ${v === undefined ? "sem dados" : fmtM(ordemMed, v)}`} className="rounded-md px-1 py-2 text-center"
                              style={{ background: v ? `rgba(111,227,247,${a})` : "rgba(111,227,247,.03)", color: a > 0.5 ? "#031018" : "#c4ebf2" }}>{v === undefined ? "" : compacto(v, MEDIDAS[ordemMed].formato.startsWith("brl"))}</td>;
                          })}</tr>))}</tbody>
                    </table>
                    <p className="mt-2 text-[11px] text-muted-foreground">Cor proporcional a {MEDIDAS[ordemMed].rotulo}. Mostra as {pivot.linhasK.length} linhas e {pivot.colsK.length} colunas de maior valor.</p>
                  </div>
                )
              )}
              {vis === "tabela" && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-[13px]">
                    <thead><tr className="border-b border-glow/15 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {dims.map((d) => <th key={d} className="px-3 py-2 font-bold">{ROTULO_DIM[d]}</th>)}
                      {meds.map((m) => <th key={m} className="px-3 py-2 text-right font-bold">{MEDIDAS[m].curto}</th>)}
                    </tr></thead>
                    <tbody>
                      {linhas.slice(0, limite).map((r, i) => (
                        <tr key={i} onClick={() => clicavel && alternar(d1 as keyof Filtros, String(r[d1]))}
                          className={`border-b border-glow/8 hover:bg-glow/5 ${clicavel ? "cursor-pointer" : ""} ${clicavel && (filtros[d1 as keyof Filtros] ?? []).includes(String(r[d1])) ? "bg-glow/10" : ""}`}>
                          {dims.map((d) => <td key={d} className="px-3 py-2.5 font-semibold text-white">{rotuloValor(d, r[d])}</td>)}
                          {meds.map((m) => <td key={m} className="num px-3 py-2.5 text-right">{fmtM(m, r[m])}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">
                {clicavel ? "Clique em uma barra ou linha para filtrar o painel inteiro por esse valor. " : ""}
                {linhas.length >= (d2 ? 600 : limite) ? "Há mais linhas do que as exibidas: aumente as linhas exibidas ou refine com filtros." : ""}
              </p>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
