import { login, signup } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message, next = "/" } = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Mini ERP Cervejaria</p>
        <h1 className="auth-title">Acesse sua operação.</h1>
        <p className="auth-intro">
          Entre com sua conta ou crie um acesso para continuar.
        </p>

        {error ? <p className="form-message error">{error}</p> : null}
        {message ? <p className="form-message success">{message}</p> : null}

        <form className="auth-form">
          <input type="hidden" name="next" value={next} />
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />

          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
          />

          <div className="auth-actions">
            <button formAction={login} className="button primary">
              Entrar
            </button>
            <button formAction={signup} className="button secondary">
              Criar conta
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
