import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

// Cada pagina registra o que esta mostrando (titulo + resumo dos numeros visiveis).
// O analista de IA recebe isso para "analisar esta tela" e para os insights clicaveis.
export interface ContextoTela {
  pagina: string;
  titulo: string;
  resumo: Record<string, unknown>;
}

interface Ctx { tela: ContextoTela | null; registrar: (c: ContextoTela | null) => void }
const C = createContext<Ctx>({ tela: null, registrar: () => {} });

export function TelaProvider({ children }: { children: ReactNode }) {
  const [tela, setTela] = useState<ContextoTela | null>(null);
  const registrar = useCallback((c: ContextoTela | null) => setTela(c), []);
  const v = useMemo(() => ({ tela, registrar }), [tela, registrar]);
  return <C.Provider value={v}>{children}</C.Provider>;
}

export const useTela = () => useContext(C);

/** Registra o contexto da pagina; compara por JSON para nao disparar render em loop. */
export function useRegistrarTela(c: ContextoTela | null) {
  const { registrar } = useContext(C);
  const ultimo = useRef("");
  const chave = JSON.stringify(c);
  useEffect(() => {
    if (chave === ultimo.current) return;
    ultimo.current = chave;
    registrar(c);
  }, [chave, c, registrar]);
  useEffect(() => () => registrar(null), [registrar]);
}
