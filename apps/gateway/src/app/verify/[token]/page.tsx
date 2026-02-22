"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { StarField } from "@/components/StarField";

type VerificationStatus = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function verifyEmail() {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Email vérifié avec succès !");
        } else {
          setStatus("error");
          setMessage(data.error || "Une erreur est survenue.");
        }
      } catch {
        setStatus("error");
        setMessage("Une erreur est survenue lors de la vérification.");
      }
    }

    if (token) {
      verifyEmail();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative flex items-center justify-center">
      {/* Animated Star Field */}
      <StarField />

      {/* Nebula gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-950/30 via-transparent to-purple-950/20 pointer-events-none" />

      {/* Scan lines effect */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-xl">
                N
              </div>
              <div className="absolute inset-0 rounded-lg bg-cyan-400/50 blur-md -z-10" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold tracking-wider">
                <span className="text-cyan-400">NET</span>
                <span className="text-white">K</span>
              </h1>
              <p className="text-[10px] text-cyan-500/60 tracking-[0.3em] uppercase">
                New Eden Toolkit
              </p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="relative rounded-2xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl overflow-hidden">
          {/* Glow effect based on status */}
          <div className={`absolute inset-0 bg-gradient-to-br ${
            status === "loading" ? "from-cyan-500/5 to-blue-500/5" :
            status === "success" ? "from-green-500/5 to-cyan-500/5" :
            "from-red-500/5 to-orange-500/5"
          }`} />

          <div className="relative p-8 text-center">
            {/* Loading state */}
            {status === "loading" && (
              <>
                <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="animate-spin h-8 w-8 text-cyan-400"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Vérification en cours...</h2>
                <p className="text-slate-400">
                  Veuillez patienter pendant que nous vérifions votre email.
                </p>
              </>
            )}

            {/* Success state */}
            {status === "success" && (
              <>
                <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Email vérifié !</h2>
                <p className="text-slate-400 mb-6">{message}</p>
                <Link
                  href="/login"
                  className="inline-block py-3 px-6 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all duration-300"
                >
                  Se connectér
                </Link>
              </>
            )}

            {/* Error state */}
            {status === "error" && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Échec de la vérification</h2>
                <p className="text-slate-400 mb-6">{message}</p>
                <div className="flex flex-col gap-3">
                  <Link
                    href="/login"
                    className="inline-block py-3 px-6 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:from-cyan-400 hover:to-blue-500 transition-all duration-300"
                  >
                    Retour à la connexion
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Créer un nouveau compte
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
