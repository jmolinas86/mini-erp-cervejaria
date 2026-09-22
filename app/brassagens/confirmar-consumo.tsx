"use client";

import { salvarConsumo } from "./actions";

type ConfirmarConsumoProps = {
  idConsumo: string;
  idBrassagem: string;
  idLote: string;
  loteLabel: string;
  saldoLabel: string;
  quantidade: number;
  unidade: string;
  confirmado: boolean;
  bloqueado?: boolean;
  compact?: boolean;
};

export function ConfirmarConsumo({ idConsumo, idBrassagem, idLote, loteLabel, saldoLabel, quantidade, unidade, confirmado, bloqueado = false, compact = false }: ConfirmarConsumoProps) {
  if (compact) return <form className="brew-confirm-form" action={salvarConsumo}>
    <input type="hidden" name="id_consumo" value={idConsumo} />
    <input type="hidden" name="id_brassagem" value={idBrassagem} />
    <input type="hidden" name="id_lote" value={idLote} />
    <input type="hidden" name="quantidade_real" value={quantidade} />
    <div className="brew-confirm-lot"><strong>{loteLabel}</strong><small>{quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} {unidade} · {saldoLabel}</small></div>
    <label className={`brew-confirm-checkbox ${bloqueado ? "disabled" : ""}`}><input type="checkbox" name="confirmado" value="true" defaultChecked={confirmado} disabled={bloqueado} onChange={(event) => event.currentTarget.form?.requestSubmit()} /><span>{bloqueado ? "Saldo insuficiente" : confirmado ? "✓ Confirmado" : "Confirmar"}</span></label>
  </form>;

  return <form className="batch-consumption-check-form" action={salvarConsumo}>
    <input type="hidden" name="id_consumo" value={idConsumo} />
    <input type="hidden" name="id_brassagem" value={idBrassagem} />
    <input type="hidden" name="id_lote" value={idLote} />
    <input type="hidden" name="quantidade_real" value={quantidade} />
    <div className="batch-auto-value"><span>Lote sugerido</span><strong>{loteLabel}</strong><small>{saldoLabel}</small></div>
    <div className="batch-auto-value"><span>Quantidade</span><strong>{quantidade.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} {unidade}</strong><small>Quantidade prevista da receita</small></div>
    <label className={`batch-confirm-checkbox ${bloqueado ? "disabled" : ""}`}><input type="checkbox" name="confirmado" value="true" defaultChecked={confirmado} disabled={bloqueado} onChange={(event) => event.currentTarget.form?.requestSubmit()} /><span>{bloqueado ? "Saldo insuficiente" : confirmado ? "Confirmado" : "Confirmar consumo"}</span></label>
  </form>;
}
