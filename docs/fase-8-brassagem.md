# Fase 8 — Brassagem simples

## Objetivo

Abrir uma produção a partir de uma versão de receita, acompanhar suas etapas e registrar o consumo real por lote.

## Entregas

- Rota autenticada `/brassagens` com abertura de uma brassagem por receita e versão.
- Geração automática do número `BR-0001`, `BR-0002` e assim por diante.
- Cópia dos insumos previstos da versão para os consumos da brassagem.
- Rota autenticada `/brassagens/[id]` com resumo da receita, volume e status.
- Atualização das etapas planejamento, mostura, fervura, fermentação e envase.
- Seleção do lote e registro da quantidade real consumida.
- Sugestão automática do lote mais antigo com saldo (FIFO), exibindo lote e quantidade prevista.
- Confirmação do consumo por checkbox, sem exigir redigitação da quantidade.
- Registro de eventos operacionais na linha do tempo.
- Finalização com volume final e baixa dos consumos no estoque.
- Baixa de estoque somente no encerramento, conforme decisão do MVP.
- Acesso à brassagem diretamente pela tela de receitas.

## Regras aplicadas

- Uma brassagem mantém a versão de receita usada, mesmo que a receita receba novas versões depois.
- A finalização exige lote e quantidade real para todos os consumos previstos.
- A quantidade consumida não pode ultrapassar o saldo atual do lote.
- A baixa usa o tipo `consumo_brassagem` e fica vinculada ao consumo e à brassagem.
- Uma brassagem finalizada não pode ser alterada novamente.
- Se uma baixa falhar durante a finalização, as baixas já criadas são revertidas.

## Validação

- `pnpm typecheck` concluído.
- `pnpm build` concluído com as rotas `/brassagens` e `/brassagens/[id]`.
- Próximo teste funcional: abrir uma brassagem com uma receita que tenha estoque, registrar os lotes, finalizar e conferir a movimentação na tela de estoque.
