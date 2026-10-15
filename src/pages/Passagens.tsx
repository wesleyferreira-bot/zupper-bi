import { useState } from "react";
import { Card, Chip, Erro, Skel, Titulo } from "@/components/ui/base";
import { Colunas, Ranking, Serie } from "@/components/ui/Graficos";
import { Kpi } from "@/components/ui/Kpi";
import { useConsulta, useKpis, useSerie } from "@/hooks/useDados";
import { useFiltros } from "@/state/Filtros";
import { useRegistrarTela } from "@/state/Tela";
import { MEDIDAS } from "@/data/metricas";
import { cidade } from "@/data/aeroportos";
import { fmt, num } from "@/lib/format";

const MEDIDAS_PAGINA = ["tarifa_emit", "tarifa_media_emit", "passageiros", "passageiros_por_pedido", "antecedencia_media", "duracao_media", "taxa_emissao", "taxa_cancelamento"];
const SERIES = ["tarifa_media_emit", "antecedencia_media", "passageiros_por_pedido", "taxa_emissao", "taxa_cancelamento"];

export default function Passagens() {
  const { periodo, comp, filtros, alternar } = useFiltros();
  const [serie, setSerie] = useState("tarifa_media_emit");
  const k = useKpis(MEDIDAS_PAGINA, periodo, comp, filtros);
  const sr = useSerie(serie, "dia");
  const base = { ini: periodo.ini, fim: periodo.fim, filtros };
  const tipo = useConsulta({ ...base, medidas: ["pedidos", "pedidos_emit", "cancelados", "tarifa_emit", "tarifa_media_emit", "antecedencia_media", "duracao_media"], dims: ["tipo"] });
  const diaSemana = useConsulta({ ...base, medidas: ["pedidos_emit", "tarifa_media_emit"], dims: ["dia_semana"], ordem: "dia_semana asc" });
  const rotas = useConsulta({ ...base, medidas: ["pedidos_emit", "tarifa_media_emit", "tarifa_emit", "antecedencia_media"], dims: ["rota"], ordem: "tarifa_emit desc", limite: 10 });

  useRegistrarTela(k.atual ? {
    pagina: "passagens", titulo: "Passagens", resumo: {
      periodo, comparacao: comp, filtros,
      kpis: Object.fromEntries(MEDIDAS_PAGINA.map((m) => [m, { valor: k.valor(m), variacao_pct: k.variacao(m) }])),
      por_tipo: tipo.data ?? [], dia_semana: diaSemana.data ?? [], top_rotas: rotas.data ?? [],
    },
  } : null);

  const porMed = (m: string) => ({ valor: k.valor(m), variacao: k.variacao(m), carregando: k.carregando });

  return (
    <div className="space-y-6">
      {k.erro && <Erro mensagem={k.erro.message} />}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi medida="tarifa_emit" destaque {...porMed("tarifa_emit")} />
        <Kpi medida="tarifa_media_emit" destaque {...porMed("tarifa_media_emit")} />
        <Kpi medida="passageiros" destaque {...porMed("passageiros")} />
        <Kpi medida="antecedencia_media" destaque {...porMed("antecedencia_media")} />
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi medida="passageiros_por_pedido" {...porMed("passageiros_por_pedido")} />
        <Kpi medida="duracao_media" {...porMed("duracao_media")} />
        <Kpi medida="taxa_emissao" {...porMed("taxa_emissao")} />
        <Kpi medida="taxa_cancelamento" {...porMed("taxa_cancelamento")} />
      </section>

      <Card>
        <Titulo dica={MEDIDAS[serie].definicao} extra={<div className="flex flex-wrap gap-1.5">{SERIES.map((s) => <Chip key={s} ativo={serie === s} onClick={() => setSerie(s)}>{MEDIDAS[s].curto}</Chip>)}</div>}>Comportamento da compra</Titulo>
        {sr.erro ? <Erro mensagem={sr.erro.message} onTentar={sr.refetch} /> : sr.carregando && !sr.dados.length ? <Skel className="h-[270px]" /> : (
          <Serie dados={sr.dados} formato={MEDIDAS[serie].formato} eixoMoeda={MEDIDAS[serie].formato.startsWith("brl")}
            series={[{ chave: "atual", nome: MEDIDAS[serie].rotulo, cor: "#6fe3f7" }, ...(comp ? [{ chave: "comparacao", nome: "Comparação", cor: "#f5c542", tracejada: true }] : [])]} altura={270} />
        )}
      </Card>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <Titulo dica="Nacional e internacional têm tarifa, antecedência e duração muito diferentes. Clique para filtrar.">Nacional x Internacional</Titulo>
          {tipo.isLoading ? <Skel className="h-40" /> : (
            <div className="space-y-3">
              {(tipo.data ?? []).map((r) => {
                const on = (filtros.tipo ?? []).includes(String(r.tipo));
                return (
                  <button key={String(r.tipo)} type="button" onClick={() => alternar("tipo", String(r.tipo), true)}
                    className={`block w-full rounded-xl border p-3 text-left transition ${on ? "border-glow/70 bg-glow/10" : "border-glow/15 bg-ink-800/40 hover:border-glow/40"}`}>
                    <div className="mb-2 flex items-center justify-between"><span className="text-[13px] font-bold text-white">{String(r.tipo)}</span><span className="num text-[13px] font-bold text-glow">{fmt(r.tarifa_emit, "brl0")}</span></div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                      <span>Tarifa média<b className="block text-[13px] text-white">{fmt(r.tarifa_media_emit, "brl")}</b></span>
                      <span>Antecedência<b className="block text-[13px] text-white">{fmt(r.antecedencia_media, "dias")}</b></span>
                      <span>Duração<b className="block text-[13px] text-white">{fmt(r.duracao_media, "dias")}</b></span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
        <Card>
          <Titulo dica="Pedidos emitidos por dia da semana, a partir da data do pedido.">Quando as pessoas emitem</Titulo>
          {diaSemana.isLoading ? <Skel className="h-48" /> : (
            <Colunas dados={(diaSemana.data ?? []).map((r) => ({ rotulo: String(r.dia_semana).split("-")[1], pedidos_emit: num(r.pedidos_emit) }))} chave="pedidos_emit" nome="Pedidos emitidos" formato="int" altura={210} />
          )}
        </Card>
        <Card>
          <Titulo dica="Rotas com maior volume de tarifa emitida no período.">Rotas que mais vendem</Titulo>
          {rotas.isLoading ? <Skel className="h-48" /> : (
            <Ranking formato="brl0" dense
              itens={(rotas.data ?? []).map((r) => { const [o, d] = String(r.rota).split(" → "); return { nome: String(r.rota), rotulo: `${o} → ${d}`, sub: `${cidade(o)} → ${cidade(d)}`, valor: num(r.tarifa_emit), extra: `${fmt(r.pedidos_emit, "int")} emitidos` }; })} />
          )}
        </Card>
      </section>
    </div>
  );
}
