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

## Proximo passo

Banco inicial executado no Supabase:

1. `database/migrations/001_initial_schema.sql`
2. `database/migrations/002_supabase_advisor_fixes.sql`
3. `database/migrations/003_traduzir_modelo_para_portugues.sql`
4. `database/migrations/004_traduzir_nomes_internos.sql`
5. `database/seed/001_seed_demo.sql`
6. `database/verification/001_check_schema.sql`

Proxima entrega da Fase 3: validar uma consulta real do app usando usuario autenticado e iniciar o login.

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
