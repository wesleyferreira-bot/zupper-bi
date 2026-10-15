import { type ReactNode, type ButtonHTMLAttributes, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Info, SearchX } from "lucide-react";

export function Card({ className, children, hover = false, ...r }: { className?: string; children: ReactNode; hover?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("holo p-5", hover && "holo-hover", className)} {...r}>{children}</div>;
}

export function Titulo({ children, dica, extra }: { children: ReactNode; dica?: string; extra?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-glow/80">
        {children}
        {dica && <Dica texto={dica} />}
      </div>
      {extra}
    </div>
  );
}

/** Tooltip simples por hover/foco: "como e calculado". */
export function Dica({ texto }: { texto: string }) {
  const [a, setA] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setA(true)} onMouseLeave={() => setA(false)}>
      <button type="button" aria-label="Como é calculado" onFocus={() => setA(true)} onBlur={() => setA(false)}
        className="grid h-4 w-4 place-items-center rounded-full text-muted-foreground/70 hover:text-glow focus-visible:outline focus-visible:outline-1 focus-visible:outline-glow">
        <Info className="h-3.5 w-3.5" />
      </button>
      {a && (
        <span role="tooltip" className="absolute left-1/2 top-6 z-50 w-64 -translate-x-1/2 rounded-xl border border-glow/25 bg-ink-900/95 p-3 text-[12px] font-normal normal-case leading-relaxed tracking-normal text-zup-100 shadow-holo backdrop-blur">
          {texto}
        </span>
      )}
    </span>
  );
}

export function Skel({ className }: { className?: string }) {
  return <div className={clsx("skel", className)} />;
}

export function Erro({ mensagem, onTentar }: { mensagem: string; onTentar?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-alerta/40 bg-alerta/5 p-4 text-sm text-red-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-alerta" />
      <div className="flex-1">
        <div className="font-semibold">Não foi possível carregar</div>
        <div className="text-red-200/80">{mensagem}</div>
      </div>
      {onTentar && <Botao variante="fantasma" onClick={onTentar}>Tentar de novo</Botao>}
    </div>
  );
}

export function Vazio({ titulo = "Sem dados neste recorte", texto = "Mude o período ou remova algum filtro." }: { titulo?: string; texto?: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-glow/20 p-8 text-center">
      <SearchX className="mb-2 h-6 w-6 text-glow/60" />
      <div className="text-sm font-semibold text-white">{titulo}</div>
      <div className="text-xs text-muted-foreground">{texto}</div>
    </div>
  );
}

type Var = "primario" | "fantasma" | "suave";
export function Botao({ variante = "suave", className, children, ...r }: { variante?: Var } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...r}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow disabled:opacity-50 disabled:pointer-events-none",
        variante === "primario" && "bg-gradient-to-b from-zup-300 to-zup-500 text-ink-950 shadow-neon hover:brightness-110",
        variante === "suave" && "border border-glow/25 bg-glow/10 text-zup-50 hover:bg-glow/20",
        variante === "fantasma" && "text-zup-100 hover:bg-glow/10",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Chip({ ativo, onClick, children, className }: { ativo?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={ativo}
      className={clsx("rounded-full border px-3 py-1.5 text-[12px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow",
        ativo ? "border-glow/70 bg-glow/20 text-white shadow-neon" : "border-glow/20 bg-ink-800/50 text-zup-100/80 hover:border-glow/50 hover:text-white", className)}>
      {children}
    </button>
  );
}

export function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{rotulo}</span>
      {children}
    </label>
  );
}

export const estiloCampo = "w-full rounded-xl border border-glow/25 bg-ink-900/70 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-muted-foreground focus:border-glow focus:shadow-neon";
