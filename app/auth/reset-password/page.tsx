import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "./actions";

type ResetPasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/login/recuperar-senha?error=O%20link%20de%20recuperação%20é%20inválido%20ou%20expirou.");
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Mini ERP Cervejaria</p>
        <h1 className="auth-title">Crie uma nova senha.</h1>
        <p className="auth-intro">
          Escolha uma senha com pelo menos 8 caracteres para voltar ao ERP.
        </p>

        {error ? <p className="form-message error">{error}</p> : null}

        <form className="auth-form" action={updatePassword}>
          <label htmlFor="password">Nova senha</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <label htmlFor="password-confirmation">Confirme a nova senha</label>
          <input
            id="password-confirmation"
            name="password_confirmation"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <button className="button primary" type="submit">
            Salvar nova senha
          </button>
        </form>

        <Link className="auth-recovery-link" href="/login">
          Voltar para o login
        </Link>
      </section>
    </main>
  );
}
