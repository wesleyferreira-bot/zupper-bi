export type Formato = "brl" | "brl0" | "int" | "pct" | "dec" | "dias";

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const brl2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl0 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const num = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export const temValor = (v: unknown) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));

export function fmt(v: unknown, f: Formato): string {
  if (!temValor(v)) return "—";
  const x = Number(v);
  switch (f) {
    case "brl": return brl2.format(x);
    case "brl0": return brl0.format(x);
    case "int": return nf0.format(x);
    case "pct": return nf1.format(x) + "%";
    case "dec": return nf2.format(x);
    case "dias": return nf1.format(x) + " d";
  }
}

/** Numero grande em formato curto: R$ 3,08 mi, 34,6 mil. */
export function compacto(v: unknown, moeda = false): string {
  if (!temValor(v)) return "—";
  const x = Number(v);
  const a = Math.abs(x);
  const pre = moeda ? "R$ " : "";
  if (a >= 1e9) return `${pre}${nf2.format(x / 1e9)} bi`;
  if (a >= 1e6) return `${pre}${nf2.format(x / 1e6)} mi`;
  if (a >= 1e4) return `${pre}${nf1.format(x / 1e3)} mil`;
  return moeda ? brl0.format(x) : nf0.format(x);
}

export function delta(atual: unknown, base: unknown): number | null {
  if (!temValor(atual) || !temValor(base) || Number(base) === 0) return null;
  return ((Number(atual) - Number(base)) / Math.abs(Number(base))) * 100;
}

export const fmtDelta = (d: number | null) =>
  d === null ? "—" : `${d > 0 ? "+" : d < 0 ? "−" : ""}${nf1.format(Math.abs(d))}%`;

export const canalLabel = (c: string) =>
  ({
    "Midia Paga": "Mídia Paga",
    "Midia Organica": "Mídia Orgânica",
    "Canais Proprietarios": "Canais Próprios",
    Metabuscadores: "Metabuscadores",
  } as Record<string, string>)[c] ?? c;

export const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function dataCurta(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}
export function dataLonga(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
export function mesLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MESES[Number(m) - 1]}/${y.slice(2)}`;
}
