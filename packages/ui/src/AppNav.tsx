"use client";

import { useState } from "react";

export type AppId =
  | "gateway"
  | "flipper"
  | "ratting"
  | "rock-radar"
  | "appraisal"
  | "fleet"
  | "market";

interface AppDef {
  id: AppId;
  name: string;
  devUrl: string;
  prodUrl: string;
  color: string;
}

const APPS: AppDef[] = [
  {
    id: "gateway",
    name: "Accueil",
    devUrl: "http://localhost:3000",
    prodUrl: "https://netk.app",
    color: "#22d3ee",
  },
  {
    id: "flipper",
    name: "Flipper",
    devUrl: "http://localhost:3001",
    prodUrl: "https://flipper.netk.app",
    color: "#a78bfa",
  },
  {
    id: "ratting",
    name: "Ratting",
    devUrl: "http://localhost:3002",
    prodUrl: "https://ratting.netk.app",
    color: "#34d399",
  },
  {
    id: "rock-radar",
    name: "Rock Radar",
    devUrl: "http://localhost:3003",
    prodUrl: "https://rock-radar.netk.app",
    color: "#fb923c",
  },
  {
    id: "appraisal",
    name: "Appraisal",
    devUrl: "http://localhost:3004",
    prodUrl: "https://appraisal.netk.app",
    color: "#facc15",
  },
  {
    id: "fleet",
    name: "Fleet",
    devUrl: "http://localhost:3005",
    prodUrl: "https://fleet.netk.app",
    color: "#60a5fa",
  },
  {
    id: "market",
    name: "Market",
    devUrl: "http://localhost:3006",
    prodUrl: "https://market.netk.app",
    color: "#f87171",
  },
];

function AppIcon({ id, size = 13 }: { id: AppId; size?: number }) {
  const s = size;
  switch (id) {
    case "gateway":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "flipper":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    case "ratting":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="2" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="22" y2="12" />
        </svg>
      );
    case "rock-radar":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "appraisal":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );
    case "fleet":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="5" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
          <line x1="12" y1="7" x2="5" y2="17" />
          <line x1="12" y1="7" x2="19" y2="17" />
          <line x1="5" y1="19" x2="19" y2="19" />
        </svg>
      );
    case "market":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    default:
      return null;
  }
}

export interface AppNavProps {
  activeApp: AppId;
}

export function AppNav({ activeApp }: AppNavProps) {
  const [hovered, setHovered] = useState<AppId | null>(null);
  const isDev = process.env.NODE_ENV === "development";

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "40px",
        zIndex: 9999,
        background: "rgba(5, 8, 15, 0.97)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: "2px",
        backdropFilter: "blur(8px)",
        fontFamily: "inherit",
      }}
    >
      {/* NETK Logo */}
      <a
        href={isDev ? "http://localhost:3000" : "https://netk.app"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginRight: "8px",
          textDecoration: "none",
          flexShrink: 0,
          padding: "4px 8px",
          borderRadius: "6px",
        }}
      >
        <div
          style={{
            width: "22px",
            height: "22px",
            background: "linear-gradient(135deg, #22d3ee, #3b82f6)",
            borderRadius: "5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: "800",
            color: "white",
            flexShrink: 0,
          }}
        >
          N
        </div>
        <span
          style={{
            fontSize: "12px",
            fontWeight: "700",
            color: "rgba(255, 255, 255, 0.9)",
            letterSpacing: "0.08em",
          }}
        >
          NETK
        </span>
      </a>

      {/* Separator */}
      <div
        style={{
          width: "1px",
          height: "20px",
          background: "rgba(255, 255, 255, 0.08)",
          marginRight: "8px",
          flexShrink: 0,
        }}
      />

      {/* App links */}
      {APPS.map((app) => {
        const isActive = app.id === activeApp;
        const isHovered = hovered === app.id;
        const url = isDev ? app.devUrl : app.prodUrl;

        return (
          <a
            key={app.id}
            href={url}
            onMouseEnter={() => setHovered(app.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 9px",
              borderRadius: "5px",
              textDecoration: "none",
              fontSize: "12px",
              fontWeight: isActive ? "600" : "400",
              color: isActive
                ? app.color
                : isHovered
                  ? "rgba(255, 255, 255, 0.8)"
                  : "rgba(255, 255, 255, 0.45)",
              background: isActive
                ? `${app.color}18`
                : isHovered
                  ? "rgba(255, 255, 255, 0.06)"
                  : "transparent",
              transition: "all 0.12s",
              whiteSpace: "nowrap",
              boxShadow: isActive ? `0 0 0 1px ${app.color}30` : "none",
            }}
          >
            <AppIcon id={app.id} size={13} />
            <span>{app.name}</span>
          </a>
        );
      })}
    </nav>
  );
}
