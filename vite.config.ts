import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Somente para desenvolvimento local (VITE_MOCK=1): responde /__mock/rpc/<funcao> lendo um
// Postgres local com dados FICTICIOS (scripts/seed-mock.sql). Nao entra no build de producao.
function mockApi(env: Record<string, string>): Plugin {
  return {
    name: "zupper-mock-api",
    apply: "serve",
    async configureServer(server) {
      if (env.VITE_MOCK !== "1") return;
      const { default: pg } = await import("pg");
      const pool = new pg.Pool({
        host: env.MOCK_PG_HOST || "/tmp",
        port: Number(env.MOCK_PG_PORT || 5499),
        user: env.MOCK_PG_USER || "pgtest",
        database: env.MOCK_PG_DB || "t",
        max: 4,
      });
      server.middlewares.use("/__mock/rpc", (req, res) => {
        const fn = (req.url || "").replace(/^\//, "").split("?")[0];
        if (!["bi_consulta", "bi_status_dados"].includes(fn)) { res.statusCode = 404; res.end("{}"); return; }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", async () => {
          const c = await pool.connect();
          try {
            await c.query("begin");
            await c.query("set local role authenticated");
            await c.query("select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true)");
            const arg = body ? JSON.parse(body) : null;
            const r = fn === "bi_consulta"
              ? await c.query("select public.bi_consulta($1::jsonb) as r", [JSON.stringify(arg?.p ?? {})])
              : await c.query("select public.bi_status_dados() as r");
            await c.query("commit");
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify(r.rows[0].r));
          } catch (e: any) {
            await c.query("rollback").catch(() => {});
            res.statusCode = 400;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ message: e.message }));
          } finally { c.release(); }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), mockApi(env)],
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    server: { port: 5173, host: true },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            charts: ["recharts"],
            map: ["d3-geo", "topojson-client", "world-atlas/countries-110m.json"],
          },
        },
      },
    },
  };
});
