# Fase 1 - Arquitetura Inicial

## Objetivo

Definir a base tecnica do Mini ERP antes de iniciar o codigo de produto. Esta fase organiza a stack, os ambientes, a estrutura do repositorio e as decisoes que vao orientar as proximas fases.

## Decisoes aprovadas

| Tema | Decisao |
| --- | --- |
| Tipo de sistema | Aplicacao web responsiva, com boa usabilidade no computador e no celular |
| Banco de dados | PostgreSQL 17 |
| Backend inicial | Supabase para banco, autenticacao e APIs |
| Modulo fiscal | Fora do escopo |
| Vendas | Fora do MVP inicial |
| Brassagem | Controle simples de estado e desconto de estoque |
| Custo real | Calculo por brassagem usando consumo real, perdas, envase, utilidades e volume final |
| Git | Repositorio GitHub privado/publico conforme configurado pelo usuario |

## Stack recomendada

| Camada | Escolha |
| --- | --- |
| Aplicacao | Next.js com TypeScript |
| UI | React, Tailwind CSS e componentes proprios |
| Banco | PostgreSQL 17 |
| Plataforma de dados | Supabase |
| Autenticacao | Supabase Auth com email e senha |
| Deploy futuro | Vercel, Cloudflare Pages ou Supabase hosting compatível, a definir depois |
| Controle de versao | Git e GitHub |

## Por que esta stack

Next.js com TypeScript da uma base boa para web, mobile responsivo e evolucao futura. Supabase reduz o trabalho inicial de backend porque ja entrega PostgreSQL, autenticacao e APIs. Para um Mini ERP caseiro, isso evita criar infraestrutura cedo demais.

## Modulos do MVP

| Modulo | Responsabilidade |
| --- | --- |
| Cadastros | Itens, insumos, embalagens, produtos e unidades |
| Estoque | Lotes, entradas, baixas, ajustes, perdas e saldo atual |
| Receitas | Receitas versionadas com rendimento previsto |
| Brassagens | Estado de producao, receita usada e desconto de estoque |
| Custo real | Consumo real, envase, utilidades, perdas e custo por litro |
| Dashboard | Alertas, estoque critico, brassagens abertas, custo e perdas |
| Mobile | Operacoes rapidas no celular |

## Estrutura inicial planejada

```text
.
├── app/
│   ├── dashboard/
│   ├── estoque/
│   ├── receitas/
│   ├── brassagens/
│   ├── custos/
│   └── configuracoes/
├── components/
│   ├── layout/
│   ├── forms/
│   ├── tables/
│   └── ui/
├── lib/
│   ├── supabase/
│   ├── formatters/
│   └── validations/
├── database/
│   ├── migrations/
│   └── seed/
├── docs/
└── outputs/
```

Esta estrutura sera criada na fase de base do sistema. Nesta Fase 1 ela fica como referencia.

## Ambiente

| Ambiente | Uso |
| --- | --- |
| Local | Desenvolvimento e testes na maquina |
| Supabase teste | Banco e autenticacao durante o MVP |
| Producao | Somente depois que o MVP estiver validado |

## Variaveis sensiveis

As credenciais devem ficar em `.env.local`, que nao deve entrar no Git. Um arquivo `.env.example` pode ser criado depois com nomes das variaveis, sem valores reais.

Variaveis previstas:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

A chave `SUPABASE_SERVICE_ROLE_KEY` deve ser usada apenas em rotinas seguras no servidor, nunca no navegador.

## Fluxo de Git

| Branch | Uso |
| --- | --- |
| main | Versao principal e estavel |
| fase-2-modelo-dados | Trabalho da proxima fase |
| feature/... | Alteracoes especificas quando o projeto crescer |

No inicio, podemos trabalhar com commits pequenos e diretos. Quando o app ganhar mais codigo, vale usar branches por fase.

## Criterio de conclusao da Fase 1

A Fase 1 pode ser considerada concluida quando:

- stack definida;
- estrategia de ambientes definida;
- estrutura inicial planejada;
- regras de seguranca para credenciais definidas;
- planilha atualizada marcando Fase 0 concluida e Fase 1 em andamento ou aprovada.

## Proxima fase

Fase 2 - Modelo de dados.

Objetivo: transformar o escopo aprovado em tabelas, relacionamentos e primeiro script SQL do PostgreSQL.
