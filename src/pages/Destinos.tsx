import { useMemo, useState } from "react";
import { Card, Chip, Erro, Skel, Titulo, Vazio } from "@/components/ui/base";
import { Ranking } from "@/components/ui/Graficos";
import { Kpi } from "@/components/ui/Kpi";
import { Mapa, type Modo } from "@/components/map/Mapa";
import { useConsulta, useKpis } from "@/hooks/useDados";
import { useFiltros } from "@/state/Filtros";
import { useRegistrarTela } from "@/state/Tela";
import { AEROPORTOS, cidade, regiao, temCoord } from "@/data/aeroportos";
import { MEDIDAS } from "@/data/metricas";
import { compacto, fmt, num } from "@/lib/format";

const METRICAS = ["receita_emit", "pedidos_emit", "tarifa_media_emit"] as const;
type Persp = "destino" | "origem";

export default function Destinos() {
  const { periodo, comp, filtros, alternar, definir } = useFiltros();
  const [modo, setModo] = useState<Modo>("brasil");
  const [metrica, setMetrica] = useState<(typeof METRICAS)[number]>("receita_emit");
  const [persp, setPersp] = useState<Persp>("destino");
  const med = MEDIDAS[metrica];

  const base = { ini: periodo.ini, fim: periodo.fim, filtros };
  const pontosQ = useConsulta({ ...base, medidas: ["receita_emit", "pedidos_emit", "tarifa_media_emit", "antecedencia_media"], dims: [persp], ordem: `${metrica} desc`, limite: 400 });
  const rotasQ = useConsulta({ ...base, medidas: ["receita_emit", "pedidos_emit"], dims: ["origem", "destino"], ordem: "receita_emit desc", limite: 24 });
  const k = useKpis(["receita_emit", "pedidos_emit", "tarifa_media_emit", "antecedencia_media", "duracao_media"], periodo, comp, filtros);

  const linhas = pontosQ.data ?? [];
  const filtrado = linhas.filter((r) => (modo === "brasil" ? AEROPORTOS[String(r[persp])]?.[3] === "BR" : AEROPORTOS[String(r[persp])]?.[3] !== "BR"));
  const pontos = filtrado.filter((r) => temCoord(String(r[persp]))).map((r) => ({
    codigo: String(r[persp]), valor: num(r[metrica]), detalhe: `${fmt(r.pedidos_emit, "int")} emitidos · antecedência ${fmt(r.antecedencia_media, "dias")}`,
  }));
  const rotas = (rotasQ.data ?? []).filter((r) => (modo === "brasil" ? AEROPORTOS[String(r.destino)]?.[3] === "BR" && AEROPORTOS[String(r.origem)]?.[3] === "BR" : true))
    .map((r) => ({ o: String(r.origem), d: String(r.destino), valor: num(r.receita_emit), detalhe: `${fmt(r.pedidos_emit, "int")} emitidos` }));

  const regioes = useMemo(() => {
    const m = new Map<string, { valor: number; pedidos: number; codigos: string[] }>();
    for (const r of linhas) {
      const c = String(r[persp]);
      const g = regiao(c);
      const x = m.get(g) ?? { valor: 0, pedidos: 0, codigos: [] };
      x.valor += num(r.receita_emit); x.pedidos += num(r.pedidos_emit); x.codigos.push(c);
      m.set(g, x);
    }
    return [...m.entries()].map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.valor - a.valor);
  }, [linhas, persp]);

  useRegistrarTela(linhas.length ? {
    pagina: "destinos", titulo: "Destinos e regiões", resumo: {
      periodo, filtros, perspectiva: persp, regioes: regioes.slice(0, 8).map((r) => ({ regiao: r.nome, receita_emit: Math.round(r.valor), pedidos_emit: r.pedidos })),
      top_pontos: linhas.slice(0, 10), top_rotas: (rotasQ.data ?? []).slice(0, 8),
    },
  } : null);

  const ativos = filtros[persp] ?? [];
  const alternarPonto = (c: string) => alternar(persp, c);
  const semCoord = filtrado.filter((r) => !temCoord(String(r[persp]))).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {["receita_emit", "pedidos_emit", "tarifa_media_emit", "antecedencia_media", "duracao_media"].map((m) => (
          <Kpi key={m} medida={m} valor={k.valor(m)} variacao={k.variacao(m)} carregando={k.carregando} />
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]">
        <Card className="overflow-hidden">
          <Titulo extra={
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip ativo={modo === "brasil"} onClick={() => setModo("brasil")}>Brasil</Chip>
              <Chip ativo={modo === "mundo"} onClick={() => setModo("mundo")}>Mundo</Chip>
              <span className="mx-1 h-4 w-px bg-glow/20" />
              <Chip ativo={persp === "destino"} onClick={() => setPersp("destino")}>Destinos</Chip>
              <Chip ativo={persp === "origem"} onClick={() => setPersp("origem")}>Origens</Chip>
            </div>
          }>Mapa de {persp === "destino" ? "destinos" : "origens"} · clique num ponto ou num aviãozinho</Titulo>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {METRICAS.map((m) => <Chip key={m} ativo={metrica === m} onClick={() => setMetrica(m)}>{MEDIDAS[m].curto}</Chip>)}
          </div>
          {pontosQ.error ? <Erro mensagem={(pontosQ.error as Error).message} onTentar={() => pontosQ.refetch()} /> : pontosQ.isLoading ? <Skel className="aspect-[1000/760] w-full" /> : !pontos.length ? <Vazio titulo="Nenhum aeroporto neste recorte" /> : (
            <Mapa modo={modo} pontos={pontos} rotas={rotas} ativos={ativos}
              onPonto={alternarPonto} onRota={(o, d) => alternar("rota", `${o} → ${d}`, true)}
              formatar={(v) => (med.formato === "brl0" || med.formato === "brl" ? compacto(v, true) : fmt(v, med.formato))} />
          )}
          {semCoord > 0 && <div className="mt-2 text-[11px] text-muted-foreground">{semCoord} aeroporto(s) fora da base de coordenadas aparecem só nos rankings.</div>}
        </Card>

        <div className="space-y-4">
          <Card>
            <Titulo>Regiões · clique para filtrar</Titulo>
            {pontosQ.isLoading ? <Skel className="h-48" /> : (
              <Ranking formato="brl0" dense
                ativos={regioes.filter((r) => r.codigos.length && r.codigos.every((c) => ativos.includes(c))).map((r) => r.nome)}
                onClick={(nome) => {
                  const r = regioes.find((x) => x.nome === nome);
                  if (!r) return;
                  const todos = r.codigos.every((c) => ativos.includes(c));
                  definir(persp, todos ? ativos.filter((c) => !r.codigos.includes(c)) : [...new Set([...ativos, ...r.codigos])]);
                }}
                itens={regioes.slice(0, 9).map((r) => ({ nome: r.nome, valor: r.valor, extra: `${fmt(r.pedidos, "int")} emitidos` }))} />
            )}
          </Card>
          <Card>
            <Titulo>{persp === "destino" ? "Destinos" : "Origens"} em ranking</Titulo>
            {pontosQ.isLoading ? <Skel className="h-48" /> : (
              <Ranking dense formato={med.formato} ativos={ativos} onClick={alternarPonto}
                itens={filtrado.slice(0, 10).map((r) => ({ nome: String(r[persp]), rotulo: `${String(r[persp])} · ${cidade(String(r[persp]))}`, valor: num(r[metrica]), extra: `${fmt(r.pedidos_emit, "int")} emitidos` }))} />
            )}
          </Card>
        </div>
      </div>

      <Card>
        <Titulo>Rotas que mais geram receita</Titulo>
        {rotasQ.isLoading ? <Skel className="h-40" /> : (
          <div className="grid gap-x-6 gap-y-1 md:grid-cols-2">
            <Ranking dense formato="brl0" ativos={filtros.rota} onClick={(n) => alternar("rota", n, true)}
              itens={(rotasQ.data ?? []).slice(0, 6).map((r) => ({ nome: `${r.origem} → ${r.destino}`, rotulo: `${r.origem} → ${r.destino}`, sub: `${cidade(String(r.origem))} → ${cidade(String(r.destino))}`, valor: num(r.receita_emit), extra: `${fmt(r.pedidos_emit, "int")} emitidos` }))} />
            <Ranking dense formato="brl0" ativos={filtros.rota} onClick={(n) => alternar("rota", n, true)}
              itens={(rotasQ.data ?? []).slice(6, 12).map((r) => ({ nome: `${r.origem} → ${r.destino}`, rotulo: `${r.origem} → ${r.destino}`, sub: `${cidade(String(r.origem))} → ${cidade(String(r.destino))}`, valor: num(r.receita_emit), extra: `${fmt(r.pedidos_emit, "int")} emitidos` }))} />
          </div>
        )}
      </Card>
    </div>
  );
}
