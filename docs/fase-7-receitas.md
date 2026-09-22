# Fase 7 — Receitas, versões e composição

## Objetivo

Disponibilizar o cadastro de receitas da cervejaria, com versões independentes e os insumos previstos para cada etapa da produção.

## Entregas

- Cadastro de receita com nome, estilo, volume previsto e parâmetros de OG, FG, ABV e IBU.
- Criação automática da versão inicial da receita.
- Criação de novas versões sem alterar versões já utilizadas.
- Composição de insumos e embalagens por versão, incluindo etapa, quantidade, ordem e observação.
- Agrupamento visual de maltes, lúpulos, leveduras/aditivos e embalagens.
- Edição e remoção de insumos da composição.
- Ativação e inativação da receita.
- Acesso pelo menu **Receitas** e pela rota autenticada `/receitas`.
- Interface responsiva seguindo o tema visual do ERP.

## Regras aplicadas

- Apenas itens ativos do tipo ingrediente podem ser incluídos na composição.
- As etapas permitidas são planejamento, mostura, fervura, fermentação e envase.
- A quantidade precisa ser maior que zero.
- OG e FG devem estar entre 0,900 e 2,000; ABV e IBU não podem ser negativos.
- Todas as alterações são executadas no Supabase com o usuário autenticado.

## Próximo passo

Integrar a receita selecionada à ordem de brassagem, calculando o consumo previsto e o custo estimado antes do início da produção.
