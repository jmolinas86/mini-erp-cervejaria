"use client";

export function ImprimirRelatorio() {
  return <button className="button secondary" type="button" onClick={() => window.print()}>▤ &nbsp; Imprimir relatório</button>;
}
