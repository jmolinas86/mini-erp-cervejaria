# Fase 3 - Base do Sistema

## Objetivo

Criar a base web do Mini ERP e conectar o app ao Supabase.

## Status

- Branch criada: `fase-3-base-sistema`.
- App Next.js criado.
- Cliente Supabase criado.
- Variaveis locais configuradas.
- Build validado.
- Banco executado e validado no Supabase.
- Login por email e senha implementado.
- Rotas protegidas com `proxy.ts`.
- Consulta autenticada ao Supabase validada.
- Painel inicial pós-login criado.

## Entregas iniciais

| Entrega | Status |
| --- | --- |
| Base Next.js | Concluida |
| Cliente Supabase | Concluido |
| Variaveis de ambiente | Concluidas localmente |
| SQL com RLS | Preparado |
| Seed demonstrativo | Preparado |
| Query de validacao | Preparada |
| Execucao no Supabase | Concluida |
| Ajustes do Supabase Advisor | Concluidos |
| Tradução de tabelas e colunas | Concluida |
| Login e cadastro | Implementados |
| Proteção de rotas | Validada |
| Consulta real autenticada | Validada |
| Painel inicial pós-login | Criado |

## Proximo passo

Banco inicial executado no Supabase:

1. `database/migrations/001_initial_schema.sql`
2. `database/migrations/002_supabase_advisor_fixes.sql`
3. `database/migrations/003_traduzir_modelo_para_portugues.sql`
4. `database/migrations/004_traduzir_nomes_internos.sql`
5. `database/seed/001_seed_demo.sql`
6. `database/verification/001_check_schema.sql`

Proxima entrega da Fase 3: teste manual do primeiro usuario real no navegador e fechamento da fase.

Como a confirmação de email esta habilitada no Supabase, o cadastro cria o usuario mas exige confirmação por email antes do primeiro login. Para teste automatico, a criação do usuario técnico funcionou ate essa barreira de confirmação.

## Tradução do banco

A migração `003_traduzir_modelo_para_portugues.sql` deixou o modelo em portugues para facilitar leitura no Supabase e no codigo.

Foram traduzidos:

- tabelas;
- colunas;
- tipos enum;
- valores dos enums;
- views de saldo e custo.
- constraints, indices, triggers e policies.

Os nomes continuam sem acentos para evitar problemas em SQL, APIs e TypeScript.

## Login e painel inicial

A base web agora tem:

- `/login` para entrar ou criar conta com email e senha;
- `/auth/signout` para sair;
- `proxy.ts` protegendo a home e demais rotas privadas;
- home autenticada consultando `vw_saldos_estoque` e `brassagens`;
- cards de resumo para itens com saldo, estoque critico e brassagens abertas;
- tabela inicial de saldos por lote;
- lista de brassagens recentes.

Validacoes executadas:

- `pnpm typecheck`;
- `pnpm build`;
- acesso sem sessão redireciona para `/login?next=%2F`;
- consulta com papel `authenticated` e `auth.uid()` simulado retorna saldos e brassagens no Supabase.
