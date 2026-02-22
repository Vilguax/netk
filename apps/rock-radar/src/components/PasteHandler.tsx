"use client";

import { useEffect, useCallback } from "react";
import { parseSurveyScan, isSurveyScanData } from "@/lib/parser";
import type { SurveyScan } from "@netk/types";

interface PasteHandlerProps {
  onScan: (scan: SurveyScan) => void;
  onError?: (message: string) => void;
  enabled?: boolean;
}

export function PasteHandler({
  onScan,
  onError,
  enabled = true,
}: PasteHandlerProps) {
  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      if (!enabled) return;

      const text = event.clipboardData?.getData("text");
      if (!text) return;

      // Check if it looks like survey data
      if (!isSurveyScanData(text)) {
        return; // Ignore non-survey pastes
      }

      // Prevent default paste behavior when we handle it
      event.preventDefault();

      try {
        const scan = parseSurveyScan(text);
        if (scan && scan.rocks.length > 0) {
          onScan(scan);
        } else {
          onError?.("Aucun rocher detecte dans le scan");
        }
      } catch (error) {
        console.error("Parse error:", error);
        onError?.("Erreur lors du parsing du scan");
      }
    },
    [enabled, onScan, onError]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [enabled, handlePaste]);

  return null; // This component doesn't render anything
}

// Visual indicator component to show paste instructions
export function PasteIndicator({
  hasScans,
  isListening,
}: {
  hasScans: boolean;
  isListening: boolean;
}) {
  if (!isListening) return null;

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50
        px-4 py-3 rounded-xl
        bg-slate-900/90 border border-slate-700/50
        backdrop-blur-sm
        transition-all duration-300
        ${hasScans ? "opacity-50 hover:opacity-100" : "animate-pulse"}
      `}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <kbd className="px-2 py-1 text-xs font-mono bg-slate-800 rounded border border-slate-600">
            Ctrl
          </kbd>
          <span className="text-slate-500">+</span>
          <kbd className="px-2 py-1 text-xs font-mono bg-slate-800 rounded border border-slate-600">
            V
          </kbd>
        </div>
        <span className="text-sm text-slate-400">
          {hasScans ? "Coller un nouveau scan" : "Collez votre Survey Scan"}
        </span>
      </div>
    </div>
  );
}
