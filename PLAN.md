# Squad Graph — Plan

## 1. Problem & Target User
**Problem:** World Cup 2026 fans want to discover hidden connections between players — especially cross-national ones — that emerge from shared club history. Existing squad listings are flat lists; no tool surfaces "Player A and Player B were teammates at Real Madrid in 2022/23 despite playing for rival nations today."

**Target user:** Football fans, data journalists, fantasy football players, and sports commentators who want to explore the social graph of international football.

## 2. Core Features

### 2.1 Graph Engine (backend / data layer)
- Load and normalize `players.json` at build time
- Derive edges: group players by `(club_id, season)`; all pairs in a group ≥ 2 are connected
- Build adjacency list for efficient traversal
- BFS shortest-path algorithm: given two player QIDs, compute degrees of separation and the path
- Precompute club-level stats: number of nations connected, total teammate pairs

### 2.2 Player & Club Browser (frontend)
- Searchable player list: filter by name, nationality, position
- Club browser: list all clubs, see roster for any season
- Player detail card: name, country, position, current club, full stint history with club names

### 2.3 Interactive Network Visualization (frontend, D3.js)
- Force-directed graph: nodes = players, colored by national team, sized by degree centrality
- Click a club node → highlight all players who were there together (same season)
- Hover a player → tooltip with name, country, clubs
- Cluster by national team with toggle to ungroup
- Zoom + pan + drag support

### 2.4 Degrees of Separation Finder (frontend + API)
- Input: two player names (autocomplete)
- Output: shortest path length + list of intermediate players/clubs
- Example: "Lamine Yamal ↔ Kylian Mbappé → 2 degrees (shared club: Barcelona 2023-24 youth)"
- Visualize the path as a highlighted subgraph

### 2.5 Club Power Rankings (frontend)
- Table: top clubs by number of distinct nations represented in their rosters
- Table: top clubs by total teammate pairs generated
- Filter by country of club

### 2.6 Season Timeline (frontend)
- Slider from earliest to latest season in the dataset
- Graph updates in real time as you drag — watch connections appear/disappear
- Play/pause animation

## 3. Tech Stack

| Layer | Choice | Justification |
|---|---|---|
| Framework | **Next.js** (App Router) | Single repo, API routes + frontend in one Vercel deploy; great TypeScript support |
| Language | **TypeScript** | Graph data structures are complex; type safety is worth it |
| Visualization | **D3.js** v7 + `react-force-graph` | Best-in-class force-directed layout; `react-force-graph` wraps D3 for React |
| Styling | **Tailwind CSS** | Rapid iteration; clean design without custom CSS files |
| Graph data | **Adjacency list** (in-memory) | ~1,248 nodes, ~11,000 edges — far below memory limits; no DB needed |
| Build-time data | **Static JSON import** | Players.json is fetched and committed at build time; zero runtime fetching |
| Deployment | **Vercel** | Zero-config Next.js hosting; edge network for fast global access |

## 4. Architecture

```
/workspace
├── src/
│   ├── app/
│   │   ├── page.tsx               # Main UI: search, browser, visualization
│   │   ├── player/[id]/page.tsx   # Player detail view
│   │   ├── club/[id]/page.tsx     # Club roster view
│   │   ├── path/page.tsx          # Degrees of separation tool
│   │   └── layout.tsx
│   ├── components/
│   │   ├── PlayerSearch.tsx
│   │   ├── PlayerCard.tsx
│   │   ├── ClubBrowser.tsx
│   │   ├── ForceGraph.tsx         # D3 network visualization
│   │   ├── PathFinder.tsx         # Degrees of separation UI
│   │   ├── ClubRankings.tsx
│   │   └── SeasonSlider.tsx
│   ├── lib/
│   │   ├── data.ts                # Load + normalize players.json
│   │   ├── graph.ts               # Edge derivation, adjacency list, BFS
│   │   ├── clubs.ts               # Club lookup helpers
│   │   └── types.ts               # TypeScript interfaces
│   └── styles/
│       └── globals.css
├── public/
│   └── data/                      # players.json committed at build time
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── README.md
```

**Data flow:**
1. `players.json` is committed to `/public/data/` at build time
2. `data.ts` loads and normalizes it into typed structures
3. `graph.ts` derives edges and builds the adjacency list
4. Pages consume these via React server components (no runtime API calls needed)
5. BFS path-finding runs client-side in `PathFinder.tsx` on the pre-built adjacency list

## 5. Rubric Mapping

| Rubric Criterion | How This Plan Addresses It |
|---|---|
| **Data accuracy and coverage** | Use the canonical provided JSON directly; club_id + season join is the defined rule; no name-merging |
| **Graph correctness** | `graph.ts` implements the exact edge-derivation logic from the brief (group by club_id + season, combinations of pairs) |
| **Query and visualization usefulness** | Player search, club browser, force graph, degrees-of-separation finder, club rankings, season timeline — all useful, all usable |
| **Code quality** | TypeScript throughout, clean module separation (data / graph / components), single-responsibility functions |
| **Write-up clarity** | README covers setup, architecture, graph logic, how to query; TAIKAI page explains the motivation, approach, and features |

## 6. Milestones

- [ ] **M1:** Repo setup: Next.js + TypeScript + Tailwind + D3; commit `players.json`; basic page shell
- [ ] **M2:** Data + graph engine: load JSON, derive edges, build adjacency list, BFS shortest path
- [ ] **M3:** Player search + club browser + player detail card
- [ ] **M4:** D3 force-directed graph with hover/click interactions
- [ ] **M5:** Degrees of separation tool with path visualization
- [ ] **M6:** Club power rankings + season timeline slider
- [ ] **M7:** Polish: responsive design, loading states, error handling
- [ ] **M8:** README with setup instructions and graph explanation
- [ ] **M9:** Deploy to Vercel, verify live URL
- [ ] **M10:** TAIKAI page write-up

## 7. Definition of Done

The project is **done** when:
1. All 1,248 players from the dataset are browsable and searchable
2. The force graph renders the ~11,000 edges interactively
3. Selecting any club + season returns all players who were there together (core query)
4. The degrees-of-separation tool finds and visualizes the shortest path between any two players
5. Club power rankings table is populated and sortable
6. Season timeline slider animates the graph in real time
7. The app is live at a public Vercel URL
8. README explains setup, architecture, and how the graph is built
9. TAIKAI page is complete with project description, approach, and usage instructions
