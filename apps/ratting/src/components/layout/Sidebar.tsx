"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Crosshair,
  History,
  Activity,
  BarChart3,
} from "lucide-react";
import { CharacterFilter } from "./CharacterFilter";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/live", label: "Live", icon: Activity },
  { href: "/history", label: "Historique", icon: History },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 fixed left-0 border-r flex flex-col"
      style={{
        top: "40px",
        height: "calc(100vh - 40px)",
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
    >
      {/* Logo */}
      <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h1
          className="text-xl font-bold flex items-center gap-2"
          style={{ color: "var(--accent-green)" }}
        >
          <Crosshair size={20} />
          Ratting
        </h1>
      </div>

      {/* Character Filter */}
      <CharacterFilter />

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                  style={{
                    background: isActive
                      ? "rgba(16, 185, 129, 0.15)"
                      : "transparent",
                    color: isActive
                      ? "var(--accent-green)"
                      : "var(--text-secondary)",
                    borderLeft: isActive
                      ? "3px solid var(--accent-green)"
                      : "3px solid transparent",
                  }}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div
        className="p-4 border-t text-xs"
        style={{
          borderColor: "var(--border)",
          color: "var(--text-secondary)",
        }}
      >
        <p>NETK Ratting v0.1.0</p>
      </div>
    </aside>
  );
}
