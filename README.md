# Galileu

Catálogo de produtos da Reval através da API Reval, para a Papelaria Galileu.

## Como funciona

O app é um **proxy com cache em disco** — todas as chamadas passam pelo servidor Vite, que cacheia as respostas em `cache/`:

- **API**: cache de 12h (produtos, categorias, fornecedores, licenças)
- **Imagens**: cache de 1 semana no servidor + cache do browser (30 dias)
- **Token Reval**: cacheado até expirar, não é deletado no clear
- O cache é preenchido automaticamente na primeira request (miss) e serve do disco nas seguintes (hit)
- O botão "Limpar cache" limpa `cache/api/` e re-cacheia os produtos automaticamente (imagens não são limpas)

## Autenticação

O app tem uma tela de login com senha. A senha é validada server-side e nunca chega ao código do front.

- Sessão via cookie httpOnly assinado com HMAC, válida por 24h
- Quando a sessão expira, o app volta automaticamente pra tela de login

## URLs

O estado da aplicação é refletido na URL:

- `/` — Busca de produtos
- `/fornecedores` — Lista de fornecedores
- `/fornecedores/Marca` — Produtos de um fornecedor
- `/listas` — Lista de listas
- `/listas/D%20-%20ESPORTES` — Produtos de uma lista
- `/produto/088590` — Detalhe do produto

## Setup

```bash
cp .env.example .env
# Preencha .env com suas credenciais Reval e senha do app
npm install
npm run dev
```

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `REVAL_USER` | Usuário da API Reval (server-side only) |
| `REVAL_PASS` | Senha da API Reval (server-side only) |
| `APP_PASSWORD` | Senha de acesso ao app (default: `galileu`) |

## Stack

- React + Vite
- React Query
- Plugin Vite customizado (`vite-reval-cache.js`) para autenticação, cache e proxy
