"use client";

import { useState } from "react";
import { Rocket, Crosshair, Shield, Zap, ChevronDown, X } from "lucide-react";
import { useFittings } from "@/hooks/useFittings";
import { ModuleTooltip } from "./ModuleTooltip";

interface FitPanelProps {
  ship?: {
    typeId: number;
    typeName: string;
    name?: string;
  } | null;
  isLoading?: boolean;
}

interface ModuleSlotProps {
  module?: {
    typeId: number;
    name: string;
    stats: Record<string, number>;
  };
  slotType: "high" | "med" | "low" | "rig";
  index: number;
}

function ModuleSlot({ module, slotType, index }: ModuleSlotProps) {
  const colors = {
    high: { bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)" },
    med: { bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.3)" },
    low: { bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.3)" },
    rig: { bg: "rgba(168, 85, 247, 0.1)", border: "rgba(168, 85, 247, 0.3)" },
  };

  const slotContent = (
    <div
      className="w-10 h-10 rounded border flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
      style={{
        background: colors[slotType].bg,
        borderColor: module ? colors[slotType].border : "rgba(100, 100, 100, 0.3)",
      }}
    >
      {module ? (
        <img
          src={`https://images.evetech.net/types/${module.typeId}/icon?size=32`}
          alt={module.name}
          className="w-8 h-8"
        />
      ) : null}
    </div>
  );

  if (module) {
    return (
      <ModuleTooltip name={module.name} stats={module.stats}>
        {slotContent}
      </ModuleTooltip>
    );
  }

  return slotContent;
}

export function FitPanel({ ship, isLoading: shipLoading }: FitPanelProps) {
  const { fittings, selectedFitting, isLoading: fittingsLoading, selectFitting, clearSelection } = useFittings();
  const [showFittingSelector, setShowFittingSelector] = useState(false);

  const isLoading = shipLoading || fittingsLoading;

  if (isLoading && !ship && !selectedFitting) {
    return (
      <aside
        className="w-72 h-screen fixed right-0 top-0 border-l p-4 overflow-y-auto"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--border)",
        }}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 rounded" style={{ background: "var(--border)" }} />
          <div className="h-40 w-full rounded-lg" style={{ background: "var(--border)" }} />
          <div className="h-4 w-24 rounded" style={{ background: "var(--border)" }} />
        </div>
      </aside>
    );
  }

  // Use selected fitting ship info if available, otherwise current ship
  const displayShip = selectedFitting
    ? { typeId: selectedFitting.shipTypeId, typeName: selectedFitting.shipName }
    : ship;

  return (
    <aside
      className="w-72 h-screen fixed right-0 top-0 border-l flex flex-col overflow-hidden"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--border)",
      }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h3 className="font-semibold flex items-center gap-2">
          <Rocket size={18} style={{ color: "var(--accent-green)" }} />
          {selectedFitting ? "Fitting" : "Vaisseau Actuel"}
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {displayShip ? (
          <>
            {/* Ship Image */}
            <div
              className="rounded-lg p-4 mb-4 flex items-center justify-center"
              style={{ background: "rgba(16, 185, 129, 0.05)" }}
            >
              <img
                src={`https://images.evetech.net/types/${displayShip.typeId}/render?size=128`}
                alt={displayShip.typeName}
                className="w-32 h-32 object-contain"
              />
            </div>

            {/* Ship Name */}
            <div className="text-center mb-4">
              <p className="font-bold text-lg">{displayShip.typeName}</p>
              {selectedFitting && (
                <p className="text-sm" style={{ color: "var(--accent-green)" }}>
                  {selectedFitting.name}
                </p>
              )}
            </div>

            {/* Fitting Selector */}
            <div className="mb-4">
              <button
                onClick={() => setShowFittingSelector(!showFittingSelector)}
                className="w-full p-2 rounded-lg border flex items-center justify-between text-sm"
                style={{
                  background: "var(--background)",
                  borderColor: "var(--border)",
                }}
              >
                <span>
                  {selectedFitting ? selectedFitting.name : "Choisir un fit sauvegardé"}
                </span>
                <ChevronDown size={16} />
              </button>

              {showFittingSelector && (
                <div
                  className="mt-2 rounded-lg border max-h-48 overflow-y-auto"
                  style={{
                    background: "var(--background)",
                    borderColor: "var(--border)",
                  }}
                >
                  {selectedFitting && (
                    <button
                      onClick={() => {
                        clearSelection();
                        setShowFittingSelector(false);
                      }}
                      className="w-full p-2 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                      style={{ color: "#ef4444" }}
                    >
                      <X size={14} />
                      Retirer le fit
                    </button>
                  )}
                  {fittings.length === 0 ? (
                    <p className="p-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      Aucun fit sauvegardé
                    </p>
                  ) : (
                    fittings.map((fit) => (
                      <button
                        key={fit.id}
                        onClick={() => {
                          selectFitting(fit.id);
                          setShowFittingSelector(false);
                        }}
                        className="w-full p-2 text-left text-sm hover:bg-white/5 border-b last:border-b-0"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <p className="font-medium">{fit.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {fit.shipName} • {fit.itemCount} modules
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="space-y-3 mb-4">
              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: "rgba(59, 130, 246, 0.1)" }}
              >
                <div className="flex items-center gap-2">
                  <Crosshair size={16} style={{ color: "var(--accent-blue)" }} />
                  <span className="text-sm">DPS</span>
                </div>
                <span className="font-bold" style={{ color: "var(--accent-blue)" }}>
                  --
                </span>
              </div>

              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: "rgba(16, 185, 129, 0.1)" }}
              >
                <div className="flex items-center gap-2">
                  <Shield size={16} style={{ color: "var(--accent-green)" }} />
                  <span className="text-sm">Tank</span>
                </div>
                <span className="font-bold" style={{ color: "var(--accent-green)" }}>
                  --
                </span>
              </div>

              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: "rgba(245, 158, 11, 0.1)" }}
              >
                <div className="flex items-center gap-2">
                  <Zap size={16} style={{ color: "var(--accent-gold)" }} />
                  <span className="text-sm">Cap</span>
                </div>
                <span className="font-bold" style={{ color: "var(--accent-gold)" }}>
                  --
                </span>
              </div>
            </div>

            {/* Module Slots */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                MODULES
              </p>

              {selectedFitting ? (
                <div className="space-y-3">
                  {/* High Slots */}
                  {selectedFitting.slots.high.length > 0 && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: "#ef4444" }}>High</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedFitting.slots.high.map((mod, i) => (
                          <ModuleSlot key={i} module={mod} slotType="high" index={i} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Med Slots */}
                  {selectedFitting.slots.med.length > 0 && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: "#3b82f6" }}>Mid</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedFitting.slots.med.map((mod, i) => (
                          <ModuleSlot key={i} module={mod} slotType="med" index={i} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Low Slots */}
                  {selectedFitting.slots.low.length > 0 && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: "#10b981" }}>Low</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedFitting.slots.low.map((mod, i) => (
                          <ModuleSlot key={i} module={mod} slotType="low" index={i} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rig Slots */}
                  {selectedFitting.slots.rig.length > 0 && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: "#a855f7" }}>Rigs</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedFitting.slots.rig.map((mod, i) => (
                          <ModuleSlot key={i} module={mod} slotType="rig" index={i} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Drones */}
                  {selectedFitting.slots.drone.length > 0 && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Drones</p>
                      <div className="space-y-1">
                        {selectedFitting.slots.drone.map((drone, i) => (
                          <ModuleTooltip key={i} name={drone.name} stats={drone.stats}>
                            <div
                              className="flex items-center gap-2 p-1 rounded hover:bg-white/5 cursor-pointer"
                            >
                              <img
                                src={`https://images.evetech.net/types/${drone.typeId}/icon?size=32`}
                                alt={drone.name}
                                className="w-6 h-6"
                              />
                              <span className="text-xs flex-1 truncate">{drone.name}</span>
                              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                x{drone.quantity}
                              </span>
                            </div>
                          </ModuleTooltip>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <ModuleSlot key={`high-${i}`} slotType="high" index={i} />
                  ))}
                  {[1, 2, 3, 4].map((i) => (
                    <ModuleSlot key={`med-${i}`} slotType="med" index={i} />
                  ))}
                  {[1, 2, 3, 4].map((i) => (
                    <ModuleSlot key={`low-${i}`} slotType="low" index={i} />
                  ))}
                  {[1, 2].map((i) => (
                    <ModuleSlot key={`rig-${i}`} slotType="rig" index={i} />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Rocket size={48} className="mb-4" style={{ color: "var(--text-secondary)" }} />
            <p style={{ color: "var(--text-secondary)" }}>Aucun vaisseau détecté</p>
            <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
              Connectez-vous à EVE Online
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

