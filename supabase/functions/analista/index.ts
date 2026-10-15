// Zuppy: analista de dados da Zupper. Conversa com o usuario, consulta o banco SEMPRE como o proprio
// usuario (o JWT dele vai para o PostgREST, entao o RLS vale) e salva o historico.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "content-type": "application/json" } });

const MEDIDAS_ROTA = [
  "receita_emit", "pedidos_emit", "pedidos", "tarifa_emit", "tarifa", "receita", "passageiros", "cancelados",
  "tarifa_media_emit", "tarifa_media_cap", "ticket_medio_emit", "taxa_emissao", "taxa_cancelamento", "cobertura_ga4",
  "passageiros_por_pedido", "antecedencia_media", "duracao_media", "pedidos_ga4", "pedidos_reat",
];

const SKILL = `Você é o Zuppy, analista de dados da Zupper Viagens, dentro do BI da empresa. Fale sempre em português do Brasil, em tom direto, caloroso e profissional, como um colega sênior de dados. Sem emojis, sem frases de efeito, sem jargão desnecessário.

COMO TRABALHAR
- Toda resposta com número vem de uma consulta: use a ferramenta consultar_dados. Nunca invente, estime ou complete número de memória. Se a consulta não trouxer o dado, diga que não tem.
- Para comparar (mês contra mês, dia contra dia, semana contra semana, ano contra ano), faça uma consulta por período e calcule a diferença absoluta e em %. Diga sempre os dois períodos com datas.
- Primeiro o resumo em uma ou duas frases (o que subiu ou caiu e quanto), depois os porquês, olhando em camadas: número geral, canal, origem/destino, campanha. Aponte onde está o ganho ou o vazamento.
- Quando o usuário pedir algo amplo, escolha você mesmo o recorte mais útil, diga qual foi e entregue. Só pergunte se for impossível seguir.
- Respostas curtas: até 120 palavras na fala. Use lista só quando houver três ou mais itens comparáveis.
- Valores em reais com separador brasileiro (R$ 1.234.567 ou R$ 1,2 mi). Percentuais com uma casa decimal.

O QUE OS NÚMEROS SIGNIFICAM
- receita_emit: receita da Zupper nos pedidos emitidos (comissão + incentivos + taxas). Não é o valor da passagem.
- tarifa_emit: valor das passagens emitidas (volume transacionado). É a métrica do contrato com a agência.
- pedidos_emit: pedidos emitidos (Emitido e Emitido Aut.). pedidos: todos os pedidos capturados.
- tarifa_media_emit = tarifa_emit / pedidos_emit. ticket_medio_emit = receita_emit / pedidos_emit.
- taxa_emissao = emitidos / capturados. taxa_cancelamento = cancelados / capturados.
- cobertura_ga4: parte dos pedidos com sessão identificada no GA4. Abaixo de ~70%, a divisão por canal é tendência, não verdade: avise quando falar de canal. Hoje a meta é 90% a 92% com o app tagueado.
- Fontes: rota (vendas por dia, canal, nacional/internacional, origem, destino), canal (canal original x reatribuído), invest (custo, impressões, cliques por plataforma e campanha), campanha (pedidos e receita por origem/mídia e campanha), orcamento (planejado diário por plataforma).
- ROAS: receita_emit (ou tarifa_emit) dividida por custo. Calcule combinando uma consulta de rota/campanha e uma de invest para o mesmo período. A faixa saudável que o cliente aceita para escalar investimento é 4x a 5x. ROAS muito alto (10x a 30x) costuma indicar pouco investimento, não eficiência. Meta é volume absoluto e tarifa emitida, não participação (share).
- Mídia: o investimento total é Google Ads + Meta Ads + programática (programática entra por lançamento manual, pode estar incompleta). Compare realizado com planejado quando houver orçamento cadastrado.
- Sazonalidade e fatores externos (Skyscanner, site fora do ar, deploy de tagueamento, Black Friday em 1º de novembro) mexem na demanda sem ter relação com a mídia. Cite eventos quando houver.
- Dados anteriores a 90 dias usam uma regra de reatribuição mais antiga: comparações de canal entre períodos muito distantes podem ter pequena distorção. Só mencione se for relevante.
- A origem igual ao destino não é uma rota real; ignore. Códigos são IATA: converta para cidade ao falar.

LIMITES
- Você só enxerga os dados do BI. Não acesse contratos, bônus nem dados pessoais de clientes. Se pedirem, diga que isso está fora do que você analisa.
- Se uma consulta falhar, diga em uma frase o que não foi possível e ofereça o recorte mais próximo.`;

const FERRAMENTA = {
  type: "function",
  function: {
    name: "consultar_dados",
    description: "Consulta o BI da Zupper. Soma as medidas pedidas por período e agrupa pelas dimensões. Datas no formato AAAA-MM-DD, ambas incluídas.",
    parameters: {
      type: "object",
      properties: {
        fonte: { type: "string", enum: ["rota", "canal", "invest", "campanha", "orcamento"], description: "rota é o padrão. invest = mídia (custo). orcamento = planejado." },
        medidas: {
          type: "array", minItems: 1, maxItems: 8, items: { type: "string" },
          description: `fonte rota: ${MEDIDAS_ROTA.join(", ")}. fonte canal: pedidos, pedidos_emit, tarifa, tarifa_emit, receita, receita_emit, pedidos_ga4, pedidos_reat, cobertura_ga4. fonte invest: custo, impressoes, cliques, cpc, ctr, cpm. fonte campanha: pedidos, tarifa_emit, receita_emit. fonte orcamento: planejado.`,
        },
        dims: {
          type: "array", maxItems: 3, items: { type: "string" },
          description: "rota: dia, semana, mes, trimestre, ano, dia_semana, canal, grupo_canal, tipo, origem, destino, rota. canal: dia, semana, mes, trimestre, canal, canal_original, agrupamento, agrupamento_original. invest: dia, semana, mes, trimestre, plataforma, campanha, origem_dado. campanha: dia, semana, mes, trimestre, origem_midia, campanha. orcamento: dia, semana, mes, trimestre, plataforma.",
        },
        filtros: {
          type: "object",
          description: "Listas de valores aceitos. rota: canal, grupo_canal, tipo (Nacional|Internacional), origem, destino, rota (ex.: 'GRU → LIS'). canal: canal, canal_original, agrupamento. invest/orcamento: plataforma, campanha. campanha: origem_midia, campanha.",
          additionalProperties: { type: "array", items: { type: "string" } },
        },
        ini: { type: "string", description: "Data inicial AAAA-MM-DD" },
        fim: { type: "string", description: "Data final AAAA-MM-DD" },
        ordem: { type: "string", description: "'<medida ou dimensao> desc|asc'" },
        limite: { type: "integer", minimum: 1, maximum: 200 },
      },
      required: ["medidas", "ini", "fim"],
    },
  },
};

const MODELOS = () => [Deno.env.get("ANALISTA_MODELO"), "gpt-5.1", "gpt-5", "gpt-4.1", "gpt-4o"].filter(Boolean) as string[];

async function chamarOpenAI(chave: string, corpo: Record<string, unknown>) {
  let ultimoErro = "";
  for (const modelo of MODELOS()) {
    const base: Record<string, unknown> = { ...corpo, model: modelo };
    if (/^gpt-5/.test(modelo)) base.reasoning_effort = modelo === "gpt-5" ? "minimal" : "none";
    for (let tent = 0; tent < 2; tent++) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST", headers: { Authorization: `Bearer ${chave}`, "content-type": "application/json" }, body: JSON.stringify(base),
      });
      if (r.ok) return { json: await r.json(), modelo };
      const t = await r.text();
      ultimoErro = `${modelo}: ${r.status} ${t.slice(0, 300)}`;
      if (r.status === 400 && /reasoning_effort/i.test(t) && "reasoning_effort" in base) { delete base.reasoning_effort; continue; }
      if (r.status === 429 || r.status >= 500) { await new Promise((x) => setTimeout(x, 800)); continue; }
      break; // 404/400 de modelo: tenta o proximo
    }
  }
  throw new Error("Falha ao falar com o modelo de IA. " + ultimoErro);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "metodo" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ erro: "Entre novamente: sessão não encontrada." }, 401);
    const db = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: u } = await db.auth.getUser();
    if (!u?.user) return json({ erro: "Sessão expirada. Entre novamente." }, 401);
    const { data: membro } = await db.rpc("bi_eh_membro");
    if (membro !== true) return json({ erro: "Seu usuário não tem acesso a este BI." }, 403);

    const chave = Deno.env.get("OPENAI_API_KEY");
    if (!chave) return json({ erro: "A IA ainda não foi configurada (falta a chave do modelo)." }, 503);

    const b = await req.json();
    const texto = String(b.texto ?? "").trim().slice(0, 4000);
    if (!texto) return json({ erro: "Escreva ou diga sua pergunta." }, 400);
    const via = ["texto", "voz", "insight"].includes(b.via) ? b.via : "texto";

    // conversa: cria se nao veio
    let conversaId: string | null = typeof b.conversa_id === "string" ? b.conversa_id : null;
    if (!conversaId) {
      const { data: c, error } = await db.from("bi_conversas").insert({ titulo: texto.slice(0, 60) }).select("id").single();
      if (error) throw new Error("Não consegui criar a conversa: " + error.message);
      conversaId = c.id;
    }
    // historico recente (ate 14 mensagens)
    const { data: hist } = await db.from("bi_mensagens").select("papel,conteudo").eq("conversa_id", conversaId).order("criado_em", { ascending: false }).limit(14);
    const historico = (hist ?? []).reverse().map((m: any) => ({ role: m.papel, content: m.conteudo }));

    const { data: st } = await db.rpc("bi_status_dados");
    const ate = st?.dados_ate ?? new Date().toISOString().slice(0, 10);
    const ctxTela = b.tela ? `\nO usuário está olhando a tela "${String(b.tela.titulo ?? "").slice(0, 80)}" com estes números (JSON): ${JSON.stringify(b.tela.resumo ?? {}).slice(0, 6000)}` : "";
    const contexto = `Hoje é ${new Date().toISOString().slice(0, 10)}. Os dados vão até ${ate}. Cobertura GA4 nos últimos 7 dias: ${st?.cobertura_ga4_7d ?? "n/d"}%. Período selecionado na tela: ${b.periodo ? `${b.periodo.ini} a ${b.periodo.fim}` : "não informado"}. Filtros ativos: ${b.filtros ? JSON.stringify(b.filtros) : "nenhum"}.${ctxTela}`;

    const msgs: any[] = [
      { role: "system", content: SKILL + "\n\nCONTEXTO ATUAL\n" + contexto },
      ...historico,
      { role: "user", content: texto },
    ];

    await db.from("bi_mensagens").insert({ conversa_id: conversaId, papel: "user", conteudo: texto, via });

    const consultas: unknown[] = [];
    let resposta = "";
    let modeloUsado = "";
    for (let i = 0; i < 6; i++) {
      const { json: r, modelo } = await chamarOpenAI(chave, { messages: msgs, tools: [FERRAMENTA], temperature: 0.2 });
      modeloUsado = modelo;
      const m = r.choices?.[0]?.message;
      if (!m) throw new Error("Resposta vazia do modelo.");
      if (m.tool_calls?.length) {
        msgs.push(m);
        for (const tc of m.tool_calls) {
          let saida: unknown;
          try {
            const args = JSON.parse(tc.function.arguments || "{}");
            args.limite = Math.min(Number(args.limite) || 100, 200);
            const { data, error } = await db.rpc("bi_consulta", { p: args });
            saida = error ? { erro: error.message } : { linhas: data };
            consultas.push({ args, linhas: Array.isArray(data) ? data.length : 0, erro: error?.message ?? null });
          } catch (e) { saida = { erro: String(e) }; }
          msgs.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(saida).slice(0, 14000) });
        }
        continue;
      }
      resposta = String(m.content ?? "").trim();
      break;
    }
    if (!resposta) resposta = "Não consegui concluir essa análise agora. Tente reformular a pergunta ou reduzir o período.";

    await db.from("bi_mensagens").insert({ conversa_id: conversaId, papel: "assistant", conteudo: resposta, via, meta: { modelo: modeloUsado, consultas } });
    await db.from("bi_conversas").update({ atualizado_em: new Date().toISOString() }).eq("id", conversaId);
    return json({ conversa_id: conversaId, resposta, consultas: consultas.length });
  } catch (e) {
    return json({ erro: e instanceof Error ? e.message : String(e) }, 500);
  }
});
