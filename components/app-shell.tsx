import Link from "next/link";

type AppShellProps = {
  active?: "painel" | "producao" | "estoque" | "receitas" | "financeiro" | "relatorios" | "cadastros";
  userEmail?: string;
  contextLabel?: string;
  contextCurrent?: string;
  children: React.ReactNode;
};

const menu = [
  { key: "painel", href: "/", label: "Painel", icon: "▦" },
  { key: "producao", href: "/brassagens", label: "Produção", icon: "♙" },
  { key: "estoque", href: "/estoque", label: "Estoque", icon: "▣" },
  { key: "receitas", href: "/receitas", label: "Receitas", icon: "▤" },
  { key: "financeiro", href: "/relatorios?aba=custos", label: "Custos", icon: "$" },
  { key: "relatorios", href: "/relatorios", label: "Relatórios", icon: "▥" },
  { key: "cadastros", href: "/cadastros", label: "Cadastros", icon: "⚙" }
] as const;

function iniciais(email?: string) {
  if (!email) return "MC";
  return email.slice(0, 2).toUpperCase();
}

export function AppShell({ active, userEmail, contextLabel = "Minha Cervejaria", contextCurrent = "Mini ERP", children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">♧</span>
          <span><strong>BrewerPro</strong><small>Mini ERP Cervejeiro</small></span>
        </Link>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          {menu.map((item) => (
            <Link className={`sidebar-link ${active === item.key ? "active" : ""}`} href={item.href} key={item.key} aria-current={active === item.key ? "page" : undefined}>
              <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-tip"><strong>Cerveja boa começa com organização.</strong><span>Cadastros, estoque e produção em um só lugar.</span></div>
        <div className="sidebar-footer"><span>⚙</span> Configurações <span>?</span> Ajuda</div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-context"><span className="mobile-menu" aria-hidden="true">☰</span><span>{contextLabel}</span><span className="topbar-separator">/</span><span className="topbar-muted">{contextCurrent}</span></div>
          <div className="topbar-user"><span className="notification" aria-hidden="true">♧</span><span className="avatar">{iniciais(userEmail)}</span><span><strong>{userEmail ?? "Cervejeiro"}</strong><small>Cervejaria Caseira</small></span><span aria-hidden="true">⌄</span></div>
        </header>
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
