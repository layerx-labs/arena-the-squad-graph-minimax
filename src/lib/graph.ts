import { Player, AdjacencyList, GraphNode, GraphEdge, PathResult } from "./types";

export type StintGroup = Map<string, Set<string>>;

export function buildStintGroups(players: Player[]): StintGroup {
  const groups = new Map<string, Set<string>>();
  for (const p of players) {
    for (const stint of p.stints) {
      const key = `${stint.club_id}::${stint.season}`;
      if (!groups.has(key)) groups.set(key, new Set());
      groups.get(key)!.add(p.id);
    }
  }
  return groups;
}

// Build adjacency list as array for RSC serialization safety
export function buildAdjacencyList(players: Player[]): AdjacencyList {
  const adjMap = new Map<string, Set<string>>();
  const groups = buildStintGroups(players);

  for (const [, members] of groups) {
    if (members.size < 2) continue;
    const arr = Array.from(members);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        if (!adjMap.has(a)) adjMap.set(a, new Set());
        if (!adjMap.has(b)) adjMap.set(b, new Set());
        adjMap.get(a)!.add(b);
        adjMap.get(b)!.add(a);
      }
    }
  }

  // Convert to array format for RSC serialization
  const result: AdjacencyList = [];
  for (const [pid, neighbors] of adjMap) {
    result.push([pid, Array.from(neighbors)]);
  }
  return result;
}

export function buildGraphNodes(players: Player[], adj: AdjacencyList): GraphNode[] {
  const degreeMap = new Map<string, number>();
  for (const [pid, neighbors] of adj) {
    degreeMap.set(pid, neighbors.length);
  }
  return players.map(p => ({
    id: p.id,
    name: p.name,
    country: p.country,
    position: p.position,
    degree: degreeMap.get(p.id) ?? 0,
    current_club_id: p.current_club_id,
  }));
}

export function buildGraphEdges(players: Player[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const groups = buildStintGroups(players);
  const seen = new Set<string>();

  for (const [key, members] of groups) {
    if (members.size < 2) continue;
    const [club_id, season] = key.split("::");
    const arr = Array.from(members);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        const edgeKey = [a, b].sort().join("--");
        if (seen.has(edgeKey)) continue;
        seen.add(edgeKey);
        edges.push({ source: a, target: b, club_id, season });
      }
    }
  }
  return edges;
}

// BFS shortest path
export function findShortestPath(
  adj: AdjacencyList,
  start: string,
  end: string
): PathResult | null {
  if (start === end) return { distance: 0, path: [start], clubs: [] };

  const adjMap = new Map<string, string[]>(adj);
  const queue: string[][] = [[start]];
  const visited = new Set<string>([start]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    const neighbors = adjMap.get(current) ?? [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      const newPath = [...path, neighbor];
      if (neighbor === end) {
        return { distance: newPath.length - 1, path: newPath, clubs: [] };
      }
      queue.push(newPath);
    }
  }

  return null;
}

export function getClubRoster(
  players: Player[],
  clubId: string,
  season?: string
): Player[] {
  return players.filter(p =>
    p.stints.some(
      s => s.club_id === clubId && (season === undefined || s.season === season)
    )
  );
}

export function getClubSeasons(players: Player[], clubId: string): string[] {
  const seasons = new Set<string>();
  for (const p of players) {
    for (const s of p.stints) {
      if (s.club_id === clubId) seasons.add(s.season);
    }
  }
  return Array.from(seasons).sort();
}

export function getSeasonRange(players: Player[]): { min: string; max: string } {
  const seasons = new Set<string>();
  for (const p of players) {
    for (const s of p.stints) seasons.add(s.season);
  }
  const sorted = Array.from(seasons).sort();
  return { min: sorted[0] ?? "", max: sorted[sorted.length - 1] ?? "" };
}
