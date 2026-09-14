"use client";

import { supabaseConfig } from "@/lib/supabase/config";

export function SupabaseStatus() {
  const configured = supabaseConfig.isConfigured;

  return (
    <section className="supabase-card">
      <div className="supabase-card-content">
        <div>
          <p className="supabase-kicker">Supabase</p>
          <h2 className="supabase-title">Conexão ativa</h2>
          <p className="supabase-text">
            O app está configurado para usar Supabase Auth, sessão SSR por
            cookies e consultas autenticadas no banco PostgreSQL.
          </p>
        </div>

        <div
          className={`status-pill ${configured ? "configured" : "pending"}`}
        >
          {configured ? "Configurado" : "Pendente"}
        </div>
      </div>
    </section>
  );
}
