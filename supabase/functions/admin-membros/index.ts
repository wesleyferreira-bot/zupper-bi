// Gestao de acessos (somente admin do BI): listar, convidar, trocar papel, ativar/desativar, gerar link de senha.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const out = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "content-type": "application/json" } });
const emailOk = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 200;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const auth = req.headers.get("Authorization") ?? "";
    const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data: u } = await user.auth.getUser();
    if (!u?.user) return out({ erro: "Sessão expirada." }, 401);
    const { data: adm } = await user.rpc("bi_eh_admin");
    if (adm !== true) return out({ erro: "Somente administradores." }, 403);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    const b = await req.json();
    const acao = String(b.acao ?? "");
    const site = (Deno.env.get("SITE_URLS") ?? "").split(",")[0]?.trim() || undefined;

    if (acao === "listar") {
      const [m, c] = await Promise.all([
        admin.from("bi_membros").select("user_id,email,nome,papel,ativo,criado_em").order("email"),
        admin.from("bi_convites").select("email,nome,papel,origem,enviado_em").order("email"),
      ]);
      return out({ membros: m.data ?? [], convites: c.data ?? [] });
    }

    const email = String(b.email ?? "").trim().toLowerCase();
    if (!emailOk(email)) return out({ erro: "E-mail inválido." }, 400);

    if (acao === "convidar") {
      const papel = b.papel === "admin" ? "admin" : "viewer";
      const nome = String(b.nome ?? "").trim().slice(0, 80) || email.split("@")[0];
      await admin.from("bi_convites").upsert({ email, nome, papel, origem: "admin" }, { onConflict: "email" });
      let { data: mem } = await admin.from("bi_membros").select("user_id").ilike("email", email).maybeSingle();
      if (!mem) {
        const { data: criado, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
        let uid = criado?.user?.id;
        if (error && !uid) uid = (await admin.auth.admin.generateLink({ type: "recovery", email })).data?.user?.id;
        if (!uid) return out({ erro: "Não consegui criar o usuário: " + (error?.message ?? "") }, 500);
        await admin.from("bi_membros").upsert({ user_id: uid, email, nome, papel }, { onConflict: "user_id" });
      } else {
        await admin.from("bi_membros").update({ nome, papel, ativo: true }).eq("user_id", mem.user_id);
      }
      const { data: l } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: site } });
      return out({ ok: true, link: l?.properties?.action_link ?? null });
    }
    if (acao === "gerar_link") {
      const { data: l, error } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: site } });
      if (error) return out({ erro: error.message }, 400);
      return out({ ok: true, link: l?.properties?.action_link ?? null });
    }
    if (acao === "papel" || acao === "ativo") {
      const patch = acao === "papel" ? { papel: b.papel === "admin" ? "admin" : "viewer" } : { ativo: b.ativo === true };
      if (email === u.user.email?.toLowerCase()) return out({ erro: "Você não pode alterar o próprio acesso por aqui." }, 400);
      const { error } = await admin.from("bi_membros").update(patch).ilike("email", email);
      if (error) return out({ erro: error.message }, 400);
      return out({ ok: true });
    }
    return out({ erro: "Ação desconhecida." }, 400);
  } catch (e) {
    return out({ erro: e instanceof Error ? e.message : String(e) }, 500);
  }
});
