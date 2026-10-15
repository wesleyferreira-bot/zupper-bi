import { MOCK, supabase } from "./supabase";

export type Fonte = "rota" | "canal" | "invest" | "campanha" | "orcamento";
export type Filtros = Partial<Record<"canal" | "grupo_canal" | "tipo" | "origem" | "destino" | "rota" | "plataforma" | "campanha" | "canal_original", string[]>>;

export interface ConsultaParams {
  fonte?: Fonte;
  medidas: string[];
  dims?: string[];
  filtros?: Filtros;
  ini: string;
  fim: string;
  ordem?: string;
  limite?: number;
}
export type Linha = Record<string, string | number | null>;

export interface StatusDados {
  dados_ate: string | null;
  dados_desde: string | null;
  cobertura_ga4_30d: number | null;
  cobertura_ga4_7d: number | null;
  invest_ate: string | null;
  carga: { modo?: string; fim?: string; linhas?: number; fonte?: string } | null;
  vigia: any;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (MOCK) {
    const r = await fetch(`/__mock/rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.message || "Falha na consulta");
    return j as T;
  }
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(traduz(error.message));
  return data as T;
}

function traduz(m: string) {
  if (/acesso negado|permission denied/i.test(m)) return "Seu usuário não tem acesso a estes dados.";
  if (/statement timeout|canceling statement/i.test(m)) return "A consulta demorou demais. Reduza o período ou os filtros.";
  if (/JWT|expired/i.test(m)) return "Sua sessão expirou. Entre novamente.";
  return m;
}

// Consultas identicas na mesma tela viram uma so (React Query ja cacheia; isto cobre chamadas fora dele)
export const consulta = (p: ConsultaParams) => rpc<Linha[]>("bi_consulta", { p });
export const statusDados = () => rpc<StatusDados>("bi_status_dados", {});
