import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Copy, Link2, Mail, Trash2, UserPlus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Botao, Campo, Card, Chip, Erro, Skel, Titulo, Vazio, estiloCampo } from "@/components/ui/base";
import { MOCK, supabase } from "@/lib/supabase";
import { useAuth } from "@/state/Auth";
import { useEventos } from "@/hooks/useDados";
import { dataCurta, fmt } from "@/lib/format";

type Aba = "acessos" | "orcamento" | "programatica" | "eventos" | "metas";
interface Mem { user_id: string; email: string; nome: string | null; papel: "admin" | "viewer"; ativo: boolean }
interface Conv { email: string; nome: string | null; papel: string; origem: string | null; enviado_em: string | null }

async function chamar<T>(acao: string, corpo: Record<string, unknown> = {}): Promise<T> {
  if (MOCK) {
    if (acao === "listar") return { membros: [{ user_id: "1", email: "demo@zupper.local", nome: "Demonstração", papel: "admin", ativo: true }], convites: [{ email: "novo@zupper.com.br", nome: "Pessoa convidada", papel: "viewer", origem: "importado", enviado_em: null }] } as T;
    return { ok: true, link: "https://exemplo.local/link-de-demonstracao" } as T;
  }
  const { data, error } = await supabase.functions.invoke("admin-membros", { body: { acao, ...corpo } });
  if (error) {
    let msg = error.message;
    try { const j = await (error as any).context?.json?.(); if (j?.erro) msg = j.erro; } catch { /* sem corpo */ }
    throw new Error(msg);
  }
  if ((data as any)?.erro) throw new Error((data as any).erro);
  return data as T;
}

function Acessos() {
  const [membros, setMembros] = useState<Mem[] | null>(null);
  const [convites, setConvites] = useState<Conv[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);
  const [email, setEmail] = useState(""); const [nome, setNome] = useState(""); const [papel, setPapel] = useState<"viewer" | "admin">("viewer");
  const [ocupado, setOcupado] = useState(false);
  const { membro } = useAuth();

  const carregar = useCallback(async () => {
    try { const r = await chamar<{ membros: Mem[]; convites: Conv[] }>("listar"); setMembros(r.membros); setConvites(r.convites); setErro(null); }
    catch (e) { setErro((e as Error).message); setMembros([]); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const executa = async (fn: () => Promise<void>) => { setOcupado(true); setErro(null); try { await fn(); await carregar(); } catch (e) { setErro((e as Error).message); } finally { setOcupado(false); } };
  const convidar = (e: FormEvent) => { e.preventDefault(); void executa(async () => {
    const r = await chamar<{ link: string | null }>("convidar", { email, nome, papel });
    if (r.link) setLink({ email, url: r.link });
    setEmail(""); setNome("");
  }); };
  const gerar = (em: string) => executa(async () => { const r = await chamar<{ link: string | null }>("gerar_link", { email: em }); if (r.link) setLink({ email: em, url: r.link }); });
  const pendentes = convites.filter((c) => !(membros ?? []).some((m) => m.email.toLowerCase() === c.email.toLowerCase()));

  return (
    <div className="space-y-6">
      {erro && <Erro mensagem={erro} />}
      {link && (
        <div className="rounded-2xl border border-mata/40 bg-mata/10 p-4 text-[13px] text-white">
          <div className="mb-1 font-bold">Link de acesso de {link.email}</div>
          <div className="mb-2 text-zup-100">Envie este link à pessoa. Ele abre a tela para ela definir a própria senha e vale por tempo limitado.</div>
          <div className="flex gap-2"><input readOnly value={link.url} className={estiloCampo} onFocus={(e) => e.currentTarget.select()} aria-label="Link de acesso" />
            <Botao variante="primario" onClick={() => navigator.clipboard?.writeText(link.url)}><Copy className="h-4 w-4" />Copiar</Botao></div>
        </div>
      )}
      <Card>
        <Titulo>Convidar pessoa</Titulo>
        <form onSubmit={convidar} className="grid gap-3 md:grid-cols-[1.3fr_1fr_160px_auto] md:items-end">
          <Campo rotulo="E-mail"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={estiloCampo} placeholder="nome@empresa.com.br" /></Campo>
          <Campo rotulo="Nome"><input value={nome} onChange={(e) => setNome(e.target.value)} className={estiloCampo} placeholder="Nome" /></Campo>
          <Campo rotulo="Perfil"><select value={papel} onChange={(e) => setPapel(e.target.value as "viewer" | "admin")} className={estiloCampo}><option value="viewer">Visualização</option><option value="admin">Administrador</option></select></Campo>
          <Botao variante="primario" type="submit" disabled={ocupado}><UserPlus className="h-4 w-4" />Convidar</Botao>
        </form>
        <p className="mt-2 text-[12px] text-muted-foreground">A pessoa define a senha pelo link. Se o envio por e-mail do projeto não estiver configurado, copie o link gerado e envie você mesmo.</p>
      </Card>

      <Card>
        <Titulo>Quem tem acesso</Titulo>
        {membros === null ? <Skel className="h-32" /> : membros.length === 0 ? <Vazio titulo="Nenhum membro ainda" texto="Convide a primeira pessoa acima." /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-[13px]">
            <thead><tr className="border-b border-glow/15 text-[11px] uppercase tracking-wider text-muted-foreground"><th className="px-3 py-2">Pessoa</th><th className="px-3 py-2">Perfil</th><th className="px-3 py-2">Situação</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
            <tbody>{membros.map((m) => {
              const eu = m.email.toLowerCase() === membro?.email?.toLowerCase();
              return (
                <tr key={m.user_id} className="border-b border-glow/8">
                  <td className="px-3 py-2.5"><div className="font-semibold text-white">{m.nome || m.email}</div><div className="text-[11px] text-muted-foreground">{m.email}</div></td>
                  <td className="px-3 py-2.5">{m.papel === "admin" ? "Administrador" : "Visualização"}</td>
                  <td className="px-3 py-2.5"><span className={m.ativo ? "text-mata" : "text-alerta"}>{m.ativo ? "Ativo" : "Bloqueado"}</span></td>
                  <td className="px-3 py-2.5 text-right"><div className="flex flex-wrap justify-end gap-1.5">
                    <Botao disabled={ocupado} onClick={() => gerar(m.email)}><Link2 className="h-3.5 w-3.5" />Gerar link</Botao>
                    {!eu && <Botao disabled={ocupado} onClick={() => executa(async () => { await chamar("papel", { email: m.email, papel: m.papel === "admin" ? "viewer" : "admin" }); })}>{m.papel === "admin" ? "Tornar visualização" : "Tornar admin"}</Botao>}
                    {!eu && <Botao disabled={ocupado} onClick={() => executa(async () => { await chamar("ativo", { email: m.email, ativo: !m.ativo }); })}>{m.ativo ? "Bloquear" : "Reativar"}</Botao>}
                  </div></td>
                </tr>);
            })}</tbody></table></div>
        )}
      </Card>

      {pendentes.length > 0 && (
        <Card>
          <Titulo dica="Pessoas que já estão autorizadas mas ainda não criaram a senha. Elas mesmas podem pedir o link na tela de entrada, em “Primeiro acesso”.">Autorizados sem primeiro acesso ({pendentes.length})</Titulo>
          <ul className="grid gap-2 md:grid-cols-2">{pendentes.map((c) => (
            <li key={c.email} className="flex items-center gap-3 rounded-xl border border-glow/10 bg-ink-800/40 p-3 text-[13px]">
              <Mail className="h-4 w-4 shrink-0 text-glow" /><div className="min-w-0 flex-1"><div className="truncate font-semibold text-white">{c.nome || c.email}</div><div className="truncate text-[11px] text-muted-foreground">{c.email} · {c.papel === "admin" ? "admin" : "visualização"}</div></div>
              <Botao disabled={ocupado} onClick={() => gerar(c.email)}>Gerar link</Botao>
            </li>))}</ul>
        </Card>
      )}
    </div>
  );
}

const PLATAFORMAS = ["Google Ads", "Meta Ads", "Programática"];
const hoje = () => new Date().toISOString().slice(0, 10);

function Orcamento() {
  const qc = useQueryClient();
  const [mes, setMes] = useState(hoje().slice(0, 7)); const [plat, setPlat] = useState(PLATAFORMAS[0]); const [valor, setValor] = useState("");
  const [msg, setMsg] = useState<string | null>(null); const [erro, setErro] = useState<string | null>(null);
  const lista = useQuery({
    queryKey: ["orcamento-mensal"],
    queryFn: async () => {
      if (MOCK) return [] as { mes: string; plataforma: string; valor: number }[];
      const { data, error } = await supabase.from("bi_orcamento").select("data,plataforma,planejado").order("data", { ascending: false }).limit(2000);
      if (error) throw new Error(error.message);
      const m = new Map<string, number>();
      for (const r of data as { data: string; plataforma: string; planejado: number }[]) { const k = `${r.data.slice(0, 7)}|${r.plataforma}`; m.set(k, (m.get(k) ?? 0) + Number(r.planejado)); }
      return [...m.entries()].map(([k, v]) => { const [mes, plataforma] = k.split("|"); return { mes, plataforma, valor: v }; }).sort((a, b) => b.mes.localeCompare(a.mes));
    },
  });
  const salvar = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null); setErro(null);
    const v = Number(valor.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(v) || v < 0) { setErro("Informe um valor válido."); return; }
    if (MOCK) { setMsg("Modo demonstração: nada foi gravado."); return; }
    const { error } = await supabase.rpc("bi_orcamento_definir", { p_mes: `${mes}-01`, p_plataforma: plat, p_valor: v });
    if (error) { setErro(error.message); return; }
    setMsg("Orçamento salvo e distribuído por dia."); setValor(""); void lista.refetch(); void qc.invalidateQueries({ queryKey: ["consulta"] });
  };
  return (
    <div className="space-y-6">
      <Card>
        <Titulo dica="O valor mensal é dividido igualmente pelos dias do mês. É o planejado que a tela Mídia compara com o realizado.">Orçamento planejado de mídia</Titulo>
        <form onSubmit={salvar} className="grid gap-3 md:grid-cols-[160px_1fr_1fr_auto] md:items-end">
          <Campo rotulo="Mês"><input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className={estiloCampo} required /></Campo>
          <Campo rotulo="Plataforma"><select value={plat} onChange={(e) => setPlat(e.target.value)} className={estiloCampo}>{PLATAFORMAS.map((p) => <option key={p}>{p}</option>)}</select></Campo>
          <Campo rotulo="Valor do mês (R$)"><input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={estiloCampo} placeholder="1.500.000" required /></Campo>
          <Botao variante="primario" type="submit">Salvar</Botao>
        </form>
        {msg && <p className="mt-2 text-[13px] text-mata">{msg}</p>}{erro && <p className="mt-2 text-[13px] text-alerta">{erro}</p>}
      </Card>
      <Card>
        <Titulo>Orçamentos cadastrados</Titulo>
        {lista.isLoading ? <Skel className="h-24" /> : !(lista.data ?? []).length ? <Vazio titulo="Nenhum orçamento cadastrado" texto="Cadastre acima o valor planejado por mês e plataforma." /> : (
          <ul className="grid gap-2 md:grid-cols-3">{lista.data!.map((o) => <li key={o.mes + o.plataforma} className="rounded-xl border border-glow/10 bg-ink-800/40 p-3 text-[13px]"><div className="text-[11px] text-muted-foreground">{o.mes} · {o.plataforma}</div><div className="num font-bold text-white">{fmt(o.valor, "brl0")}</div></li>)}</ul>
        )}
      </Card>
    </div>
  );
}

function Programatica() {
  const qc = useQueryClient();
  const [f, setF] = useState({ data: hoje(), campanha: "Programática", custo: "", impressoes: "", cliques: "", nota: "" });
  const [msg, setMsg] = useState<string | null>(null); const [erro, setErro] = useState<string | null>(null);
  const lista = useQuery({
    queryKey: ["invest-manual"],
    queryFn: async () => {
      if (MOCK) return [];
      const { data, error } = await supabase.from("bi_invest_manual").select("data,plataforma,campanha,custo,impressoes,cliques").order("data", { ascending: false }).limit(30);
      if (error) throw new Error(error.message);
      return data as { data: string; plataforma: string; campanha: string; custo: number; impressoes: number; cliques: number }[];
    },
  });
  const n = (s: string) => Number(s.replace(/\./g, "").replace(",", ".") || 0);
  const salvar = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null); setErro(null);
    if (MOCK) { setMsg("Modo demonstração: nada foi gravado."); return; }
    const { error } = await supabase.from("bi_invest_manual").upsert({ data: f.data, plataforma: "Programática", campanha: f.campanha || "Programática", custo: n(f.custo), impressoes: Math.round(n(f.impressoes)), cliques: Math.round(n(f.cliques)), nota: f.nota || null }, { onConflict: "data,plataforma,campanha" });
    if (error) { setErro(error.message); return; }
    setMsg("Lançamento salvo. O investimento total já considera este valor."); setF({ ...f, custo: "", impressoes: "", cliques: "", nota: "" });
    void lista.refetch(); void qc.invalidateQueries({ queryKey: ["consulta"] });
  };
  return (
    <div className="space-y-6">
      <Card>
        <Titulo dica="Enquanto a programática não vem por integração, o custo diário é lançado aqui e entra no investimento total, no planejado × realizado e no ROAS.">Lançar mídia programática</Titulo>
        <form onSubmit={salvar} className="grid gap-3 md:grid-cols-3">
          <Campo rotulo="Dia"><input type="date" required value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} className={estiloCampo} /></Campo>
          <Campo rotulo="Campanha ou parceiro"><input value={f.campanha} onChange={(e) => setF({ ...f, campanha: e.target.value })} className={estiloCampo} /></Campo>
          <Campo rotulo="Custo (R$)"><input required inputMode="decimal" value={f.custo} onChange={(e) => setF({ ...f, custo: e.target.value })} className={estiloCampo} placeholder="12.500,00" /></Campo>
          <Campo rotulo="Impressões (opcional)"><input inputMode="numeric" value={f.impressoes} onChange={(e) => setF({ ...f, impressoes: e.target.value })} className={estiloCampo} /></Campo>
          <Campo rotulo="Cliques (opcional)"><input inputMode="numeric" value={f.cliques} onChange={(e) => setF({ ...f, cliques: e.target.value })} className={estiloCampo} /></Campo>
          <Campo rotulo="Observação"><input value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} className={estiloCampo} /></Campo>
          <div className="md:col-span-3"><Botao variante="primario" type="submit">Salvar lançamento</Botao></div>
        </form>
        {msg && <p className="mt-2 text-[13px] text-mata">{msg}</p>}{erro && <p className="mt-2 text-[13px] text-alerta">{erro}</p>}
      </Card>
      <Card>
        <Titulo>Últimos lançamentos</Titulo>
        {lista.isLoading ? <Skel className="h-24" /> : !(lista.data ?? []).length ? <Vazio titulo="Sem lançamentos" texto="Os valores lançados aparecem aqui." /> : (
          <ul className="space-y-1.5">{lista.data!.map((r) => <li key={r.data + r.campanha} className="flex justify-between rounded-xl border border-glow/10 bg-ink-800/40 px-3 py-2 text-[13px]"><span className="text-white">{dataCurta(r.data)} · {r.campanha}</span><span className="num font-bold">{fmt(r.custo, "brl")}</span></li>)}</ul>
        )}
      </Card>
    </div>
  );
}

function Eventos() {
  const ev = useEventos(); const qc = useQueryClient();
  const [f, setF] = useState({ data: hoje(), titulo: "", tipo: "outro" });
  const [erro, setErro] = useState<string | null>(null);
  const salvar = async (e: FormEvent) => {
    e.preventDefault(); setErro(null);
    if (MOCK) { setErro("Modo demonstração: nada foi gravado."); return; }
    const { error } = await supabase.from("bi_eventos").insert({ data: f.data, titulo: f.titulo, tipo: f.tipo });
    if (error) { setErro(error.message); return; }
    setF({ ...f, titulo: "" }); void qc.invalidateQueries({ queryKey: ["eventos"] });
  };
  const apagar = async (id: string) => { if (MOCK) return; const { error } = await supabase.from("bi_eventos").delete().eq("id", id); if (error) setErro(error.message); else void qc.invalidateQueries({ queryKey: ["eventos"] }); };
  return (
    <div className="space-y-6">
      <Card>
        <Titulo dica="Registre o que explica mudanças que não vêm da mídia: deploy de tagueamento, site fora do ar, ação de metabuscador, Black Friday.">Anotar evento</Titulo>
        <form onSubmit={salvar} className="grid gap-3 md:grid-cols-[160px_1fr_160px_auto] md:items-end">
          <Campo rotulo="Dia"><input type="date" required value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} className={estiloCampo} /></Campo>
          <Campo rotulo="O que aconteceu"><input required maxLength={120} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} className={estiloCampo} /></Campo>
          <Campo rotulo="Tipo"><select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className={estiloCampo}>{["deploy", "site", "campanha", "mercado", "outro"].map((t) => <option key={t}>{t}</option>)}</select></Campo>
          <Botao variante="primario" type="submit">Anotar</Botao>
        </form>
        {erro && <p className="mt-2 text-[13px] text-alerta">{erro}</p>}
      </Card>
      <Card>
        <Titulo>Eventos</Titulo>
        {ev.isLoading ? <Skel className="h-24" /> : !(ev.data ?? []).length ? <Vazio titulo="Nenhum evento" texto="Os eventos anotados aparecem aqui e na tela Dados." /> : (
          <ul className="space-y-1.5">{ev.data!.map((e) => <li key={e.id} className="flex items-center gap-3 rounded-xl border border-glow/10 bg-ink-800/40 px-3 py-2 text-[13px]"><span className="num font-bold text-glow">{dataCurta(e.data)}</span><span className="flex-1 text-white">{e.titulo}</span><Chip>{e.tipo}</Chip>
            <button type="button" aria-label="Excluir evento" onClick={() => apagar(e.id)} className="text-muted-foreground hover:text-alerta"><Trash2 className="h-4 w-4" /></button></li>)}</ul>
        )}
      </Card>
    </div>
  );
}

function Metas() {
  const [trim, setTrim] = useState(`${new Date().getFullYear()}-T${Math.floor(new Date().getMonth() / 3) + 1}`);
  const [medida, setMedida] = useState("tarifa_emit"); const [valor, setValor] = useState(""); const [cresc, setCresc] = useState("");
  const [msg, setMsg] = useState<string | null>(null); const [erro, setErro] = useState<string | null>(null);
  const lista = useQuery({ queryKey: ["metas"], queryFn: async () => { if (MOCK) return []; const { data, error } = await supabase.from("bi_metas").select("*").order("trimestre", { ascending: false }); if (error) throw new Error(error.message); return data as { trimestre: string; medida: string; valor: number; crescimento_pct: number | null }[]; } });
  const salvar = async (e: FormEvent) => {
    e.preventDefault(); setMsg(null); setErro(null);
    if (MOCK) { setMsg("Modo demonstração: nada foi gravado."); return; }
    const { error } = await supabase.from("bi_metas").upsert({ trimestre: trim, medida, valor: Number(valor.replace(/\./g, "").replace(",", ".")), crescimento_pct: cresc ? Number(cresc.replace(",", ".")) : null }, { onConflict: "trimestre,medida" });
    if (error) { setErro(error.message); return; }
    setMsg("Meta salva."); setValor(""); setCresc(""); void lista.refetch();
  };
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-sol/40 bg-sol/10 p-3 text-[13px] text-amber-100">Metas e bônus são visíveis apenas para administradores. Nenhum valor desta aba aparece para quem tem perfil de visualização nem é enviado ao analista de IA.</div>
      <Card>
        <Titulo>Meta trimestral</Titulo>
        <form onSubmit={salvar} className="grid gap-3 md:grid-cols-[140px_1fr_1fr_140px_auto] md:items-end">
          <Campo rotulo="Trimestre"><input pattern="[0-9]{4}-T[1-4]" value={trim} onChange={(e) => setTrim(e.target.value.toUpperCase())} className={estiloCampo} placeholder="2026-T4" required /></Campo>
          <Campo rotulo="Medida"><select value={medida} onChange={(e) => setMedida(e.target.value)} className={estiloCampo}><option value="tarifa_emit">Tarifa emitida</option><option value="pedidos_emit">Pedidos emitidos</option><option value="receita_emit">Receita emitida</option></select></Campo>
          <Campo rotulo="Meta"><input required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={estiloCampo} /></Campo>
          <Campo rotulo="Crescimento %"><input inputMode="decimal" value={cresc} onChange={(e) => setCresc(e.target.value)} className={estiloCampo} /></Campo>
          <Botao variante="primario" type="submit">Salvar</Botao>
        </form>
        {msg && <p className="mt-2 text-[13px] text-mata">{msg}</p>}{erro && <p className="mt-2 text-[13px] text-alerta">{erro}</p>}
      </Card>
      <Card>
        <Titulo>Metas cadastradas</Titulo>
        {lista.isLoading ? <Skel className="h-20" /> : !(lista.data ?? []).length ? <Vazio titulo="Nenhuma meta" texto="Cadastre a meta do trimestre acima." /> : (
          <ul className="space-y-1.5">{lista.data!.map((m) => <li key={m.trimestre + m.medida} className="flex justify-between rounded-xl border border-glow/10 bg-ink-800/40 px-3 py-2 text-[13px]"><span className="text-white">{m.trimestre} · {m.medida}</span><span className="num font-bold">{fmt(m.valor, m.medida === "pedidos_emit" ? "int" : "brl0")}{m.crescimento_pct != null && ` · +${m.crescimento_pct}%`}</span></li>)}</ul>
        )}
      </Card>
    </div>
  );
}

export default function Admin() {
  const { admin } = useAuth();
  const [aba, setAba] = useState<Aba>("acessos");
  if (!admin) return <Vazio titulo="Área restrita" texto="Somente administradores acessam esta página." />;
  const abas: [Aba, string][] = [["acessos", "Acessos"], ["orcamento", "Orçamento de mídia"], ["programatica", "Programática"], ["eventos", "Eventos"], ["metas", "Metas e bônus"]];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">{abas.map(([id, nome]) => <Chip key={id} ativo={aba === id} onClick={() => setAba(id)}>{nome}</Chip>)}</div>
      {aba === "acessos" && <Acessos />}{aba === "orcamento" && <Orcamento />}{aba === "programatica" && <Programatica />}{aba === "eventos" && <Eventos />}{aba === "metas" && <Metas />}
    </div>
  );
}
