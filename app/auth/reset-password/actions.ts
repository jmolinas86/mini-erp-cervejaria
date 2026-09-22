"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function updatePassword(formData: FormData) {
  const password = field(formData, "password");
  const passwordConfirmation = field(formData, "password_confirmation");

  if (password.length < 8) {
    redirect("/auth/reset-password?error=A%20senha%20deve%20ter%20pelo%20menos%208%20caracteres.");
  }

  if (password !== passwordConfirmation) {
    redirect("/auth/reset-password?error=As%20senhas%20não%20conferem.");
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/login/recuperar-senha?error=O%20link%20de%20recuperação%20é%20inválido%20ou%20expirou.");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/auth/reset-password?error=${encodeURIComponent("Não foi possível atualizar a senha. Solicite um novo link.")}`);
  }

  await supabase.auth.signOut();
  redirect("/login?message=Senha%20atualizada%20com%20sucesso.%20Entre%20com%20a%20nova%20senha.");
}
