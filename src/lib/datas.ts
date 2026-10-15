// Datas em ISO (yyyy-mm-dd) sem fuso: a base e por dia de pedido.
export const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
export const parse = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const somaDias = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const diffDias = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
export const inicioMes = (s: string) => s.slice(0, 8) + "01";
export const fimMes = (s: string) => {
  const d = parse(s);
  return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};
export const mesAnterior = (s: string) => {
  const d = parse(s);
  const ini = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return { ini: iso(ini), fim: iso(new Date(d.getFullYear(), d.getMonth(), 0)) };
};
export const anoAnterior = (s: string) => {
  const d = parse(s);
  d.setFullYear(d.getFullYear() - 1);
  return iso(d);
};

export type Preset = "7d" | "30d" | "mes" | "mes_ant" | "90d" | "ano" | "custom";
export interface Periodo { ini: string; fim: string; preset: Preset }

export function presetPeriodo(p: Preset, ate: string): Periodo {
  switch (p) {
    case "7d": return { preset: p, ini: somaDias(ate, -6), fim: ate };
    case "30d": return { preset: p, ini: somaDias(ate, -29), fim: ate };
    case "90d": return { preset: p, ini: somaDias(ate, -89), fim: ate };
    case "mes": return { preset: p, ini: inicioMes(ate), fim: ate };
    case "mes_ant": { const m = mesAnterior(ate); return { preset: p, ...m }; }
    case "ano": return { preset: p, ini: ate.slice(0, 4) + "-01-01", fim: ate };
    default: return { preset: "custom", ini: somaDias(ate, -29), fim: ate };
  }
}

export type Comparar = "anterior" | "ano" | "off";
export function periodoComparacao(p: Periodo, modo: Comparar): { ini: string; fim: string } | null {
  if (modo === "off") return null;
  if (modo === "ano") return { ini: anoAnterior(p.ini), fim: anoAnterior(p.fim) };
  const n = diffDias(p.ini, p.fim) + 1;
  // mes fechado compara com o mes anterior inteiro; o resto, com a janela de mesmo tamanho logo antes
  if (p.preset === "mes_ant") {
    const m = mesAnterior(p.ini);
    return m;
  }
  return { ini: somaDias(p.ini, -n), fim: somaDias(p.ini, -1) };
}
