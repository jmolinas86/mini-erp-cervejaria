"use client";

import { useMemo, useState } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  searchText?: string;
};

function normalizar(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

export function SearchableSelect({
  name,
  options,
  placeholder = "Selecione",
  searchPlaceholder = "Buscar por código ou nome...",
  required = false,
  defaultValue = "",
}: {
  name: string;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const [termo, setTermo] = useState("");
  const [valor, setValor] = useState(defaultValue);

  const opcoesFiltradas = useMemo(() => {
    const busca = normalizar(termo.trim());
    if (!busca) return options;
    return options.filter((option) => normalizar(`${option.label} ${option.searchText ?? ""}`).includes(busca));
  }, [options, termo]);

  const opcaoSelecionada = options.find((option) => option.value === valor);
  const opcoesExibidas = opcaoSelecionada && !opcoesFiltradas.some((option) => option.value === valor)
    ? [opcaoSelecionada, ...opcoesFiltradas]
    : opcoesFiltradas;

  return (
    <div className="searchable-select">
      <input
        className="searchable-select-search"
        type="search"
        value={termo}
        onChange={(event) => setTermo(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
      />
      <select name={name} required={required} value={valor} onChange={(event) => setValor(event.target.value)}>
        <option value="" disabled>{placeholder}</option>
        {opcoesExibidas.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
      {termo.trim() && opcoesFiltradas.length === 0 ? <small>Nenhum item encontrado.</small> : null}
    </div>
  );
}
