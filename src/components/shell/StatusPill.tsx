import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { useStatus } from "@/hooks/useDados";
import { dataLonga } from "@/lib/format";

function atras(iso?: string) {
  if (!iso) return null;
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 2) return "agora há pouco";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 36) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

/** Ultima atualizacao + data coberta + cobertura GA4, sempre visiveis. */
export function StatusPill({ compacto = false }: { compacto?: boolean }) {
  const { data, isLoading, isError } = useStatus();
  if (isLoading) return <div className="skel h-9 w-64" />;
  if (isError || !data) return <div className="inline-flex items-center gap-2 rounded-xl border border-alerta/40 bg-alerta/10 px-3 py-2 text-xs text-red-100"><AlertTriangle className="h-4 w-4" />Status dos dados indisponível</div>;
  const hoje = new Date();
  const ate = data.dados_ate ? new Date(data.dados_ate + "T12:00:00") : null;
  const defasagem = ate ? Math.round((hoje.getTime() - ate.getTime()) / 86400000) : 99;
  const cob = data.cobertura_ga4_7d;
  const ok = defasagem <= 2;
  const cobBaixa = cob !== null && cob < 70;
  return (
    <div className={clsx("flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border px-3 py-2 text-[12px]", ok ? "border-glow/20 bg-ink-800/50" : "border-sol/50 bg-sol/10")}>
      <span className="inline-flex items-center gap-1.5 font-semibold text-white">
        {ok ? <CheckCircle2 className="h-4 w-4 text-mata" /> : <AlertTriangle className="h-4 w-4 text-sol" />}
        Dados até {data.dados_ate ? dataLonga(data.dados_ate) : "—"}
      </span>
      {!compacto && <span className="text-muted-foreground">Atualizado {atras(data.carga?.fim) ?? "—"}</span>}
      <span className={clsx("inline-flex items-center gap-1.5 font-semibold", cobBaixa ? "text-sol" : "text-zup-100")}>
        <Activity className="h-3.5 w-3.5" />Cobertura GA4 (7d): {cob === null ? "—" : `${cob.toFixed(1).replace(".", ",")}%`}
      </span>
    </div>
  );
}
