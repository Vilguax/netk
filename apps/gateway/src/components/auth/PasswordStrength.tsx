"use client";

import { useMemo } from "react";

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

interface StrengthResult {
  score: number;
  label: string;
  color: string;
  textColor: string;
}

function calculateStrength(password: string): StrengthResult {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) {
    return { score, label: "Faible", color: "bg-red-500", textColor: "text-red-400" };
  } else if (score <= 4) {
    return { score, label: "Moyen", color: "bg-yellow-500", textColor: "text-yellow-400" };
  } else {
    return { score, label: "Fort", color: "bg-green-500", textColor: "text-green-400" };
  }
}

interface Requirement {
  label: string;
  met: boolean;
}

function getRequirements(password: string): Requirement[] {
  return [
    { label: "Au moins 8 caractères", met: password.length >= 8 },
    { label: "Une lettre minuscule", met: /[a-z]/.test(password) },
    { label: "Une lettre majuscule", met: /[A-Z]/.test(password) },
    { label: "Un chiffre", met: /[0-9]/.test(password) },
  ];
}

export function PasswordStrength({ password, showRequirements = false }: PasswordStrengthProps) {
  const strength = useMemo(() => calculateStrength(password), [password]);
  const requirements = useMemo(() => getRequirements(password), [password]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${strength.color} transition-all duration-300`}
            style={{ width: `${(strength.score / 6) * 100}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${strength.textColor}`}>
          {strength.label}
        </span>
      </div>

      {/* Requirements list */}
      {showRequirements && (
        <ul className="space-y-1">
          {requirements.map((req) => (
            <li
              key={req.label}
              className={`flex items-center gap-2 text-xs ${
                req.met ? "text-green-400" : "text-slate-500"
              }`}
            >
              {req.met ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {req.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
