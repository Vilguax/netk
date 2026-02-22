"use client";

import { useState } from "react";
import {
  RefreshCw,
  Shield,
  Crown,
  Users,
  X,
  ChevronDown,
  ChevronRight,
  Crosshair,
  AlertTriangle,
  Compass,
  Star,
  MapPin,
} from "lucide-react";
import type { FleetMember, FleetWing, FleetData } from "@/hooks/useFleetData";
import type { FavoriteSystem } from "@/app/page";

interface Props {
  fleetData: FleetData | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onKick: (memberId: number) => Promise<boolean>;
  onSelectMember: (characterId: number | null) => void;
  selectedMemberId: number | null;
  favorites: FavoriteSystem[];
  onFocusSystem: (systemId: string) => void;
  onRemoveFavorite: (systemId: string) => void;
  onFavoriteContextMenu?: (systemId: string, x: number, y: number) => void;
}

const roleLabels: Record<string, string> = {
  fleet_commander: "Fleet Commander",
  wing_commander: "Wing Commander",
  squad_commander: "Squad Commander",
  squad_member: "Membre",
};

const roleIcons: Record<string, typeof Crown> = {
  fleet_commander: Crown,
  wing_commander: Shield,
  squad_commander: Crosshair,
  squad_member: Users,
};

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "fleet_commander":
      return "rgba(251, 191, 36, 0.2)";
    case "wing_commander":
      return "rgba(59, 130, 246, 0.2)";
    case "squad_commander":
      return "rgba(168, 85, 247, 0.2)";
    default:
      return "rgba(100, 116, 139, 0.15)";
  }
}

function getRoleBadgeText(role: string): string {
  switch (role) {
    case "fleet_commander":
      return "var(--accent-gold)";
    case "wing_commander":
      return "var(--accent-blue)";
    case "squad_commander":
      return "#a855f7";
    default:
      return "var(--text-secondary)";
  }
}

function MemberCard({
  member,
  isCommander,
  onKick,
  onSelect,
  isSelected,
}: {
  member: FleetMember;
  isCommander: boolean;
  onKick: (id: number) => Promise<boolean>;
  onSelect: (id: number | null) => void;
  isSelected: boolean;
}) {
  const [kicking, setKicking] = useState(false);

  const handleKick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setKicking(true);
    await onKick(member.characterId);
    setKicking(false);
  };

  return (
    <div
      className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all"
      style={{
        background: isSelected
          ? "rgba(16, 185, 129, 0.15)"
          : "rgba(255, 255, 255, 0.02)",
        borderLeft: isSelected
          ? "2px solid var(--accent-green)"
          : "2px solid transparent",
      }}
      onClick={() => onSelect(isSelected ? null : member.characterId)}
    >
      {/* Portrait */}
      <div className="relative flex-shrink-0">
        <img
          src={`https://images.evetech.net/characters/${member.characterId}/portrait?size=64`}
          alt={member.characterName}
          className="w-9 h-9 rounded-full"
          style={{
            border: member.isNetkUser
              ? "2px solid var(--accent-green)"
              : "2px solid rgba(45, 55, 72, 0.5)",
            boxShadow:
              member.canJump && member.hasSkillScope
                ? "0 0 0 2px #f59e0b, 0 0 8px rgba(245,158,11,0.3)"
                : undefined,
          }}
        />
        {/* Jump indicator badge (top-left) */}
        {member.canJump && member.hasSkillScope && (
          <div
            className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
            style={{
              background: "#f59e0b",
              color: "#000",
              lineHeight: 1,
            }}
            title={`Jump: ${member.jumpRangeLY?.toFixed(1) ?? "?"} LY (JDC ${member.jdcLevel ?? "?"})`}
          >
            ⚡
          </div>
        )}
        {/* NETK badge (bottom-right) */}
        {member.isNetkUser && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black"
            style={{
              background: "var(--accent-green)",
              color: "#000",
            }}
          >
            N
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">
            {member.characterName}
          </span>
          <span
            className="text-[10px] px-1 py-0.5 rounded flex-shrink-0"
            style={{
              background: getRoleBadgeColor(member.role),
              color: getRoleBadgeText(member.role),
            }}
          >
            {roleLabels[member.role] || member.role}
          </span>
        </div>
        <div
          className="text-xs truncate"
          style={{ color: "var(--text-secondary)" }}
        >
          {member.shipTypeName}
        </div>
      </div>

      {/* Kick button (only for fleet commander) */}
      {isCommander && member.role !== "fleet_commander" && (
        <button
          onClick={handleKick}
          disabled={kicking}
          className="flex-shrink-0 p-1 rounded hover:bg-red-500/20 transition-colors"
          title="Kick"
        >
          <X
            size={14}
            className={kicking ? "animate-spin" : ""}
            style={{ color: kicking ? "var(--text-secondary)" : "#ef4444" }}
          />
        </button>
      )}
    </div>
  );
}

function getSecurityColor(sec: number): string {
  if (sec >= 1.0) return "#5eead4";
  if (sec >= 0.9) return "#67e8f9";
  if (sec >= 0.8) return "#6ee7b7";
  if (sec >= 0.7) return "#86efac";
  if (sec >= 0.6) return "#bef264";
  if (sec >= 0.5) return "#fde047";
  if (sec >= 0.4) return "#fbbf24";
  if (sec >= 0.3) return "#fb923c";
  if (sec >= 0.2) return "#f87171";
  if (sec >= 0.1) return "#e55050";
  return "#dc2626";
}

export function FleetPanel({
  fleetData,
  isLoading,
  error,
  onRefresh,
  onKick,
  onSelectMember,
  selectedMemberId,
  favorites,
  onFocusSystem,
  onRemoveFavorite,
  onFavoriteContextMenu,
}: Props) {
  const [collapsedWings, setCollapsedWings] = useState<Set<number>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const toggleWing = (wingId: number) => {
    setCollapsedWings((prev) => {
      const next = new Set(prev);
      if (next.has(wingId)) {
        next.delete(wingId);
      } else {
        next.add(wingId);
      }
      return next;
    });
  };

  const isCommander = fleetData?.myRole === "fleet_commander";

  // Separate fleet commanders (wingId=-1), wing commanders (squadId=-1), and squad members
  const fleetCommanders = fleetData?.members.filter((m) => m.wingId === -1 && m.squadId === -1) ?? [];

  // Group remaining members by wing/squad
  const membersByWingSquad = new Map<string, FleetMember[]>();
  // Wing-level members (wing commanders): key = `wing-${wingId}`
  const wingCommanders = new Map<number, FleetMember[]>();
  if (fleetData?.members) {
    for (const m of fleetData.members) {
      if (m.wingId === -1 && m.squadId === -1) continue; // fleet commanders handled separately
      if (m.squadId === -1) {
        // Wing-level member (wing commander)
        const arr = wingCommanders.get(m.wingId) || [];
        arr.push(m);
        wingCommanders.set(m.wingId, arr);
        continue;
      }
      const key = `${m.wingId}-${m.squadId}`;
      const arr = membersByWingSquad.get(key) || [];
      arr.push(m);
      membersByWingSquad.set(key, arr);
    }
  }

  return (
    <aside
      className="w-80 h-full border-r flex flex-col flex-shrink-0"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
    >
      {/* Header */}
      <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between">
          <h1
            className="text-lg font-bold flex items-center gap-2"
            style={{ color: "var(--accent-green)" }}
          >
            <Compass size={20} />
            Fleet Manager
          </h1>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RefreshCw
              size={16}
              className={isRefreshing ? "animate-spin" : ""}
              style={{ color: "var(--text-secondary)" }}
            />
          </button>
        </div>

        {/* Role badge */}
        {fleetData?.inFleet && fleetData.myRole && (
          <div
            className="mt-2 px-2 py-1 rounded text-xs flex items-center gap-1.5"
            style={{
              background: getRoleBadgeColor(fleetData.myRole),
              color: getRoleBadgeText(fleetData.myRole),
            }}
          >
            {(() => {
              const Icon = roleIcons[fleetData.myRole] || Users;
              return <Icon size={12} />;
            })()}
            {roleLabels[fleetData.myRole] || fleetData.myRole}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 rounded-lg animate-pulse"
                style={{ background: "var(--border)" }}
              />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <AlertTriangle
              size={24}
              className="mx-auto mb-2"
              style={{ color: "#ef4444" }}
            />
            <p className="text-sm" style={{ color: "#ef4444" }}>
              {error}
            </p>
          </div>
        ) : !fleetData?.inFleet ? (
          <div className="p-4 text-center">
            <Users
              size={32}
              className="mx-auto mb-3"
              style={{ color: "var(--text-secondary)" }}
            />
            <p className="font-medium mb-2">Pas en fleet</p>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Rejoignez une fleet in-game pour utiliser le Fleet Manager.
            </p>
            <div
              className="mt-4 p-3 rounded-lg text-xs text-left"
              style={{
                background: "rgba(251, 191, 36, 0.1)",
                borderLeft: "3px solid var(--accent-gold)",
              }}
            >
              <p className="font-medium mb-1" style={{ color: "var(--accent-gold)" }}>
                Note
              </p>
              <p style={{ color: "var(--text-secondary)" }}>
                Pour voir les membres de la fleet, vous devez être Fleet
                Commander, Wing Commander ou Squad Commander.
              </p>
            </div>
          </div>
        ) : fleetData.members.length === 0 ? (
          <div className="p-4 text-center">
            <Shield
              size={32}
              className="mx-auto mb-3"
              style={{ color: "var(--accent-gold)" }}
            />
            <p className="font-medium mb-2">Fleet détectée</p>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Vous êtes en fleet mais impossible de lire les membres.
              Vérifiez que vous êtes au moins Squad Commander.
            </p>
            <div
              className="mt-4 p-3 rounded-lg text-xs text-left"
              style={{
                background: "rgba(59, 130, 246, 0.1)",
                borderLeft: "3px solid var(--accent-blue)",
              }}
            >
              <p className="font-medium mb-1" style={{ color: "var(--accent-blue)" }}>
                Scopes manquants ?
              </p>
              <p style={{ color: "var(--text-secondary)" }}>
                Si vos personnages ont été liés avant le Fleet Manager,
                vous devez les re-lier pour obtenir les nouveaux scopes fleet.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2">
            {/* Stats bar */}
            <div
              className="flex items-center justify-between px-2 py-1.5 mb-2 rounded text-xs"
              style={{ background: "rgba(16, 185, 129, 0.08)" }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                {fleetData.members.length} membres
              </span>
              <span style={{ color: "var(--accent-green)" }}>
                {fleetData.netkMemberCount} NETK
              </span>
            </div>

            {/* Fleet Commanders (wingId=-1, squadId=-1) */}
            {fleetCommanders.length > 0 && (
              <div className="mb-2">
                <div
                  className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: "var(--accent-gold)" }}
                >
                  Fleet Level
                </div>
                <div className="space-y-0.5">
                  {fleetCommanders.map((m) => (
                    <MemberCard
                      key={m.characterId}
                      member={m}
                      isCommander={isCommander}
                      onKick={onKick}
                      onSelect={onSelectMember}
                      isSelected={selectedMemberId === m.characterId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Wings/Squads hierarchy */}
            {fleetData.wings.length > 0 ? (
              fleetData.wings.map((wing) => (
                <div key={wing.id} className="mb-1">
                  <button
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium hover:bg-white/5 transition-colors"
                    style={{ color: "var(--accent-blue)" }}
                    onClick={() => toggleWing(wing.id)}
                  >
                    {collapsedWings.has(wing.id) ? (
                      <ChevronRight size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                    {wing.name || `Wing ${wing.id}`}
                  </button>

                  {!collapsedWings.has(wing.id) && (
                    <div className="ml-2">
                      {/* Wing-level members (wing commanders, squadId=-1) */}
                      {(wingCommanders.get(wing.id) || []).map((m) => (
                        <MemberCard
                          key={m.characterId}
                          member={m}
                          isCommander={isCommander}
                          onKick={onKick}
                          onSelect={onSelectMember}
                          isSelected={selectedMemberId === m.characterId}
                        />
                      ))}

                      {/* Squads */}
                      {wing.squads.map((squad) => {
                        const squadMembers =
                          membersByWingSquad.get(`${wing.id}-${squad.id}`) || [];
                        if (squadMembers.length === 0) return null;

                        return (
                          <div key={squad.id} className="mb-1">
                            <div
                              className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {squad.name || `Squad ${squad.id}`} ({squadMembers.length})
                            </div>
                            <div className="space-y-0.5">
                              {squadMembers.map((m) => (
                                <MemberCard
                                  key={m.characterId}
                                  member={m}
                                  isCommander={isCommander}
                                  onKick={onKick}
                                  onSelect={onSelectMember}
                                  isSelected={selectedMemberId === m.characterId}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            ) : (
              /* Flat member list (no wing info) */
              <div className="space-y-0.5">
                {fleetData.members.map((m) => (
                  <MemberCard
                    key={m.characterId}
                    member={m}
                    isCommander={isCommander}
                    onKick={onKick}
                    onSelect={onSelectMember}
                    isSelected={selectedMemberId === m.characterId}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Favorites section */}
      {favorites.length > 0 && (
        <div
          className="border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="px-3 py-2 flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "#f59e0b" }}
          >
            <Star size={12} fill="currentColor" />
            Systèmes favoris
            <span
              className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}
            >
              {favorites.length}
            </span>
          </div>
          <div className="px-2 pb-2 space-y-0.5 max-h-40 overflow-y-auto">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors group"
                onClick={() => onFocusSystem(fav.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onFavoriteContextMenu?.(fav.id, e.clientX, e.clientY);
                }}
              >
                <MapPin size={12} style={{ color: "#f59e0b", flexShrink: 0 }} />
                <span className="text-sm truncate flex-1">{fav.name}</span>
                <span
                  className="text-[10px] font-mono"
                  style={{ color: getSecurityColor(fav.security) }}
                >
                  {fav.security.toFixed(1)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFavorite(fav.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 transition-all"
                  title="Retirer"
                >
                  <X size={12} style={{ color: "#ef4444" }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="p-3 border-t text-xs"
        style={{
          borderColor: "var(--border)",
          color: "var(--text-secondary)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--accent-green)" }}
          />
          <span>= Utilisateur NETK</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px]">⚡</span>
          <span>= Jump drive (JDC)</span>
        </div>
        <p className="mt-1 text-[10px]" style={{ color: "var(--text-secondary)" }}>
          Clic droit sur la carte → Set destination
        </p>
      </div>
    </aside>
  );
}

