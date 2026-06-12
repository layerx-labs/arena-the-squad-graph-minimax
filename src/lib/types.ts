// Core domain types for the Squad Graph application

export interface Stint {
  club_id: string;
  season: string;
}

export interface Player {
  id: string;
  name: string;
  country: string;
  position: string;
  current_club_id: string;
  stints: Stint[];
}

export interface Club {
  id: string;
  name: string;
  country: string;
}

export interface DatasetMeta {
  tournament: string;
  season_format: string;
  edge_rule: string;
  player_count: number;
  club_count: number;
}

export interface Dataset {
  meta: DatasetMeta;
  clubs: Club[];
  players: Player[];
}

// Graph types — using plain arrays/objects for RSC serialization safety
export type AdjacencyList = [string, string[]][]; // [playerId, neighborIds[]]

export interface GraphNode {
  id: string;
  name: string;
  country: string;
  position: string;
  degree: number;
  current_club_id: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  club_id: string;
  season: string;
}

export interface PathResult {
  distance: number;
  path: string[];
  clubs: string[];
}

export interface ClubStats {
  id: string;
  name: string;
  country: string;
  playerCount: number;
  nationCount: number;
  pairCount: number;
}

// Country color palette (FIFA-style)
export const COUNTRY_COLORS: Record<string, string> = {
  "Argentina": "#75AADB", "Brazil": "#009C3B", "France": "#002395",
  "Germany": "#000000", "Spain": "#AA151B", "England": "#FFFFFF",
  "Portugal": "#006600", "Netherlands": "#FF6600", "Italy": "#0066CC",
  "Belgium": "#FFD900", "Croatia": "#FF0000", "Uruguay": "#5CBFEB",
  "Mexico": "#006847", "USA": "#3C3B6E", "Japan": "#BC002D",
  "South Korea": "#0047A0", "Morocco": "#C1272D", "Senegal": "#00853F",
  "Cameroon": "#D21034", "Ghana": "#FCD116", "Australia": "#00008B",
  "Iran": "#239F40", "Saudi Arabia": "#006C35", "Qatar": "#8A0058",
  "Costa Rica": "#002877", "Panama": "#D21034", "Jamaica": "#009B3A",
  "Canada": "#FF0000", "Poland": "#DC143C", "Switzerland": "#FF0000",
  "Austria": "#ED2939", "Czech Republic": "#D7141A", "Denmark": "#C60C30",
  "Sweden": "#006AA7", "Norway": "#EF2B2D", "Ukraine": "#005BBB",
  "Serbia": "#C6363C", "Romania": "#002B7F", "Slovakia": "#0B4EA2",
  "Hungary": "#CD2A3E", "Slovenia": "#005CE8", "Algeria": "#247238",
  "Tunisia": "#E70013", "Egypt": "#CE1126", "Nigeria": "#008751",
  "South Africa": "#002395", "Ivory Coast": "#F77F00", "Ecuador": "#FFD100",
  "Colombia": "#FCD116", "Peru": "#D91023", "Chile": "#D52B1E",
  "Paraguay": "#D52B1E", "Venezuela": "#0073E8", "Bolivia": "#D52B1E",
  "New Zealand": "#00247D", "default": "#999999",
};

export function getCountryColor(country: string): string {
  return COUNTRY_COLORS[country] ?? COUNTRY_COLORS["default"];
}
