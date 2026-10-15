// Grupos oficiais de canal (mesma regra do painel atual da Zupper).
export const CANAIS_MARKETING = ["Direto", "Midia Paga", "App", "Canais Proprietarios", "Midia Organica"];
export const CANAIS_COMERCIAIS = ["Afiliados", "Outros", "Metabuscadores", "Cobrand", "Parceiros", "Venda offline"];
export const TODOS_CANAIS = [...CANAIS_MARKETING, ...CANAIS_COMERCIAIS];

export const COR_CANAL: Record<string, string> = {
  Direto: "#6fe3f7",
  "Midia Paga": "#f5c542",
  App: "#7bc74d",
  "Canais Proprietarios": "#b38cff",
  "Midia Organica": "#45d4a0",
  Afiliados: "#ff9f5a",
  Outros: "#8aa4b3",
  Metabuscadores: "#4d9bff",
  Cobrand: "#ff6fae",
  Parceiros: "#5ee0c4",
  "Venda offline": "#c0c9d4",
};
export const corCanal = (c: string, i = 0) => COR_CANAL[c] ?? ["#6fe3f7", "#f5c542", "#7bc74d", "#b38cff", "#ff9f5a", "#4d9bff"][i % 6];
export const grupoDoCanal = (c: string) => (CANAIS_MARKETING.includes(c) ? "Canais de Marketing" : "Canais Comerciais");
