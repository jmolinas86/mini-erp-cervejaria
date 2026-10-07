import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : null;
}

function loginError(message: string, next: string): never {
  const params = new URLSearchParams({ error: message, next });
  redirect(`/login?${params.toString()}`);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const isRecovery =
    request.nextUrl.searchParams.get("flow") === "recovery" ||
    type === "recovery";
  // Links de recuperação devem sempre abrir a troca de senha. Alguns
  // templates do Supabase não preservam o parâmetro `next` no link final.
  const next = isRecovery
    ? "/auth/reset-password"
    : safeNext(request.nextUrl.searchParams.get("next")) ?? "/";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      loginError("Não foi possível confirmar o email. Solicite um novo link.", next);
    }
  } else if (tokenHash && (type === "email" || type === "recovery")) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type
    });

    if (error) {
      loginError("Não foi possível confirmar o email. Solicite um novo link.", next);
    }
  } else {
    loginError("Link de confirmação inválido ou expirado.", next);
  }

  redirect(next);
}
