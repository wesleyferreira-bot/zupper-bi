import { useState } from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/fx/Aviao";
import { BackgroundFX } from "@/components/fx/BackgroundFX";
import { Botao, Campo, estiloCampo } from "@/components/ui/base";
import { useAuth } from "@/state/Auth";
import { ERRO_DO_LINK } from "@/lib/supabase";

type Modo = "entrar" | "link" | "enviado";

export default function Login({ erroConfig, definirSenha, semAcesso }: { erroConfig?: boolean; definirSenha?: boolean; semAcesso?: boolean }) {
  const { entrar, pedirLink, novaSenha, sair } = useAuth();
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [erro, setErro] = useState<string | null>(ERRO_DO_LINK);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      if (definirSenha) {
        if (senha.length < 10) return setErro("Use pelo menos 10 caracteres.");
        if (senha !== senha2) return setErro("As senhas não conferem.");
        setErro(await novaSenha(senha));
      } else if (modo === "entrar") {
        setErro(await entrar(email, senha));
      } else {
        await pedirLink(email);
        setModo("enviado");
      }
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <BackgroundFX />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="holo w-full max-w-[420px] p-8">
        <div className="mb-7"><Logo /></div>

        {erroConfig ? (
          <p className="text-sm text-red-200">O app ainda não está ligado ao banco. Falta configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no build.</p>
        ) : semAcesso ? (
          <div className="space-y-4">
            <h1 className="text-xl font-extrabold text-white">Acesso não liberado</h1>
            <p className="text-sm text-muted-foreground">Seu e-mail entrou, mas ainda não está na lista de pessoas autorizadas. Peça à Metrix para liberar.</p>
            <Botao variante="suave" onClick={sair}>Sair</Botao>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <h1 className="text-xl font-extrabold text-white">
              {definirSenha ? "Defina sua senha" : modo === "entrar" ? "Entrar" : modo === "link" ? "Primeiro acesso ou esqueci a senha" : "Confira seu e-mail"}
            </h1>

            {modo === "enviado" ? (
              <p className="text-sm text-zup-100">Se este e-mail estiver autorizado, enviamos um link para definir a senha. Ele vale por algumas horas.</p>
            ) : definirSenha ? (
              <>
                <Campo rotulo="Nova senha"><input type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={estiloCampo} /></Campo>
                <Campo rotulo="Repita a senha"><input type="password" autoComplete="new-password" value={senha2} onChange={(e) => setSenha2(e.target.value)} className={estiloCampo} /></Campo>
              </>
            ) : (
              <>
                <Campo rotulo="E-mail"><input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={estiloCampo} placeholder="voce@empresa.com.br" /></Campo>
                {modo === "entrar" && <Campo rotulo="Senha"><input type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={estiloCampo} /></Campo>}
              </>
            )}

            {erro && <div role="alert" className="rounded-xl border border-alerta/40 bg-alerta/10 px-3 py-2 text-[13px] text-red-100">{erro}</div>}

            {modo !== "enviado" && <Botao variante="primario" className="w-full" disabled={ocupado} type="submit">{definirSenha ? "Salvar e entrar" : modo === "entrar" ? "Entrar" : "Enviar link"}</Botao>}
            {!definirSenha && (
              <button type="button" onClick={() => { setErro(null); setModo(modo === "entrar" ? "link" : "entrar"); }} className="block w-full text-center text-[13px] font-semibold text-glow hover:underline">
                {modo === "entrar" ? "Primeiro acesso ou esqueci a senha" : "Voltar para o login"}
              </button>
            )}
          </form>
        )}
      </motion.div>
    </div>
  );
}
