# Fase 2 - Modelo de Dados

## Status

Fase 2 concluida em 14/09/2026.

O projeto Supabase ja foi criado. A execucao e validacao do SQL no banco ficam como primeiro passo pratico da Fase 3, junto com a base do sistema web.

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
| `database/migrations/003_traduzir_modelo_para_portugues.sql` | Traduz tabelas, colunas, tipos e views para portugues |
| `database/migrations/004_traduzir_nomes_internos.sql` | Traduz constraints, indices, triggers e policies para portugues |
| `database/seed/001_seed_demo.sql` | Insere unidades, itens, lotes, estoque inicial e receita de exemplo |
| `docs/fase-2-modelo-dados.md` | Explica o modelo e as regras principais |

## Tabelas principais

| Tabela | Responsabilidade |
| --- | --- |
| `usuarios_app` | Usuarios do sistema |
| `fornecedores` | Fornecedores simples |
| `unidades` | Unidades de medida |
| `itens` | Insumos, embalagens e produtos de referencia |
| `lotes_itens` | Lotes, validade e custo unitario |
| `movimentacoes_estoque` | Entradas, baixas, ajustes, consumo e perdas |
| `receitas` | Receitas principais |
| `versoes_receitas` | Versoes de uma receita |
| `insumos_receita` | Insumos previstos por versao da receita |
| `brassagens` | Brassagens |
| `consumos_brassagem` | Consumo previsto e real por brassagem |
| `custos_extras_brassagem` | Custos extras como embalagem e utilidades |
| `eventos_brassagem` | Historico simples de eventos da brassagem |

## Regras importantes

### Fornecedor

Fornecedor entra como cadastro simples. Ele pode ser vinculado ao lote, mas o sistema nao depende dele para funcionar.

Isso permite iniciar simples e ainda manter historico de onde cada lote veio.

### Produto acabado

No MVP, produto acabado nao tera estoque separado.

O resultado da producao fica em `brassagens.volume_final_litros`. Isso evita criar um segundo controle de estoque antes de termos o fluxo principal validado.

### Desconto de estoque

A brassagem pode registrar consumo durante o processo, mas o saldo do estoque so deve ser baixado quando a brassagem for finalizada.

No banco isso aparece assim:

- `consumos_brassagem` guarda o consumo real.
- `movimentacoes_estoque` recebe o movimento do tipo `consumo_brassagem`.
- `brassagens.estoque_baixado_em` marca quando a baixa foi lançada.

Na fase do app, a acao "Finalizar brassagem" devera:

1. validar se os consumos reais foram informados;
2. criar as baixas em `movimentacoes_estoque`;
3. preencher `volume_final_litros`;
4. calcular perdas e custo real;
5. marcar `estoque_baixado_em`;
6. mudar status para `finalizada`.

## Views iniciais

| View | Uso |
| --- | --- |
| `vw_saldos_estoque` | Mostra saldo por item e lote, com status de estoque |
| `vw_custos_brassagem` | Calcula perda, custo de insumos, custo extra, custo total e custo por litro |

## Pontos para revisar antes da Fase 3

- Confirmar se as unidades do MVP bastam: kg, g, l, ml, un, pct e cil.
- Confirmar se o campo `custo_referencia` em `itens` sera usado como custo previsto.
- Confirmar se perdas de estoque fora da brassagem usam `movimentacoes_estoque.tipo_movimentacao = 'perda'`.
- Confirmar se embalagem sera registrada como item de estoque e tambem como custo de envase.
- Executar e validar o SQL inicial no Supabase criado.

## Criterio de conclusao da Fase 2

A Fase 2 pode ser considerada concluida quando:

- o SQL inicial for revisado;
- as regras de estoque forem aprovadas;
- as regras de custo real forem aprovadas;
- o seed de exemplo representar uma brassagem realista;
- a Fase 3 puder iniciar a base do sistema web.
