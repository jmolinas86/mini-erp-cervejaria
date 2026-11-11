# Módulo de notas de entrada — Fase 3

## Objetivo

Conferir a nota importada antes de qualquer alteração no estoque. A nota permanece com status `em_conferencia`; lotes e movimentações continuam reservados para a Fase 4.

## Fluxo entregue

- acesso à conferência pela lista de notas importadas;
- cadastro do fornecedor usando razão social e CNPJ do XML;
- vínculo com um fornecedor existente, validando divergência de CNPJ;
- pesquisa de itens por código ou por qualquer parte do nome;
- vínculo de cada linha da nota com o item correspondente no HopFlow;
- opção de desvincular um item incorreto, removendo também o mapeamento memorizado para o fornecedor;
- fator de conversão entre a unidade comprada e a unidade interna;
- sugestão automática para unidades diretas e embalagens descritas como `50g`, `500g`, `1kg`, entre outras;
- cálculo imediato da quantidade convertida e do custo por unidade;
- opção de ignorar linhas que não devem gerar estoque;
- cadastro rápido de um novo item sem sair da conferência;
- gravação do mapeamento por fornecedor para reaproveitar nas próximas notas;
- progresso da conferência e indicação de quando a nota está pronta para confirmação.

## Regras

- somente notas com status `em_conferencia` podem ser editadas;
- a unidade de destino é sempre a unidade cadastrada no item;
- quantidade convertida é `quantidade do XML × fator de conversão`;
- custo convertido é `valor líquido da linha ÷ quantidade convertida`;
- fornecedor selecionado não pode ter CNPJ diferente do emitente;
- uma linha é resolvida quando está vinculada e convertida ou quando foi explicitamente ignorada;
- nenhuma operação desta fase cria lote ou movimentação de estoque.

## Próxima fase

Liberar a confirmação da entrada para as notas totalmente conferidas, criando os lotes e as movimentações de estoque de forma idempotente.
