import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { MOCK, supabase } from "@/lib/supabase";
import { consulta, statusDados, type ConsultaParams, type Filtros, type Linha } from "@/lib/api";
import { delta, num } from "@/lib/format";

export function useStatus() {
  return useQuery({ queryKey: ["status"], queryFn: statusDados, staleTime: 60_000, refetchInterval: 5 * 60_000, retry: 1 });
}

export function useConsulta(p: ConsultaParams | null, opts: { enabled?: boolean } = {}) {
  return useQuery<Linha[]>({
    queryKey: ["consulta", p],
    queryFn: () => consulta(p as ConsultaParams),
    enabled: !!p && (opts.enabled ?? true),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}

export interface Periodo2 { ini: string; fim: string }

/** Atual x comparacao numa chamada logica so: devolve uma linha por periodo. */
export function useKpis(medidas: string[], periodo: Periodo2, comp: Periodo2 | null, filtros: Filtros, fonte: ConsultaParams["fonte"] = "rota") {
  const a = useConsulta({ fonte, medidas, ini: periodo.ini, fim: periodo.fim, filtros });
  const b = useConsulta(comp ? { fonte, medidas, ini: comp.ini, fim: comp.fim, filtros } : null);
  const atual = a.data?.[0] ?? null;
  const base = b.data?.[0] ?? null;
  return {
    carregando: a.isLoading || (!!comp && b.isLoading),
    erro: (a.error as Error | null) ?? (b.error as Error | null),
    atual, base,
    valor: (m: string) => (atual ? (atual[m] === null ? null : num(atual[m])) : null),
    variacao: (m: string) => (atual && base ? delta(atual[m], base[m]) : null),
    baseValor: (m: string) => (base ? (base[m] === null ? null : num(base[m])) : null),
  };
}

import { useFiltros } from "@/state/Filtros";
import { dataCurta, mesLabel } from "@/lib/format";
import type { PontoSerie } from "@/components/ui/Graficos";

/** Serie por dia/semana/mes com o periodo de comparacao alinhado por posicao. */
export function useSerie(medida: string, dim: "dia" | "semana" | "mes" = "dia", fonte: ConsultaParams["fonte"] = "rota") {
  const { periodo, comp, filtros } = useFiltros();
  const a = useConsulta({ fonte, medidas: [medida], dims: [dim], ini: periodo.ini, fim: periodo.fim, filtros, limite: 2000 });
  const b = useConsulta(comp ? { fonte, medidas: [medida], dims: [dim], ini: comp.ini, fim: comp.fim, filtros, limite: 2000 } : null);
  const dados: PontoSerie[] = (a.data ?? []).map((r, i) => ({
    x: String(r[dim]),
    rotulo: dim === "mes" ? mesLabel(String(r[dim])) : dataCurta(String(r[dim])),
    atual: r[medida] === null ? null : num(r[medida]),
    comparacao: b.data?.[i] ? (b.data[i][medida] === null ? null : num(b.data[i][medida])) : null,
  }));
  return { dados, carregando: a.isLoading || (!!comp && b.isLoading), erro: (a.error as Error | null) ?? (b.error as Error | null), refetch: () => { a.refetch(); b.refetch(); } };
}

export interface Evento { id: string; data: string; titulo: string; tipo: "deploy" | "site" | "campanha" | "mercado" | "outro" }
/** Anotacoes de fatores externos (deploy de tagueamento, site fora do ar, Black Friday...). */
export function useEventos() {
  return useQuery<Evento[]>({
    queryKey: ["eventos"],
    queryFn: async () => {
      if (MOCK) return [{ id: "m1", data: "2026-10-15", titulo: "Deploy do data layer (dado de demonstração)", tipo: "deploy" }];
      const { data, error } = await supabase.from("bi_eventos").select("id,data,titulo,tipo").order("data", { ascending: false }).limit(200);
      if (error) throw new Error(error.message);
      return data as Evento[];
    },
    staleTime: 5 * 60_000,
  });
}
