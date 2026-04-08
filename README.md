# Galileu

Catálogo de produtos da Papelaria Galileu, consumindo a API Reval.

## Como funciona

Os dados da API Reval são pouco mutáveis, então o app atua como um **proxy com cache em disco** — todas as chamadas passam pelo servidor Vite, que cacheia as respostas em `cache/`:

- **API**: cache de 12h (produtos, categorias, fornecedores, licenças)
- **Imagens**: cache de 72h no disco
- **Token**: cacheado até expirar, nunca é deletado no clear
- O cache é preenchido automaticamente na primeira request (miss) e serve do disco nas seguintes (hit)
- O botão "Limpar cache" limpa `cache/api/` e `cache/images/` e re-cacheia os produtos automaticamente

## Setup

```bash
cp .env.example .env
# Preencha .env com suas credenciais Reval
npm install
npm run dev
```

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `REVAL_USER` | Usuário da API Reval (server-side) |
| `REVAL_PASS` | Senha da API Reval (server-side) |
| `VITE_REVAL_USER` | Mesmo valor de `REVAL_USER`, exposto ao client para parâmetros de query |

## Stack

- React + Vite
- React Query
- Vite plugin custom (`vite-reval-cache.js`) para proxy + cache
