import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Squad Graph — World Cup 2026",
  description: "Explore the social graph of World Cup 2026 players connected by shared club history",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a1a]">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚽</span>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Squad Graph</h1>
              <p className="text-xs text-slate-400">FIFA World Cup 2026 — Club Connections</p>
            </div>
          </div>
          <nav className="flex gap-1">
            <a href="#graph" className="nav-tab active">Graph</a>
            <a href="#players" className="nav-tab">Players</a>
            <a href="#clubs" className="nav-tab">Clubs</a>
            <a href="#path" className="nav-tab">Path Finder</a>
            <a href="#rankings" className="nav-tab">Rankings</a>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-white/8 py-4 text-center text-xs text-slate-500">
        Squad Graph — World Cup 2026 · Data: layerx-labs/wc2026-squad-graph-dataset · Built by AI agents
      </footer>
    </div>
  );
}
