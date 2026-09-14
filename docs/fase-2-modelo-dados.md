# Fase 2 - Modelo de Dados

## Objetivo

Transformar o escopo aprovado em uma primeira versao revisavel do banco PostgreSQL.

Esta fase ainda nao cria as telas. Ela define o esqueleto dos dados que as telas vao usar nas fases seguintes.

## Decisoes usadas

| Pergunta | Decisao |
| --- | --- |
| Fornecedor entra no MVP? | Sim, entra simples |
| Produto acabado fica em estoque separado? | Nao. No MVP sera apenas volume final da brassagem |
| Quando a brassagem desconta estoque? | Ao finalizar a brassagem |

## Arquivos criados

| Arquivo | Uso |
| --- | --- |
| `database/migrations/001_initial_schema.sql` | Cria tabelas, tipos, indices, triggers e views iniciais |
| `database/seed/001_seed_demo.sql` | Insere unidades, itens, lotes, estoque inicial e receita de exemplo |
| `docs/fase-2-modelo-dados.md` | Explica o modelo e as regras principais |

## Tabelas principais

| Tabela | Responsabilidade |
| --- | --- |
| `app_users` | Usuarios do sistema |
| `suppliers` | Fornecedores simples |
| `units` | Unidades de medida |
| `items` | Insumos, embalagens e produtos de referencia |
| `item_lots` | Lotes, validade e custo unitario |
| `stock_movements` | Entradas, baixas, ajustes, consumo e perdas |
| `recipes` | Receitas principais |
| `recipe_versions` | Versoes de uma receita |
| `recipe_inputs` | Insumos previstos por versao da receita |
| `brew_batches` | Brassagens |
| `brew_batch_consumptions` | Consumo previsto e real por brassagem |
| `brew_batch_extra_costs` | Custos extras como embalagem e utilidades |
| `brew_batch_events` | Historico simples de eventos da brassagem |

## Regras importantes

### Fornecedor

Fornecedor entra como cadastro simples. Ele pode ser vinculado ao lote, mas o sistema nao depende dele para funcionar.

Isso permite iniciar simples e ainda manter historico de onde cada lote veio.

### Produto acabado

No MVP, produto acabado nao tera estoque separado.

O resultado da producao fica em `brew_batches.final_volume_liters`. Isso evita criar um segundo controle de estoque antes de termos o fluxo principal validado.

### Desconto de estoque

A brassagem pode registrar consumo durante o processo, mas o saldo do estoque so deve ser baixado quando a brassagem for finalizada.

No banco isso aparece assim:

- `brew_batch_consumptions` guarda o consumo real.
- `stock_movements` recebe o movimento do tipo `batch_consumption`.
- `brew_batches.stock_posted_at` marca quando a baixa foi lançada.

Na fase do app, a acao "Finalizar brassagem" devera:

1. validar se os consumos reais foram informados;
2. criar as baixas em `stock_movements`;
3. preencher `final_volume_liters`;
4. calcular perdas e custo real;
5. marcar `stock_posted_at`;
6. mudar status para `finalized`.

## Views iniciais

| View | Uso |
| --- | --- |
| `v_stock_balances` | Mostra saldo por item e lote, com status de estoque |
| `v_brew_batch_costs` | Calcula perda, custo de insumos, custo extra, custo total e custo por litro |

## Pontos para revisar antes da Fase 3

- Confirmar se as unidades do MVP bastam: kg, g, l, ml, un, pct e cil.
- Confirmar se o campo `reference_cost` em `items` sera usado como custo previsto.
- Confirmar se perdas de estoque fora da brassagem usam `stock_movements.loss`.
- Confirmar se embalagem sera registrada como item de estoque e tambem como custo de envase.

## Criterio de conclusao da Fase 2

A Fase 2 pode ser considerada concluida quando:

- o SQL inicial for revisado;
- as regras de estoque forem aprovadas;
- as regras de custo real forem aprovadas;
- o seed de exemplo representar uma brassagem realista;
- a Fase 3 puder iniciar a base do sistema web.
