"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function authError(message: string, next: string): never {
  const params = new URLSearchParams({ error: message, next });
  redirect(`/login?${params.toString()}`);
}

export async function login(formData: FormData) {
  const email = field(formData, "email");
  const password = field(formData, "password");
  const next = safeNext(field(formData, "next"));

  if (!email || !password) {
    authError("Informe email e senha.", next);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    authError("Email ou senha inválidos.", next);
  }

  redirect(next);
}

export async function signup(formData: FormData) {
  const email = field(formData, "email");
  const password = field(formData, "password");
  const next = safeNext(field(formData, "next"));

  if (!email || password.length < 8) {
    authError("Use um email válido e uma senha com pelo menos 8 caracteres.", next);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    authError(error.message, next);
  }

  if (data.session) {
    redirect(next);
  }

  const params = new URLSearchParams({
    message: "Confira seu email para confirmar o cadastro.",
    next
  });
  redirect(`/login?${params.toString()}`);
}
