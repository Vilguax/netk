"use client";

import { useEffect, useState } from "react";
import { PROVIDER_COLORS, type AuthProvider } from "@netk/auth/client";

interface CharacterAvatarProps {
  characterId?: string | number | null;
  characterName?: string | null;
  oauthImage?: string | null;
  provider?: AuthProvider;
  size?: "sm" | "md" | "lg";
  showBadge?: boolean;
  fallback?: string;
}

const sizes = {
  sm: { container: "w-8 h-8", portrait: 32, ring: "border", badge: "text-[8px] px-1" },
  md: { container: "w-10 h-10", portrait: 64, ring: "border-2", badge: "text-[10px] px-1.5" },
  lg: { container: "w-16 h-16", portrait: 128, ring: "border-2", badge: "text-xs px-2 py-0.5" },
};

export function CharacterAvatar({
  characterId,
  characterName,
  oauthImage,
  provider = "credentials",
  size = "md",
  showBadge = false,
  fallback,
}: CharacterAvatarProps) {
  const sizeConfig = sizes[size];
  const providerColor = PROVIDER_COLORS[provider];
  const [oauthImageFailed, setOauthImageFailed] = useState(false);

  const providerName = {
    credentials: "NETK",
    google: "Google",
    discord: "Discord",
  }[provider];

  const normalizedOAuthImage =
    typeof oauthImage === "string" && oauthImage.trim().startsWith("http")
      ? oauthImage.trim()
      : null;

  useEffect(() => {
    setOauthImageFailed(false);
  }, [normalizedOAuthImage]);

  return (
    <div className="relative inline-block">
      {characterId ? (
        <img
          src={`https://images.evetech.net/characters/${characterId}/portrait?size=${sizeConfig.portrait}`}
          alt={characterName || "Avatar"}
          className={`${sizeConfig.container} rounded-lg object-cover`}
          style={{ boxShadow: `0 0 10px ${providerColor}30` }}
        />
      ) : normalizedOAuthImage && !oauthImageFailed ? (
        <img
          src={normalizedOAuthImage}
          alt={characterName || fallback || providerName}
          className={`${sizeConfig.container} rounded-lg object-cover`}
          style={{ boxShadow: `0 0 10px ${providerColor}30` }}
          referrerPolicy="no-referrer"
          onError={() => setOauthImageFailed(true)}
        />
      ) : (
        <div
          className={`${sizeConfig.container} rounded-lg bg-slate-800 flex items-center justify-center font-bold text-slate-500`}
          style={{ boxShadow: `0 0 10px ${providerColor}30` }}
        >
          {fallback?.charAt(0).toUpperCase() || "?"}
        </div>
      )}

      {/* Provider ring */}
      <div
        className={`absolute -inset-0.5 rounded-lg ${sizeConfig.ring} pointer-events-none`}
        style={{ borderColor: providerColor }}
      />

      {/* Provider badge */}
      {showBadge && (
        <div
          className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full font-medium text-white whitespace-nowrap ${sizeConfig.badge}`}
          style={{ backgroundColor: providerColor }}
        >
          {providerName}
        </div>
      )}
    </div>
  );
}
