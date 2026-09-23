# Fase 10 — Finalização e preparação do MVP

## Entregas realizadas

- Filtro de período funcional no painel: últimos 6 meses ou último ano.
- Exportação CSV autenticada para custos, produção e estoque.
- Botão de impressão dos relatórios pelo navegador.
- Índices de performance para as referências de item e grupo adicionados na migration `010_fase10_indices_relatorios.sql`.
- Revisão dos alertas do Supabase Advisor.
- Documentação de configuração para publicação e operação do MVP.

## Segurança e performance

- As rotas de dashboard e relatórios exigem sessão autenticada.
- As consultas usam as views existentes com RLS do Supabase.
- O Advisor não apresenta mais alertas de chaves estrangeiras sem índice.
- O Advisor ainda aponta a proteção contra senhas vazadas desativada; essa opção deve ser habilitada no painel do Supabase em Authentication > Password Security.
- Os avisos de índices não utilizados são informativos e devem ser reavaliados somente depois de uso real do sistema.

## Checklist de publicação

1. Criar um projeto de hospedagem (Vercel ou Render) conectado ao GitHub.
2. Configurar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SITE_URL`.
3. Configurar o endereço de confirmação de e-mail no Supabase Auth.
4. Habilitar proteção contra senhas vazadas.
5. Executar um cadastro, uma entrada de estoque, uma receita e uma brassagem de teste.
6. Conferir o relatório de custo e o CSV gerado.
7. Configurar backup automático do projeto Supabase.

## Validação

- `pnpm typecheck` concluído.
- `pnpm build` concluído com `/`, `/relatorios` e `/relatorios/exportar`.
- Filtro anual validado no painel.
- Relatórios validados com os dados reais do Supabase.

## Pendências externas

- Publicar o aplicativo em uma hospedagem escolhida pelo usuário.
- Habilitar a proteção contra senhas vazadas no painel do Supabase.
- Definir domínio, política de backup e usuários iniciais.
