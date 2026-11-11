# Módulo de notas de entrada — Fase 1

## Objetivo

Preparar o banco para receber documentos de compra sem alterar o funcionamento da entrada manual de estoque. Esta fase não cria lotes ou movimentações automaticamente; isso será feito somente após conferência e confirmação em uma fase posterior.

## Estruturas criadas

### `notas_entrada`

Armazena o cabeçalho e a origem do documento:

- fornecedor vinculado e dados do emitente preservados como fotografia da nota;
- origem XML, PDF ou manual;
- chave de acesso, modelo, número, série e emissão;
- totais de produtos, frete, seguro, desconto, outras despesas e nota;
- referência ao arquivo original e hash SHA-256;
- estados `rascunho`, `em_conferencia`, `confirmada`, `cancelada` e `revertida`;
- usuário e data de criação, confirmação ou cancelamento.

A chave de acesso é única. Para documentos sem chave, a combinação CNPJ, modelo, série e número também impede duplicidade.

### `itens_notas_entrada`

Preserva cada linha recebida do documento e prepara sua conversão para o estoque:

- código e descrição usados pelo fornecedor;
- EAN/GTIN, NCM e CFOP quando disponíveis;
- quantidade, unidade e valores originais;
- valor líquido calculado da linha;
- item e unidade interna vinculados;
- fator de conversão, quantidade convertida e custo unitário convertido;
- futuro vínculo com lote e movimentação de estoque;
- opção de ignorar uma linha durante a conferência.

### `mapeamentos_itens_fornecedores`

Guarda o vínculo entre o código usado por um fornecedor e o item correspondente no HopFlow. Assim, depois da primeira conferência, futuras notas podem sugerir automaticamente o item e a conversão já utilizados.

### `fornecedores.cnpj`

O fornecedor passa a aceitar CNPJ normalizado com 14 dígitos, único quando informado. Isso permitirá localizar ou sugerir o fornecedor durante a leitura do XML.

## Regras definidas

- nenhum documento cria estoque enquanto estiver em rascunho ou conferência;
- quantidades devem ser positivas e valores não podem ser negativos;
- CNPJ, chave de acesso, NCM, CFOP e hash possuem validação de formato;
- uma nota confirmada deve registrar a data de confirmação;
- cancelamentos e reversões exigem data e motivo;
- tabelas expostas possuem RLS e acesso somente para usuários autenticados;
- todas as chaves estrangeiras usadas em consultas possuem índice adequado.

## Próxima fase

Construir o importador de XML da NF-e, validar o arquivo e salvar a nota inicialmente como `em_conferencia`, sem movimentar o estoque.
