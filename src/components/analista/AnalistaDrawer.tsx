import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { History, Mic, MicOff, Plus, Send, Volume2, VolumeX, X, Wand2, AudioLines } from "lucide-react";
import clsx from "clsx";
import { Zuppy, type EstadoZuppy } from "@/components/fx/Zuppy";
import { Skel } from "@/components/ui/base";
import { MOCK, supabase } from "@/lib/supabase";
import { useAnalista } from "@/state/Analista";
import { useTela } from "@/state/Tela";
import { useFiltros } from "@/state/Filtros";
import { useAuth } from "@/state/Auth";

interface Msg { id: string; papel: "user" | "assistant"; conteudo: string; via?: string; erro?: boolean }
interface Conversa { id: string; titulo: string; atualizado_em: string }

const SUGESTOES = [
  "Como está a receita emitida neste período contra o anterior?",
  "Onde estamos perdendo pedidos entre captura e emissão?",
  "Qual o ROAS de Google e Meta nos últimos 30 dias?",
  "Quais destinos mais cresceram?",
];

/** Markdown minimo: **negrito**, listas com "- " e quebras de linha. Nada de HTML vindo do modelo. */
function Texto({ t }: { t: string }) {
  const blocos = t.split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocos.map((b, i) => {
        const linhas = b.split("\n");
        if (linhas.every((l) => /^\s*[-•*]\s+/.test(l))) {
          return <ul key={i} className="list-disc space-y-1 pl-5">{linhas.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-•*]\s+/, ""))}</li>)}</ul>;
        }
        return <p key={i}>{linhas.map((l, j) => <span key={j}>{j > 0 && <br />}{inline(l)}</span>)}</p>;
      })}
    </div>
  );
}
function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="text-white">{p.slice(2, -2)}</strong> : p));
}

type SR = { start: () => void; stop: () => void; abort: () => void; lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: ((e: any) => void) | null };
const SpeechRec: (new () => SR) | undefined = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;

export function AnalistaDrawer() {
  const { aberto, fechar, pedido, consumir, perguntar, modoVoz, setModoVoz } = useAnalista();
  const { tela } = useTela();
  const { periodo, filtros } = useFiltros();
  const { membro } = useAuth();

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [falando, setFalando] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [mudo, setMudo] = useState(false);
  const [verHistorico, setVerHistorico] = useState(false);
  const [historico, setHistorico] = useState<Conversa[] | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const rec = useRef<SR | null>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const modoVozRef = useRef(modoVoz);
  modoVozRef.current = modoVoz;
  const enviarRef = useRef<(t: string, via: "texto" | "voz" | "insight", falar?: boolean) => void>(() => {});

  const estado: EstadoZuppy = falando ? "falando" : ouvindo ? "ouvindo" : pensando ? "pensando" : "parado";

  useEffect(() => { fim.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, pensando]);

  const pararFala = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
    window.speechSynthesis?.cancel();
    setFalando(false);
  }, []);

  const iniciarEscuta = useCallback(async () => {
    pararFala();
    if (SpeechRec) {
      const r = new SpeechRec();
      r.lang = "pt-BR"; r.interimResults = true; r.continuous = false;
      let final = "";
      r.onresult = (e: any) => {
        let parcial = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const x = e.results[i];
          if (x.isFinal) final += x[0].transcript; else parcial += x[0].transcript;
        }
        setTexto((final + parcial).trim());
      };
      r.onerror = () => { setOuvindo(false); };
      r.onend = () => {
        setOuvindo(false);
        const t = final.trim();
        if (t) { setTexto(""); enviarRef.current(t, "voz", true); }
      };
      rec.current = r;
      setOuvindo(true);
      try { r.start(); } catch { setOuvindo(false); }
      return;
    }
    // Navegador sem reconhecimento nativo: grava e transcreve no servidor
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const partes: BlobPart[] = [];
      mr.ondataavailable = (e) => partes.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setOuvindo(false);
        const blob = new Blob(partes, { type: mr.mimeType || "audio/webm" });
        if (blob.size < 1500) return;
        const f = new FormData();
        f.append("audio", blob, "fala.webm");
        const { data, error } = await supabase.functions.invoke("analista-transcrever", { body: f });
        const t = String((data as any)?.texto ?? "").trim();
        if (error || !t) { setMsgs((m) => [...m, { id: crypto.randomUUID(), papel: "assistant", conteudo: "Não consegui entender o áudio. Tente de novo ou escreva a pergunta.", erro: true }]); return; }
        enviarRef.current(t, "voz", true);
      };
      gravador.current = mr;
      mr.start();
      setOuvindo(true);
      setTimeout(() => { if (mr.state === "recording") mr.stop(); }, 20000);
    } catch {
      setMsgs((m) => [...m, { id: crypto.randomUUID(), papel: "assistant", conteudo: "Não consegui acessar o microfone. Libere a permissão no navegador.", erro: true }]);
    }
  }, [pararFala]);

  const pararEscuta = useCallback(() => {
    rec.current?.stop();
    if (gravador.current?.state === "recording") gravador.current.stop();
    setOuvindo(false);
  }, []);

  const falar = useCallback(async (t: string) => {
    if (mudo) return;
    pararFala();
    setFalando(true);
    const depois = () => {
      setFalando(false);
      if (modoVozRef.current) setTimeout(() => iniciarEscuta(), 350);
    };
    try {
      if (MOCK) throw new Error("mock");
      const { data: s } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analista-voz`;
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${s.session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string },
        body: JSON.stringify({ texto: t }),
      });
      if (!r.ok) throw new Error("tts");
      const blob = await r.blob();
      const a = new Audio(URL.createObjectURL(blob));
      audio.current = a;
      a.onended = depois;
      a.onerror = depois;
      await a.play();
    } catch {
      // Sem a voz do servidor, usa a do navegador para nao ficar mudo
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(t.replace(/[*_`#]/g, ""));
        u.lang = "pt-BR";
        u.onend = depois; u.onerror = depois;
        window.speechSynthesis.speak(u);
      } else depois();
    }
  }, [mudo, pararFala, iniciarEscuta]);

  const enviar = useCallback(async (t: string, via: "texto" | "voz" | "insight", querFalar = false) => {
    const pergunta = t.trim();
    if (!pergunta) return;
    setMsgs((m) => [...m, { id: crypto.randomUUID(), papel: "user", conteudo: pergunta, via }]);
    setPensando(true);
    try {
      let resposta: string;
      if (MOCK) {
        await new Promise((r) => setTimeout(r, 900));
        resposta = "Modo demonstração local: aqui o Zuppy consulta o banco e responde com números reais. Conecte o Supabase para ver a análise de verdade.";
      } else {
        const { data, error } = await supabase.functions.invoke("analista", {
          body: {
            texto: pergunta, via, conversa_id: conversaId,
            tela: tela ? { pagina: tela.pagina, titulo: tela.titulo, resumo: tela.resumo } : null,
            periodo: { ini: periodo.ini, fim: periodo.fim }, filtros,
          },
        });
        if (error) {
          let msg = error.message;
          try { const j = await (error as any).context?.json?.(); if (j?.erro) msg = j.erro; } catch { /* corpo ilegivel */ }
          throw new Error(msg);
        }
        if ((data as any)?.erro) throw new Error((data as any).erro);
        if ((data as any)?.conversa_id) setConversaId((data as any).conversa_id);
        resposta = String((data as any)?.resposta ?? "");
      }
      setMsgs((m) => [...m, { id: crypto.randomUUID(), papel: "assistant", conteudo: resposta, via }]);
      setHistorico(null);
      if (querFalar || modoVozRef.current) void falar(resposta);
    } catch (e) {
      setMsgs((m) => [...m, { id: crypto.randomUUID(), papel: "assistant", erro: true, conteudo: `Não consegui responder agora. ${e instanceof Error ? e.message : ""}`.trim() }]);
      if (modoVozRef.current) setModoVoz(false);
    } finally {
      setPensando(false);
    }
  }, [conversaId, tela, periodo.ini, periodo.fim, filtros, falar, setModoVoz]);
  enviarRef.current = enviar;

  // pedidos vindos de fora (insights clicaveis, "analisar esta tela")
  useEffect(() => {
    if (!pedido) return;
    consumir(pedido.id);
    void enviar(pedido.texto, pedido.via, pedido.falar);
  }, [pedido, consumir, enviar]);

  useEffect(() => { if (!aberto) { pararFala(); pararEscuta(); setModoVoz(false); } }, [aberto, pararFala, pararEscuta, setModoVoz]);

  const nova = () => { pararFala(); setMsgs([]); setConversaId(null); setVerHistorico(false); };

  const abrirHistorico = async () => {
    setVerHistorico((v) => !v);
    if (historico || MOCK) return;
    const { data } = await supabase.from("bi_conversas").select("id,titulo,atualizado_em").order("atualizado_em", { ascending: false }).limit(40);
    setHistorico((data as Conversa[]) ?? []);
  };
  const carregar = async (c: Conversa) => {
    pararFala();
    setVerHistorico(false);
    setConversaId(c.id);
    setMsgs([]);
    const { data } = await supabase.from("bi_mensagens").select("id,papel,conteudo,via").eq("conversa_id", c.id).order("criado_em");
    setMsgs(((data as Msg[]) ?? []));
  };

  const alternarVoz = () => {
    if (modoVoz) { setModoVoz(false); pararEscuta(); pararFala(); return; }
    setModoVoz(true);
    void iniciarEscuta();
  };

  const primeiroNome = useMemo(() => (membro?.nome || membro?.email || "").split(/[\s@]/)[0], [membro]);
  const legenda = falando ? "Falando" : ouvindo ? "Ouvindo você" : pensando ? "Consultando os dados" : "Analista de dados";

  return (
    <AnimatePresence>
      {aberto && (
        <motion.aside
          initial={{ x: 460, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 460, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[430px] flex-col border-l border-glow/25 bg-ink-950/90 shadow-[-30px_0_80px_-30px_rgba(111,227,247,.35)] backdrop-blur-2xl"
          aria-label="Analista de IA"
        >
          <header className="flex items-center gap-3 border-b border-glow/15 p-4">
            <Zuppy tamanho={48} estado={estado} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-extrabold text-white">Zuppy</div>
              <div className="flex items-center gap-1.5 text-[12px] text-glow/90" aria-live="polite">
                {(falando || ouvindo) && <AudioLines className="h-3.5 w-3.5 animate-pulse" />}{legenda}
              </div>
            </div>
            <button type="button" onClick={() => setMudo((m) => { if (!m) pararFala(); return !m; })} aria-label={mudo ? "Ativar voz" : "Silenciar voz"} aria-pressed={mudo}
              className="grid h-9 w-9 place-items-center rounded-lg text-zup-100 hover:bg-glow/10">{mudo ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}</button>
            <button type="button" onClick={abrirHistorico} aria-label="Histórico de conversas" aria-pressed={verHistorico} className={clsx("grid h-9 w-9 place-items-center rounded-lg hover:bg-glow/10", verHistorico ? "bg-glow/15 text-glow" : "text-zup-100")}><History className="h-4.5 w-4.5" /></button>
            <button type="button" onClick={nova} aria-label="Nova conversa" className="grid h-9 w-9 place-items-center rounded-lg text-zup-100 hover:bg-glow/10"><Plus className="h-4.5 w-4.5" /></button>
            <button type="button" onClick={fechar} aria-label="Fechar analista" className="grid h-9 w-9 place-items-center rounded-lg text-zup-100 hover:bg-glow/10"><X className="h-5 w-5" /></button>
          </header>

          {verHistorico ? (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-glow/80">Suas conversas</div>
              {MOCK ? <p className="text-sm text-muted-foreground">O histórico fica salvo no banco quando o BI está conectado.</p>
                : historico === null ? <div className="space-y-2"><Skel className="h-12" /><Skel className="h-12" /><Skel className="h-12" /></div>
                : historico.length === 0 ? <p className="text-sm text-muted-foreground">Você ainda não tem conversas salvas.</p>
                : <ul className="space-y-2">{historico.map((c) => (
                    <li key={c.id}><button type="button" onClick={() => carregar(c)} className="w-full rounded-xl border border-glow/15 bg-ink-800/50 p-3 text-left hover:border-glow/40">
                      <div className="truncate text-[13px] font-semibold text-white">{c.titulo}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(c.atualizado_em).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                    </button></li>))}</ul>}
            </div>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite">
              {msgs.length === 0 && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-glow/15 bg-glow/5 p-4 text-[13.5px] leading-relaxed text-zup-50">
                    {primeiroNome ? `Oi, ${primeiroNome}. ` : "Oi. "}Eu leio os mesmos dados que você vê no painel e respondo com números. Pergunte por escrito ou toque no microfone e converse comigo.
                  </div>
                  {tela && (
                    <button type="button" onClick={() => perguntar(`Analise esta tela (${tela.titulo}): o que mais merece atenção e o que eu devo fazer a respeito?`, { via: "insight", falar: false })}
                      className="flex w-full items-center gap-2 rounded-xl border border-glow/30 bg-glow/10 p-3 text-left text-[13px] font-semibold text-white hover:bg-glow/20">
                      <Wand2 className="h-4 w-4 text-glow" />Analisar esta tela: {tela.titulo}
                    </button>
                  )}
                  <div className="space-y-2">
                    {SUGESTOES.map((s) => (
                      <button key={s} type="button" onClick={() => enviar(s, "texto")} className="block w-full rounded-xl border border-glow/15 bg-ink-800/40 p-3 text-left text-[13px] text-zup-100 hover:border-glow/40 hover:text-white">{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m) => (
                <div key={m.id} className={clsx("flex", m.papel === "user" ? "justify-end" : "justify-start")}>
                  <div className={clsx("max-w-[92%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed",
                    m.papel === "user" ? "rounded-br-md bg-gradient-to-b from-zup-400 to-zup-600 text-white" : m.erro ? "rounded-bl-md border border-alerta/40 bg-alerta/5 text-red-100" : "rounded-bl-md border border-glow/15 bg-ink-800/70 text-zup-50")}>
                    {m.via === "voz" && m.papel === "user" && <Mic className="mb-1 inline h-3 w-3 opacity-70" />}{" "}
                    <Texto t={m.conteudo} />
                    {m.papel === "assistant" && !m.erro && (
                      <button type="button" onClick={() => (falando ? pararFala() : falar(m.conteudo))} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-glow/80 hover:text-glow">
                        <Volume2 className="h-3 w-3" />Ouvir
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {pensando && (
                <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-glow/15 bg-ink-800/70 px-4 py-3">
                  <span className="inline-flex gap-1" aria-label="Consultando os dados">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-glow" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>
                </div></div>
              )}
              <div ref={fim} />
            </div>
          )}

          <footer className="border-t border-glow/15 p-3">
            {modoVoz && <div className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-glow/80">Conversa por voz ligada: fale, eu respondo e volto a ouvir</div>}
            <form onSubmit={(e) => { e.preventDefault(); const t = texto; setTexto(""); void enviar(t, "texto"); }} className="flex items-end gap-2">
              <textarea
                value={texto} onChange={(e) => setTexto(e.target.value)} rows={1} placeholder={ouvindo ? "Estou ouvindo…" : "Pergunte sobre os números"}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const t = texto; setTexto(""); void enviar(t, "texto"); } }}
                aria-label="Sua pergunta" disabled={pensando}
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-glow/25 bg-ink-800/70 px-3 py-2.5 text-[14px] text-white placeholder:text-muted-foreground focus:border-glow focus:outline-none" />
              <button type="button" onClick={alternarVoz} aria-label={modoVoz ? "Encerrar conversa por voz" : "Conversar por voz"} aria-pressed={modoVoz}
                className={clsx("grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition", modoVoz ? "border-mata bg-mata/20 text-mata" : "border-glow/30 text-glow hover:bg-glow/10")}>
                {modoVoz ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button type="submit" disabled={pensando || !texto.trim()} aria-label="Enviar" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-zup-300 to-zup-500 text-ink-950 shadow-neon disabled:opacity-40"><Send className="h-5 w-5" /></button>
            </form>
          </footer>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
