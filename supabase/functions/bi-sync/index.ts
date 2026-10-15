// bi-sync — BigQuery (zupper-mkt) -> Supabase do Zupper BI 2.0
//
// Por que existe: o navegador nunca fala com o BigQuery e nenhuma chave do Google
// aparece no front. Esta funcao e o unico lugar que lê o BigQuery, com uma service
// account SOMENTE LEITURA guardada como secret (GOOGLE_SERVICE_ACCOUNT_JSON).
//
// Auth (verify_jwt desligado de proposito, a funcao confere sozinha):
//   - cron / automacao: cabecalho x-sync-secret igual ao secret SYNC_SECRET; ou
//   - usuario logado que seja admin do BI (bi_eh_admin()).
//
// Acoes (POST JSON):
//   { "action": "diag" }                                    testa BigQuery + banco, sem gravar
//   { "action": "incremental", "dias": 90 }                 ultimos N dias a partir de bi.tb_vendas_aereo_90d_v3 (barato)
//   { "action": "historico", "ini": "2025-01-01", "fim": "2025-03-31" }
//        intervalo antigo a partir de atribuicao.vw_vendas_aereo_reatribuido (varre a view inteira: use trimestres)
//   { "action": "status" }                                  so atualiza o estado (log de cargas e vigia)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SYNC_SECRET = Deno.env.get("SYNC_SECRET") ?? "";
const PROJECT = "zupper-mkt";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ---------------------------------------------------------------- BigQuery auth
const b64u = (buf: ArrayBuffer | string) => {
  const bytes = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
};

async function bqToken(): Promise<string> {
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("secret GOOGLE_SERVICE_ACCOUNT_JSON nao configurado");
  const sa = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64u(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/bigquery.readonly",
    aud: "https://oauth2.googleapis.com/token", exp: now + 3600, iat: now,
  }));
  const pem = String(sa.private_key).replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${claim}`));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${head}.${claim}.${b64u(sig)}`,
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("falha ao obter token do Google");
  return j.access_token;
}

// Le o resultado completo (com paginacao) e converte tipos.
async function bq(sql: string, token: string): Promise<Record<string, unknown>[]> {
  const base = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT}`;
  let r = await fetch(`${base}/queries`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql, useLegacySql: false, timeoutMs: 100000, maxResults: 20000, location: "US" }),
  });
  let j = await r.json();
  if (j.error) throw new Error("BigQuery: " + (j.error.message ?? "erro"));
  const jobId = j.jobReference?.jobId;
  let tries = 0;
  while (!j.jobComplete && tries++ < 40) {
    await new Promise((res) => setTimeout(res, 3000));
    r = await fetch(`${base}/queries/${jobId}?location=US&maxResults=20000&timeoutMs=60000`, { headers: { Authorization: `Bearer ${token}` } });
    j = await r.json();
    if (j.error) throw new Error("BigQuery: " + (j.error.message ?? "erro"));
  }
  if (!j.jobComplete) throw new Error("BigQuery: consulta nao terminou a tempo");
  const fields: { name: string; type: string }[] = j.schema?.fields ?? [];
  const out: Record<string, unknown>[] = [];
  const take = (page: any) => {
    for (const row of page.rows ?? []) {
      const o: Record<string, unknown> = {};
      row.f.forEach((c: any, i: number) => {
        const f = fields[i]; const v = c.v;
        if (v === null || v === undefined) { o[f.name] = null; return; }
        if (["INTEGER", "INT64"].includes(f.type)) o[f.name] = parseInt(v, 10);
        else if (["FLOAT", "FLOAT64", "NUMERIC", "BIGNUMERIC"].includes(f.type)) o[f.name] = Number(v);
        else if (["BOOLEAN", "BOOL"].includes(f.type)) o[f.name] = v === "true" || v === true;
        else o[f.name] = v;
      });
      out.push(o);
    }
  };
  take(j);
  let token_ = j.pageToken;
  while (token_) {
    r = await fetch(`${base}/queries/${jobId}?location=US&maxResults=20000&pageToken=${encodeURIComponent(token_)}`, { headers: { Authorization: `Bearer ${token}` } });
    j = await r.json();
    if (j.error) throw new Error("BigQuery: " + (j.error.message ?? "erro"));
    take(j);
    token_ = j.pageToken;
  }
  return out;
}

// ---------------------------------------------------------------- SQL de origem
const CAMPOS_ROTA = (dataExpr: string) => `
  FORMAT_DATE('%Y-%m-%d', ${dataExpr}) AS data,
  IFNULL(NULLIF(TRIM(canais_reatribuido), ''), '(sem canal)') AS canal,
  IFNULL(isInternational, 'Nacional') != 'Nacional' AS intl,
  IFNULL(NULLIF(TRIM(origin), ''), '?') AS origem,
  IFNULL(NULLIF(TRIM(destination), ''), '?') AS destino,
  COUNT(*) AS pedidos,
  COUNTIF(is_emitido) AS pedidos_emit,
  COUNTIF(LOWER(IFNULL(situation, '')) IN ('cancelled', 'canceled', 'cancelado')) AS cancelados,
  ROUND(SUM(IFNULL(tarifa, 0)), 2) AS tarifa,
  ROUND(SUM(IF(is_emitido, IFNULL(tarifa, 0), 0)), 2) AS tarifa_emit,
  ROUND(SUM(IFNULL(receita, 0)), 2) AS receita,
  ROUND(SUM(IFNULL(RECEITA_EMIT, 0)), 2) AS receita_emit,
  SUM(IFNULL(qtd_passageiros, 0)) AS passageiros,
  COUNTIF(tem_sessao_ga4) AS pedidos_ga4,
  COUNTIF(foi_reatribuido) AS pedidos_reat,
  SUM(IF(is_emitido AND DATE_DIFF(SAFE_CAST(SUBSTR(departureDate, 1, 10) AS DATE), ${dataExpr}, DAY) >= 0,
         DATE_DIFF(SAFE_CAST(SUBSTR(departureDate, 1, 10) AS DATE), ${dataExpr}, DAY), 0)) AS ant_soma,
  COUNTIF(is_emitido AND DATE_DIFF(SAFE_CAST(SUBSTR(departureDate, 1, 10) AS DATE), ${dataExpr}, DAY) >= 0) AS ant_n,
  SUM(IF(is_emitido AND DATE_DIFF(SAFE_CAST(SUBSTR(returnDate, 1, 10) AS DATE), SAFE_CAST(SUBSTR(departureDate, 1, 10) AS DATE), DAY) >= 0,
         DATE_DIFF(SAFE_CAST(SUBSTR(returnDate, 1, 10) AS DATE), SAFE_CAST(SUBSTR(departureDate, 1, 10) AS DATE), DAY), 0)) AS dur_soma,
  COUNTIF(is_emitido AND DATE_DIFF(SAFE_CAST(SUBSTR(returnDate, 1, 10) AS DATE), SAFE_CAST(SUBSTR(departureDate, 1, 10) AS DATE), DAY) >= 0) AS dur_n`;

const CAMPOS_CANAL = (dataExpr: string) => `
  FORMAT_DATE('%Y-%m-%d', ${dataExpr}) AS data,
  IFNULL(NULLIF(TRIM(canais), ''), '(sem canal)') AS canal,
  IFNULL(NULLIF(TRIM(agrupamento), ''), '(sem agrupamento)') AS agrupamento,
  IFNULL(NULLIF(TRIM(canais_reatribuido), ''), '(sem canal)') AS canal_reat,
  IFNULL(NULLIF(TRIM(agrupamento_reatribuido), ''), '(sem agrupamento)') AS agrupamento_reat,
  COUNT(*) AS pedidos, COUNTIF(is_emitido) AS pedidos_emit,
  ROUND(SUM(IFNULL(tarifa, 0)), 2) AS tarifa,
  ROUND(SUM(IF(is_emitido, IFNULL(tarifa, 0), 0)), 2) AS tarifa_emit,
  ROUND(SUM(IFNULL(receita, 0)), 2) AS receita,
  ROUND(SUM(IFNULL(RECEITA_EMIT, 0)), 2) AS receita_emit,
  COUNTIF(tem_sessao_ga4) AS pedidos_ga4, COUNTIF(foi_reatribuido) AS pedidos_reat`;

function sqlRota(origem: "v3" | "view", ini: string, fim: string) {
  if (origem === "v3") {
    return `SELECT ${CAMPOS_ROTA("data_pedido").replace("RECEITA_EMIT", "receita_emitida")}
      FROM \`${PROJECT}.bi.tb_vendas_aereo_90d_v3\` WHERE data_pedido BETWEEN '${ini}' AND '${fim}'
      GROUP BY data, canal, intl, origem, destino`;
  }
  return `SELECT ${CAMPOS_ROTA("DATE(orderDate)").replace("RECEITA_EMIT", "receita_emitida_real")}
    FROM \`${PROJECT}.atribuicao.vw_vendas_aereo_reatribuido\` WHERE DATE(orderDate) BETWEEN '${ini}' AND '${fim}'
    GROUP BY data, canal, intl, origem, destino`;
}
function sqlCanal(origem: "v3" | "view", ini: string, fim: string) {
  if (origem === "v3") {
    return `SELECT ${CAMPOS_CANAL("data_pedido").replace("RECEITA_EMIT", "receita_emitida")}
      FROM \`${PROJECT}.bi.tb_vendas_aereo_90d_v3\` WHERE data_pedido BETWEEN '${ini}' AND '${fim}'
      GROUP BY data, canal, agrupamento, canal_reat, agrupamento_reat`;
  }
  return `SELECT ${CAMPOS_CANAL("DATE(orderDate)").replace("RECEITA_EMIT", "receita_emitida_real")}
    FROM \`${PROJECT}.atribuicao.vw_vendas_aereo_reatribuido\` WHERE DATE(orderDate) BETWEEN '${ini}' AND '${fim}'
    GROUP BY data, canal, agrupamento, canal_reat, agrupamento_reat`;
}
const sqlInvest = (ini: string, fim: string) => `
  SELECT FORMAT_DATE('%Y-%m-%d', data) AS data, 'Google Ads' AS plataforma,
         IFNULL(NULLIF(LOWER(TRIM(campanha)), ''), '(sem nome)') AS campanha, ROUND(SUM(custo), 2) AS custo,
         0 AS impressoes, 0 AS cliques
  FROM \`${PROJECT}.silver.google_ads_custo_day\` WHERE data BETWEEN '${ini}' AND '${fim}' GROUP BY 1, 2, 3
  UNION ALL
  -- impressoes e cliques do Google vem das tabelas de estatistica; o nome da campanha segue a mesma regra da view de custo
  SELECT FORMAT_DATE('%Y-%m-%d', s.data), 'Google Ads',
         IFNULL(NULLIF(LOWER(TRIM(nc.campaign_name)), ''), '(sem nome)'), 0, SUM(s.impressoes), SUM(s.cliques)
  FROM (
    SELECT _DATA_DATE AS data, customer_id AS conta_id, campaign_id, SUM(metrics_impressions) AS impressoes, SUM(metrics_clicks) AS cliques
    FROM \`${PROJECT}.google_ads.ads_CampaignBasicStats_7421299244\` WHERE _DATA_DATE BETWEEN '${ini}' AND '${fim}' AND _DATA_DATE >= DATE '2025-07-01' GROUP BY 1,2,3
    UNION ALL
    SELECT _DATA_DATE, customer_id, campaign_id, SUM(metrics_impressions), SUM(metrics_clicks)
    FROM \`${PROJECT}.google_ads.ads_CampaignBasicStats_3725814497\` WHERE _DATA_DATE BETWEEN '${ini}' AND '${fim}' AND _DATA_DATE >= DATE '2025-12-05' GROUP BY 1,2,3
  ) s
  LEFT JOIN (
    SELECT conta_id, campaign_id, campaign_name FROM (
      SELECT customer_id AS conta_id, campaign_id, campaign_name, ROW_NUMBER() OVER (PARTITION BY customer_id, campaign_id ORDER BY _DATA_DATE DESC) rn
      FROM \`${PROJECT}.google_ads.ads_Campaign_7421299244\`
      UNION ALL
      SELECT customer_id, campaign_id, campaign_name, ROW_NUMBER() OVER (PARTITION BY customer_id, campaign_id ORDER BY _DATA_DATE DESC)
      FROM \`${PROJECT}.google_ads.ads_Campaign_3725814497\`
    ) WHERE rn = 1
  ) nc ON s.conta_id = nc.conta_id AND s.campaign_id = nc.campaign_id
  GROUP BY 1, 2, 3
  UNION ALL
  SELECT FORMAT_DATE('%Y-%m-%d', data), 'Meta Ads',
         IFNULL(NULLIF(LOWER(TRIM(campaign_name)), ''), '(sem nome)'), ROUND(SUM(spend), 2),
         SUM(IFNULL(impressions, 0)), SUM(IFNULL(clicks, 0))
  FROM \`${PROJECT}.silver.meta_ads\` WHERE data BETWEEN '${ini}' AND '${fim}' GROUP BY 1, 2, 3`;
const sqlCampanha = (ini: string, fim: string) => `
  SELECT FORMAT_DATE('%Y-%m-%d', date) AS data, IFNULL(NULLIF(TRIM(source_medium), ''), '(sem origem)') AS source_medium,
         IFNULL(NULLIF(LOWER(TRIM(campaign_name)), ''), '(sem nome)') AS campanha,
         SUM(IFNULL(pedidos, 0)) AS pedidos, ROUND(SUM(IFNULL(tarifa_emitida, 0)), 2) AS tarifa_emit,
         ROUND(SUM(IFNULL(receita_emitida, 0)), 2) AS receita_emit
  FROM \`${PROJECT}.silver.campanha_custo_receita\` WHERE date BETWEEN '${ini}' AND '${fim}' GROUP BY 1, 2, 3`;

// ---------------------------------------------------------------- gravacao
async function gravar(fonte: string, ini: string, fim: string, rows: Record<string, unknown>[]) {
  const tabela = { rota: "bi_fato_rota", canal: "bi_fato_canal", invest: "bi_fato_invest", campanha: "bi_fato_campanha" }[fonte];
  if (!tabela) throw new Error(`fonte desconhecida: ${fonte}`);
  const { error: e0 } = await admin.from(tabela).delete().gte("data", ini).lte("data", fim);
  if (e0) throw new Error(`limpar ${fonte}: ${e0.message}`);
  const LOTE = 4000;
  let total = 0;
  for (let i = 0; i < rows.length; i += LOTE) {
    const { data, error } = await admin.rpc("bi_carga_inserir", { p_fonte: fonte, p_rows: rows.slice(i, i + LOTE) });
    if (error) throw new Error(`inserir ${fonte}: ${error.message}`);
    total += Number(data ?? 0);
  }
  return total;
}

async function atualizarStatus(token: string, extra: Record<string, unknown>) {
  let bqLog: unknown = null; let vigia: unknown = null;
  try {
    const r = await bq(`SELECT * FROM \`${PROJECT}.bi.log_cargas\` ORDER BY executado_em DESC LIMIT 1`, token);
    bqLog = r[0] ?? null;
  } catch (e) { bqLog = { erro: String(e).slice(0, 200) }; }
  try {
    vigia = await bq(`SELECT * FROM \`${PROJECT}.bi.vw_vigia\` LIMIT 30`, token);
  } catch (e) { vigia = null; }
  await admin.rpc("bi_status_gravar", {
    p_chave: "ultima_carga",
    p_valor: { sincronizado_em: new Date().toISOString(), bigquery_log: bqLog, ...extra },
  });
  if (vigia) await admin.rpc("bi_status_gravar", { p_chave: "vigia", p_valor: { itens: vigia } });
}

const dia = (d: Date) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------- handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // auth
  const secret = req.headers.get("x-sync-secret") ?? "";
  let autorizado = !!SYNC_SECRET && secret.length > 0 && secret === SYNC_SECRET;
  if (!autorizado) {
    const auth = req.headers.get("Authorization") ?? "";
    if (auth.startsWith("Bearer ")) {
      const u = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
      const { data } = await u.rpc("bi_eh_admin");
      autorizado = data === true;
    }
  }
  if (!autorizado) return json({ error: "nao autorizado" }, 401);

  const body = await req.json().catch(() => ({})) as Record<string, any>;
  const action = String(body.action ?? "diag");
  const t0 = Date.now();

  try {
    const token = await bqToken();

    if (action === "diag") {
      const r = await bq(`SELECT MAX(data_pedido) AS ultimo_dia, COUNT(*) AS linhas FROM \`${PROJECT}.bi.tb_vendas_aereo_90d_v3\``, token);
      return json({ ok: true, bigquery: r[0], ms: Date.now() - t0 });
    }

    if (action === "status") {
      await atualizarStatus(token, { modo: "status" });
      return json({ ok: true, ms: Date.now() - t0 });
    }

    if (action === "incremental") {
      const dias = Math.min(Math.max(Number(body.dias ?? 90), 1), 90);
      const fimD = new Date(); const iniD = new Date(Date.now() - (dias - 1) * 86400000);
      const ini = dia(iniD), fim = dia(fimD);
      const res: Record<string, number> = {};
      res.rota = await gravar("rota", ini, fim, await bq(sqlRota("v3", ini, fim), token));
      res.canal = await gravar("canal", ini, fim, await bq(sqlCanal("v3", ini, fim), token));
      res.invest = await gravar("invest", ini, fim, await bq(sqlInvest(ini, fim), token));
      res.campanha = await gravar("campanha", ini, fim, await bq(sqlCampanha(ini, fim), token));
      await atualizarStatus(token, { modo: "incremental", ini, fim, linhas: res, ms: Date.now() - t0 });
      return json({ ok: true, ini, fim, linhas: res, ms: Date.now() - t0 });
    }

    if (action === "historico") {
      const ini = String(body.ini ?? ""), fim = String(body.fim ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ini) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) return json({ error: "ini/fim invalidos" }, 400);
      const res: Record<string, number> = {};
      res.rota = await gravar("rota", ini, fim, await bq(sqlRota("view", ini, fim), token));
      res.canal = await gravar("canal", ini, fim, await bq(sqlCanal("view", ini, fim), token));
      res.invest = await gravar("invest", ini, fim, await bq(sqlInvest(ini, fim), token));
      res.campanha = await gravar("campanha", ini, fim, await bq(sqlCampanha(ini, fim), token));
      return json({ ok: true, ini, fim, linhas: res, ms: Date.now() - t0 });
    }

    return json({ error: "action desconhecida" }, 400);
  } catch (e) {
    console.error("[bi-sync]", e);
    await admin.rpc("bi_status_gravar", {
      p_chave: "ultima_falha", p_valor: { em: new Date().toISOString(), action, erro: String(e).slice(0, 400) },
    }).catch(() => {});
    return json({ ok: false, error: String(e).slice(0, 400) }, 500);
  }
});
