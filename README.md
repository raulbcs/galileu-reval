# Galileu

Catálogo de produtos multi-fornecedor para a Papelaria Galileu. Integra dados da **Reval** (API) e **Atacado Ideal** (SQLite importado) com busca unificada.

## Arquitetura

- **Server-side**: Plugin Vite (`server-plugin.js`) expõe REST API com SQLite (`db/catalogo.db`), cache de imagens, autenticação e proxy pra API Reval
- **Client-side**: React SPA com React Query, busca paginada server-side, URLs amigáveis

### Dados

| Fornecedor | Origem | Importação |
|---|---|---|
| Reval | API (`api.reval.net`) | `npm run import-reval` |
| Atacado Ideal | SQLite externo | `npm run import-ideal` |

Os dois fornecedores compartilham a mesma tabela `produtos` no SQLite, diferenciados pela coluna `supplier`. Produtos duplicados (mesmo EAN nos dois) não são mesclados — cada um aparece como card separado com badge de fornecedor.

### REST API

| Endpoint | Descrição |
|---|---|
| `GET /api/produtos?q=&supplier=&page=&pageSize=` | Busca paginada |
| `GET /api/produtos/:supplier/:codigo` | Detalhe do produto |
| `GET /api/counts` | Contadores por fornecedor |
| `POST /api/import/reval` | Importa produtos da Reval |
| `POST /api/import/ideal` | Importa produtos da Ideal |
| `GET /cached-images/:codigo` | Imagem da Reval (proxy com cache) |
| `GET /cached-api/*` | Proxy cacheado pra API Reval (categorias, etc.) |

Busca suporta prefixo: `reval:termo` ou `ideal:termo` filtra por fornecedor direto na query.

### Cache

- **Imagens Reval**: cache em disco (`cache/images/`) com TTL de 1 semana + header `Cache-Control` pro navegador (30 dias)
- **Imagens Ideal**: servidas por CDN externa, cache natural do navegador
- **API Reval** (categorias etc.): cache em disco com TTL de 12h
- **Token Reval**: cacheado até expirar

## URLs

- `/` — Home com busca
- `/produtos` — Catálogo paginado
- `/simulador` — Simulador de preços
- `/produto/:supplier/:codigo` — Detalhe do produto

## Setup

```bash
cp .env.example .env
# Preencha .env com credenciais Reval, senha do app e Sentry DSN (opcional)
npm install

# Importar produtos
npm run import-reval
npm run import-ideal

npm run dev
```

### Produção

```bash
npm run build    # minifica JS/CSS para dist/
npm run preview  # serve dist/ com API, cache e auth

# Source maps no Sentry (opcional)
npx @sentry/wizard@latest -i sourcemaps --saas --org rb-software-c9 --project galileu-reval
```

Variáveis `VITE_*` são lidas no build, não no runtime — se mudar o Sentry DSN, rode `npm run build` novamente.

## Autenticação

Tela de login com senha validada server-side. Sessão via cookie httpOnly assinado com HMAC, válida por 24h.

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `REVAL_USER` | Usuário da API Reval (server-side only) |
| `REVAL_PASS` | Senha da API Reval (server-side only) |
| `APP_PASSWORD` | Senha de acesso ao app (default: `password`) |
| `VITE_SENTRY_DSN` | DSN do Sentry (opcional, só ativa em produção) |

## Stack

- React 19 + Vite 8
- TanStack React Query v5
- better-sqlite3
- Sentry
