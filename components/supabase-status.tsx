"use client";

import { supabaseConfig } from "@/lib/supabase/config";

export function SupabaseStatus() {
  const configured = supabaseConfig.isConfigured;

  return (
    <section className="supabase-card">
      <div className="supabase-card-content">
        <div>
          <p className="supabase-kicker">Supabase</p>
          <h2 className="supabase-title">Conexão preparada</h2>
          <p className="supabase-text">
            As variáveis locais do Supabase foram configuradas. O próximo passo
            é executar o SQL da Fase 2 no banco e validar a primeira consulta.
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
