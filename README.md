# Zupper BI 2.0 com AI

BI da Zupper Viagens (Metrix Consultoria). Painel separado do de produção, com analista de IA (Zuppy) por texto e voz.

## Arquitetura

```
BigQuery (zupper-mkt) ──► edge function bi-sync ──► Supabase "zupper-bi" (Auth + RLS) ◄── React (VPS)
                         (conta de serviço só leitura)         ▲
                                                               └── analista / analista-voz / analista-transcrever (OpenAI)
```

- O navegador fala **só com o Supabase**. Nenhuma credencial do BigQuery ou da OpenAI chega ao front.
- Toda leitura passa por RLS: só quem está em `bi_membros` (ativo) enxerga dados. `anon` não tem acesso a nada.
- `bi_consulta(p jsonb)` é a única porta de consulta dinâmica (lista fechada de fontes, dimensões e medidas). O analista de IA usa a mesma porta, **como o usuário logado**.
- Metas e bônus (`bi_metas`) só para administradores e nunca vão ao analista.

## Pastas

- `src/` front (React 18, Vite, TS, Tailwind, TanStack Query, Recharts).
- `supabase/migrations/` esquema, RLS e funções.
- `supabase/functions/` `bi-sync`, `analista`, `analista-voz`, `analista-transcrever`, `acesso-link`, `admin-membros`.
- `deploy/` preparo do VPS e publicação. `.github/workflows/deploy.yml` faz build e publica a cada push no `main`.

## Desenvolvimento local

```
npm install
cp .env.example .env.local      # URL e chave publicável do Supabase
npm run dev
```

`VITE_MOCK=1` liga o modo demonstração (exige Postgres local; ver `scripts/seed-mock.sql`).

## Segredos (Supabase → Edge Functions → Secrets)

| Nome | Para quê |
|---|---|
| `OPENAI_API_KEY` | chat, voz (TTS) e transcrição do Zuppy |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | conta de serviço **somente leitura** (BigQuery Data Viewer + Job User em `zupper-mkt`) usada pelo `bi-sync` |
| `SYNC_SECRET` | senha da chamada agendada do `bi-sync` |
| `SITE_URLS` | domínio final do BI (primeiro valor é usado nos links de acesso) |
| `VOZ_ANALISTA` | opcional; voz do Zuppy (padrão `shimmer`) |

## Deploy (VPS)

1. DNS: registro A do domínio apontando para o VPS.
2. No VPS, uma vez: `DOMAIN=<dominio> bash deploy/vps-setup.sh`.
3. Secrets do repositório: `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_KEY`.
4. Push no `main` publica. Confira o hash do bundle (`/assets/index-*.js`) antes e depois.

## Acesso

Usuários são pré-autorizados em `bi_convites` (e-mail, nome, perfil). Cada pessoa define a própria senha pelo link de "Primeiro acesso". Desligue o cadastro público em Auth → Providers → Email.
