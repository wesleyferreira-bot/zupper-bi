// Voz do Zuppy: texto -> audio (OpenAI TTS). Exige usuario membro do BI.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const err = (m: string, s: number) => new Response(JSON.stringify({ erro: m }), { status: s, headers: { ...CORS, "content-type": "application/json" } });

const INSTRUCOES = "Fale em português do Brasil, com voz feminina de analista de dados: calorosa, segura e natural, ritmo conversacional levemente ágil, pausas curtas entre as ideias. Pronuncie valores em reais por extenso e as siglas (GA4, ROAS) como as pessoas falam no Brasil. Não soe como locutora de comercial.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: u } = await db.auth.getUser();
    if (!u?.user) return err("Sessão expirada.", 401);
    const { data: m } = await db.rpc("bi_eh_membro");
    if (m !== true) return err("Sem acesso.", 403);
    const chave = Deno.env.get("OPENAI_API_KEY");
    if (!chave) return err("Voz não configurada.", 503);

    const { texto } = await req.json();
    const t = String(texto ?? "").replace(/[*_`#>]/g, "").trim().slice(0, 1800);
    if (!t) return err("Sem texto.", 400);

    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "content-type": "application/json" },
      body: JSON.stringify({ model: Deno.env.get("VOZ_MODELO") ?? "gpt-4o-mini-tts", voice: Deno.env.get("VOZ_ANALISTA") ?? "shimmer", input: t, instructions: INSTRUCOES, response_format: "mp3" }),
    });
    if (!r.ok) return err("Falha ao gerar a voz (" + r.status + ").", 502);
    return new Response(r.body, { headers: { ...CORS, "content-type": "audio/mpeg", "cache-control": "no-store" } });
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
});
