# Fase 5 — Cadastros básicos

## Entrega

Esta fase disponibiliza os cadastros necessários para alimentar estoque e receitas:

- **Itens**: ingredientes, embalagens e produtos acabados;
- **Fornecedores**: nome, contato, e-mail, telefone e observações;
- **Unidades**: catálogo padrão consultado pelos itens (kg, g, l, ml, pct, un e cilindro).

Os cadastros de itens e fornecedores permitem criar, editar e inativar registros. A inativação é reversível e preserva o histórico. O acesso exige autenticação e as operações usam as políticas RLS do Supabase.

## Como acessar

- `/cadastros` — hub da fase e contadores;
- `/cadastros/itens` — catálogo de itens, busca e manutenção;
- `/cadastros/fornecedores` — fornecedores, busca e manutenção.

## Critérios atendidos

- cadastro de insumos, embalagens e produtos acabados;
- unidade e estoque mínimo por item;
- custo de referência opcional;
- fornecedor simples para rastreabilidade de compras;
- layout responsivo com o tema visual definido para o ERP;
- validação de autenticação, tipo de item, valores não negativos e e-mail.

O próximo passo é a Fase 6: lotes, entradas e movimentações de estoque.
