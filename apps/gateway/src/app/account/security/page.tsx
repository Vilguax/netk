"use client";

import { useState, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: "Faible", color: "bg-red-500" };
  if (score <= 4) return { score, label: "Moyen", color: "bg-yellow-500" };
  return { score, label: "Fort", color: "bg-green-500" };
}

export default function SecurityPage() {
  const { data: session } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const passwordsMatch = newPassword === confirmPassword;
  const isCredentialsProvider = session?.user?.provider === "credentials";

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: "Mot de passe modifié avec succès." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: data.error || "Erreur lors du changement." });
      }
    } catch {
      setMessage({ type: "error", text: "Une erreur est survenue." });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutAll = async () => {
    if (!confirm("Êtes-vous sûr de vouloir vous déconnecter de tous les appareils ?")) {
      return;
    }
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Sécurité</h2>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="float-right text-current opacity-50 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Change password section */}
      <div className="relative rounded-xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />
        <div className="relative p-6">
          <h3 className="text-lg font-medium text-white mb-4">Changer le mot de passe</h3>

          {isCredentialsProvider ? (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mot de passe actuel
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.color} transition-all duration-300`}
                          style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs ${
                        passwordStrength.score <= 2 ? "text-red-400" :
                        passwordStrength.score <= 4 ? "text-yellow-400" : "text-green-400"
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg bg-slate-800/50 border text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all ${
                    confirmPassword && !passwordsMatch
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30"
                      : "border-slate-700/50 focus:border-cyan-500/50 focus:ring-cyan-500/30"
                  }`}
                  placeholder="••••••••"
                  required
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-400 mt-1">
                    Les mots de passe ne correspondent pas
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !passwordsMatch}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {loading ? "Modification..." : "Modifier le mot de passe"}
              </button>
            </form>
          ) : (
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/30">
              <p className="text-slate-400">
                Vous êtes connecté via{" "}
                <span className="text-white font-medium">
                  {session?.user?.provider === "google" ? "Google" : "Discord"}
                </span>
                . La gestion du mot de passe se fait directement sur ce service.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2FA Section (coming soon) */}
      <div className="relative rounded-xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white mb-1">
                Authentification à deux facteurs
              </h3>
              <p className="text-sm text-slate-400">
                Ajoutez une couche de sécurité supplémentaire à votre compte
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700">
              Bientôt disponible
            </span>
          </div>
        </div>
      </div>

      {/* Sessions section */}
      <div className="relative rounded-xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />
        <div className="relative p-6">
          <h3 className="text-lg font-medium text-white mb-4">Sessions actives</h3>
          <p className="text-sm text-slate-400 mb-4">
            Si vous pensez que votre compte a été compromis, déconnectez-vous de toutes les sessions.
          </p>
          <button
            onClick={handleSignOutAll}
            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
          >
            Se déconnecter de tous les appareils
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="relative rounded-xl bg-red-900/20 border border-red-500/30 backdrop-blur-xl overflow-hidden">
        <div className="relative p-6">
          <h3 className="text-lg font-medium text-red-400 mb-4">Zone de danger</h3>
          <p className="text-sm text-slate-400 mb-4">
            La suppression de votre compte est irréversible. Toutes vos données seront perdues.
          </p>
          <button
            disabled
            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 opacity-50 cursor-not-allowed"
          >
            Supprimer mon compte (bientôt)
          </button>
        </div>
      </div>
    </div>
  );
}

