import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Filtros } from "@/lib/api";
import { presetPeriodo, periodoComparacao, type Comparar, type Periodo, type Preset } from "@/lib/datas";
import { useStatus } from "@/hooks/useDados";

type Chave = keyof Filtros;

interface Ctx {
  periodo: Periodo;
  setPreset: (p: Preset) => void;
  setCustom: (ini: string, fim: string) => void;
  comparar: Comparar;
  setComparar: (c: Comparar) => void;
  comp: { ini: string; fim: string } | null;
  filtros: Filtros;
  /** alterna um valor (clique em grafico/mapa); com exclusivo, troca em vez de somar */
  alternar: (k: Chave, v: string, exclusivo?: boolean) => void;
  definir: (k: Chave, v: string[]) => void;
  limpar: () => void;
  qtdFiltros: number;
  hoje: string;
}

const C = createContext<Ctx | null>(null);
const CH = "zupper-bi:filtros:v1";

function ler(): { preset: Preset; ini?: string; fim?: string; comparar: Comparar; filtros: Filtros } {
  try {
    const j = JSON.parse(sessionStorage.getItem(CH) || "null");
    if (j) return j;
  } catch { /* storage indisponivel */ }
  return { preset: "30d", comparar: "anterior", filtros: {} };
}

export function FiltrosProvider({ children }: { children: ReactNode }) {
  const { data: st } = useStatus();
  const hoje = st?.dados_ate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const ini0 = useMemo(ler, []);
  const [preset, setPresetS] = useState<Preset>(ini0.preset);
  const [custom, setCustomS] = useState<{ ini: string; fim: string } | null>(ini0.ini && ini0.fim ? { ini: ini0.ini, fim: ini0.fim } : null);
  const [comparar, setComparar] = useState<Comparar>(ini0.comparar);
  const [filtros, setFiltros] = useState<Filtros>(ini0.filtros || {});

  const periodo: Periodo = useMemo(() => {
    if (preset === "custom" && custom) return { preset, ini: custom.ini, fim: custom.fim };
    return presetPeriodo(preset === "custom" ? "30d" : preset, hoje);
  }, [preset, custom, hoje]);

  useEffect(() => {
    try {
      sessionStorage.setItem(CH, JSON.stringify({ preset, ...(custom ?? {}), comparar, filtros }));
    } catch { /* ignora */ }
  }, [preset, custom, comparar, filtros]);

  const setPreset = useCallback((p: Preset) => setPresetS(p), []);
  const setCustom = useCallback((ini: string, fim: string) => { setCustomS({ ini, fim }); setPresetS("custom"); }, []);
  const alternar = useCallback((k: Chave, v: string, exclusivo = false) => {
    setFiltros((f) => {
      const atual = f[k] ?? [];
      const tem = atual.includes(v);
      const novo = tem ? atual.filter((x) => x !== v) : exclusivo ? [v] : [...atual, v];
      const out = { ...f };
      if (novo.length) out[k] = novo; else delete out[k];
      return out;
    });
  }, []);
  const definir = useCallback((k: Chave, v: string[]) => setFiltros((f) => {
    const out = { ...f };
    if (v.length) out[k] = v; else delete out[k];
    return out;
  }), []);
  const limpar = useCallback(() => setFiltros({}), []);
  const comp = useMemo(() => periodoComparacao(periodo, comparar), [periodo, comparar]);
  const qtdFiltros = Object.values(filtros).reduce((a, v) => a + (v?.length ?? 0), 0);

  const v = useMemo<Ctx>(() => ({ periodo, setPreset, setCustom, comparar, setComparar, comp, filtros, alternar, definir, limpar, qtdFiltros, hoje }),
    [periodo, setPreset, setCustom, comparar, comp, filtros, alternar, definir, limpar, qtdFiltros, hoje]);
  return <C.Provider value={v}>{children}</C.Provider>;
}

export function useFiltros() {
  const c = useContext(C);
  if (!c) throw new Error("useFiltros fora do FiltrosProvider");
  return c;
}
