# Conexao com Supabase

## Status atual

- Projeto Supabase criado.
- URL local configurada em `.env.local`.
- Publishable key local configurada em `.env.local`.
- `.env.local` esta ignorado pelo Git.
- App Next.js compila com a configuracao local.
- Schema inicial executado no Supabase.
- Seed demonstrativo executado no Supabase.
- Ajustes do Supabase Advisor executados.
- Advisor de seguranca sem alertas apos a correcao.

## Como executar o banco pela primeira vez

Como a publishable key e uma chave de navegador, ela nao pode criar tabelas. Para criar o banco, use o SQL Editor do Supabase ou conecte o Supabase MCP ao Codex.

### Opcao 1: SQL Editor do Supabase

1. Abrir o projeto no Supabase.
2. Ir em SQL Editor.
3. Criar uma nova query.
4. Copiar e executar o conteudo de `database/migrations/001_initial_schema.sql`.
5. Criar outra query.
6. Copiar e executar o conteudo de `database/migrations/002_supabase_advisor_fixes.sql`.
7. Criar outra query.
8. Copiar e executar o conteudo de `database/seed/001_seed_demo.sql`.
9. Copiar e executar o conteudo de `database/verification/001_check_schema.sql`.

Se a ultima query mostrar unidades, estoque e uma brassagem demonstrativa, o banco inicial esta pronto.

## Validacao feita em 14/09/2026

- Projeto localizado: `ERP_cervejaria`.
- Projeto ativo e saudavel.
- PostgreSQL: 17.6.
- Tabelas publicas criadas: 13.
- Todas as tabelas publicas com RLS ativo.
- Unidades demonstrativas criadas: 7.
- Itens demonstrativos criados: 4.
- Lotes demonstrativos criados: 4.
- Movimentos iniciais de estoque criados: 4.
- Receita demonstrativa criada: `IPA Citra 20 L`.
- Brassagem demonstrativa criada: `BR-0001`.
- Advisor de seguranca: sem alertas.

O Advisor de performance ainda pode mostrar indices como nao usados. Isso e esperado em banco recem-criado, antes de uso real pelo app.

### Opcao 2: Supabase MCP no Codex

Esta opcao permite que o Codex execute e valide SQL direto no projeto Supabase.

1. Configurar o MCP do Supabase.
2. Autenticar no navegador com sua conta Supabase.
3. Reabrir ou recarregar a sessao do Codex.
4. Confirmar que o projeto aparece para execucao de SQL.

## Regra de seguranca

No frontend usamos somente:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Nao usar no navegador:

```text
service_role
secret key
senha do banco
connection string direta
```

## Modelo de acesso do MVP

O schema inicial ativa RLS nas tabelas publicas.

No MVP, apenas usuarios autenticados conseguem acessar os dados operacionais. Como a primeira versao e para uso caseiro, as tabelas operacionais usam acesso simples para qualquer usuario autenticado. Antes de abrir cadastro publico para outras pessoas, devemos evoluir isso para permissao por dono, cervejaria ou equipe.
