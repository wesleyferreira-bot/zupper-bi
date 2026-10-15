// Primeiro acesso / esqueci a senha. Publica (sem JWT), mas so age para e-mails ja convidados.
// A resposta e sempre a mesma, exista o e-mail ou nao (nao revela quem tem acesso).
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const ok = () => new Response(JSON.stringify({ ok: true }), { headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { email, redirect } = await req.json();
    const e = String(email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || e.length > 200) return ok();

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });

    const { data: conv } = await admin.from("bi_convites").select("email,nome,papel").ilike("email", e).maybeSingle();
    const { data: mem } = await admin.from("bi_membros").select("user_id,ativo").ilike("email", e).maybeSingle();
    if (!conv && !(mem && mem.ativo)) return ok();

    // so aceita redirecionar para o proprio site (lista em SITE_URLS, separada por virgula)
    const permitidos = (Deno.env.get("SITE_URLS") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const destino = permitidos.find((p) => typeof redirect === "string" && redirect.startsWith(p)) ?? permitidos[0];

    if (!mem) {
      const { data: criado, error } = await admin.auth.admin.createUser({ email: e, email_confirm: true });
      let uid = criado?.user?.id;
      if (error && !uid) {
        const { data: l } = await admin.auth.admin.generateLink({ type: "recovery", email: e });
        uid = l?.user?.id;
      }
      if (uid) await admin.from("bi_membros").upsert({ user_id: uid, email: e, nome: conv?.nome ?? e.split("@")[0], papel: conv?.papel ?? "viewer" }, { onConflict: "user_id", ignoreDuplicates: true });
    }
    await anon.auth.resetPasswordForEmail(e, destino ? { redirectTo: destino } : undefined);
    if (conv) await admin.from("bi_convites").update({ enviado_em: new Date().toISOString() }).ilike("email", e);
  } catch (_) { /* resposta generica de proposito */ }
  return ok();
});
