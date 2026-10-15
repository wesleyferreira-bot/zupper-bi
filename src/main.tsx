import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App";
import { AuthProvider } from "@/state/Auth";
import { FiltrosProvider } from "@/state/Filtros";
import { TelaProvider } from "@/state/Tela";
import { AnalistaProvider } from "@/state/Analista";

const qc = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <FiltrosProvider>
            <TelaProvider>
              <AnalistaProvider>
                <App />
              </AnalistaProvider>
            </TelaProvider>
          </FiltrosProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
