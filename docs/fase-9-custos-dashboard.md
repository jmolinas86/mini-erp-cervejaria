# Fase 9 — Custos, dashboard e relatórios

## Objetivo

Consolidar os dados de estoque e produção em uma visão operacional simples, com custo real por brassagem e por litro.

## Entregas realizadas

- Painel inicial redesenhado com o tema visual aprovado.
- Indicadores de estoque crítico, custo médio por litro, brassagens abertas e perdas médias.
- Gráfico de produção mensal dos últimos seis meses.
- Gráfico de evolução do custo por litro.
- Alertas de estoque abaixo do mínimo e brassagens abertas há vários dias.
- Lista das últimas movimentações de estoque.
- Lista de próximas ações operacionais.
- Nova rota `/relatorios` com abas de custos, produção e estoque.
- Relatório de custos por brassagem, volume produzido e perda.
- Relatório de histórico de produção.
- Relatório de posição do estoque por lote.
- Botões de impressão pelo navegador.
- Navegação de Custos e Relatórios ativada no menu principal.

## Regras

- Os cálculos usam as views existentes `vw_saldos_estoque` e `vw_custos_brassagem`.
- O custo real considera consumos confirmados e custos extras registrados na brassagem.
- A perda percentual é calculada apenas quando existe volume final.
- A fase não cria estoque separado de produto acabado.
- Nenhuma alteração de schema foi necessária nesta entrega.

## Validação

- `pnpm typecheck` concluído.
- `pnpm build` concluído com as rotas `/` e `/relatorios`.
- Painel validado com dados do Supabase.
- Relatório de custos validado com a brassagem finalizada `BR-0002`.

## Próximo passo

Validar os indicadores com o usuário e, se necessário, incluir filtros por período e exportação CSV/PDF em uma etapa complementar.
