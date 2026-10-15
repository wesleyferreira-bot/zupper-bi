import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, Plane, Globe2, Layers, Megaphone, Wand2, Database, Users, LogOut, Sparkles, Menu, X } from "lucide-react";
import clsx from "clsx";
import { Logo } from "@/components/fx/Aviao";
import { Zuppy } from "@/components/fx/Zuppy";
import { BackgroundFX } from "@/components/fx/BackgroundFX";
import { PlaneTransition } from "@/components/fx/PlaneTransition";
import { StatusPill } from "./StatusPill";
import { FilterBar } from "./FilterBar";
import { AnalistaDrawer } from "@/components/analista/AnalistaDrawer";
import { useAuth } from "@/state/Auth";
import { useAnalista } from "@/state/Analista";
import { Botao } from "@/components/ui/base";

const NAV = [
  { to: "/", rotulo: "Visão geral", Icone: BarChart3, fim: true },
  { to: "/passagens", rotulo: "Passagens", Icone: Plane },
  { to: "/destinos", rotulo: "Destinos e regiões", Icone: Globe2 },
  { to: "/canais", rotulo: "Canais", Icone: Layers },
  { to: "/midia", rotulo: "Mídia e ROAS", Icone: Megaphone },
  { to: "/analise", rotulo: "Análise livre", Icone: Wand2 },
  { to: "/dados", rotulo: "Dados e atualização", Icone: Database },
];

export function Shell() {
  const { membro, admin, sair } = useAuth();
  const { abrir, aberto } = useAnalista();
  const [menu, setMenu] = useState(false);
  const itens = admin ? [...NAV, { to: "/admin", rotulo: "Acessos", Icone: Users }] : NAV;

  const Nav = ({ aoClicar }: { aoClicar?: () => void }) => (
    <nav className="space-y-1" aria-label="Principal">
      {itens.map(({ to, rotulo, Icone, fim }) => (
        <NavLink key={to} to={to} end={fim} onClick={aoClicar}
          className={({ isActive }) => clsx("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-glow",
            isActive ? "bg-glow/15 text-white shadow-[inset_0_0_0_1px_rgba(111,227,247,.35)]" : "text-zup-100/70 hover:bg-glow/8 hover:text-white")}>
          <Icone className="h-4.5 w-4.5 shrink-0" />{rotulo}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen">
      <BackgroundFX />
      <PlaneTransition />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-glow/10 bg-ink-950/60 p-4 backdrop-blur-xl lg:flex">
        <div className="mb-6 mt-1 px-1"><Logo /></div>
        <Nav />
        <div className="mt-auto space-y-3">
          <Botao variante="primario" className="w-full" onClick={abrir}><Sparkles className="h-4 w-4" />Analista IA</Botao>
          <div className="rounded-xl border border-glow/15 bg-ink-800/50 p-3">
            <div className="truncate text-[12px] font-semibold text-white">{membro?.nome || membro?.email}</div>
            <div className="truncate text-[11px] text-muted-foreground">{membro?.email}</div>
            <button type="button" onClick={sair} className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-glow hover:underline"><LogOut className="h-3.5 w-3.5" />Sair</button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-glow/10 bg-ink-950/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo compacto />
        <div className="flex items-center gap-2">
          <Botao variante="primario" onClick={abrir} aria-label="Abrir analista IA"><Sparkles className="h-4 w-4" />IA</Botao>
          <button type="button" aria-label="Menu" onClick={() => setMenu(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-glow/25 text-white"><Menu className="h-5 w-5" /></button>
        </div>
      </header>
      {menu && (
        <div className="fixed inset-0 z-40 bg-ink-950/80 backdrop-blur-sm lg:hidden" onClick={() => setMenu(false)}>
          <div className="h-full w-[270px] border-r border-glow/20 bg-ink-900 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><Logo /><button type="button" aria-label="Fechar menu" onClick={() => setMenu(false)}><X className="h-5 w-5 text-white" /></button></div>
            <Nav aoClicar={() => setMenu(false)} />
            <button type="button" onClick={sair} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-glow"><LogOut className="h-4 w-4" />Sair</button>
          </div>
        </div>
      )}

      <main className={clsx("transition-[padding] duration-300 lg:pl-[232px]", aberto && "min-[1750px]:pr-[430px]")}>
        <div className="mx-auto max-w-[1480px] px-4 pb-24 pt-5 sm:px-6">
          <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <FilterBar />
            <div className="shrink-0"><StatusPill /></div>
          </div>
          <Outlet />
        </div>
      </main>
      {!aberto && (
        <button type="button" onClick={abrir} aria-label="Perguntar ao Zuppy"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full border border-glow/40 bg-ink-900/85 py-2 pl-2 pr-5 text-[13px] font-bold text-white shadow-neon backdrop-blur-xl transition hover:border-glow hover:brightness-110">
          <Zuppy tamanho={40} estado="parado" />Pergunte ao Zuppy
        </button>
      )}
      <AnalistaDrawer />
    </div>
  );
}
