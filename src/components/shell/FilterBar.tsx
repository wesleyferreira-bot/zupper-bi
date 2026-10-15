import { useState } from "react";
import { CalendarRange, GitCompare, X, FilterX } from "lucide-react";
import clsx from "clsx";
import { useFiltros } from "@/state/Filtros";
import { Chip } from "@/components/ui/base";
import { TODOS_CANAIS } from "@/data/canais";
import { canalLabel, dataCurta } from "@/lib/format";
import type { Preset } from "@/lib/datas";
import type { Filtros } from "@/lib/api";

const PRESETS: { id: Preset; nome: string }[] = [
  { id: "7d", nome: "7 dias" }, { id: "30d", nome: "30 dias" }, { id: "mes", nome: "Mês atual" },
  { id: "mes_ant", nome: "Mês anterior" }, { id: "90d", nome: "90 dias" }, { id: "ano", nome: "Ano" },
];
const ROTULO: Record<keyof Filtros, string> = { canal: "Canal", grupo_canal: "Grupo", tipo: "Tipo", origem: "Origem", destino: "Destino", rota: "Rota", plataforma: "Plataforma", campanha: "Campanha", canal_original: "Canal original" };

export function FilterBar() {
  const f = useFiltros();
  const [aberto, setAberto] = useState(false);
  const [ci, setCi] = useState(f.periodo.ini);
  const [cf, setCf] = useState(f.periodo.fim);
  const chips = (Object.entries(f.filtros) as [keyof Filtros, string[]][]).flatMap(([k, vs]) => vs.map((v) => ({ k, v })));

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 pr-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground"><CalendarRange className="h-3.5 w-3.5" />Período</div>
        {PRESETS.map((p) => <Chip key={p.id} ativo={f.periodo.preset === p.id} onClick={() => f.setPreset(p.id)}>{p.nome}</Chip>)}
        <Chip ativo={f.periodo.preset === "custom"} onClick={() => setAberto((a) => !a)}>
          {f.periodo.preset === "custom" ? `${dataCurta(f.periodo.ini)} → ${dataCurta(f.periodo.fim)}` : "Personalizado"}
        </Chip>
        <div className="mx-1 hidden h-5 w-px bg-glow/20 sm:block" />
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground"><GitCompare className="h-3.5 w-3.5" />Comparar</div>
        <Chip ativo={f.comparar === "anterior"} onClick={() => f.setComparar("anterior")}>Período anterior</Chip>
        <Chip ativo={f.comparar === "ano"} onClick={() => f.setComparar("ano")}>Mesmo período, ano anterior</Chip>
        <Chip ativo={f.comparar === "off"} onClick={() => f.setComparar("off")}>Sem comparação</Chip>
      </div>

      {aberto && (
        <div className="holo flex flex-wrap items-end gap-3 p-4">
          <label className="text-xs text-muted-foreground">De
            <input type="date" value={ci} max={f.hoje} onChange={(e) => setCi(e.target.value)} className="mt-1 block rounded-lg border border-glow/25 bg-ink-900 px-2.5 py-2 text-sm text-white" />
          </label>
          <label className="text-xs text-muted-foreground">Até
            <input type="date" value={cf} max={f.hoje} onChange={(e) => setCf(e.target.value)} className="mt-1 block rounded-lg border border-glow/25 bg-ink-900 px-2.5 py-2 text-sm text-white" />
          </label>
          <button type="button" disabled={!ci || !cf || cf < ci} onClick={() => { f.setCustom(ci, cf); setAberto(false); }}
            className="rounded-xl bg-gradient-to-b from-zup-300 to-zup-500 px-4 py-2 text-sm font-bold text-ink-950 disabled:opacity-40">Aplicar</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 pr-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground"><FilterX className="h-3.5 w-3.5" />Filtros</div>
        <Chip ativo={f.filtros.tipo?.includes("Nacional")} onClick={() => f.alternar("tipo", "Nacional")}>Nacional</Chip>
        <Chip ativo={f.filtros.tipo?.includes("Internacional")} onClick={() => f.alternar("tipo", "Internacional")}>Internacional</Chip>
        <Chip ativo={f.filtros.grupo_canal?.includes("Canais de Marketing")} onClick={() => f.alternar("grupo_canal", "Canais de Marketing")}>Marketing</Chip>
        <Chip ativo={f.filtros.grupo_canal?.includes("Canais Comerciais")} onClick={() => f.alternar("grupo_canal", "Canais Comerciais")}>Comerciais</Chip>
        <select aria-label="Adicionar canal ao filtro" value="" onChange={(e) => e.target.value && f.alternar("canal", e.target.value)}
          className="rounded-full border border-glow/20 bg-ink-800/60 px-3 py-1.5 text-[12px] font-semibold text-zup-100/90 outline-none hover:border-glow/50 focus:border-glow">
          <option value="">+ Canal</option>
          {TODOS_CANAIS.filter((c) => !f.filtros.canal?.includes(c)).map((c) => <option key={c} value={c}>{canalLabel(c)}</option>)}
        </select>
        {chips.filter((c) => !["tipo", "grupo_canal"].includes(c.k)).map((c) => (
          <button key={c.k + c.v} type="button" onClick={() => f.alternar(c.k, c.v)} aria-label={`Remover filtro ${c.v}`}
            className={clsx("inline-flex items-center gap-1.5 rounded-full border border-glow/60 bg-glow/15 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-alerta/20")}>
            <span className="text-muted-foreground">{ROTULO[c.k]}:</span> {c.k === "canal" ? canalLabel(c.v) : c.v}<X className="h-3 w-3" />
          </button>
        ))}
        {f.qtdFiltros > 0 && <button type="button" onClick={f.limpar} className="ml-1 text-[12px] font-semibold text-glow underline-offset-2 hover:underline">Limpar tudo</button>}
      </div>
    </div>
  );
}
