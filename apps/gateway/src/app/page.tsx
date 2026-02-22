import { auth } from "@netk/auth";
import { redirect } from "next/navigation";
import { REGIONS } from "@netk/types";
import { StarField } from "@/components/StarField";
import { Header } from "@/components/layout";
import { ModulesGrid } from "@/components/ModulesGrid";

// URLs des modules (sous-domaines en prod, ports en dev)
const MODULE_URLS = {
  flipper: process.env.FLIPPER_URL || "http://localhost:3001",
};

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated Star Field */}
      <StarField />

      {/* Nebula gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-950/30 via-transparent to-purple-950/20 pointer-events-none" />

      {/* Scan lines effect */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)'
      }} />

      {/* Header */}
      <Header />

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <section className="text-center mb-20">
          <div className="inline-block mb-6">
            <span className="px-4 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-full tracking-wider uppercase">
              Capsuleer Tools v2.0
            </span>
          </div>
          <h2 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
              Dominez
            </span>
            <br />
            <span className="text-white">New Eden</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Suite d'outils pour maximiser vos profits dans l'univers d'EVE Online.
            Analyse de marché, tracking de bounties, et plus encore.
          </p>
        </section>

        {/* Modules Grid */}
        <section className="mb-20">
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-cyan-500/50" />
            <h3 className="text-sm font-medium text-cyan-400 tracking-[0.3em] uppercase">Modules</h3>
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>

          <ModulesGrid />
        </section>

        {/* Quick Access - Flipper Hubs */}
        <section>
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-cyan-500/50" />
            <h3 className="text-sm font-medium text-cyan-400 tracking-[0.3em] uppercase">Trade Hubs</h3>
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(REGIONS).map(([slug, region]) => (
              <HubCard
                key={slug}
                region={slug}
                hub={region.hub}
                faction={region.faction}
                baseUrl={MODULE_URLS.flipper}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-cyan-500/10 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="text-xs text-slate-600">NETK - New Eden Toolkit</p>
          <p className="text-xs text-slate-600">EVE Online &copy; CCP Games</p>
        </div>
      </footer>
    </div>
  );
}

function HubCard({
  region,
  hub,
  faction,
  baseUrl,
}: {
  region: string;
  hub: string;
  faction: string;
  baseUrl: string;
}) {
  const factionColors: Record<string, { gradient: string; text: string; glow: string }> = {
    caldari: { gradient: "from-blue-500 to-cyan-400", text: "text-cyan-400", glow: "shadow-cyan-500/20" },
    amarr: { gradient: "from-amber-500 to-yellow-400", text: "text-amber-400", glow: "shadow-amber-500/20" },
    minmatar: { gradient: "from-orange-500 to-red-400", text: "text-orange-400", glow: "shadow-orange-500/20" },
    gallente: { gradient: "from-green-500 to-emerald-400", text: "text-green-400", glow: "shadow-green-500/20" },
  };

  const colors = factionColors[faction] || factionColors.caldari;

  return (
    <a
      href={`${baseUrl}/${region}`}
      className={`group relative p-4 rounded-xl bg-slate-900/30 border border-slate-700/30 hover:border-slate-600/50 overflow-hidden transition-all duration-300 hover:shadow-lg ${colors.glow}`}
    >
      {/* Hover glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

      <div className="relative">
        <p className={`text-xs font-medium ${colors.text} capitalize tracking-wider`}>{faction}</p>
        <p className="text-white font-semibold mt-1 group-hover:text-white transition-colors">{hub}</p>
      </div>
    </a>
  );
}
