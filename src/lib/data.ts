import { Dataset } from "./types";

// In-memory cache for client-side use
let _dataset: Dataset | null = null;

export async function loadDataset(): Promise<Dataset> {
  if (_dataset) return _dataset;
  // Load from the public/data/players.json (served as static file)
  const res = await fetch("/data/players.json");
  if (!res.ok) throw new Error(`Failed to load players.json: ${res.status}`);
  _dataset = await res.json();
  return _dataset!;
}

// --- Club lookup helpers ---
const _clubMap: Record<string, import("./types").Club> = {};
const _clubNameMap: Record<string, import("./types").Club> = {};

export function buildClubMaps(clubs: import("./types").Club[]): void {
  for (const c of clubs) {
    _clubMap[c.id] = c;
    _clubNameMap[c.name.toLowerCase()] = c;
  }
}

export function getClubById(id: string): import("./types").Club | undefined {
  return _clubMap[id];
}

export function getClubByName(name: string): import("./types").Club | undefined {
  return _clubNameMap[name.toLowerCase()];
}

// --- Player lookup helpers ---
const _playerMap: Record<string, import("./types").Player> = {};
const _playerNameMap: Record<string, import("./types").Player[]> = {};

export function buildPlayerMaps(players: import("./types").Player[]): void {
  for (const p of players) {
    _playerMap[p.id] = p;
    const key = p.name.toLowerCase();
    if (!_playerNameMap[key]) _playerNameMap[key] = [];
    _playerNameMap[key].push(p);
  }
}

export function getPlayerById(id: string): import("./types").Player | undefined {
  return _playerMap[id];
}

export function getPlayersByName(name: string): import("./types").Player[] {
  return _playerNameMap[name.toLowerCase()] ?? [];
}

// --- Club stats ---
export function computeClubStats(
  players: import("./types").Player[],
  clubs: import("./types").Club[]
): import("./types").ClubStats[] {
  const clubPlayers = new Map<string, Set<string>>();
  const clubNations = new Map<string, Set<string>>();

  for (const p of players) {
    for (const stint of p.stints) {
      if (!clubPlayers.has(stint.club_id)) {
        clubPlayers.set(stint.club_id, new Set());
        clubNations.set(stint.club_id, new Set());
      }
      clubPlayers.get(stint.club_id)!.add(p.id);
      clubNations.get(stint.club_id)!.add(p.country);
    }
  }

  const seasonGroups = new Map<string, Set<string>>();
  for (const p of players) {
    for (const stint of p.stints) {
      const key = `${stint.club_id}::${stint.season}`;
      if (!seasonGroups.has(key)) seasonGroups.set(key, new Set());
      seasonGroups.get(key)!.add(p.id);
    }
  }

  const result: import("./types").ClubStats[] = [];
  for (const club of clubs) {
    const pSet = clubPlayers.get(club.id);
    if (!pSet) continue;
    const nSet = clubNations.get(club.id);

    let pairCount = 0;
    for (const [key, members] of seasonGroups) {
      if (!key.startsWith(club.id + "::")) continue;
      const n = members.size;
      if (n >= 2) pairCount += (n * (n - 1)) / 2;
    }

    result.push({
      id: club.id,
      name: club.name,
      country: club.country,
      playerCount: pSet.size,
      nationCount: nSet?.size ?? 0,
      pairCount,
    });
  }

  return result.sort((a, b) => b.nationCount - a.nationCount);
}
