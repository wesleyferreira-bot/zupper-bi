// Transcricao de fala -> texto (fallback para navegadores sem reconhecimento de voz nativo).
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const out = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: u } = await db.auth.getUser();
    if (!u?.user) return out({ erro: "Sessão expirada." }, 401);
    const { data: m } = await db.rpc("bi_eh_membro");
    if (m !== true) return out({ erro: "Sem acesso." }, 403);
    const chave = Deno.env.get("OPENAI_API_KEY");
    if (!chave) return out({ erro: "Transcrição não configurada." }, 503);

    const form = await req.formData();
    const arq = form.get("audio");
    if (!(arq instanceof File) || arq.size === 0 || arq.size > 8_000_000) return out({ erro: "Áudio inválido ou grande demais." }, 400);
    const f = new FormData();
    f.append("file", arq, arq.name || "fala.webm");
    f.append("model", Deno.env.get("STT_MODELO") ?? "gpt-4o-mini-transcribe");
    f.append("language", "pt");
    f.append("prompt", "Conversa sobre vendas de passagens aéreas: receita, tarifa, pedidos, canais, GA4, ROAS, Zupper.");
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${chave}` }, body: f });
    if (!r.ok) return out({ erro: "Falha ao transcrever (" + r.status + ")." }, 502);
    const j = await r.json();
    return out({ texto: String(j.text ?? "").trim() });
  } catch (e) {
    return out({ erro: e instanceof Error ? e.message : String(e) }, 500);
  }
});
