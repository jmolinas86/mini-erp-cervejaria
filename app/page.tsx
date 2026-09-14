import { SupabaseStatus } from "@/components/supabase-status";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="page-content">
        <div>
          <p className="eyebrow">Mini ERP Cervejaria</p>
          <h1>Base da Fase 3 iniciada.</h1>
          <p className="intro">
            O projeto web já está preparado para usar o Supabase como banco,
            autenticação e API do Mini ERP.
          </p>
        </div>

        <div className="card-grid">
          <div className="dark-card">
            <p className="card-label">Próximo módulo</p>
            <p className="card-title">Login</p>
            <p className="card-text">Email e senha com Supabase Auth.</p>
          </div>
          <div className="dark-card">
            <p className="card-label">Primeiro fluxo</p>
            <p className="card-title">Estoque</p>
            <p className="card-text">Itens, lotes e movimentações.</p>
          </div>
          <div className="dark-card">
            <p className="card-label">Meta do MVP</p>
            <p className="card-title">Custo real</p>
            <p className="card-text">
              Custo por brassagem e por litro produzido.
            </p>
          </div>
        </div>

        <SupabaseStatus />
      </section>
    </main>
  );
}
