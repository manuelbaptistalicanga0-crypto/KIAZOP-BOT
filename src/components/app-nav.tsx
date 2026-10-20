import Link from "next/link";
import { CheckSquare2, LayoutDashboard, Settings2, Users2 } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

type Props = { company: string; name: string; plan: string };
const links = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare2 },
  { href: "/team", label: "Equipa", icon: Users2 },
  { href: "/setup", label: "WhatsApp", icon: Settings2 },
];

export function AppNav({ company, name, plan }: Props) {
  return <>
    <aside className="sidebar">
      <Link className="wordmark" href="/dashboard"><span className="brand-icon">E</span><span>executa<span>pro</span></span></Link>
      <p className="nav-caption">ESPAÇO DE TRABALHO</p>
      <nav className="nav-links" aria-label="Navegação principal">
        {links.map(({ href, label, icon: Icon }) => <Link href={href} key={href} className="nav-link"><Icon size={18} strokeWidth={1.8} /><span>{label}</span></Link>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="company-switch"><span className="company-avatar">{company.slice(0, 1).toUpperCase()}</span><div className="company-copy"><strong>{company}</strong><small>Plano {plan}</small></div></div>
        <div className="profile-row"><span className="profile-avatar">{name.slice(0, 1).toUpperCase()}</span><span className="profile-name">{name}</span><SignOutButton /></div>
      </div>
    </aside>
    <nav className="mobile-tabs" aria-label="Navegação móvel">
      {links.map(({ href, label, icon: Icon }) => <Link href={href} key={href} className="mobile-tab"><Icon size={19} strokeWidth={1.8} /><span>{label === "Visão geral" ? "Início" : label}</span></Link>)}
    </nav>
  </>;
}
