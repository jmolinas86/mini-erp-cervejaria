# Fase 6 — Estoque

## Entrega

O módulo de estoque permite controlar a posição física por lote e manter o histórico das alterações:

- entrada de compra com criação de lote;
- fornecedor, validade, data de recebimento e custo unitário;
- unidade informada na compra com conversão automática para a unidade-base;
- saída manual, perda, entrada manual e ajustes;
- validação de saldo antes de qualquer saída;
- saldo e status calculados pela view `vw_saldos_estoque`;
- valor estimado do estoque por custo dos lotes;
- histórico recente de movimentações;
- edição do código do lote, validade e saldo desejado, com ajuste automático auditável;

## Como acessar

- `/estoque` — posição atual, formulários de entrada e baixa e auditoria.

As operações exigem autenticação, validam os dados no servidor e registram o usuário autenticado em `criado_por`. Movimentações não são editadas ou apagadas pela interface; correções devem ser feitas com um novo ajuste.

## Critérios atendidos

- lotes identificados por item e código único;
- entradas aumentam o saldo após confirmação;
- saídas não ultrapassam o saldo do lote;
- estoque mínimo e itens vazios destacados;
- filtros por item/lote e status;
- conversão de massa (g/kg) e volume (ml/l), com custo normalizado;
- ajustes de quantidade não sobrescrevem o histórico: uma movimentação de ajuste é criada;
- layout responsivo alinhado às telas de referência do BrewerPro.

O próximo passo é a Fase 7: receitas, versões e composição de insumos.
