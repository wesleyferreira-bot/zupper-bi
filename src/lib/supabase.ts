import { createClient } from "@supabase/supabase-js";

export const MOCK = import.meta.env.VITE_MOCK === "1";
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configurado = MOCK || Boolean(url && key);

export const supabase = createClient(url || "http://localhost:54321", key || "sem-chave", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
});
