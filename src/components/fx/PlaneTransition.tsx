import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Aviao } from "./Aviao";
import { Zuppy } from "./Zuppy";

const NOMES: Record<string, string> = {
  "/": "Visão geral", "/passagens": "Passagens", "/destinos": "Destinos e regiões", "/canais": "Canais",
  "/midia": "Mídia e ROAS", "/analise": "Análise livre", "/dados": "Dados e atualização", "/admin": "Acessos",
};
const PARES = [["São Paulo", "Lisboa"], ["Recife", "Miami"], ["Salvador", "Buenos Aires"], ["Fortaleza", "Paris"], ["Rio de Janeiro", "Madri"], ["Brasília", "Santiago"], ["Natal", "Roma"]];

const ARCO = "M 90 300 C 300 40, 700 40, 910 300";

/** Cena do aviao cruzando o arco entre duas cidades. Serve de transicao de pagina e de carregamento. */
export function CenaVoo({ origem, destino, legenda }: { origem: string; destino: string; legenda: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[300px] w-[min(86vw,820px)]">
        <svg viewBox="0 0 1000 340" className="absolute inset-0 h-full w-full overflow-visible">
          <motion.path d={ARCO} fill="none" stroke="rgba(111,227,247,.65)" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeInOut" }} />
          {[[90, 300, origem], [910, 300, destino]].map(([x, y, n]) => (
            <g key={String(n)}>
              <circle cx={x as number} cy={y as number} r="16" fill="none" stroke="#6fe3f7" strokeOpacity=".5">
                <animate attributeName="r" values="6;22" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values=".9;0" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle cx={x as number} cy={y as number} r="5" fill="#6fe3f7" />
              <text x={x as number} y={(y as number) + 34} textAnchor="middle" fill="#bfeaf3" fontSize="17" fontWeight="600" letterSpacing="2">{String(n).toUpperCase()}</text>
            </g>
          ))}
        </svg>
        <motion.div
          className="absolute left-0 top-0"
          style={{ offsetPath: `path("${ARCO}")`, offsetRotate: "auto 90deg", width: 0, height: 0 } as React.CSSProperties}
          initial={{ offsetDistance: "0%" } as never}
          animate={{ offsetDistance: "100%" } as never}
          transition={{ duration: 1.15, ease: [0.45, 0.05, 0.3, 1] }}
        >
          <Aviao className="h-14 w-14 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_14px_rgba(111,227,247,.9)]" preenchido />
          <Zuppy tamanho={30} className="absolute -translate-x-1/2 -translate-y-1/2" />
        </motion.div>
      </div>
      <div className="text-xs font-semibold uppercase tracking-[0.34em] text-glow/90">{legenda}</div>
    </div>
  );
}

export function TelaCarregando({ mensagem = "Carregando seus dados" }: { mensagem?: string }) {
  const [par] = useState(() => PARES[Math.floor(Math.random() * PARES.length)]);
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-ink-950/95 backdrop-blur-md">
      <CenaVoo origem={par[0]} destino={par[1]} legenda={mensagem} />
    </div>
  );
}

export function PlaneTransition() {
  const { pathname } = useLocation();
  const [ativo, setAtivo] = useState(false);
  const [i, setI] = useState(0);
  const primeira = useRef(true);

  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    setI((x) => (x + 1) % PARES.length);
    setAtivo(true);
    const t = setTimeout(() => setAtivo(false), 1250);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <AnimatePresence>
      {ativo && (
        <motion.div key="voo" className="fixed inset-0 z-[80] grid place-items-center bg-ink-950/90 backdrop-blur-md"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
          <CenaVoo origem={PARES[i][0]} destino={PARES[i][1]} legenda={NOMES[pathname] ?? "Carregando"} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
