import { useMemo, useState } from "react";
import { CartesianGrid, ComposedChart, ReferenceArea, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis, Line } from "recharts";
import { Card, Chip, Dica, Erro, Skel, Titulo } from "@/components/ui/base";
import { Ranking, Serie } from "@/components/ui/Graficos";
import { Kpi } from "@/components/ui/Kpi";
import { useConsulta } from "@/hooks/useDados";
import type { ConsultaParams, Linha } from "@/lib/api";
import { useFiltros } from "@/state/Filtros";
import { useAnalista } from "@/state/Analista";
import { useRegistrarTela } from "@/state/Tela";
import { compacto, dataCurta, delta, fmt, num } from "@/lib/format";

type Base = "receita_emit" | "tarifa_emit";
const COR_PLAT: Record<string, string> = { "Google Ads": "#f5c542", "Meta Ads": "#4d9bff", Programática: "#b38cff", Programatica: "#b38cff" };
const corPlat = (p: string) => COR_PLAT[p] ?? "#6fe3f7";
const roas = (r: number, c: number) => (c > 0 ? r / c : null);

export default function Midia() {
  const { periodo, comp } = useFiltros();
  const { perguntar } = useAnalista();
  const [base, setBase] = useState<Base>("receita_emit");
  const [plat, setPlat] = useState<string | null>(null);
  const filtros = plat ? { plataforma: [plat] } : undefined;
  const q = (extra: Omit<ConsultaParams, "ini" | "fim">, per: { ini: string; fim: string } = periodo): ConsultaParams => ({ ini: per.ini, fim: per.fim, ...extra });

  const totAtual = useConsulta(q({ fonte: "invest", medidas: ["custo", "impressoes", "cliques", "cpc", "ctr"], filtros }));
  const totComp = useConsulta(comp ? q({ fonte: "invest", medidas: ["custo", "impressoes", "cliques", "cpc", "ctr"], filtros }, comp) : null);
  const plan = useConsulta(q({ fonte: "orcamento", medidas: ["planejado"], filtros }));
  const porPlat = useConsulta(q({ fonte: "invest", medidas: ["custo", "cliques", "impressoes", "cpc", "ctr"], dims: ["plataforma"], ordem: "custo desc" }));
  const diaReal = useConsulta(q({ fonte: "invest", medidas: ["custo"], dims: ["dia"], filtros, limite: 2000 }));
  const diaPlan = useConsulta(q({ fonte: "orcamento", medidas: ["planejado"], dims: ["dia"], filtros, limite: 2000 }));
  const camp = useConsulta(q({ fonte: "invest", medidas: ["custo", "cliques", "impressoes", "ctr", "cpc"], dims: ["plataforma", "campanha"], filtros, ordem: "custo desc", limite: 40 }));
  const campRes = useConsulta(q({ fonte: "campanha", medidas: ["pedidos", "receita_emit", "tarifa_emit"], dims: ["campanha"], ordem: "receita_emit desc", limite: 400 }));
  const resTot = useConsulta(q({ fonte: "campanha", medidas: ["pedidos", "receita_emit", "tarifa_emit"] }));
  const semCusto = useConsulta(q({ fonte: "invest", medidas: ["custo"], dims: ["semana"], filtros, limite: 200 }));
  const semRes = useConsulta(q({ fonte: "campanha", medidas: [base], dims: ["semana"], limite: 200 }));
  const manual = useConsulta(q({ fonte: "invest", medidas: ["custo"], dims: ["origem_dado"] }));

  const ult = <T extends Record<string, unknown>>(d?: T[]) => d?.[0] ?? null;
  const t = ult(totAtual.data), tc = ult(totComp.data), p = ult(plan.data), rt = ult(resTot.data);
  const custo = num(t?.custo), planej = num(p?.planejado), resultado = num(rt?.[base]);
  const roasGeral = roas(resultado, custo);
  const aderencia = planej > 0 ? (custo / planej) * 100 : null;
  const prog = (manual.data ?? []).find((r) => r.origem_dado === "manual");

  const serieDia = useMemo(() => {
    const m = new Map<string, { x: string; rotulo: string; real: number | null; plan: number | null }>();
    for (const r of diaReal.data ?? []) m.set(String(r.dia), { x: String(r.dia), rotulo: dataCurta(String(r.dia)), real: num(r.custo), plan: null });
    for (const r of diaPlan.data ?? []) { const o = m.get(String(r.dia)) ?? { x: String(r.dia), rotulo: dataCurta(String(r.dia)), real: null, plan: null }; o.plan = num(r.planejado); m.set(String(r.dia), o); }
    return [...m.values()].sort((a, b) => a.x.localeCompare(b.x));
  }, [diaReal.data, diaPlan.data]);

  const pontos = useMemo(() => {
    const res = new Map((semRes.data ?? []).map((r) => [String(r.semana), num(r[base])]));
    return (semCusto.data ?? []).filter((r) => num(r.custo) > 0 && res.has(String(r.semana)))
      .map((r) => ({ semana: String(r.semana), custo: num(r.custo), resultado: res.get(String(r.semana)) ?? 0, roas: roas(res.get(String(r.semana)) ?? 0, num(r.custo)) }));
  }, [semCusto.data, semRes.data, base]);
  const maxCusto = Math.max(...pontos.map((x) => x.custo), 1);

  const resCamp = useMemo(() => new Map((campRes.data ?? []).map((r) => [String(r.campanha).toLowerCase(), r])), [campRes.data]);
  const campanhas = (camp.data ?? []).map((r): Linha & { pedidos: number | null; resultado: number | null; roas: number | null } => {
    const x = resCamp.get(String(r.campanha).toLowerCase());
    return { ...r, pedidos: x ? num(x.pedidos) : null, resultado: x ? num(x[base]) : null, roas: x ? roas(num(x[base]), num(r.custo)) : null };
  });

  useRegistrarTela(t ? {
    pagina: "midia", titulo: "Mídia e ROAS", resumo: {
      periodo, plataforma: plat, investimento: custo, planejado: planej, aderencia_pct: aderencia, base_roas: base, roas: roasGeral,
      faixa_saudavel_roas: "4x a 5x", por_plataforma: porPlat.data, top_campanhas: campanhas.slice(0, 8),
      programatica_manual: prog ? "inclui lançamentos manuais" : "sem lançamento de programática no período",
    },
  } : null);

  const faixa = roasGeral === null ? null : roasGeral < 4 ? "abaixo" : roasGeral <= 5 ? "dentro" : "acima";
  const textoFaixa = { abaixo: "abaixo da faixa de 4x a 5x: o retorno está apertado", dentro: "dentro da faixa saudável de 4x a 5x", acima: "acima de 5x: há espaço para investir mais antes de a eficiência cair" }[faixa ?? "dentro"];

  const erro = (totAtual.error ?? diaReal.error) as Error | null;
  const carregando = totAtual.isLoading;

  return (
    <div className="space-y-6">
      {erro && <Erro mensagem={erro.message} />}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Plataforma</span>
        <Chip ativo={!plat} onClick={() => setPlat(null)}>Todas</Chip>
        {(porPlat.data ?? []).map((r) => <Chip key={String(r.plataforma)} ativo={plat === r.plataforma} onClick={() => setPlat(plat === r.plataforma ? null : String(r.plataforma))}>{String(r.plataforma)}</Chip>)}
        <span className="mx-2 hidden h-5 w-px bg-glow/20 sm:block" />
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Retorno sobre</span>
        <Chip ativo={base === "receita_emit"} onClick={() => setBase("receita_emit")}>Receita emitida</Chip>
        <Chip ativo={base === "tarifa_emit"} onClick={() => setBase("tarifa_emit")}>Tarifa emitida</Chip>
      </div>

      {!prog && !carregando && (
        <div className="rounded-2xl border border-sol/40 bg-sol/10 p-3 text-[13px] text-amber-100">
          O investimento total soma Google Ads e Meta Ads. A mídia programática entra por lançamento manual na área de Acessos e ainda não há valores neste período.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi medida="custo" destaque rotulo="Investimento total" valor={carregando ? null : custo} variacao={tc ? delta(t?.custo, tc.custo) : null} carregando={carregando} serie={serieDia.map((d) => d.real ?? 0)} />
        <Card className="flex min-h-[184px] flex-col justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zup-200/80">Planejado x realizado
            <Dica texto="Orçamento planejado do período (cadastrado em Acessos, distribuído por dia) contra o custo realizado." /></div>
          {plan.isLoading ? <Skel className="h-12" /> : planej > 0 ? (
            <div>
              <div className="num text-[34px] font-extrabold leading-none text-white">{fmt(aderencia, "pct")}</div>
              <div className="mt-1 text-[12px] text-muted-foreground">{fmt(custo, "brl0")} de {fmt(planej, "brl0")} planejados</div>
              <div className="mt-3 h-2 rounded-full bg-glow/10"><div className="h-full rounded-full bg-gradient-to-r from-zup-400 to-glow" style={{ width: `${Math.min(100, aderencia ?? 0)}%` }} /></div>
            </div>
          ) : <div className="text-[13px] text-muted-foreground">Sem orçamento cadastrado para o período.</div>}
        </Card>
        <Card className="flex min-h-[184px] flex-col justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zup-200/80">ROAS
            <Dica texto="Receita (ou tarifa) emitida atribuída a campanhas ÷ investimento em mídia. O cliente aceita escalar com retorno entre 4x e 5x; 10x a 30x costuma significar pouco investimento." /></div>
          {carregando ? <Skel className="h-12" /> : (
            <div>
              <div className="num text-[44px] font-extrabold leading-none text-white">{roasGeral === null ? "—" : `${roasGeral.toFixed(1).replace(".", ",")}x`}</div>
              <div className={`mt-2 text-[12px] font-semibold ${faixa === "abaixo" ? "text-alerta" : faixa === "dentro" ? "text-mata" : "text-glow"}`}>{roasGeral === null ? "Sem custo no período" : `Retorno ${textoFaixa}`}</div>
            </div>
          )}
        </Card>
        <Card className="flex min-h-[184px] flex-col justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zup-200/80">Eficiência do clique
            <Dica texto="Dados das plataformas com API (Google Ads e Meta Ads). Programática entra só se o lançamento trouxer impressões e cliques." /></div>
          {carregando ? <Skel className="h-20" /> : (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {[["Impressões", fmt(t?.impressoes, "int"), tc ? delta(t?.impressoes, tc.impressoes) : null], ["Cliques", fmt(t?.cliques, "int"), tc ? delta(t?.cliques, tc.cliques) : null], ["CTR", fmt(t?.ctr, "pct"), null], ["CPC", fmt(t?.cpc, "brl"), tc ? delta(t?.cpc, tc.cpc) : null]].map(([n, v]) => (
                <div key={String(n)}><dt className="text-[11px] text-muted-foreground">{n}</dt><dd className="num text-[18px] font-extrabold text-white">{v}</dd></div>
              ))}
            </dl>
          )}
        </Card>
      </section>

      <Card>
        <Titulo dica="Custo diário realizado contra o planejado diário (orçamento mensal dividido pelos dias).">Investimento por dia</Titulo>
        {diaReal.isLoading ? <Skel className="h-[260px]" /> : (
          <Serie dados={serieDia} formato="brl0" eixoMoeda
            series={[{ chave: "real", nome: "Realizado", cor: "#6fe3f7" }, { chave: "plan", nome: "Planejado", cor: "#f5c542", tracejada: true }]} altura={260} />
        )}
      </Card>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <Titulo dica="Camada 1: onde o dinheiro está. Clique para filtrar a página inteira.">Por plataforma</Titulo>
          {porPlat.isLoading ? <Skel className="h-40" /> : (
            <Ranking formato="brl0" ativos={plat ? [plat] : []} onClick={(n) => setPlat(plat === n ? null : n)}
              itens={(porPlat.data ?? []).map((r) => ({ nome: String(r.plataforma), valor: num(r.custo), extra: `CPC ${fmt(r.cpc, "brl")} · CTR ${fmt(r.ctr, "pct")}`, cor: corPlat(String(r.plataforma)) }))} />
          )}
        </Card>
        <Card className="xl:col-span-2">
          <Titulo dica="Topo ao fundo: quem viu o anúncio, quem clicou e quem virou pedido atribuído a campanha.">Funil de mídia</Titulo>
          {totAtual.isLoading ? <Skel className="h-40" /> : (
            <div className="space-y-2.5">
              {[{ n: "Impressões", v: num(t?.impressoes), c: "#4d9bff" }, { n: "Cliques", v: num(t?.cliques), c: "#6fe3f7" }, { n: "Pedidos atribuídos", v: num(rt?.pedidos), c: "#7bc74d" }].map((e, i, arr) => (
                <div key={e.n}>
                  <div className="mb-1 flex items-baseline justify-between text-[12px]"><span className="font-semibold text-white">{e.n}</span>
                    <span className="num text-zup-100">{e.v === 0 && i < 2 ? "sem dado" : fmt(e.v, "int")}{i > 0 && arr[i - 1].v > 0 && <span className="ml-2 text-muted-foreground">{((e.v / arr[i - 1].v) * 100).toFixed(2).replace(".", ",")}% da etapa anterior</span>}</span></div>
                  <div className="h-3 rounded-full bg-glow/10"><div className="h-full rounded-full" style={{ width: `${Math.max(1.5, (Math.log10(e.v + 1) / Math.log10(arr[0].v + 1 || 10)) * 100)}%`, background: e.c }} /></div>
                </div>
              ))}
              <p className="pt-1 text-[11px] text-muted-foreground">Barras em escala logarítmica para caber as três etapas. Impressões e cliques vêm da API das plataformas; programática entra apenas se houver lançamento com esses campos.</p>
            </div>
          )}
        </Card>
      </section>

      <Card>
        <Titulo dica="Cada ponto é uma semana. O eixo vertical é o retorno; a faixa de 4x a 5x é o que o cliente considera saudável para escalar. Pontos muito acima da faixa pedem mais investimento; abaixo, revisão.">Elasticidade: quanto mais invisto, quanto retorna</Titulo>
        {semCusto.isLoading || semRes.isLoading ? <Skel className="h-[300px]" /> : pontos.length < 3 ? <div className="py-10 text-center text-sm text-muted-foreground">Pouco histórico no período para desenhar a curva. Amplie o período para pelo menos 4 semanas.</div> : (
          <div className="h-[300px]">
            <ResponsiveContainer>
              <ComposedChart margin={{ top: 10, right: 16, bottom: 6, left: 0 }}>
                <CartesianGrid />
                <XAxis type="number" dataKey="custo" name="Investimento" domain={[0, "auto"]} tickFormatter={(v) => compacto(v, true)} tickLine={false} axisLine={false} />
                <YAxis type="number" dataKey="roas" name="ROAS" domain={[0, (m: number) => Math.max(8, Math.ceil(m + 1))]} tickFormatter={(v) => `${v}x`} tickLine={false} axisLine={false} width={44} />
                <ReferenceArea y1={4} y2={5} fill="#7bc74d" fillOpacity={0.14} stroke="#7bc74d" strokeOpacity={0.5} strokeDasharray="4 4" label={{ value: "faixa saudável 4x–5x", fill: "#7bc74d", fontSize: 11, position: "insideTopRight" }} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "rgba(5,22,31,.96)", border: "1px solid rgba(111,227,247,.35)", borderRadius: 12, color: "#e8f7fa", fontSize: 12 }}
                  formatter={(v: number, n: string) => [n === "Investimento" ? fmt(v, "brl0") : `${v.toFixed(1).replace(".", ",")}x`, n]} labelFormatter={() => ""} />
                <Scatter name="Semanas" data={pontos} fill="#6fe3f7" />
                <Line type="monotone" data={[...pontos].sort((a, b) => a.custo - b.custo)} dataKey="roas" stroke="#f5c542" strokeDasharray="5 5" dot={false} strokeWidth={1.4} legendType="none" isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-2 text-[12px] text-muted-foreground">Maior semana investida: {fmt(maxCusto, "brl0")}. {pontos.length > 0 && `${pontos.filter((x) => (x.roas ?? 0) > 5).length} de ${pontos.length} semanas ficaram acima de 5x.`}</p>
      </Card>

      <Card>
        <Titulo dica="Camada 2 e 3: campanhas de cada plataforma. Pedidos e retorno vêm do cruzamento pelo nome da campanha com o GA4; campanha renomeada pode ficar sem cruzamento.">Campanhas</Titulo>
        {camp.isLoading ? <Skel className="h-60" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead><tr className="border-b border-glow/15 text-[11px] uppercase tracking-wider text-muted-foreground">
                {["Campanha", "Plataforma", "Investimento", "Cliques", "CTR", "CPC", "Pedidos", "ROAS"].map((h, i) => <th key={h} className={`px-3 py-2 font-bold ${i > 1 ? "text-right" : ""}`}>{h}</th>)}
              </tr></thead>
              <tbody>
                {campanhas.map((r) => (
                  <tr key={`${r.plataforma}-${r.campanha}`} className="border-b border-glow/8 hover:bg-glow/5">
                    <td className="max-w-[280px] truncate px-3 py-2.5 font-semibold text-white" title={String(r.campanha)}>{String(r.campanha)}</td>
                    <td className="px-3 py-2.5"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: corPlat(String(r.plataforma)) }} />{String(r.plataforma)}</td>
                    <td className="num px-3 py-2.5 text-right font-bold text-white">{fmt(r.custo, "brl0")}</td>
                    <td className="num px-3 py-2.5 text-right">{fmt(r.cliques, "int")}</td>
                    <td className="num px-3 py-2.5 text-right">{fmt(r.ctr, "pct")}</td>
                    <td className="num px-3 py-2.5 text-right">{fmt(r.cpc, "brl")}</td>
                    <td className="num px-3 py-2.5 text-right">{r.pedidos === null ? "—" : fmt(r.pedidos, "int")}</td>
                    <td className="num px-3 py-2.5 text-right">{r.roas === null ? "—" : `${r.roas.toFixed(1).replace(".", ",")}x`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => perguntar(`Analise a eficiência da mídia entre ${periodo.ini} e ${periodo.fim}: ROAS por plataforma, campanhas que mais consomem sem retornar e onde há espaço para escalar dentro da faixa de 4x a 5x.`, { via: "insight", falar: true })}
            className="rounded-xl border border-glow/30 bg-glow/10 px-3 py-2 text-[12px] font-bold text-white hover:bg-glow/20">Pedir ao Zuppy uma leitura da mídia</button>
        </div>
      </Card>
    </div>
  );
}
