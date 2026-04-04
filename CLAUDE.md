# Galileu

## Regras absolutas

- **NUNCA apagar o token cacheado** (`cache/token.json`). O token só pode ser sobrescrito quando estiver expirado. Nunca deletar, nunca remover em cache clear, nunca.
- O cache clear (`/cached-api/clear`) só limpa `cache/api/` e `cache/images/`. O token fica intocado.
- O `fetchToken` só deve ser chamado quando o token não existe ou está expirado. Nunca force refresh sem motivo.
