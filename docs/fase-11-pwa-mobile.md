# Fase 11 — Experiência móvel e PWA

## Objetivo

Permitir que o Mini ERP seja instalado no celular como um aplicativo, mantendo a mesma base web e o acesso autenticado ao Supabase.

## Entregas

- Manifesto PWA com nome, ícone, cores e modo standalone.
- Ícone HopFlow da marca para a instalação.
- Botão contextual “Instalar no celular”, exibido quando o navegador oferece instalação.
- Detecção de aplicativo já instalado para não repetir o convite.
- Navegação e painéis preservados em modo responsivo.

## Como testar

1. Rode o sistema com `pnpm dev` ou abra a versão publicada em HTTPS.
2. Acesse o painel usando Chrome ou Edge no celular.
3. Use o botão **Instalar no celular** quando ele aparecer, ou o menu do navegador **Adicionar à tela inicial**.
4. Abra o ícone instalado e confirme que o sistema abre em modo aplicativo.

## Observações

- A instalação depende do navegador e, em produção, de HTTPS.
- O login continua sendo controlado pelo Supabase; nenhuma credencial é armazenada no dispositivo pela aplicação.
- O modo offline completo não foi ativado nesta etapa para evitar cache de dados autenticados e informações de estoque.

## Validação

- Manifesto e ícone adicionados ao build Next.js.
- Botão de instalação integrado ao cabeçalho autenticado.
- `pnpm typecheck` e `pnpm build` devem ser executados antes da publicação.
