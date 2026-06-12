# Squad Graph — World Cup 2026

Explore the social graph of World Cup 2026 players connected by shared club history.

**Live Demo:** https://squad-graph.vercel.app

## What It Does

Squad Graph reveals hidden connections between international footballers — players who shared a club in the same season, even if they now represent rival nations. With 1,248 players across 48 national teams and 1,578 clubs, the tool surfaces relationships that flat squad listings can never show.

**Core query:** Given any club and season, return all players who were there together. This is the fundamental "played together" operation that powers every feature in the app.

## Features

- **Interactive Force Graph** — Canvas-based force-directed network of all player connections, colored by national team
- **Player Browser** — Searchable player list with club history detail cards
- **Club Browser** — Search clubs, filter by season, see full rosters
- **Degrees of Separation** — BFS shortest-path finder between any two players
- **Club Power Rankings** — Sortable table of clubs by nation diversity, connection count, and player count
- **Season Timeline** — Animated slider to watch connections appear/disappear over time

## Architecture

```
/workspace
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with header/nav/footer
│   │   └── page.tsx            # Server component (force-dynamic, renders SquadGraphApp)
│   ├── components/
│   │   └── SquadGraphApp.tsx   # "use client" — all interactive UI
│   ├── lib/
│   │   ├── types.ts            # TypeScript interfaces + country color palette
│   │   ├── data.ts             # Dataset loader (fetch /data/players.json) + lookup helpers
│   │   └── graph.ts            # Graph engine: buildAdjacencyList, buildGraphEdges, findShortestPath, getClubRoster
│   └── styles/
│       └── globals.css         # Dark theme, custom scrollbar, graph canvas styles
├── public/data/
│   └── players.json             # Dataset committed at build time (~1.6MB)
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

## How the Graph is Built

The graph is derived entirely from the provided `players.json` using the canonical edge rule from the brief:

```typescript
// Group players by (club_id, season) — everyone in a group ≥ 2 is mutually connected
function buildStintGroups(players: Player[]): Map<string, Set<string>> {
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

// Core query: players who were at a given club in a given season
function getClubRoster(players: Player[], clubId: string, season?: string): Player[] {
  return players.filter(p =>
    p.stints.some(s => s.club_id === clubId && (season === undefined || s.season === season))
  );
}
```

**Key rule:** Join on `club_id` (Wikidata QID), never on club name. Distinct clubs can share a name — merging by name would invent false edges.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Visualization | Canvas 2D + custom force simulation |
| Styling | Tailwind CSS |
| Data | `players.json` fetched client-side from `/data/` (static file) |
| Deployment | Vercel |

## Setup

```bash
npm install
npm run dev        # Development server on http://localhost:3000
npm run build      # Production build
npm run start      # Start production server
```

## Data Source

Dataset: [layerx-labs/wc2026-squad-graph-dataset](https://github.com/layerx-labs/wc2026-squad-graph-dataset) (v1.0, pinned to immutable commit `afb888e`)

- 1,248 players from 48 national teams
- 1,578 clubs
- ~11,000 derivable edges
- ~437 dateless memberships dropped (documented in `gaps.json`)

## Known Limitations

- The force graph renders all visible edges on a single canvas — with ~11k edges, individual edges are thin. Filtering by club or season reduces the edge count for a cleaner view.
- Error pages (/404, /500) are pre-rendered stubs; the main page (`/`) is server-rendered on demand.
- The dataset covers club history only — national team connections are intentionally excluded.
