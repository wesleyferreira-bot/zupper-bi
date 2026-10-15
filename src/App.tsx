import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "@/components/shell/Shell";
import { TelaCarregando } from "@/components/fx/PlaneTransition";
import { useAuth } from "@/state/Auth";
import { configurado } from "@/lib/supabase";
import Login from "@/pages/Login";
import VisaoGeral from "@/pages/VisaoGeral";

const Passagens = lazy(() => import("@/pages/Passagens"));
const Destinos = lazy(() => import("@/pages/Destinos"));
const Canais = lazy(() => import("@/pages/Canais"));
const Midia = lazy(() => import("@/pages/Midia"));
const Analise = lazy(() => import("@/pages/Analise"));
const Dados = lazy(() => import("@/pages/Dados"));
const Admin = lazy(() => import("@/pages/Admin"));

export default function App() {
  const { carregando, session, membro, definindoSenha } = useAuth();
  if (!configurado) return <Login erroConfig />;
  if (carregando) return <TelaCarregando mensagem="Entrando" />;
  if (!session && !import.meta.env.VITE_MOCK) return <Login />;
  if (definindoSenha) return <Login definirSenha />;
  if (!membro || !membro.ativo) return <Login semAcesso />;

  return (
    <Suspense fallback={<TelaCarregando mensagem="Carregando" />}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<VisaoGeral />} />
          <Route path="passagens" element={<Passagens />} />
          <Route path="destinos" element={<Destinos />} />
          <Route path="canais" element={<Canais />} />
          <Route path="midia" element={<Midia />} />
          <Route path="analise" element={<Analise />} />
          <Route path="dados" element={<Dados />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
