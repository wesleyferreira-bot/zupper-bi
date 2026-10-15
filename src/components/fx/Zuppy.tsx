import clsx from "clsx";
import { ZUPPY_IMG } from "./zuppyImg";

export type EstadoZuppy = "parado" | "pensando" | "falando" | "ouvindo";

// Mascote da Zupper como rosto do analista de IA. A imagem fica embutida em zuppyImg.ts.
export function Zuppy({ tamanho = 44, estado = "parado", className }: { tamanho?: number; estado?: EstadoZuppy; className?: string }) {
  const anel = estado === "falando" ? "#6fe3f7" : estado === "ouvindo" ? "#7bc74d" : estado === "pensando" ? "#f5c542" : "rgba(111,227,247,.55)";
  return (
    <div className={clsx("relative shrink-0", className)} style={{ width: tamanho, height: tamanho }} role="img" aria-label="Zuppy, analista de dados">
      {(estado === "falando" || estado === "ouvindo") && (
        <>
          <span className="absolute inset-0 rounded-full border-2 animate-pulseRing" style={{ borderColor: anel }} />
          <span className="absolute inset-0 rounded-full border-2 animate-pulseRing" style={{ borderColor: anel, animationDelay: "1s" }} />
        </>
      )}
      <img
        src={ZUPPY_IMG}
        alt=""
        draggable={false}
        className={clsx("relative h-full w-full rounded-full object-cover shadow-neon", estado === "pensando" ? "animate-floaty" : "")}
        style={{ boxShadow: `0 0 0 2px ${anel}, 0 0 22px -4px ${anel}` }}
      />
    </div>
  );
}
