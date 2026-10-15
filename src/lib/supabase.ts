import { createClient } from "@supabase/supabase-js";

export const MOCK = import.meta.env.VITE_MOCK === "1";
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configurado = MOCK || Boolean(url && key);

export const supabase = createClient(url || "http://localhost:54321", key || "sem-chave", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
});

// Le o que o link do e-mail trouxe ANTES de o supabase-js limpar o endereco (ele apaga o hash ao processar).
// Assim a tela "Defina sua senha" aparece mesmo que o evento PASSWORD_RECOVERY dispare antes de o React montar.
const hashInicial = typeof window !== "undefined" ? window.location.hash : "";
export const CHEGOU_POR_LINK_DE_SENHA = /[#&]type=(recovery|invite|signup)\b/.test(hashInicial) && /access_token=/.test(hashInicial);
export const ERRO_DO_LINK: string | null = /error_code=otp_expired|error=access_denied/.test(hashInicial)
  ? "Este link já foi usado ou expirou. Peça um novo em “Primeiro acesso ou esqueci a senha” e abra o link mais recente do e-mail, uma única vez."
  : null;
