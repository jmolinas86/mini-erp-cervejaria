"use client";

import { removerReceita } from "@/app/receitas/actions";
import type { FormEvent } from "react";

export function RecipeDeleteButton({ id, nome }: { id: string; nome: string }) {
  function confirmar(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(`Apagar a receita “${nome}”? Essa ação não pode ser desfeita.`)) event.preventDefault();
  }

  return <form action={removerReceita} onSubmit={confirmar} className="recipe-delete-form"><input type="hidden" name="id" value={id} /><button className="recipe-delete-button" type="submit" aria-label={`Apagar receita ${nome}`} title="Apagar receita"><img src="/icons/hopflow-trash.png" alt="" aria-hidden="true" /></button></form>;
}
