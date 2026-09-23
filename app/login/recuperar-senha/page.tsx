import Link from "next/link";
import { requestPasswordReset } from "../actions";

type RecuperarSenhaPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function RecuperarSenhaPage({ searchParams }: RecuperarSenhaPageProps) {
  const { error, message } = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <img className="auth-brand-logo" src="/hopflow-logo.png" alt="HopFlow" />
        <p className="eyebrow">HopFlow · Mini ERP Cervejeiro</p>
        <h1 className="auth-title">Recupere seu acesso.</h1>
        <p className="auth-intro">
          Informe seu email e enviaremos um link para criar uma nova senha.
        </p>

        {error ? <p className="form-message error">{error}</p> : null}
        {message ? <p className="form-message success">{message}</p> : null}

        <form className="auth-form" action={requestPasswordReset}>
          <label htmlFor="recovery-email">Email</label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="voce@exemplo.com"
          />
          <button className="button primary" type="submit">
            Enviar link de recuperação
          </button>
        </form>

        <Link className="auth-recovery-link" href="/login">
          Voltar para o login
        </Link>
      </section>
    </main>
  );
}
