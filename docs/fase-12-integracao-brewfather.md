# Fase 12 — Integração com Brewfather

## Entrega atual

O HopFlow agora possui uma tela em **Cadastros → Brewfather** para consultar e importar o inventário pessoal do Brewfather pela API oficial v2.

Também existe a opção **Captura assistida da tela** em `/integracoes/brewfather/captura`. Ela aceita conteúdo copiado da tela do Brewfather em texto tabular, CSV/TSV ou JSON, mostra uma prévia e só grava após a confirmação.

São consultadas as coleções de:

- fermentáveis (maltes);
- lúpulos;
- leveduras;
- miscelâneas, incluindo sais e outros aditivos.

## Configuração

1. No Brewfather, gere uma API key com o escopo `inventory.read`.
2. No ambiente do HopFlow, configure:

   ```env
   BREWFATHER_USER_ID=seu_user_id
   BREWFATHER_API_KEY=sua_api_key
   ```

3. Reinicie a aplicação e abra **Cadastros → Brewfather**.

As credenciais são lidas somente no servidor e nunca recebem o prefixo `NEXT_PUBLIC_`.

## Como a importação funciona

- a consulta mostra uma prévia antes de qualquer gravação;
- itens já importados são reconhecidos por coleção e ID externo;
- itens com o mesmo nome de um cadastro existente também ficam bloqueados para evitar duplicidade;
- o código numérico do HopFlow é gerado automaticamente para cada item novo;
- o grupo é mapeado para Malte, Lúpulo, Levedura ou Diversos;
- o saldo pode ser importado opcionalmente;
- quando o Brewfather não informa custo, o lote recebe custo zero e uma observação para revisão manual.

O Brewfather informa unidades métricas; fermentáveis são convertidos de gramas para quilogramas no cadastro do HopFlow. A API lista os itens pessoais do inventário, não todos os ingredientes globais que nunca foram adicionados à conta.

## Próxima evolução

Depois de validar a captura, podemos adicionar leitura automatizada da paginação da tela, edição do mapeamento de grupo/unidade e importação de receitas.
