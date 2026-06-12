"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Dataset, Player, Club, GraphNode, GraphEdge, AdjacencyList, ClubStats } from "@/lib/types";
import { loadDataset, buildClubMaps, buildPlayerMaps, computeClubStats } from "@/lib/data";
import {
  buildAdjacencyList, buildGraphNodes, buildGraphEdges,
  findShortestPath, getClubRoster, getClubSeasons, getSeasonRange
} from "@/lib/graph";
import { getCountryColor } from "@/lib/types";

// ---- Force Graph component ----
function ForceGraphCanvas({
  nodes, edges, selectedClub, selectedSeason
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedClub: string | null;
  selectedSeason: string | null;
}) {
  const canvasRef = useCallback((el: HTMLCanvasElement | null) => {
    if (!el) return;
    const ctx = el.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    el.width = el.offsetWidth * dpr;
    el.height = el.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const W2 = el.offsetWidth, H2 = el.offsetHeight;

    const visibleEdges = edges.filter(e =>
      (selectedClub === null || e.club_id === selectedClub) &&
      (selectedSeason === null || e.season === selectedSeason)
    );
    const visibleNodeIds = new Set<string>();
    for (const e of visibleEdges) { visibleNodeIds.add(e.source); visibleNodeIds.add(e.target); }

    const visibleNodes = nodes.filter(n => visibleNodeIds.has(n.id));
    const nodeMap = new Map(visibleNodes.map(n => [n.id, n]));

    type SimNode = { id: string; x: number; y: number; vx: number; vy: number };
    const simNodes: SimNode[] = visibleNodes.map(n => ({
      id: n.id, x: Math.random() * W2, y: Math.random() * H2, vx: 0, vy: 0
    }));
    const simMap = new Map(simNodes.map(n => [n.id, n]));

    let animId: number;
    const ALPHA = 0.08, REPULSION = 4000, ATTRACTION = 0.008, DAMPING = 0.88;

    function step() {
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i], b = simNodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
          const force = REPULSION / (dist * dist);
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          a.vx -= fx * ALPHA; a.vy -= fy * ALPHA;
          b.vx += fx * ALPHA; b.vy += fy * ALPHA;
        }
      }
      for (const e of visibleEdges) {
        const a = simMap.get(e.source), b = simMap.get(e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const force = dist * ATTRACTION;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        a.vx += fx * ALPHA; a.vy += fy * ALPHA;
        b.vx -= fx * ALPHA; b.vy -= fy * ALPHA;
      }
      for (const n of simNodes) {
        n.x += n.vx; n.y += n.vy;
        n.vx *= DAMPING; n.vy *= DAMPING;
        if (n.x < 20) n.vx += 2; if (n.x > W2 - 20) n.vx -= 2;
        if (n.y < 20) n.vy += 2; if (n.y > H2 - 20) n.vy -= 2;
        n.x = Math.max(10, Math.min(W2 - 10, n.x));
        n.y = Math.max(10, Math.min(H2 - 10, n.y));
      }
      ctx.clearRect(0, 0, W2, H2);
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 0.5;
      for (const e of visibleEdges) {
        const a = simMap.get(e.source), b = simMap.get(e.target);
        if (!a || !b) continue;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      for (const n of simNodes) {
        const node = nodeMap.get(n.id);
        if (!node) continue;
        const deg = node.degree;
        const r = Math.max(4, Math.min(12, 3 + Math.sqrt(deg) * 1.2));
        ctx.fillStyle = getCountryColor(node.country);
        ctx.globalAlpha = 0.88;
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1; ctx.stroke();
      }
      animId = requestAnimationFrame(step);
    }

    step();
    return () => cancelAnimationFrame(animId);
  }, [nodes, edges, selectedClub, selectedSeason]);

  return (
    <div className="graph-container relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

// ---- Player Search ----
function PlayerSearch({ players, onSelect }: { players: Player[]; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const results = query.length < 2 ? [] : players.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.country.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 20);

  return (
    <div className="relative">
      <input type="text" value={query} onChange={e => setQuery(e.target.value)}
        placeholder="Search players by name or country..."
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50" />
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d0d20] border border-white/10 rounded-lg overflow-hidden z-50 shadow-xl max-h-64 overflow-y-auto">
          {results.map(p => (
            <button key={p.id} onClick={() => { onSelect(p.id); setQuery(""); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/8 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getCountryColor(p.country) }} />
              <span className="text-white font-medium">{p.name}</span>
              <span className="text-slate-400 text-xs">{p.country}</span>
              <span className="text-slate-500 text-xs ml-auto">{p.position}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Club Rankings ----
function ClubRankings({ stats }: { stats: ClubStats[] }) {
  const [sortBy, setSortBy] = useState<"nations" | "pairs" | "players">("nations");
  const sorted = useMemo(() =>
    [...stats].sort((a, b) => {
      if (sortBy === "nations") return b.nationCount - a.nationCount;
      if (sortBy === "pairs") return b.pairCount - a.pairCount;
      return b.playerCount - a.playerCount;
    }).slice(0, 30),
    [stats, sortBy]
  );

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["nations", "pairs", "players"] as const).map(k => (
          <button key={k} onClick={() => setSortBy(k)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${sortBy === k ? "bg-indigo-600 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}>
            {k === "nations" ? "By Nations" : k === "pairs" ? "By Connections" : "By Players"}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>#</th><th>Club</th><th>Country</th><th>Nations</th><th>Connections</th><th>Players</th></tr></thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr key={s.id}>
                <td className="text-slate-500">{i + 1}</td>
                <td className="text-white font-medium">{s.name}</td>
                <td className="text-slate-400">{s.country}</td>
                <td><span className="text-indigo-400 font-bold">{s.nationCount}</span></td>
                <td><span className="text-emerald-400">{s.pairCount.toLocaleString()}</span></td>
                <td><span className="text-slate-300">{s.playerCount}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Path Finder ----
function PathFinder({ players, adj }: { players: Player[]; adj: AdjacencyList }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [result, setResult] = useState<{ distance: number; path: string[] } | null>(null);
  const [error, setError] = useState("");
  const playerMap = useMemo(() => new Map(players.map(p => [p.name.toLowerCase(), p])), [players]);

  function handleFind() {
    setError(""); setResult(null);
    const pa = playerMap.get(a.toLowerCase());
    const pb = playerMap.get(b.toLowerCase());
    if (!pa) { setError(`Player "${a}" not found`); return; }
    if (!pb) { setError(`Player "${b}" not found`); return; }
    const r = findShortestPath(adj, pa.id, pb.id);
    if (!r) { setError("No connection found between these players"); return; }
    setResult(r);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Player A</label>
          <input value={a} onChange={e => setA(e.target.value)} placeholder="e.g. Kylian Mbappé"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Player B</label>
          <input value={b} onChange={e => setB(e.target.value)} placeholder="e.g. Lamine Yamal"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50" />
        </div>
      </div>
      <button onClick={handleFind}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition">
        Find Shortest Path
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {result && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <p className="text-sm text-slate-300">
            <span className="text-indigo-400 font-bold text-lg">{result.distance}</span> degrees of separation
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {result.path.map((pid, i) => {
              const p = players.find(x => x.id === pid);
              return (
                <span key={i} className="flex items-center gap-2">
                  <span className="bg-white/8 rounded-lg px-3 py-1.5 text-sm text-white">{p?.name ?? pid}</span>
                  {i < result.path.length - 1 && <span className="text-slate-500 text-xs">→</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Club Browser ----
function ClubBrowser({ clubs, players, clubMap }: { clubs: Club[]; players: Player[]; clubMap: Record<string, Club> }) {
  const [selected, setSelected] = useState<Club | null>(null);
  const [season, setSeason] = useState<string>("");
  const [query, setQuery] = useState("");

  const filtered = clubs.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) || c.country.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 50);
  const seasons = selected ? getClubSeasons(players, selected.id) : [];
  const roster = selected ? getClubRoster(players, selected.id, season || undefined) : [];

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search clubs..."
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 mb-4" />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
          {filtered.map(c => (
            <button key={c.id} onClick={() => { setSelected(c); setSeason(""); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selected?.id === c.id ? "bg-indigo-600/30 text-white border border-indigo-500/30" : "hover:bg-white/6 text-slate-300"}`}>
              <span className="font-medium">{c.name}</span>
              <span className="text-slate-500 text-xs ml-2">{c.country}</span>
            </button>
          ))}
        </div>
        <div>
          {selected && (
            <div className="space-y-3">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-semibold text-sm mb-1">{selected.name}</h3>
                <p className="text-slate-400 text-xs">{selected.country}</p>
              </div>
              {seasons.length > 0 && (
                <select value={season} onChange={e => setSeason(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                  <option value="">All seasons</option>
                  {seasons.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {roster.map(p => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-white/4 rounded-lg">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getCountryColor(p.country) }} />
                    <span className="text-white text-xs font-medium">{p.name}</span>
                    <span className="text-slate-500 text-xs ml-auto">{p.country}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Season Slider ----
function SeasonSlider({ min, max }: { min: string; max: string }) {
  const [current, setCurrent] = useState(min);
  const [playing, setPlaying] = useState(false);
  const seasons = useMemo(() => {
    const result: string[] = [];
    let cur = min;
    while (cur <= max) {
      result.push(cur);
      const [y] = cur.split("-");
      const next = String(parseInt(y) + 1).padStart(4, "0") + "-" + String((parseInt(y) + 1) % 100).padStart(2, "0");
      cur = next;
      if (result.length > 50) break;
    }
    return result;
  }, [min, max]);
  const idx = seasons.indexOf(current);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 w-16">{min}</span>
        <input type="range" min={0} max={Math.max(0, seasons.length - 1)} value={idx}
          onChange={e => setCurrent(seasons[parseInt(e.target.value)] ?? min)} className="flex-1" />
        <span className="text-xs text-slate-500 w-16 text-right">{max}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-indigo-400 font-mono text-sm font-bold">{current}</span>
        <button onClick={() => setPlaying(p => !p)}
          className="bg-white/8 hover:bg-white/12 text-white rounded-lg px-3 py-1 text-xs font-medium transition">
          {playing ? "⏸ Pause" : "▶ Play"}
        </button>
      </div>
    </div>
  );
}

// ---- Main App Component ----
export function SquadGraphApp() {
  const [data, setData] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("graph");
  const [adj, setAdj] = useState<AdjacencyList>([]);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [clubStats, setClubStats] = useState<ClubStats[]>([]);
  const [clubMap, setClubMap] = useState<Record<string, Club>>({});
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const clubList = useMemo(() => Object.values(clubMap), [clubMap]);
  const seasons = useMemo(() => data ? getSeasonRange(data.players) : { min: "", max: "" }, [data]);
  const allSeasons = useMemo(() => {
    if (!data) return [];
    const ss = new Set<string>();
    for (const p of data.players) for (const s of p.stints) ss.add(s.season);
    return Array.from(ss).sort();
  }, [data]);

  useEffect(() => {
    loadDataset()
      .then(d => {
        setData(d);
        buildClubMaps(d.clubs);
        buildPlayerMaps(d.players);
        const map: Record<string, Club> = {};
        for (const c of d.clubs) map[c.id] = c;
        setClubMap(map);
        const adjList = buildAdjacencyList(d.players);
        const gNodes = buildGraphNodes(d.players, adjList);
        const gEdges = buildGraphEdges(d.players);
        const stats = computeClubStats(d.players, d.clubs);
        setAdj(adjList);
        setNodes(gNodes);
        setEdges(gEdges);
        setClubStats(stats);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading squad data...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-red-400 bg-red-900/20 border border-red-800 rounded-xl px-6 py-4 text-sm">
        Failed to load data: {error}
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold text-white mb-2">Squad Graph Explorer</h2>
        <p className="text-slate-400 text-sm max-w-2xl mx-auto">
          Explore {data.meta.player_count.toLocaleString()} World Cup 2026 players across {data.meta.club_count.toLocaleString()} clubs.
          Discover hidden connections — players who shared a club in the same season, even if they now represent rival nations.
        </p>
        <div className="flex justify-center gap-4 mt-4 text-xs text-slate-500">
          <span>⚽ {data.meta.player_count.toLocaleString()} players</span>
          <span>🏟️ {data.meta.club_count.toLocaleString()} clubs</span>
          <span>🔗 ~{(edges.length / 1000).toFixed(1)}k connections</span>
        </div>
      </div>

      <div className="flex gap-1 bg-white/4 rounded-xl p-1 overflow-x-auto">
        {[
          { id: "graph", label: "📊 Graph" },
          { id: "players", label: "👥 Players" },
          { id: "clubs", label: "🏟️ Clubs" },
          { id: "path", label: "🧭 Path Finder" },
          { id: "rankings", label: "🏆 Rankings" },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`nav-tab whitespace-nowrap ${activeTab === t.id ? "active" : ""}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "graph" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Filter by Club</label>
              <select value={selectedClub ?? ""} onChange={e => setSelectedClub(e.target.value || null)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                <option value="">All clubs</option>
                {clubList.slice(0, 200).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Filter by Season</label>
              <select value={selectedSeason ?? ""} onChange={e => setSelectedSeason(e.target.value || null)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                <option value="">All seasons</option>
                {allSeasons.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Season Timeline</label>
              <SeasonSlider min={seasons.min} max={seasons.max} />
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d20]" style={{ height: "520px" }}>
            <ForceGraphCanvas nodes={nodes} edges={edges} selectedClub={selectedSeason ? null : selectedClub} selectedSeason={selectedSeason} />
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            {Object.entries({
              "Argentina": "#75AADB", "Brazil": "#009C3B", "France": "#002395",
              "Spain": "#AA151B", "England": "#FFFFFF", "Germany": "#000000",
              "Portugal": "#006600", "Netherlands": "#FF6600"
            }).map(([c, col]) => (
              <span key={c} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: col }} />
                {c}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-500" />
              Other nations
            </span>
          </div>
        </div>
      )}

      {activeTab === "players" && (
        <div className="space-y-4">
          <PlayerSearch players={data.players} onSelect={(id) => {
            const p = data.players.find(x => x.id === id);
            setSelectedPlayer(p ?? null);
          }} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {data.players.slice(0, 100).map(p => (
                <button key={p.id} onClick={() => setSelectedPlayer(p)}
                  className={`w-full text-left player-card flex items-center gap-3 ${selectedPlayer?.id === p.id ? "border-indigo-500/40" : ""}`}>
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: getCountryColor(p.country), color: "#fff" }}>
                    {p.name[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.name}</p>
                    <p className="text-slate-400 text-xs">{p.country} · {p.position}</p>
                  </div>
                </button>
              ))}
            </div>
            <div>
              {selectedPlayer ? (
                <div className="player-card space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
                      style={{ background: getCountryColor(selectedPlayer.country), color: "#fff" }}>
                      {selectedPlayer.name[0]}
                    </div>
                    <div>
                      <h3 className="text-white text-lg font-bold">{selectedPlayer.name}</h3>
                      <p className="text-slate-400 text-sm">{selectedPlayer.country}</p>
                      <p className="text-slate-500 text-xs">{selectedPlayer.position}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Club History</h4>
                    <div className="space-y-2">
                      {selectedPlayer.stints.map((s, i) => {
                        const club = clubMap[s.club_id];
                        return (
                          <div key={i} className="flex items-center gap-3 px-3 py-2 bg-white/4 rounded-lg">
                            <span className="text-white text-sm font-medium">{club?.name ?? s.club_id}</span>
                            <span className="text-indigo-400 text-xs ml-auto">{s.season}</span>
                            <span className="text-slate-500 text-xs">{club?.country}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="player-card text-center py-12 text-slate-500 text-sm">Select a player to see details</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "clubs" && (
        <ClubBrowser clubs={clubList} players={data.players} clubMap={clubMap} />
      )}

      {activeTab === "path" && (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-white text-xl font-bold mb-2">Degrees of Separation</h3>
            <p className="text-slate-400 text-sm">Find the shortest connection path between any two World Cup players</p>
          </div>
          <div className="player-card">
            <PathFinder players={data.players} adj={adj} />
          </div>
        </div>
      )}

      {activeTab === "rankings" && (
        <ClubRankings stats={clubStats} />
      )}
    </div>
  );
}
