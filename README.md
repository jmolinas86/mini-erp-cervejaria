# Mini ERP Cervejaria

Mini ERP para cervejaria caseira, sem modulo fiscal, com foco em estoque, receitas, brassagens simples, custo real e dashboard.

## Status

- Escopo aprovado.
- Fase 2 concluida.
- Supabase criado.
- Banco inicial executado no Supabase.
- Fase atual: Fase 9 - Custos, dashboard e relatórios.
- Auth por email e senha configurado com sessões SSR e rotas protegidas.
- Painel inicial autenticado lendo estoque e brassagens do Supabase.

## Documentos principais

- `outputs/mini_erp_escopo/mini_erp_escopo_cervejaria_fase3.xlsx`: escopo aprovado e acompanhamento por fases atualizado.
- `docs/fase-1-arquitetura.md`: decisoes iniciais de arquitetura, stack, ambientes e padrao de implementacao.
- `docs/fase-2-modelo-dados.md`: modelo de dados inicial e regras de estoque/custo.
- `docs/fase-3-base-sistema.md`: status da base web e proximos passos da Fase 3.
- `docs/fase-7-receitas.md`: cadastro de receitas, versões e composição de insumos.
- `docs/fase-8-brassagem.md`: abertura, acompanhamento e finalização de brassagens.
- `docs/fase-9-custos-dashboard.md`: indicadores, custos reais e relatórios operacionais.
- `docs/supabase-conexao.md`: passo a passo para executar e validar o banco no Supabase.
- `database/migrations/001_initial_schema.sql`: primeira versao do schema PostgreSQL.
- `database/migrations/002_supabase_advisor_fixes.sql`: ajustes recomendados pelo Supabase Advisor.
- `database/migrations/008_imagens_itens.sql`: coluna de imagem dos itens e bucket do catálogo no Storage.
- `database/migrations/009_fase8_brassagem_backfill.sql`: prepara consumos de brassagens demonstrativas antigas.
- `database/seed/001_seed_demo.sql`: dados de exemplo para validar o modelo.
- `database/verification/001_check_schema.sql`: consultas para validar se o schema e o seed foram criados corretamente.

## Como rodar localmente

1. Instalar as dependencias:

```bash
pnpm install
```

2. Criar o arquivo `.env.local` com as variaveis do Supabase:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

3. Rodar o app:

```bash
pnpm dev
```

O arquivo `.env.local` nao deve ser enviado ao GitHub.

## Autenticacao

- `/login` permite entrar ou criar uma conta com email e senha.
- `/` e as demais rotas do app exigem uma sessão válida.
- O Proxy renova os cookies de autenticação e valida o JWT com `getClaims()`.
- `POST /auth/signout` encerra a sessão e retorna ao login.
- A home autenticada consulta `vw_saldos_estoque` e `brassagens`.

Se a confirmação de email estiver habilitada no Supabase, o usuário precisa
confirmar o cadastro antes do primeiro acesso. O link retorna para
`/auth/confirm`, que troca o código PKCE por uma sessão SSR.

## Repositorio

Repositorio GitHub: https://github.com/jmolinas86/mini-erp-cervejaria

## Regras do projeto

- Nao subir arquivos `.env` nem chaves do Supabase.
- Usar `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no navegador.
- Nao usar `service_role` ou `secret key` no frontend.
- Comecar pelo MVP aprovado na planilha.
- Manter vendas e modulo fiscal fora do primeiro ciclo.
- Priorizar uso no celular para operacoes de estoque e brassagem.
