"use client";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header
      className="px-6 py-4 flex items-center justify-between"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div>
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: "var(--accent-lime)", boxShadow: "0 0 6px var(--accent-lime)" }}
        />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Données locales
        </span>
      </div>
    </header>
  );
}
