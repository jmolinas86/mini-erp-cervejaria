alter table public.versoes_receitas
  add column eficiencia_percentual numeric(5, 2)
  check (eficiencia_percentual is null or (eficiencia_percentual >= 0 and eficiencia_percentual <= 100));
