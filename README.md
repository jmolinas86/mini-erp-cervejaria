# Mini ERP Cervejaria

Mini ERP para cervejaria caseira, sem modulo fiscal, com foco em estoque, receitas, brassagens simples, custo real e dashboard.

## Status

- Escopo aprovado.
- Fase 2 concluida.
- Supabase criado.
- Fase atual: Fase 3 - Base do sistema.

## Documentos principais

- `outputs/mini_erp_escopo/mini_erp_escopo_cervejaria_fase3.xlsx`: escopo aprovado e acompanhamento por fases atualizado.
- `docs/fase-1-arquitetura.md`: decisoes iniciais de arquitetura, stack, ambientes e padrao de implementacao.
- `docs/fase-2-modelo-dados.md`: modelo de dados inicial e regras de estoque/custo.
- `database/migrations/001_initial_schema.sql`: primeira versao do schema PostgreSQL.
- `database/seed/001_seed_demo.sql`: dados de exemplo para validar o modelo.

## Repositorio

Repositorio GitHub: https://github.com/jmolinas86/mini-erp-cervejaria

## Regras do projeto

- Nao subir arquivos `.env` nem chaves do Supabase.
- Comecar pelo MVP aprovado na planilha.
- Manter vendas e modulo fiscal fora do primeiro ciclo.
- Priorizar uso no celular para operacoes de estoque e brassagem.
