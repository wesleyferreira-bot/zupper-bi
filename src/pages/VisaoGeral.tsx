import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Globe2, Layers, Lightbulb, Plane, TrendingDown, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { Card, Chip, Erro, Skel, Titulo } from "@/components/ui/base";
import { Kpi } from "@/components/ui/Kpi";
import { Ranking, Serie, type PontoSerie } from "@/components/ui/Graficos";
import { useConsulta, useKpis, useSerie } from "@/hooks/useDados";
import { useFiltros } from "@/state/Filtros";
import { useAnalista } from "@/state/Analista";
import { useRegistrarTela } from "@/state/Tela";
import { MEDIDAS } from "@/data/metricas";
import { corCanal } from "@/data/canais";
import { canalLabel, fmt, num } from "@/lib/format";
import { insightsDeKpis } from "@/lib/insights";
import { cidade } from "@/data/aeroportos";

const SERIES = [
  { id: "receita_emit", nome: "Receita emitida" },
  { id: "pedidos_emit", nome: "Pedidos emitidos" },
  { id: "tarifa_emit", nome: "Tarifa emitida" },
  { id: "pedidos", nome: "Pedidos capturados" },
];
const MEDIDAS_PAGINA = ["receita_emit", "pedidos_emit", "tarifa_emit", "tarifa_media_emit", "pedidos", "taxa_emissao", "passageiros", "ticket_medio_emit", "taxa_cancelamento", "cobertura_ga4"];

export default function VisaoGeral() {
  const nav = useNavigate();
  const { periodo, comp, filtros, alternar, comparar } = useFiltros();
  const { perguntar } = useAnalista();
  const [serie, setSerie] = useState("receita_emit");
  const k = useKpis(MEDIDAS_PAGINA, periodo, comp, filtros);
  const sparkR = useSerie("receita_emit");
  const sparkP = useSerie("pedidos_emit");
  const sparkT = useSerie("tarifa_emit");
  const sparkM = useSerie("tarifa_media_emit");
  const sr = useSerie(serie);
  const canais = useConsulta({ medidas: ["receita_emit", "pedidos_emit"], dims: ["canal"], ini: periodo.ini, fim: periodo.fim, filtros, ordem: "receita_emit desc" });
  const destinos = useConsulta({ medidas: ["receita_emit", "pedidos_emit"], dims: ["destino"], ini: periodo.ini, fim: periodo.fim, filtros, ordem: "receita_emit desc", limite: 8 });
  const tipos = useConsulta({ medidas: ["receita_emit", "pedidos_emit"], dims: ["tipo"], ini: periodo.ini, fim: periodo.fim, filtros });

  const rotuloComp = comparar === "ano" ? "contra o mesmo período do ano anterior" : "contra o período anterior";
  const insights = useMemo(() => insightsDeKpis(k.valor, k.variacao, rotuloComp), [k.atual, k.base, rotuloComp]); // eslint-disable-line react-hooks/exhaustive-deps

  useRegistrarTela(k.atual ? {
    pagina: "visao-geral", titulo: "Visão geral (Big Numbers)",
    resumo: {
      periodo, comparacao: comp, filtros,
      kpis: Object.fromEntries(MEDIDAS_PAGINA.map((m) => [m, { valor: k.valor(m), variacao_pct: k.variacao(m) }])),
      canais: (canais.data ?? []).slice(0, 6), destinos: destinos.data ?? [], tipos: tipos.data ?? [],
    },
  } : null);

  const porMed = (m: string) => ({ valor: k.valor(m), variacao: k.variacao(m), carregando: k.carregando });
  const serieDe = (s: { dados: PontoSerie[] }) => s.dados.map((d) => num(d.atual));

  return (
    <div className="space-y-6">
      {k.erro && <Erro mensagem={k.erro.message} />}

      <section aria-label="Números principais" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi medida="receita_emit" destaque serie={serieDe(sparkR)} {...porMed("receita_emit")} />
        <Kpi medida="pedidos_emit" destaque serie={serieDe(sparkP)} {...porMed("pedidos_emit")} />
        <Kpi medida="tarifa_emit" destaque serie={serieDe(sparkT)} {...porMed("tarifa_emit")} />
        <Kpi medida="tarifa_media_emit" destaque serie={serieDe(sparkM)} {...porMed("tarifa_media_emit")} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi medida="pedidos" {...porMed("pedidos")} onClick={() => nav("/canais")} />
        <Kpi medida="taxa_emissao" {...porMed("taxa_emissao")} onClick={() => nav("/passagens")} />
        <Kpi medida="passageiros" {...porMed("passageiros")} onClick={() => nav("/passagens")} />
        <Kpi medida="ticket_medio_emit" {...porMed("ticket_medio_emit")} onClick={() => nav("/passagens")} />
        <Kpi medida="taxa_cancelamento" {...porMed("taxa_cancelamento")} onClick={() => nav("/passagens")} />
        <Kpi medida="cobertura_ga4" {...porMed("cobertura_ga4")} onClick={() => nav("/dados")} />
      </section>

      {insights.length > 0 && (
        <section aria-label="Insights" className="grid gap-3 lg:grid-cols-2">
          {insights.map((i) => (
            <button key={i.id} type="button" onClick={() => perguntar(i.pergunta, { via: "insight", falar: true })}
              className="holo holo-hover group flex items-center gap-3 !rounded-2xl px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${i.icone === "alerta" ? "bg-alerta/15 text-alerta" : i.icone === "alta" ? "bg-mata/15 text-mata" : "bg-glow/15 text-glow"}`}>
                {i.icone === "alerta" ? <AlertTriangle className="h-4.5 w-4.5" /> : i.icone === "alta" ? <TrendingUp className="h-4.5 w-4.5" /> : <Lightbulb className="h-4.5 w-4.5" />}
              </span>
              <span className="flex-1 text-[13px] font-medium text-zup-50">{i.texto}</span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-glow opacity-80 group-hover:opacity-100"><Sparkles className="h-3.5 w-3.5" />Ouvir análise</span>
            </button>
          ))}
        </section>
      )}

      <Card>
        <Titulo dica={MEDIDAS[serie].definicao} extra={
          <div className="flex flex-wrap gap-1.5">{SERIES.map((s) => <Chip key={s.id} ativo={serie === s.id} onClick={() => setSerie(s.id)}>{s.nome}</Chip>)}</div>
        }>Evolução no período</Titulo>
        {sr.erro ? <Erro mensagem={sr.erro.message} onTentar={sr.refetch} /> : sr.carregando && !sr.dados.length ? <Skel className="h-[280px] w-full" /> : (
          <Serie dados={sr.dados} formato={MEDIDAS[serie].formato} eixoMoeda={MEDIDAS[serie].formato.startsWith("brl")}
            series={[{ chave: "atual", nome: MEDIDAS[serie].rotulo, cor: "#6fe3f7" }, ...(comp ? [{ chave: "comparacao", nome: "Comparação", cor: "#f5c542", tracejada: true }] : [])]} altura={290} />
        )}
      </Card>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <Titulo>Canais · clique para filtrar tudo</Titulo>
          {canais.isLoading ? <Skel className="h-56" /> : (
            <Ranking formato="brl0" ativos={filtros.canal} onClick={(c) => alternar("canal", c)}
              itens={(canais.data ?? []).map((r) => ({ nome: String(r.canal), rotulo: canalLabel(String(r.canal)), valor: num(r.receita_emit), extra: `${fmt(r.pedidos_emit, "int")} emitidos`, cor: corCanal(String(r.canal)) }))} />
          )}
        </Card>
        <Card>
          <Titulo>Destinos que mais geram receita</Titulo>
          {destinos.isLoading ? <Skel className="h-56" /> : (
            <Ranking formato="brl0" ativos={filtros.destino} onClick={(d) => alternar("destino", d)}
              itens={(destinos.data ?? []).map((r) => ({ nome: String(r.destino), rotulo: `${String(r.destino)} · ${cidade(String(r.destino))}`, valor: num(r.receita_emit), extra: `${fmt(r.pedidos_emit, "int")} emitidos` }))} />
          )}
        </Card>
        <Card>
          <Titulo>Nacional x Internacional</Titulo>
          {tipos.isLoading ? <Skel className="h-24" /> : (
            <Ranking formato="brl0" ativos={filtros.tipo} onClick={(t) => alternar("tipo", t, true)}
              itens={(tipos.data ?? []).map((r) => ({ nome: String(r.tipo), valor: num(r.receita_emit), extra: `${fmt(r.pedidos_emit, "int")} emitidos`, cor: r.tipo === "Internacional" ? "#b38cff" : "#6fe3f7" }))} />
          )}
          <div className="mt-5 grid gap-2">
            {[
              { to: "/passagens", t: "Passagens", d: "tarifa, antecedência, duração", I: Plane },
              { to: "/destinos", t: "Destinos e regiões", d: "mapa e rotas", I: Globe2 },
              { to: "/canais", t: "Canais", d: "atribuição e emissão", I: Layers },
            ].map(({ to, t, d, I }) => (
              <button key={to} type="button" onClick={() => nav(to)} className="group flex items-center gap-3 rounded-xl border border-glow/15 bg-ink-800/50 px-3 py-2.5 text-left transition hover:border-glow/50">
                <I className="h-4.5 w-4.5 text-glow" />
                <span className="flex-1"><span className="block text-[13px] font-bold text-white">{t}</span><span className="block text-[11px] text-muted-foreground">{d}</span></span>
                <ArrowRight className="h-4 w-4 text-glow transition group-hover:translate-x-1" />
              </button>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
