"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, Globe, Clock, BookOpen, Radar, GitBranch, GraduationCap } from "lucide-react";

const NAV_ITEMS = [
  { href: "/",          label: "Calculateur",  icon: Calculator },
  { href: "/finder",    label: "Finder",       icon: Radar },
  { href: "/skills",    label: "Skills",       icon: BookOpen },
  { href: "/timers",    label: "Timers",       icon: Clock },
  { href: "/craft",     label: "Craft",        icon: GitBranch },
  { href: "/guide",     label: "Guide",        icon: GraduationCap },
  { href: "/colonies",  label: "Colonies",     icon: Globe,      soon: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-10 h-[calc(100vh-40px)] w-56 flex flex-col"
      style={{
        background: "rgba(10, 14, 23, 0.95)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
          style={{ background: "rgba(163, 230, 53, 0.15)", color: "var(--accent-lime)" }}
        >
          PI
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Planetary</div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Interaction</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, soon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={soon ? "#" : href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer"
              style={{
                background: isActive ? "rgba(163, 230, 53, 0.1)" : "transparent",
                color: isActive ? "var(--accent-lime)" : soon ? "var(--text-muted)" : "var(--text-secondary)",
                borderLeft: isActive ? "2px solid var(--accent-lime)" : "2px solid transparent",
                pointerEvents: soon ? "none" : "auto",
              }}
            >
              <Icon size={15} />
              <span>{label}</span>
              {soon && (
                <span
                  className="ml-auto text-xs px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(148, 163, 184, 0.1)", color: "var(--text-muted)", fontSize: "10px" }}
                >
                  bientôt
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Recettes PI — EVE Online
        </p>
      </div>
    </aside>
  );
}
