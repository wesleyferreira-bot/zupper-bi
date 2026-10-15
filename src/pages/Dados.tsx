import { useMemo } from "react";
import { Activity, CheckCircle2, Clock, Database, FlaskConical, TriangleAlert } from "lucide-react";
import { Card, Erro, Skel, Titulo, Vazio } from "@/components/ui/base";
import { Serie } from "@/components/ui/Graficos";
import { useConsulta, useEventos, useStatus } from "@/hooks/useDados";
import { useRegistrarTela } from "@/state/Tela";
import { dataCurta, dataLonga, fmt, num } from "@/lib/format";
import { somaDias } from "@/lib/datas";

const DEPLOY = "2026-10-15"; // deploy do data layer; o laboratorio acompanha os 7 dias seguintes
const META_MIN = 90, META_MAX = 92;

const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export default function Dados() {
  const st = useStatus();
  const ev = useEventos();
  const ate = st.data?.dados_ate?.slice(0, 10) ?? null;
  const ini = ate ? somaDias(ate, -34) : "2026-09-10";
  const cob = useConsulta(ate ? { medidas: ["cobertura_ga4", "pedidos", "pedidos_ga4"], dims: ["dia"], ini, fim: ate, limite: 60 } : null);
  const d = st.data;

  const serie = (cob.data ?? []).map((r) => ({ x: String(r.dia), rotulo: dataCurta(String(r.dia)), cobertura: num(r.cobertura_ga4), meta: META_MIN }));
  const lab = useMemo(() => {
    const antes = serie.filter((s) => s.x < DEPLOY && s.x >= somaDias(DEPLOY, -7)).map((s) => s.cobertura);
    const depois = serie.filter((s) => s.x >= DEPLOY && s.x <= somaDias(DEPLOY, 6));
    const mDepois = media(depois.map((s) => s.cobertura));
    return { antes: media(antes), depois: mDepois, dias: depois.length, ultimo: depois[depois.length - 1]?.cobertura ?? null };
  }, [serie]);
  const ganho = lab.antes !== null && lab.depois !== null ? lab.depois - lab.antes : null;
  const veredito = lab.depois === null ? "Aguardando os primeiros dias após o deploy."
    : lab.depois >= META_MIN ? "Meta de cobertura atingida na média da janela."
    : ganho !== null && ganho > 1 ? "Cobertura subindo, ainda abaixo da meta." : "Sem ganho relevante até agora.";

  const itensVigia: Record<string, unknown>[] = Array.isArray(d?.vigia?.itens) ? d!.vigia.itens : [];
  const eventos = ev.data ?? [];

  useRegistrarTela(d ? {
    pagina: "dados", titulo: "Dados e atualização",
    resumo: { dados_ate: d.dados_ate, dados_desde: d.dados_desde, cobertura_7d: d.cobertura_ga4_7d, cobertura_30d: d.cobertura_ga4_30d, laboratorio_ga4: lab, meta_cobertura: `${META_MIN}% a ${META_MAX}%`, eventos: eventos.slice(0, 8) },
  } : null);

  const horas = d?.carga?.fim ? Math.round((Date.now() - new Date(d.carga.fim).getTime()) / 3600000) : null;

  return (
    <div className="space-y-6">
      {st.error && <Erro mensagem={(st.error as Error).message} />}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { I: Clock, t: "Dados até", v: d?.dados_ate ? dataLonga(d.dados_ate) : "—", s: d?.dados_desde ? `desde ${dataLonga(d.dados_desde)}` : "" },
          { I: Database, t: "Última atualização", v: horas === null ? "—" : horas < 1 ? "agora há pouco" : `há ${horas} h`, s: d?.carga?.modo ? `carga ${d.carga.modo}` : "" },
          { I: Activity, t: "Cobertura GA4 · 7 dias", v: d?.cobertura_ga4_7d == null ? "—" : fmt(d.cobertura_ga4_7d, "pct"), s: `meta ${META_MIN}% a ${META_MAX}%` },
          { I: Activity, t: "Cobertura GA4 · 30 dias", v: d?.cobertura_ga4_30d == null ? "—" : fmt(d.cobertura_ga4_30d, "pct"), s: d?.invest_ate ? `mídia até ${dataLonga(d.invest_ate)}` : "" },
        ].map(({ I, t, v, s }) => (
          <Card key={t} className="min-h-[120px]">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zup-200/80"><I className="h-3.5 w-3.5" />{t}</div>
            {st.isLoading ? <Skel className="mt-3 h-8 w-40" /> : <div className="num mt-3 text-[26px] font-extrabold text-white">{v}</div>}
            <div className="text-[12px] text-muted-foreground">{s}</div>
          </Card>
        ))}
      </section>

      <Card>
        <Titulo dica={`Pedidos com sessão identificada no GA4 ÷ pedidos. A meta combinada é ${META_MIN}% a ${META_MAX}% com o app tagueado.`}>Cobertura do GA4 por dia</Titulo>
        {cob.isLoading ? <Skel className="h-[260px]" /> : cob.error ? <Erro mensagem={(cob.error as Error).message} /> : (
          <Serie dados={serie} formato="pct" series={[{ chave: "cobertura", nome: "Cobertura GA4", cor: "#6fe3f7" }, { chave: "meta", nome: `Meta mínima ${META_MIN}%`, cor: "#7bc74d", tracejada: true }]} altura={260} />
        )}
      </Card>

      <Card className="border-glow/30">
        <Titulo dica={`Janela de 7 dias a partir do deploy do data layer (${dataLonga(DEPLOY)}), comparada com os 7 dias anteriores.`}><span className="inline-flex items-center gap-2"><FlaskConical className="h-3.5 w-3.5" />Laboratório de validação do GA4</span></Titulo>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { t: "7 dias antes do deploy", v: lab.antes === null ? "—" : fmt(lab.antes, "pct") },
            { t: `Após o deploy (${lab.dias}/7 dias)`, v: lab.depois === null ? "—" : fmt(lab.depois, "pct") },
            { t: "Variação", v: ganho === null ? "—" : `${ganho > 0 ? "+" : ""}${ganho.toFixed(1).replace(".", ",")} p.p.` },
            { t: "Último dia", v: lab.ultimo === null ? "—" : fmt(lab.ultimo, "pct") },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border border-glow/15 bg-ink-800/40 p-3">
              <div className="text-[11px] text-muted-foreground">{x.t}</div>
              <div className="num mt-1 text-[22px] font-extrabold text-white">{x.v}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-zup-100">{veredito}</p>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <Titulo dica="Fatores externos que mexem na demanda ou nos dados: deploys, site fora do ar, campanhas e mercado. Cadastrados em Acessos.">Eventos e anotações</Titulo>
          {ev.isLoading ? <Skel className="h-32" /> : !eventos.length ? <Vazio titulo="Nenhum evento anotado" texto="Um administrador pode registrar deploys, instabilidades e ações de mercado." /> : (
            <ul className="space-y-2">{eventos.slice(0, 12).map((e) => (
              <li key={e.id} className="flex items-start gap-3 rounded-xl border border-glow/10 bg-ink-800/40 p-3 text-[13px]">
                <span className="num shrink-0 font-bold text-glow">{dataCurta(e.data)}</span>
                <span className="flex-1 text-white">{e.titulo}</span>
                <span className="rounded-full bg-glow/10 px-2 py-0.5 text-[11px] text-zup-100">{e.tipo}</span>
              </li>))}
            </ul>
          )}
        </Card>
        <Card>
          <Titulo dica="Verificações automáticas da base de origem (vigia). Qualquer item fora do normal aparece aqui.">Vigia da base</Titulo>
          {st.isLoading ? <Skel className="h-32" /> : itensVigia.length === 0 ? (
            <div className="flex items-center gap-2 text-[13px] text-zup-100"><CheckCircle2 className="h-4 w-4 text-mata" />{d?.vigia ? "Nenhum alerta registrado." : "O vigia ainda não enviou resultados."}</div>
          ) : (
            <ul className="space-y-2">{itensVigia.slice(0, 12).map((it, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-glow/10 bg-ink-800/40 p-3 text-[12px] text-zup-50">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-sol" />
                <span className="break-words">{Object.entries(it).map(([k, v]) => `${k}: ${v}`).join(" · ")}</span>
              </li>))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
