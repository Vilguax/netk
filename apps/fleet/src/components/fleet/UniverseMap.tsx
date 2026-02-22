"use client";

import { useRef, useEffect, useState, useCallback, type MutableRefObject } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import { NodeCircleProgram, createNodeCompoundProgram } from "sigma/rendering";
import { NodeGlowProgram } from "./nodeGlowProgram";
import type { FleetMember, OutOfFleetCharacter } from "@/hooks/useFleetData";
import type { FavoriteSystem } from "@/app/page";

// Compound program: glow layer (bottom) + solid circle (top)
const NodeGlowCircleProgram = createNodeCompoundProgram([NodeGlowProgram, NodeCircleProgram]);

// ============ Types ============

interface SystemData {
  n: string; // name
  x: number; // normalized x
  z: number; // normalized z
  s: number; // security
  cid: number; // constellationId
  rid: number; // regionId
}

interface UniverseData {
  systems: Record<string, SystemData>;
  connections: [number, number][];
  constellations: Record<string, { n: string; rid: number }>;
  regions: Record<string, { n: string; x: number; z: number }>;
}

interface TooltipInfo {
  x: number;
  y: number;
  systemId: string;
  system: SystemData;
  members: FleetMember[];
}

interface ContextMenuInfo {
  x: number;
  y: number;
  systemId: string;
  system: SystemData;
}

interface Toast {
  message: string;
  type: "success" | "error";
  id: number;
}

interface Props {
  members: FleetMember[];
  outOfFleet: OutOfFleetCharacter[];
  onSetDestination: (
    systemId: number,
    mode: "self" | "fleet" | "specific",
    clearOther?: boolean,
    characterIds?: number[]
  ) => Promise<boolean>;
  netkMemberCount: number;
  highlightCharacterId?: number;
  favorites: FavoriteSystem[];
  onFavoritesChange: (favorites: FavoriteSystem[]) => void;
  zoomToSystemRef: MutableRefObject<((systemId: string) => void) | null>;
  openContextMenuRef: MutableRefObject<((systemId: string, x: number, y: number) => void) | null>;
}

// ============ Security color ============

function getSecurityColor(sec: number): string {
  if (sec >= 1.0) return "#5eead4"; // teal
  if (sec >= 0.9) return "#67e8f9"; // cyan
  if (sec >= 0.8) return "#6ee7b7"; // emerald
  if (sec >= 0.7) return "#86efac"; // green
  if (sec >= 0.6) return "#bef264"; // lime
  if (sec >= 0.5) return "#fde047"; // yellow
  if (sec >= 0.4) return "#fbbf24"; // amber
  if (sec >= 0.3) return "#fb923c"; // orange
  if (sec >= 0.2) return "#f87171"; // red
  if (sec >= 0.1) return "#e55050"; // darker red
  return "#dc2626"; // deep red (nullsec)
}

function getEdgeColor(fromSec: number, toSec: number, crossRegion: boolean): string {
  if (crossRegion) return "rgba(130, 110, 180, 0.15)";
  const avg = (fromSec + toSec) / 2;
  if (avg >= 0.5) return "rgba(80, 130, 180, 0.12)";
  if (avg >= 0.1) return "rgba(180, 140, 60, 0.12)";
  return "rgba(180, 60, 60, 0.12)";
}

// ============ Component ============

export function UniverseMap({
  members,
  outOfFleet,
  onSetDestination,
  netkMemberCount,
  highlightCharacterId,
  favorites,
  onFavoritesChange,
  zoomToSystemRef,
  openContextMenuRef,
}: Props) {
  // Refs
  const sigmaContainerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const regionLabelsRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const jumpMembersRef = useRef<FleetMember[]>([]);
  const reachableSetRef = useRef<Set<number>>(new Set());

  // State
  const [universeData, setUniverseData] = useState<UniverseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuInfo | null>(null);
  const [expandedSubmenu, setExpandedSubmenu] = useState<"dest" | "wp" | "oof" | null>(null);
  const [selectedCharIds, setSelectedCharIds] = useState<Set<number>>(new Set());
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; sys: SystemData }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  // Favorites ref for reducer (avoid stale closures)
  const favoritesRef = useRef<Set<string>>(new Set());

  // Keep favoritesRef in sync with props
  useEffect(() => {
    favoritesRef.current = new Set(favorites.map((f) => f.id));
    sigmaRef.current?.scheduleRefresh();
  }, [favorites]);

  // Refs for reducer access (avoid stale closures)
  const hoveredNodeRef = useRef<string | null>(null);
  const searchHighlightRef = useRef<string | null>(null);
  const searchHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const membersBySystem = useRef<Map<number, FleetMember[]>>(new Map());
  const universeDataRef = useRef<UniverseData | null>(null);

  // Keep universeDataRef in sync
  useEffect(() => {
    universeDataRef.current = universeData;
  }, [universeData]);

  // Update members map + jump refs
  useEffect(() => {
    const map = new Map<number, FleetMember[]>();
    for (const m of members) {
      if (!m.solarSystemId) continue;
      const arr = map.get(m.solarSystemId) || [];
      arr.push(m);
      map.set(m.solarSystemId, arr);
    }
    membersBySystem.current = map;

    // Jump drive data
    const jumpMembers = members.filter(
      (m) => m.canJump && m.hasSkillScope && m.reachableSystems?.length && m.solarSystemId
    );
    jumpMembersRef.current = jumpMembers;
    const rs = new Set<number>();
    for (const m of jumpMembers) {
      for (const id of m.reachableSystems!) rs.add(id);
    }
    reachableSetRef.current = rs;

    sigmaRef.current?.refresh();
  }, [members]);

  // Load universe data
  useEffect(() => {
    fetch("/data/universe.json")
      .then((r) => r.json())
      .then((data: UniverseData) => {
        setUniverseData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load universe data:", err);
        setLoading(false);
      });
  }, []);

  // Initialize Sigma when data is loaded
  useEffect(() => {
    if (!universeData || !sigmaContainerRef.current) return;

    const graph = new Graph();

    // Add system nodes
    for (const [id, sys] of Object.entries(universeData.systems)) {
      graph.addNode(id, {
        x: sys.x,
        y: sys.z,
        size: 2,
        color: getSecurityColor(sys.s),
        label: sys.n,
      });
    }

    // Add edges
    for (const [fromId, toId] of universeData.connections) {
      const from = universeData.systems[fromId];
      const to = universeData.systems[toId];
      if (!from || !to) continue;

      const edgeKey = `${fromId}-${toId}`;
      if (!graph.hasEdge(edgeKey)) {
        graph.addEdgeWithKey(edgeKey, String(fromId), String(toId), {
          size: 0.5,
          color: getEdgeColor(from.s, to.s, from.rid !== to.rid),
        });
      }
    }

    graphRef.current = graph;

    // Create sigma renderer
    const sigma = new Sigma(graph, sigmaContainerRef.current, {
      renderLabels: true,
      labelFont: "'Geist Mono', monospace",
      labelSize: 10,
      labelWeight: "500",
      labelColor: { color: "#94a3b8" },
      labelRenderedSizeThreshold: 4,
      labelDensity: 0.7,
      labelGridCellSize: 120,
      defaultNodeColor: "#475569",
      defaultEdgeColor: "rgba(80, 110, 160, 0.1)",
      minEdgeThickness: 0.3,
      zoomingRatio: 1.3,
      itemSizesReference: "screen",
      defaultEdgeType: "line",
      defaultNodeType: "glowCircle",
      nodeProgramClasses: {
        glowCircle: NodeGlowCircleProgram,
      },
      stagePadding: 50,
      autoCenter: true,
      autoRescale: true,
      enableEdgeEvents: false,
      hideEdgesOnMove: false,
      hideLabelsOnMove: true,
      zIndex: true,

      nodeReducer: (node, data) => {
        const res = { ...data };
        const sysId = Number(node);
        const hasMembers = membersBySystem.current.has(sysId);
        const isFavorite = favoritesRef.current.has(node);
        const isHovered = hoveredNodeRef.current === node;

        if (isFavorite) {
          res.color = "#f59e0b";
          res.size = 4;
          res.forceLabel = true;
          res.zIndex = 5;
        }

        // Reachable by a jump-capable member (amber tint, overridden by member coloring)
        if (reachableSetRef.current.has(sysId) && !isFavorite) {
          res.color = "#f59e0b";
          res.size = Math.max(res.size || 2, 3);
          res.zIndex = 3;
        }

        if (hasMembers) {
          const membersHere = membersBySystem.current.get(sysId)!;
          const hasNetk = membersHere.some((m) => m.isNetkUser);
          res.color = hasNetk ? "#10b981" : "#8b5cf6";
          res.size = 6;
          res.highlighted = true;
          res.forceLabel = true;
          res.zIndex = 10;
        }

        if (searchHighlightRef.current === node) {
          res.color = "#fbbf24";
          res.size = 9;
          res.highlighted = true;
          res.forceLabel = true;
          res.zIndex = 30;
        }

        if (isHovered) {
          res.highlighted = true;
          res.size = Math.max(res.size || 2, 7);
          res.zIndex = 20;
        }

        return res;
      },

      edgeReducer: (edge, data) => {
        // Dim edges connectéd to hovered node's neighbors for contrast
        if (hoveredNodeRef.current) {
          const src = graph.source(edge);
          const tgt = graph.target(edge);
          if (src === hoveredNodeRef.current || tgt === hoveredNodeRef.current) {
            return { ...data, size: 1.5, color: "rgba(120, 160, 220, 0.4)" };
          }
        }
        return data;
      },
    });

    sigmaRef.current = sigma;

    // ---- Event handlers ----

    // Hover
    sigma.on("enterNode", (payload) => {
      hoveredNodeRef.current = payload.node;
      sigma.scheduleRefresh();

      const sys = universeData.systems[Number(payload.node)];
      if (sys) {
        const membersHere = membersBySystem.current.get(Number(payload.node)) || [];
        setTooltip({
          x: payload.event.x + 16,
          y: payload.event.y - 10,
          systemId: payload.node,
          system: sys,
          members: membersHere,
        });
      }
    });

    sigma.on("leaveNode", () => {
      hoveredNodeRef.current = null;
      sigma.scheduleRefresh();
      setTooltip(null);
    });

    // Right-click
    sigma.on("rightClickNode", (payload) => {
      payload.event.original.preventDefault();
      const sys = universeData.systems[Number(payload.node)];
      if (sys) {
        setContextMenu({
          x: payload.event.x,
          y: payload.event.y,
          systemId: payload.node,
          system: sys,
        });
        setExpandedSubmenu(null);
        setSelectedCharIds(new Set());
        setTooltip(null);
      }
    });

    sigma.on("clickStage", () => {
      setContextMenu(null);
      setExpandedSubmenu(null);
    });

    sigma.on("rightClickStage", (payload) => {
      payload.event.original.preventDefault();
      setContextMenu(null);
      setExpandedSubmenu(null);
    });

    // ---- Region labels update on render ----
    const updateRegionLabels = () => {
      const container = regionLabelsRef.current;
      if (!container) return;

      const camera = sigma.getCamera();
      const ratio = camera.ratio;

      // Show region labels at low-to-medium zoom (higher ratio = more zoomed out)
      const show = ratio > 0.15;
      container.style.opacity = show ? "1" : "0";

      if (!show) return;

      const alpha = Math.min(0.5, ratio * 0.6);
      const children = container.children as HTMLCollectionOf<HTMLElement>;
      let i = 0;
      for (const [, region] of Object.entries(universeData.regions)) {
        if (i >= children.length) break;
        const pos = sigma.graphToViewport({ x: region.x, y: region.z });
        children[i].style.transform = `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`;
        children[i].style.opacity = String(alpha);
        i++;
      }
    };

    sigma.on("afterRender", updateRegionLabels);

    // ---- Jump range canvas overlay ----
    const drawOverlay = () => {
      const canvas = overlayCanvasRef.current;
      const container = sigmaContainerRef.current;
      if (!canvas || !container) return;

      const w = container.offsetWidth;
      const h = container.offsetHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      for (const member of jumpMembersRef.current) {
        if (!member.solarSystemId || !member.reachableSystems?.length) continue;

        const sourceNodeData = sigma.getNodeDisplayData(String(member.solarSystemId));
        if (!sourceNodeData) continue;
        const sourceVp = sigma.graphToViewport({ x: sourceNodeData.x, y: sourceNodeData.y });

        // Find max viewport distance to any reachable system
        let maxDist = 0;
        for (const sysId of member.reachableSystems) {
          const nd = sigma.getNodeDisplayData(String(sysId));
          if (!nd) continue;
          const vp = sigma.graphToViewport({ x: nd.x, y: nd.y });
          const dx = vp.x - sourceVp.x;
          const dy = vp.y - sourceVp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > maxDist) maxDist = dist;
        }

        if (maxDist < 2) continue;

        // Draw filled circle
        ctx.beginPath();
        ctx.arc(sourceVp.x, sourceVp.y, maxDist, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(245, 158, 11, 0.04)";
        ctx.fill();

        // Draw dashed border
        ctx.beginPath();
        ctx.arc(sourceVp.x, sourceVp.y, maxDist, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    sigma.on("afterRender", drawOverlay);

    // Prevent browser context menu on sigma container
    const container = sigmaContainerRef.current;
    const preventCtxMenu = (e: Event) => e.preventDefault();
    container.addEventListener("contextmenu", preventCtxMenu);

    return () => {
      container.removeEventListener("contextmenu", preventCtxMenu);
      sigma.kill();
      sigmaRef.current = null;
      graphRef.current = null;
    };
  }, [universeData]);

  // Auto-zoom to fleet members on first load
  const hasAutoZoomedRef = useRef(false);
  useEffect(() => {
    if (!sigmaRef.current || !universeData || hasAutoZoomedRef.current) return;
    if (members.length === 0) return;

    // Collect display positions of member systems
    const positions: { x: number; y: number }[] = [];
    const seenSystems = new Set<number>();

    for (const m of members) {
      if (!m.solarSystemId || seenSystems.has(m.solarSystemId)) continue;
      seenSystems.add(m.solarSystemId);
      const nodeData = sigmaRef.current.getNodeDisplayData(String(m.solarSystemId));
      if (nodeData) positions.push({ x: nodeData.x, y: nodeData.y });
    }

    if (positions.length === 0) return;
    hasAutoZoomedRef.current = true;

    if (positions.length === 1) {
      sigmaRef.current.getCamera().animate(
        { x: positions[0].x, y: positions[0].y, ratio: 0.05 },
        { duration: 800, easing: "cubicOut" }
      );
      return;
    }

    // Bounding box of all member systems
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of positions) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const spread = Math.max(maxX - minX, maxY - minY);
    // ratio proportional to spread; clamp between tight zoom and comfortable overview
    const ratio = Math.max(0.03, Math.min(0.4, spread * 1.8));

    sigmaRef.current.getCamera().animate(
      { x: centerX, y: centerY, ratio },
      { duration: 800, easing: "cubicOut" }
    );
  }, [members, universeData]);

  // Camera animation for highlighted character
  useEffect(() => {
    if (!highlightCharacterId || !universeData || !sigmaRef.current) return;

    for (const [sysId, membersHere] of membersBySystem.current) {
      if (membersHere.some((m) => m.characterId === highlightCharacterId)) {
        const nodeData = sigmaRef.current.getNodeDisplayData(String(sysId));
        if (nodeData) {
          sigmaRef.current.getCamera().animate(
            { x: nodeData.x, y: nodeData.y, ratio: 0.05 },
            { duration: 600, easing: "cubicOut" }
          );
        }
        break;
      }
    }
  }, [highlightCharacterId, universeData]);

  // Search
  useEffect(() => {
    if (!universeData || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    const results: { id: string; sys: SystemData }[] = [];
    for (const [id, sys] of Object.entries(universeData.systems)) {
      if (sys.n.toLowerCase().includes(q)) {
        results.push({ id, sys });
        if (results.length >= 8) break;
      }
    }
    setSearchResults(results);
  }, [searchQuery, universeData]);

  // Zoom + highlight a system (reused by search and external calls)
  const zoomAndHighlight = useCallback((systemId: string) => {
    if (!sigmaRef.current) return;
    const nodeData = sigmaRef.current.getNodeDisplayData(systemId);
    if (nodeData) {
      sigmaRef.current.getCamera().animate(
        { x: nodeData.x, y: nodeData.y, ratio: 0.05 },
        { duration: 600, easing: "cubicOut" }
      );
    }

    if (searchHighlightTimer.current) clearTimeout(searchHighlightTimer.current);
    searchHighlightRef.current = systemId;
    sigmaRef.current.scheduleRefresh();
    searchHighlightTimer.current = setTimeout(() => {
      searchHighlightRef.current = null;
      sigmaRef.current?.scheduleRefresh();
    }, 3000);
  }, []);

  const handleSearchSelect = useCallback((systemId: string) => {
    zoomAndHighlight(systemId);
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  }, [zoomAndHighlight]);

  // Expose zoom function to parent via ref
  useEffect(() => {
    zoomToSystemRef.current = zoomAndHighlight;
    return () => { zoomToSystemRef.current = null; };
  }, [zoomAndHighlight, zoomToSystemRef]);

  // Expose context menu opener to parent via ref
  const openContextMenuForSystem = useCallback((systemId: string, x: number, y: number) => {
    const data = universeDataRef.current;
    if (!data) return;
    const sys = data.systems[Number(systemId)];
    if (!sys) return;
    setContextMenu({ x, y, systemId, system: sys });
    setExpandedSubmenu(null);
    setSelectedCharIds(new Set());
  }, []);

  useEffect(() => {
    openContextMenuRef.current = openContextMenuForSystem;
    return () => { openContextMenuRef.current = null; };
  }, [openContextMenuForSystem, openContextMenuRef]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Toast helper
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  // Favorites helpers
  const toggleFavorite = useCallback(
    (systemId: string, sys: SystemData) => {
      const exists = favorites.some((f) => f.id === systemId);
      if (exists) {
        onFavoritesChange(favorites.filter((f) => f.id !== systemId));
      } else {
        onFavoritesChange([...favorites, { id: systemId, name: sys.n, security: sys.s }]);
      }
    },
    [favorites, onFavoritesChange]
  );

  // Context menu actions
  const handleContextAction = useCallback(
    (action: "fav" | "copy") => {
      if (!contextMenu) return;
      const sysName = contextMenu.system.n;

      setContextMenu(null);
      setExpandedSubmenu(null);
      setSelectedCharIds(new Set());

      if (action === "copy") {
        navigator.clipboard.writeText(sysName);
        showToast(`${sysName} copie`);
      } else if (action === "fav") {
        toggleFavorite(contextMenu.systemId, contextMenu.system);
        const isFav = favoritesRef.current.has(contextMenu.systemId);
        showToast(isFav ? `${sysName} retire des favoris` : `${sysName} ajoute aux favoris`);
      }
    },
    [contextMenu, showToast, toggleFavorite]
  );

  // Send destination/waypoint to selected characters
  const handleBatchAction = useCallback(
    (action: "dest" | "wp") => {
      if (!contextMenu || selectedCharIds.size === 0) return;
      const sysId = Number(contextMenu.systemId);
      const sysName = contextMenu.system.n;
      const clearOther = action === "dest";
      const label = clearOther ? "Destination" : "Waypoint";
      const ids = Array.from(selectedCharIds);

      setContextMenu(null);
      setExpandedSubmenu(null);
      setSelectedCharIds(new Set());

      showToast(`${label} → ${sysName} (${ids.length} perso${ids.length > 1 ? "s" : ""})...`);
      onSetDestination(sysId, "specific", clearOther, ids).then((ok) => {
        if (!ok) showToast(`Échec: ${label} ${sysName}`, "error");
      });
    },
    [contextMenu, selectedCharIds, onSetDestination, showToast]
  );

  // Toggle character selection
  const toggleCharSelection = useCallback((charId: number) => {
    setSelectedCharIds((prev) => {
      const next = new Set(prev);
      if (next.has(charId)) next.delete(charId);
      else next.add(charId);
      return next;
    });
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    sigmaRef.current?.getCamera().animatedZoom({ duration: 200 });
  }, []);

  const handleZoomOut = useCallback(() => {
    sigmaRef.current?.getCamera().animatedUnzoom({ duration: 200 });
  }, []);

  if (loading) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
        style={{ background: "#060a14" }}
      >
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: "var(--accent-green)", borderTopColor: "transparent" }}
          />
          <p style={{ color: "var(--text-secondary)" }}>
            Chargement de la carte...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden" style={{ background: "#060a14" }}>
      {/* Sigma WebGL container */}
      <div ref={sigmaContainerRef} className="absolute inset-0" />

      {/* Jump range canvas overlay */}
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 5 }}
      />

      {/* Region labels overlay (positioned imperatively by afterRender) */}
      <div ref={regionLabelsRef} className="absolute inset-0 pointer-events-none overflow-hidden">
        {universeData &&
          Object.entries(universeData.regions).map(([rid, region]) => (
            <div
              key={rid}
              className="absolute left-0 top-0 whitespace-nowrap"
              style={{
                color: "rgba(140, 165, 210, 0.4)",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "'Geist', sans-serif",
                textShadow: "0 0 8px rgba(0,0,0,0.8)",
                willChange: "transform",
              }}
            >
              {region.n}
            </div>
          ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 px-3 py-2 rounded-lg border text-sm"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            background: "rgba(10, 15, 26, 0.95)",
            borderColor: "var(--border)",
            transform: "translateY(-100%)",
            maxWidth: 250,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold">{tooltip.system.n}</span>
            <span
              className="text-xs font-mono font-bold"
              style={{ color: getSecurityColor(tooltip.system.s) }}
            >
              {tooltip.system.s.toFixed(1)}
            </span>
          </div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {universeData?.regions[tooltip.system.rid]?.n || ""}
            {" / "}
            {universeData?.constellations[tooltip.system.cid]?.n || ""}
          </div>
          {tooltip.members.length > 0 && (
            <div className="mt-1.5 pt-1.5 border-t" style={{ borderColor: "var(--border)" }}>
              {tooltip.members.map((m) => (
                <div key={m.characterId} className="flex items-center gap-1.5 text-xs">
                  {m.isNetkUser && (
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ background: "var(--accent-green)" }}
                    />
                  )}
                  <span>{m.characterName}</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    ({m.shipTypeName})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="absolute z-20 rounded-lg border overflow-hidden"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 260),
            top: Math.min(contextMenu.y, window.innerHeight - 400),
            background: "rgba(15, 20, 35, 0.97)",
            borderColor: "var(--border)",
            minWidth: 230,
          }}
        >
          <div
            className="px-3 py-2 border-b text-sm font-semibold flex items-center gap-2"
            style={{ borderColor: "var(--border)" }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: getSecurityColor(contextMenu.system.s) }}
            />
            {contextMenu.system.n}
            <span
              className="text-xs font-mono"
              style={{ color: getSecurityColor(contextMenu.system.s) }}
            >
              {contextMenu.system.s.toFixed(1)}
            </span>
          </div>

          {/* Set destination submenu */}
          <div
            className="relative"
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
              setExpandedSubmenu("dest");
            }}
            onMouseLeave={() => {
              hoverTimeoutRef.current = setTimeout(() => setExpandedSubmenu(null), 150);
            }}
          >
            <div
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-2 cursor-default"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
              Set destination
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="ml-auto transition-transform"
                style={{ transform: expandedSubmenu === "dest" ? "rotate(90deg)" : "rotate(0deg)" }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
            {expandedSubmenu === "dest" && (
              <div className="border-t" style={{ borderColor: "rgba(55, 65, 85, 0.4)" }}>
                {/* Fleet members */}
                {members.map((m) => (
                  <label
                    key={m.characterId}
                    className="w-full text-left px-3 py-1 text-xs hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                    style={{ paddingLeft: "1.25rem" }}
                  >
                    <input
                      type="checkbox"
                      className="accent-cyan-500 w-3 h-3 shrink-0"
                      checked={selectedCharIds.has(m.characterId)}
                      onChange={() => toggleCharSelection(m.characterId)}
                    />
                    <img
                      src={`https://images.evetech.net/characters/${m.characterId}/portrait?size=32`}
                      alt=""
                      className="w-4 h-4 rounded-full"
                    />
                    <span className="truncate">{m.characterName}</span>
                    <span className="ml-auto text-[10px] shrink-0" style={{ color: "var(--text-secondary)" }}>
                      {m.shipTypeName}
                    </span>
                  </label>
                ))}
                {/* Out of fleet characters */}
                {outOfFleet.length > 0 && (
                  <>
                    {members.length > 0 && (
                      <div className="border-t my-0.5" style={{ borderColor: "rgba(55, 65, 85, 0.3)" }} />
                    )}
                    {outOfFleet.map((c) => (
                      <label
                        key={c.characterId}
                        className="w-full text-left px-3 py-1 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
                        style={{
                          paddingLeft: "1.25rem",
                          opacity: c.online ? 1 : 0.35,
                          cursor: c.online ? "pointer" : "default",
                        }}
                      >
                        <input
                          type="checkbox"
                          className="accent-purple-500 w-3 h-3 shrink-0"
                          checked={selectedCharIds.has(c.characterId)}
                          onChange={() => c.online && toggleCharSelection(c.characterId)}
                          disabled={!c.online}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: c.online ? "#22c55e" : "#6b7280" }}
                        />
                        <img
                          src={`https://images.evetech.net/characters/${c.characterId}/portrait?size=32`}
                          alt=""
                          className="w-4 h-4 rounded-full"
                          style={{ filter: c.online ? "none" : "grayscale(100%)" }}
                        />
                        <span className="truncate">{c.characterName}</span>
                      </label>
                    ))}
                  </>
                )}
                {/* Actions row */}
                <div
                  className="border-t flex items-center gap-1 px-2 py-1"
                  style={{ borderColor: "rgba(55, 65, 85, 0.4)" }}
                >
                  <button
                    className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={() => {
                      const allIds = [
                        ...members.map((m) => m.characterId),
                        ...outOfFleet.filter((c) => c.online).map((c) => c.characterId),
                      ];
                      setSelectedCharIds(new Set(allIds));
                    }}
                  >
                    Tous
                  </button>
                  <button
                    className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={() => setSelectedCharIds(new Set())}
                  >
                    Aucun
                  </button>
                  <button
                    className="ml-auto text-[10px] px-2 py-0.5 rounded font-medium transition-colors"
                    style={{
                      background: selectedCharIds.size > 0 ? "rgba(6, 182, 212, 0.3)" : "rgba(55, 65, 85, 0.3)",
                      color: selectedCharIds.size > 0 ? "#22d3ee" : "var(--text-secondary)",
                      cursor: selectedCharIds.size > 0 ? "pointer" : "default",
                    }}
                    onClick={() => selectedCharIds.size > 0 && handleBatchAction("dest")}
                  >
                    Go ({selectedCharIds.size})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add waypoint submenu */}
          <div
            className="relative"
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
              setExpandedSubmenu("wp");
            }}
            onMouseLeave={() => {
              hoverTimeoutRef.current = setTimeout(() => setExpandedSubmenu(null), 150);
            }}
          >
            <div
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-2 cursor-default"
              style={{ color: "var(--text-secondary)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Add waypoint
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="ml-auto transition-transform"
                style={{ transform: expandedSubmenu === "wp" ? "rotate(90deg)" : "rotate(0deg)" }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
            {expandedSubmenu === "wp" && (
              <div className="border-t" style={{ borderColor: "rgba(55, 65, 85, 0.4)" }}>
                {/* Fleet members */}
                {members.map((m) => (
                  <label
                    key={m.characterId}
                    className="w-full text-left px-3 py-1 text-xs hover:bg-white/5 transition-colors flex items-center gap-2 cursor-pointer"
                    style={{ paddingLeft: "1.25rem" }}
                  >
                    <input
                      type="checkbox"
                      className="accent-cyan-500 w-3 h-3 shrink-0"
                      checked={selectedCharIds.has(m.characterId)}
                      onChange={() => toggleCharSelection(m.characterId)}
                    />
                    <img
                      src={`https://images.evetech.net/characters/${m.characterId}/portrait?size=32`}
                      alt=""
                      className="w-4 h-4 rounded-full"
                    />
                    <span className="truncate">{m.characterName}</span>
                    <span className="ml-auto text-[10px] shrink-0" style={{ color: "var(--text-secondary)" }}>
                      {m.shipTypeName}
                    </span>
                  </label>
                ))}
                {/* Out of fleet characters */}
                {outOfFleet.length > 0 && (
                  <>
                    {members.length > 0 && (
                      <div className="border-t my-0.5" style={{ borderColor: "rgba(55, 65, 85, 0.3)" }} />
                    )}
                    {outOfFleet.map((c) => (
                      <label
                        key={c.characterId}
                        className="w-full text-left px-3 py-1 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
                        style={{
                          paddingLeft: "1.25rem",
                          opacity: c.online ? 1 : 0.35,
                          cursor: c.online ? "pointer" : "default",
                        }}
                      >
                        <input
                          type="checkbox"
                          className="accent-purple-500 w-3 h-3 shrink-0"
                          checked={selectedCharIds.has(c.characterId)}
                          onChange={() => c.online && toggleCharSelection(c.characterId)}
                          disabled={!c.online}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: c.online ? "#22c55e" : "#6b7280" }}
                        />
                        <img
                          src={`https://images.evetech.net/characters/${c.characterId}/portrait?size=32`}
                          alt=""
                          className="w-4 h-4 rounded-full"
                          style={{ filter: c.online ? "none" : "grayscale(100%)" }}
                        />
                        <span className="truncate">{c.characterName}</span>
                      </label>
                    ))}
                  </>
                )}
                {/* Actions row */}
                <div
                  className="border-t flex items-center gap-1 px-2 py-1"
                  style={{ borderColor: "rgba(55, 65, 85, 0.4)" }}
                >
                  <button
                    className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={() => {
                      const allIds = [
                        ...members.map((m) => m.characterId),
                        ...outOfFleet.filter((c) => c.online).map((c) => c.characterId),
                      ];
                      setSelectedCharIds(new Set(allIds));
                    }}
                  >
                    Tous
                  </button>
                  <button
                    className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={() => setSelectedCharIds(new Set())}
                  >
                    Aucun
                  </button>
                  <button
                    className="ml-auto text-[10px] px-2 py-0.5 rounded font-medium transition-colors"
                    style={{
                      background: selectedCharIds.size > 0 ? "rgba(6, 182, 212, 0.3)" : "rgba(55, 65, 85, 0.3)",
                      color: selectedCharIds.size > 0 ? "#22d3ee" : "var(--text-secondary)",
                      cursor: selectedCharIds.size > 0 ? "pointer" : "default",
                    }}
                    onClick={() => selectedCharIds.size > 0 && handleBatchAction("wp")}
                  >
                    Go ({selectedCharIds.size})
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t" style={{ borderColor: "var(--border)" }} />

          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-2"
            style={{ color: "#f59e0b" }}
            onClick={() => handleContextAction("fav")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={favoritesRef.current.has(contextMenu.systemId) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {favoritesRef.current.has(contextMenu.systemId) ? "Retirer des favoris" : "Ajouter aux favoris"}
          </button>

          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-2"
            style={{ color: "var(--text-secondary)" }}
            onClick={() => handleContextAction("copy")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copier le nom
          </button>
        </div>
      )}

      {/* ---- Top-right controls ---- */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2 z-10">
        {/* Search bar */}
        <div className="flex items-center gap-1">
          {showSearch && (
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un système..."
                className="w-56 px-3 py-1.5 rounded-lg text-sm outline-none border"
                style={{
                  background: "rgba(10, 15, 26, 0.95)",
                  borderColor: "rgba(55, 65, 85, 0.6)",
                  color: "#e2e8f0",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchResults.length > 0) {
                    handleSearchSelect(searchResults[0].id);
                  }
                  if (e.key === "Escape") {
                    setShowSearch(false);
                    setSearchQuery("");
                  }
                }}
              />
              {/* Search results dropdown */}
              {searchResults.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-lg border overflow-hidden"
                  style={{
                    background: "rgba(10, 15, 26, 0.97)",
                    borderColor: "rgba(55, 65, 85, 0.6)",
                  }}
                >
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5 flex items-center gap-2"
                      onClick={() => handleSearchSelect(r.id)}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: getSecurityColor(r.sys.s) }}
                      />
                      <span className="text-slate-200 truncate">{r.sys.n}</span>
                      <span className="text-xs ml-auto shrink-0" style={{ color: getSecurityColor(r.sys.s) }}>
                        {r.sys.s.toFixed(1)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className="p-1.5 rounded-lg border transition-colors hover:bg-white/5"
            style={{
              background: "rgba(10, 15, 26, 0.8)",
              borderColor: "rgba(55, 65, 85, 0.5)",
            }}
            title="Rechercher (Ctrl+F)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </div>

        {/* Zoom controls */}
        <div
          className="flex flex-col rounded-lg border overflow-hidden"
          style={{
            background: "rgba(10, 15, 26, 0.8)",
            borderColor: "rgba(55, 65, 85, 0.5)",
          }}
        >
          <button
            className="px-2 py-1 text-sm font-mono hover:bg-white/5 transition-colors border-b"
            style={{ borderColor: "rgba(55, 65, 85, 0.5)", color: "#94a3b8" }}
            onClick={handleZoomIn}
          >
            +
          </button>
          <button
            className="px-2 py-1 text-sm font-mono hover:bg-white/5 transition-colors"
            style={{ color: "#94a3b8" }}
            onClick={handleZoomOut}
          >
            -
          </button>
        </div>
      </div>

      {/* ---- Security legend (bottom-left) ---- */}
      <div
        className="absolute bottom-4 left-4 rounded-lg border px-3 py-2 z-10"
        style={{
          background: "rgba(8, 12, 22, 0.9)",
          borderColor: "rgba(55, 65, 85, 0.4)",
        }}
      >
        <div className="text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>
          Securite
        </div>
        <div className="flex items-center gap-1">
          {[1.0, 0.8, 0.6, 0.4, 0.2, 0.0].map((sec) => (
            <div key={sec} className="flex flex-col items-center gap-0.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: getSecurityColor(sec) }}
              />
              <span className="text-[9px] font-mono" style={{ color: "#475569" }}>
                {sec.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-30 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="px-3 py-2 rounded-lg border text-sm animate-in fade-in slide-in-from-bottom-2"
              style={{
                background: t.type === "error" ? "rgba(220, 38, 38, 0.9)" : "rgba(15, 25, 40, 0.95)",
                borderColor: t.type === "error" ? "rgba(220, 38, 38, 0.5)" : "rgba(16, 185, 129, 0.3)",
                color: t.type === "error" ? "#fca5a5" : "#94a3b8",
              }}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* Close context menu on click elsewhere */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => { setContextMenu(null); setExpandedSubmenu(null); }}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu(null);
            setExpandedSubmenu(null);
          }}
        />
      )}
    </div>
  );
}

