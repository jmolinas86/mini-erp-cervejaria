# Módulo de notas de entrada — Fase 2

## Objetivo

Receber o XML autorizado da NF-e/NFC-e, validar sua origem e salvar o documento para conferência sem criar lote, movimentação ou saldo de estoque.

## Fluxo entregue

1. Em **Estoque → Importar NF-e**, o usuário seleciona um XML de até 5 MB.
2. O servidor valida a sintaxe, rejeita declarações externas e exige o protocolo de autorização da SEFAZ com status `100` ou `150`.
3. O sistema extrai cabeçalho, emitente, totais e todas as linhas da nota.
4. A chave de acesso e o hash SHA-256 impedem a importação duplicada.
5. O XML original é guardado no bucket privado `documentos-notas-entrada`.
6. A nota e seus itens são salvos com status `em_conferencia`.
7. Se o fornecedor já possuir CNPJ e mapeamentos cadastrados, os itens conhecidos são vinculados automaticamente.

## Segurança e consistência

- somente usuários autenticados podem inserir, ler ou excluir arquivos do bucket;
- o bucket não é público e limita XML a 5 MB;
- entidades e `DOCTYPE` são rejeitados antes do processamento;
- arquivos sem protocolo de autorização não são aceitos;
- em caso de falha parcial, arquivo, nota e itens são removidos antes de exibir o erro;
- a nota só muda para `em_conferencia` depois que o arquivo e todas as linhas são persistidos;
- nenhuma tabela de lote ou movimentação de estoque é alterada nesta fase.

## Próxima fase

Criar a conferência dos itens: vincular ou cadastrar produtos, escolher unidade de destino e fator de conversão, marcar linhas ignoradas e revisar os totais antes da confirmação.
