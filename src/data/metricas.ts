import type { Formato } from "@/lib/format";

// Catalogo unico de medidas: a UI, o "como e calculado" dos tooltips e o analista de IA
// leem daqui (e a mesma lista fechada que a funcao bi_consulta aceita no banco).
export interface Medida {
  id: string;
  rotulo: string;
  curto: string;
  formato: Formato;
  /** alta = subir e bom; baixa = subir e ruim */
  bom: "alta" | "baixa" | "neutro";
  definicao: string;
  origem: string;
  /** somavel: pode ser agregada por soma em qualquer dimensao */
  aditiva: boolean;
}

export const MEDIDAS: Record<string, Medida> = {
  receita_emit: { id: "receita_emit", rotulo: "Receita emitida", curto: "Receita", formato: "brl0", bom: "alta", aditiva: true,
    definicao: "Receita da Zupper nos pedidos emitidos (soma de du + du2 + incentivos + taxa de cartão). Não é o preço da passagem.",
    origem: "bi_fato_rota.receita_emit ← vendas aéreas, pedidos Emitido e Emitido Aut." },
  pedidos_emit: { id: "pedidos_emit", rotulo: "Pedidos emitidos", curto: "Emitidos", formato: "int", bom: "alta", aditiva: true,
    definicao: "Pedidos com status Emitido ou Emitido Aut. Conta o pedido, não o passageiro.",
    origem: "bi_fato_rota.pedidos_emit" },
  pedidos: { id: "pedidos", rotulo: "Pedidos capturados", curto: "Pedidos", formato: "int", bom: "alta", aditiva: true,
    definicao: "Todo pedido criado na Zupper no período, emitido ou não.",
    origem: "bi_fato_rota.pedidos" },
  tarifa_emit: { id: "tarifa_emit", rotulo: "Tarifa emitida", curto: "Tarifa emitida", formato: "brl0", bom: "alta", aditiva: true,
    definicao: "Valor da tarifa aérea dos pedidos emitidos (volume transacionado).",
    origem: "bi_fato_rota.tarifa_emit" },
  tarifa: { id: "tarifa", rotulo: "Tarifa capturada", curto: "Tarifa capt.", formato: "brl0", bom: "alta", aditiva: true,
    definicao: "Valor da tarifa aérea de todos os pedidos capturados, emitidos ou não.",
    origem: "bi_fato_rota.tarifa" },
  receita: { id: "receita", rotulo: "Receita capturada", curto: "Receita capt.", formato: "brl0", bom: "alta", aditiva: true,
    definicao: "Receita potencial de todos os pedidos capturados.", origem: "bi_fato_rota.receita" },
  passageiros: { id: "passageiros", rotulo: "Passageiros", curto: "Passageiros", formato: "int", bom: "alta", aditiva: true,
    definicao: "Soma de passageiros dos pedidos capturados.", origem: "bi_fato_rota.passageiros" },
  cancelados: { id: "cancelados", rotulo: "Pedidos cancelados", curto: "Cancelados", formato: "int", bom: "baixa", aditiva: true,
    definicao: "Pedidos com situação cancelada.", origem: "bi_fato_rota.cancelados" },
  tarifa_media_emit: { id: "tarifa_media_emit", rotulo: "Tarifa média emitida", curto: "Tarifa média", formato: "brl", bom: "neutro", aditiva: false,
    definicao: "Tarifa emitida ÷ pedidos emitidos.", origem: "derivada: tarifa_emit / pedidos_emit" },
  tarifa_media_cap: { id: "tarifa_media_cap", rotulo: "Tarifa média capturada", curto: "Tarifa média capt.", formato: "brl", bom: "neutro", aditiva: false,
    definicao: "Tarifa capturada ÷ pedidos capturados.", origem: "derivada: tarifa / pedidos" },
  ticket_medio_emit: { id: "ticket_medio_emit", rotulo: "Ticket médio (receita)", curto: "Ticket médio", formato: "brl", bom: "alta", aditiva: false,
    definicao: "Receita emitida ÷ pedidos emitidos: quanto a Zupper ganha por pedido emitido.", origem: "derivada: receita_emit / pedidos_emit" },
  taxa_emissao: { id: "taxa_emissao", rotulo: "Taxa de emissão", curto: "Emissão", formato: "pct", bom: "alta", aditiva: false,
    definicao: "Pedidos emitidos ÷ pedidos capturados. O que não emite expira, cancela ou trava na emissão.", origem: "derivada: pedidos_emit / pedidos" },
  taxa_cancelamento: { id: "taxa_cancelamento", rotulo: "Taxa de cancelamento", curto: "Cancelamento", formato: "pct", bom: "baixa", aditiva: false,
    definicao: "Pedidos cancelados ÷ pedidos capturados.", origem: "derivada: cancelados / pedidos" },
  cobertura_ga4: { id: "cobertura_ga4", rotulo: "Cobertura GA4", curto: "Cobertura GA4", formato: "pct", bom: "alta", aditiva: false,
    definicao: "Pedidos com sessão identificada no GA4 ÷ total de pedidos. É a régua de confiança de qualquer leitura por canal: abaixo de ~70% a divisão por canal é tendência, não verdade.",
    origem: "derivada: pedidos_ga4 / pedidos" },
  passageiros_por_pedido: { id: "passageiros_por_pedido", rotulo: "Passageiros por pedido", curto: "Pax/pedido", formato: "dec", bom: "neutro", aditiva: false,
    definicao: "Passageiros ÷ pedidos capturados.", origem: "derivada: passageiros / pedidos" },
  antecedencia_media: { id: "antecedencia_media", rotulo: "Antecedência da compra", curto: "Antecedência", formato: "dias", bom: "neutro", aditiva: false,
    definicao: "Dias entre a compra e a ida, nos pedidos emitidos.", origem: "derivada: soma dos dias / pedidos emitidos com ida futura" },
  duracao_media: { id: "duracao_media", rotulo: "Duração da viagem", curto: "Duração", formato: "dias", bom: "neutro", aditiva: false,
    definicao: "Dias entre a ida e a volta, nos pedidos emitidos de ida e volta.", origem: "derivada: soma dos dias / pedidos ida e volta" },
  custo: { id: "custo", rotulo: "Investimento em mídia", curto: "Investimento", formato: "brl0", bom: "neutro", aditiva: true,
    definicao: "Custo de Google Ads e Meta Ads, uma linha por campanha por dia, sem duplicar campanhas renomeadas.", origem: "bi_fato_invest" },
};

export const DIMENSOES: Record<string, { id: string; rotulo: string; tempo?: boolean; geo?: boolean }> = {
  dia: { id: "dia", rotulo: "Dia", tempo: true },
  semana: { id: "semana", rotulo: "Semana", tempo: true },
  mes: { id: "mes", rotulo: "Mês", tempo: true },
  ano: { id: "ano", rotulo: "Ano", tempo: true },
  dia_semana: { id: "dia_semana", rotulo: "Dia da semana", tempo: true },
  canal: { id: "canal", rotulo: "Canal" },
  grupo_canal: { id: "grupo_canal", rotulo: "Grupo de canal" },
  tipo: { id: "tipo", rotulo: "Nacional x Internacional" },
  origem: { id: "origem", rotulo: "Origem", geo: true },
  destino: { id: "destino", rotulo: "Destino", geo: true },
  rota: { id: "rota", rotulo: "Rota", geo: true },
};

export const MEDIDAS_ANALISE = [
  "receita_emit", "pedidos_emit", "pedidos", "tarifa_emit", "passageiros", "cancelados",
  "tarifa_media_emit", "ticket_medio_emit", "taxa_emissao", "taxa_cancelamento", "cobertura_ga4",
  "passageiros_por_pedido", "antecedencia_media", "duracao_media",
];

export const BASE_KPIS = [
  "receita_emit", "pedidos_emit", "pedidos", "tarifa_emit", "tarifa", "receita", "passageiros", "cancelados",
  "tarifa_media_emit", "tarifa_media_cap", "ticket_medio_emit", "taxa_emissao", "taxa_cancelamento", "cobertura_ga4",
  "passageiros_por_pedido", "antecedencia_media", "duracao_media",
];
