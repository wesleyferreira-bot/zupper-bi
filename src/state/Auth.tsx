import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { CHEGOU_POR_LINK_DE_SENHA, MOCK, supabase } from "@/lib/supabase";

export interface Membro { user_id: string; email: string; nome: string | null; papel: "admin" | "viewer"; ativo: boolean }

interface Ctx {
  carregando: boolean;
  session: Session | null;
  membro: Membro | null;
  /** true quando o usuario chegou por link de convite/recuperacao e precisa definir a senha */
  definindoSenha: boolean;
  entrar: (email: string, senha: string) => Promise<string | null>;
  sair: () => Promise<void>;
  pedirLink: (email: string) => Promise<void>;
  novaSenha: (senha: string) => Promise<string | null>;
  admin: boolean;
}

const C = createContext<Ctx | null>(null);

const MEMBRO_MOCK: Membro = { user_id: "11111111-1111-1111-1111-111111111111", email: "demo@zupper.local", nome: "Demonstração", papel: "admin", ativo: true };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(!MOCK);
  const [session, setSession] = useState<Session | null>(null);
  const [membro, setMembro] = useState<Membro | null>(MOCK ? MEMBRO_MOCK : null);
  const [definindoSenha, setDefinindoSenha] = useState(CHEGOU_POR_LINK_DE_SENHA);

  const buscarMembro = useCallback(async (s: Session | null) => {
    if (!s) { setMembro(null); return; }
    const { data } = await supabase.from("bi_membros").select("user_id,email,nome,papel,ativo").eq("user_id", s.user.id).maybeSingle();
    setMembro((data as Membro) ?? null);
  }, []);

  useEffect(() => {
    if (MOCK) return;
    let vivo = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return;
      setSession(data.session);
      await buscarMembro(data.session);
      if (vivo) setCarregando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((ev, s) => {
      setSession(s);
      if (ev === "PASSWORD_RECOVERY") setDefinindoSenha(true);
      // evita chamar o banco dentro do callback (deadlock conhecido do supabase-js)
      setTimeout(() => buscarMembro(s), 0);
    });
    return () => { vivo = false; sub.subscription.unsubscribe(); };
  }, [buscarMembro]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (!error) return null;
    if (/invalid login/i.test(error.message)) return "E-mail ou senha incorretos. Se é o seu primeiro acesso, use “Primeiro acesso ou esqueci a senha”.";
    return error.message;
  }, []);

  const sair = useCallback(async () => { if (!MOCK) await supabase.auth.signOut(); setMembro(MOCK ? MEMBRO_MOCK : null); }, []);

  // Primeiro acesso e recuperacao usam a mesma porta: a funcao confere o convite e manda o link.
  // A resposta e sempre a mesma, exista o e-mail ou nao.
  const pedirLink = useCallback(async (email: string) => {
    await supabase.functions.invoke("acesso-link", { body: { email: email.trim(), redirect: window.location.origin + "/" } }).catch(() => {});
  }, []);

  const novaSenha = useCallback(async (senha: string) => {
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) return error.message;
    setDefinindoSenha(false);
    return null;
  }, []);

  const v = useMemo<Ctx>(() => ({ carregando, session, membro, definindoSenha, entrar, sair, pedirLink, novaSenha, admin: membro?.papel === "admin" }),
    [carregando, session, membro, definindoSenha, entrar, sair, pedirLink, novaSenha]);
  return <C.Provider value={v}>{children}</C.Provider>;
}

export function useAuth() {
  const c = useContext(C);
  if (!c) throw new Error("useAuth fora do AuthProvider");
  return c;
}
