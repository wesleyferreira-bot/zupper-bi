import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Card, Chip, Erro, Skel, Titulo } from "@/components/ui/base";
import { Ranking, Serie } from "@/components/ui/Graficos";
import { Kpi } from "@/components/ui/Kpi";
import { useConsulta, useKpis } from "@/hooks/useDados";
import { useFiltros } from "@/state/Filtros";
import { useRegistrarTela } from "@/state/Tela";
import { CANAIS_COMERCIAIS, CANAIS_MARKETING, corCanal } from "@/data/canais";
import { MEDIDAS } from "@/data/metricas";
import { canalLabel, dataCurta, fmt, num } from "@/lib/format";

const MEDIDAS_PAGINA = ["receita_emit", "pedidos", "pedidos_emit", "taxa_emissao", "cobertura_ga4"];

export default function Canais() {
  const { periodo, comp, filtros, alternar } = useFiltros();
  const [medida, setMedida] = useState<"receita_emit" | "pedidos_emit" | "tarifa_emit">("receita_emit");
  const base = { ini: periodo.ini, fim: periodo.fim, filtros };
  const k = useKpis(MEDIDAS_PAGINA, periodo, comp, filtros);
  const tabela = useConsulta({ ...base, medidas: ["pedidos", "pedidos_emit", "taxa_emissao", "receita_emit", "tarifa_emit", "tarifa_media_emit", "cobertura_ga4"], dims: ["canal"], ordem: `${medida} desc` });
  const grupos = useConsulta({ ...base, medidas: ["receita_emit", "pedidos_emit"], dims: ["grupo_canal"] });
  const evol = useConsulta({ ...base, medidas: [medida], dims: ["semana", "canal"], limite: 2000 });
  // Atribuicao: canal original (GA4 na hora da compra) x reatribuido (regra da Zupper com pedidos sem sessao)
  const orig = useConsulta({ fonte: "canal", ini: periodo.ini, fim: periodo.fim, filtros: { canal: filtros.canal }, medidas: ["pedidos_emit", "receita_emit"], dims: ["canal_original"], ordem: "receita_emit desc" });
  const reat = useConsulta({ fonte: "canal", ini: periodo.ini, fim: periodo.fim, filtros: { canal: filtros.canal }, medidas: ["pedidos_emit", "receita_emit"], dims: ["canal"], ordem: "receita_emit desc" });

  const dadosEvol = useMemo(() => {
    const por = new Map<string, Record<string, string | number>>();
    for (const r of evol.data ?? []) {
      const x = String(r.semana);
      const o = por.get(x) ?? { x, rotulo: dataCurta(x) };
      o[String(r.canal)] = num(r[medida]);
      por.set(x, o);
    }
    return [...por.values()].sort((a, b) => String(a.x).localeCompare(String(b.x)));
  }, [evol.data, medida]);
  const canaisTop = (tabela.data ?? []).slice(0, 6).map((r) => String(r.canal));

  const compara = useMemo(() => {
    const m = new Map<string, { original: number; reat: number }>();
    for (const r of orig.data ?? []) m.set(String(r.canal_original), { original: num(r.receita_emit), reat: 0 });
    for (const r of reat.data ?? []) { const x = m.get(String(r.canal)) ?? { original: 0, reat: 0 }; x.reat = num(r.receita_emit); m.set(String(r.canal), x); }
    return [...m.entries()].map(([canal, v]) => ({ canal, ...v, dif: v.reat - v.original })).sort((a, b) => b.reat - a.reat);
  }, [orig.data, reat.data]);

  useRegistrarTela(tabela.data ? {
    pagina: "canais", titulo: "Canais", resumo: {
      periodo, filtros, kpis: Object.fromEntries(MEDIDAS_PAGINA.map((m) => [m, { valor: k.valor(m), variacao_pct: k.variacao(m) }])),
      canais: tabela.data, grupos: grupos.data, original_x_reatribuido: compara,
    },
  } : null);

  const porMed = (m: string) => ({ valor: k.valor(m), variacao: k.variacao(m), carregando: k.carregando });
  const cobertura = k.valor("cobertura_ga4");
  const linhas = tabela.data ?? [];
  const grupoDe = (c: string) => (CANAIS_MARKETING.includes(c) ? "Marketing" : CANAIS_COMERCIAIS.includes(c) ? "Comercial" : "—");

  return (
    <div className="space-y-6">
      {k.erro && <Erro mensagem={k.erro.message} />}
      {cobertura !== null && cobertura < 70 && (
        <div className="rounded-2xl border border-sol/50 bg-sol/10 p-4 text-[13px] text-amber-100">
          A cobertura do GA4 no período é {fmt(cobertura, "pct")}. Abaixo de 70%, a divisão por canal indica tendência e não verdade absoluta.
        </div>
      )}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi medida="receita_emit" {...porMed("receita_emit")} />
        <Kpi medida="pedidos_emit" {...porMed("pedidos_emit")} />
        <Kpi medida="pedidos" {...porMed("pedidos")} />
        <Kpi medida="taxa_emissao" {...porMed("taxa_emissao")} />
        <Kpi medida="cobertura_ga4" {...porMed("cobertura_ga4")} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <Titulo dica="Semana a semana, os seis maiores canais do período." extra={
            <div className="flex gap-1.5">{(["receita_emit", "pedidos_emit", "tarifa_emit"] as const).map((m) => <Chip key={m} ativo={medida === m} onClick={() => setMedida(m)}>{MEDIDAS[m].curto}</Chip>)}</div>
          }>Evolução por canal</Titulo>
          {evol.isLoading ? <Skel className="h-[290px]" /> : (
            <Serie dados={dadosEvol as never} formato={MEDIDAS[medida].formato} eixoMoeda={MEDIDAS[medida].formato.startsWith("brl")}
              series={canaisTop.map((c) => ({ chave: c, nome: canalLabel(c), cor: corCanal(c), tipo: "linha" as const }))} altura={400} />
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">A primeira e a última semana do período podem estar incompletas e parecer queda.</p>
        </Card>
        <Card>
          <Titulo dica="Canais de Marketing: Direto, Mídia Paga, App, Canais Próprios e Orgânica. Comerciais: Afiliados, Metabuscadores, Cobrand, Parceiros, Venda offline e Outros.">Marketing x Comercial</Titulo>
          {grupos.isLoading ? <Skel className="h-40" /> : (
            <Ranking formato="brl0" itens={(grupos.data ?? []).map((r) => ({ nome: String(r.grupo_canal), valor: num(r.receita_emit), extra: `${fmt(r.pedidos_emit, "int")} emitidos`, cor: String(r.grupo_canal).includes("Marketing") ? "#6fe3f7" : "#b38cff" }))}
              ativos={filtros.grupo_canal} onClick={(g) => alternar("grupo_canal", g, true)} />
          )}
          <div className="mt-5">
            <Titulo>Canais · clique para filtrar</Titulo>
            <Ranking formato="brl0" dense ativos={filtros.canal} onClick={(c) => alternar("canal", c)}
              itens={linhas.map((r) => ({ nome: String(r.canal), rotulo: canalLabel(String(r.canal)), valor: num(r.receita_emit), cor: corCanal(String(r.canal)) }))} />
          </div>
        </Card>
      </section>

      <Card>
        <Titulo dica="Cada linha é um canal. Taxa de emissão = emitidos ÷ capturados. Cobertura GA4 = pedidos com sessão identificada ÷ pedidos.">Desempenho por canal</Titulo>
        {tabela.isLoading ? <Skel className="h-60" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead><tr className="border-b border-glow/15 text-[11px] uppercase tracking-wider text-muted-foreground">
                {["Canal", "Grupo", "Capturados", "Emitidos", "Emissão", "Receita emitida", "Tarifa média", "GA4"].map((h, i) => <th key={h} className={`px-3 py-2 font-bold ${i > 1 ? "text-right" : ""}`}>{h}</th>)}
              </tr></thead>
              <tbody>
                {linhas.map((r) => {
                  const c = String(r.canal);
                  const on = (filtros.canal ?? []).includes(c);
                  return (
                    <tr key={c} onClick={() => alternar("canal", c)} className={`cursor-pointer border-b border-glow/8 transition hover:bg-glow/5 ${on ? "bg-glow/10" : ""}`}>
                      <td className="px-3 py-2.5 font-semibold text-white"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: corCanal(c) }} />{canalLabel(c)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{grupoDe(c)}</td>
                      <td className="num px-3 py-2.5 text-right">{fmt(r.pedidos, "int")}</td>
                      <td className="num px-3 py-2.5 text-right">{fmt(r.pedidos_emit, "int")}</td>
                      <td className="num px-3 py-2.5 text-right">{fmt(r.taxa_emissao, "pct")}</td>
                      <td className="num px-3 py-2.5 text-right font-bold text-white">{fmt(r.receita_emit, "brl0")}</td>
                      <td className="num px-3 py-2.5 text-right">{fmt(r.tarifa_media_emit, "brl")}</td>
                      <td className="num px-3 py-2.5 text-right">{fmt(r.cobertura_ga4, "pct")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <Titulo dica="Canal original é o que o GA4 enxergou na compra. Reatribuído é o canal depois da regra da Zupper, que recupera pedidos sem sessão. A diferença mostra quanto cada canal ganha ou perde com a reatribuição.">Atribuição: original × reatribuído</Titulo>
        {orig.isLoading || reat.isLoading ? <Skel className="h-48" /> : (orig.error || reat.error) ? <Erro mensagem={String((orig.error ?? reat.error)?.message)} /> : (
          <div className="space-y-2">
            {compara.map((c) => {
              const topo = Math.max(...compara.map((x) => Math.max(x.original, x.reat)), 1);
              return (
                <div key={c.canal} className="grid grid-cols-[130px_1fr_auto] items-center gap-3 text-[12px]">
                  <span className="truncate font-semibold text-white">{canalLabel(c.canal)}</span>
                  <div className="space-y-1">
                    <div className="h-2.5 rounded-full bg-glow/10"><div className="h-full rounded-full bg-zup-300/70" style={{ width: `${(c.original / topo) * 100}%` }} /></div>
                    <div className="h-2.5 rounded-full bg-glow/10"><div className="h-full rounded-full" style={{ width: `${(c.reat / topo) * 100}%`, background: corCanal(c.canal) }} /></div>
                  </div>
                  <span className="num flex items-center gap-1.5 text-right text-muted-foreground">{fmt(c.original, "brl0")}<ArrowRight className="h-3 w-3" /><b className="text-white">{fmt(c.reat, "brl0")}</b></span>
                </div>
              );
            })}
            <div className="flex gap-4 pt-2 text-[11px] text-muted-foreground"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-zup-300/70" />Original</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-glow" />Reatribuído</span></div>
          </div>
        )}
      </Card>
    </div>
  );
}
