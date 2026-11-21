"use client";

import * as m from "motion/react-m";
import { usePathname } from "next/navigation";
import { AppLink } from "@/components/ui/AppLink";
import { Icon, type IconName } from "@/components/ui/Icon";
import { move } from "@/lib/motion";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/kierunki", label: "Kierunki i grupy", icon: "layers" },
  { href: "/harmonogram", label: "Harmonogram grup", icon: "calendar" },
  { href: "/prowadzacy", label: "Prowadzący", icon: "users" },
  { href: "/harmonogram-prowadzacych", label: "Harmonogram prowadzących", icon: "badge" },
  { href: "/import", label: "Import danych", icon: "upload" },
  { href: "/plan", label: "Plan zajęć", icon: "table" },
  { href: "/plan/edycja", label: "Edycja planu", icon: "move" },
  { href: "/generator", label: "Generator planu", icon: "check" },
];

const pasuje = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** The nav item whose address is the longest match: /plan/edycja marks "Edycja planu", not also "Plan zajęć". */
function isActive(pathname: string, href: string) {
  return pasuje(pathname, href) && !NAV.some((inny) => inny.href.length > href.length && pasuje(pathname, inny.href));
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    // Named so page view transitions leave it in place (see ::view-transition-*(sidebar) in globals.css).
    <aside className="sidebar" style={{ viewTransitionName: "sidebar" }}>
      <AppLink href="/kierunki" className="sidebar-brand">
        <div className="mark">
          <Icon name="calendar" stroke="#fff" />
        </div>
        <div>
          <h1>Planner</h1>
          <span className="sidebar-sub">Plan zajęć uczelni</span>
        </div>
      </AppLink>
      <nav aria-label="Nawigacja główna">
        <ul className="nav-list">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <AppLink
                  className={active ? "nav-item active" : "nav-item"}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                >
                  {active && <m.span className="nav-pill" layoutId="nav-active" transition={move} aria-hidden="true" />}
                  <Icon name={item.icon} size={17} />
                  {item.label}
                </AppLink>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* TODO(backend): read the current academic year and semester from settings in Supabase. */}
      <div className="sidebar-foot">
        Rok akademicki 2026/2027
        <br />
        Semestr zimowy
      </div>
    </aside>
  );
}
