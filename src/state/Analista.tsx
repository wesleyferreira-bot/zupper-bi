import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface Pedido { texto: string; via: "texto" | "voz" | "insight"; falar?: boolean; id: number }

interface Ctx {
  aberto: boolean;
  abrir: () => void;
  fechar: () => void;
  /** abre o painel e dispara uma pergunta (insights clicaveis, "analisar esta tela") */
  perguntar: (texto: string, opts?: { via?: Pedido["via"]; falar?: boolean }) => void;
  pedido: Pedido | null;
  consumir: (id: number) => void;
  modoVoz: boolean;
  setModoVoz: (v: boolean) => void;
}
const C = createContext<Ctx | null>(null);
let seq = 0;

export function AnalistaProvider({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [modoVoz, setModoVoz] = useState(false);
  const abrir = useCallback(() => setAberto(true), []);
  const fechar = useCallback(() => setAberto(false), []);
  const perguntar = useCallback((texto: string, opts?: { via?: Pedido["via"]; falar?: boolean }) => {
    setAberto(true);
    setPedido({ texto, via: opts?.via ?? "texto", falar: opts?.falar ?? false, id: ++seq });
  }, []);
  const consumir = useCallback((id: number) => setPedido((p) => (p && p.id === id ? null : p)), []);
  const v = useMemo(() => ({ aberto, abrir, fechar, perguntar, pedido, consumir, modoVoz, setModoVoz }), [aberto, abrir, fechar, perguntar, pedido, consumir, modoVoz]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
export const useAnalista = () => {
  const c = useContext(C);
  if (!c) throw new Error("useAnalista fora do AnalistaProvider");
  return c;
};
