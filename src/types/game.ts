// ============================================================
// TIPOS BASE DEL JUEGO — FASE 1
// ============================================================

export type RealmId = 'aldoria' | 'valdris' | 'kethmar' | 'sylvanna' | 'drakkar';
export type RaceId = 'humano' | 'elfo' | 'enano' | 'orco' | 'semielfo' | 'draconiano' | 'nomuerto';
export type ClassId = 'guerrero' | 'caballero' | 'arquero' | 'mago' | 'picaro' | 'barbaro' | 'cazador' | 'domador';

export type StatKey =
  | 'fuerza' | 'destreza' | 'inteligencia' | 'vitalidad' | 'sabiduria'
  | 'carisma' | 'suerte' | 'liderazgo' | 'sigilo' | 'percepcion';

export type SettlementType = 'capital' | 'ciudad' | 'villa' | 'pueblo' | 'aldea' | 'alqueria';
export type FeudalDivision = 'ducado' | 'condado' | 'marca';

export type RankId =
  | 'plebeyo' | 'gentilhombre' | 'hidalgo' | 'escudero' | 'caballero'
  | 'baronet' | 'baron' | 'vizconde' | 'conde' | 'marques' | 'duque'
  | 'principe' | 'gran_duque' | 'archiduque' | 'rey' | 'emperador';

export type BuildingType =
  | 'granja' | 'mina' | 'aserradero' | 'cuartel' | 'mercado'
  | 'taberna' | 'templo' | 'muralla' | 'alhondiga' | 'taller';

export type ResourceType =
  | 'oro' | 'plata' | 'cobre' | 'alimento' | 'madera' | 'piedra' | 'hierro' | 'piedrapreciosa';

export type EventType =
  | 'cosecha' | 'bandolerismo' | 'peste' | 'festival'
  | 'comercio' | 'reclutamiento' | 'tormenta' | 'descubrimiento'
  // FASE 2 — eventos narrativos de combate y guerra
  | 'guerra' | 'duelo' | 'emboscada' | 'asedio' | 'resurreccion' | 'bounty'
  | 'ejecucion' | 'construccion_completada';

// ============================================================
// RECURSOS Y EDIFICIOS
// ============================================================

export interface Resources {
  oro: number;
  plata: number;
  cobre: number;
  alimento: number;
  madera: number;
  piedra: number;
  hierro: number;
  piedrapreciosa: number;
}

export interface Building {
  id: string;
  type: BuildingType;
  name: string;
  level: number;
  maxLevel: number;
  production: Partial<Resources>;
  constructionTime: number; // horas de juego
  isUnderConstruction: boolean;
  constructionEndsAt?: number; // timestamp ms
}

// ============================================================
// ASENTAMIENTOS Y ESTRUCTURA FEUDAL
// ============================================================

export interface Settlement {
  id: string;
  name: string;
  type: SettlementType;
  level: number; // 1-10
  population: number;
  maxPopulation: number;
  walls: number; // 1-10
  garrison: number;
  infrastructure: number; // 1-10
  development: number; // 1-10
  stability: number; // 0-100
  loyalty: number; // 0-100
  income: number; // oro por hora de juego
  happiness: number; // 0-100
  canEvolve: boolean;
  ownerId?: string;
  buildings: Building[];
  resources: Resources;
  upgrades: string[];
  description: string;
  lastTickAt: number;
}

export interface FeudalTerritory {
  id: string;
  name: string;
  type: FeudalDivision;
  rulerTitle: string; // "Duque", "Conde", "Marqués"
  rulerId?: string;
  settlements: Settlement[];
  totalPopulation: number;
  totalIncome: number;
}

export interface Realm {
  id: RealmId;
  name: string;
  motto: string;
  description: string;
  lore: string;
  capital: Settlement;
  duchies: FeudalTerritory[];
  counties: FeudalTerritory[];
  marches: FeudalTerritory[];
  accent: string; // color HSL
  icon: string;   // emoji representativo del reino (🦁 💰 ⛰️ 🌲 ⚡) — se usa en el mapa, asedios y listas desplegables
  totalCities: number;
  totalSettlements: number;
  kingName: string;
  royalHouse: string;
}

// ============================================================
// NOBLEZA
// ============================================================

export interface NobleHouse {
  id: string;
  surname: string;
  realmId: RealmId;
  foundedAt: number;
  members: string[];
  highestRank: RankId;
  reputation: number;
  wealth: number;
  lands: string[];
  isRoyal: boolean;
  coatOfArms: string; // emoji
  motto: string;
  color: string;
}

export interface NobilityRank {
  id: RankId;
  name: string;
  title: string; // tratamiento: "Sir", "Barón"...
  level: number; // 0-15 (16 niveles)
  power: number;
  military: number;
  taxRate: number; // % impuestos
  maxSettlements: number;
  requirements: {
    level: number;
    wealth: number;
    honor: number;
    lands: number;
    influence: number;
  };
  privileges: string[];
}

export interface PlayerReputation {
  honor: number; // 0-100
  infamy: number; // 0-100
  loyalty: number; // 0-100 hacia el reino
  influence: number; // 0-100 poder político
  relations: Record<string, number>;
  deeds: Deed[];
}

export interface Deed {
  id: string;
  title: string;
  description: string;
  type: 'honorable' | 'infame' | 'neutral';
  timestamp: number;
  effects: {
    honor?: number;
    infamy?: number;
    loyalty?: number;
    influence?: number;
  };
}

// ============================================================
// PERSONAJE
// ============================================================

export interface CharacterProgress {
  experience: number;
  experienceToNext: number;
  skillPoints: number;
  abilities: string[];
  equipment: Equipment[];
  quests: Quest[];
}

export interface Equipment {
  id: string;
  name: string;
  type: 'arma' | 'armadura' | 'accesorio';
  rarity: 'comun' | 'raro' | 'epico' | 'legendario';
  stats: Partial<Record<StatKey, number>>;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'principal' | 'secundaria' | 'diaria' | 'reino';
  status: 'disponible' | 'en_progreso' | 'completada';
  rewards: {
    experience?: number;
    gold?: number;
    items?: string[];
    reputation?: number;
    honor?: number;
  };
}

export interface Character {
  id: string;
  name: string;
  surname: string;
  houseId: string;
  realmId: RealmId;
  raceId: RaceId;
  classId: ClassId;
  stats: Record<StatKey, number>;
  level: number;
  loyalty: 'permanente';
  isTraitor: boolean;
  rank: RankId;
  reputation: PlayerReputation;
  progress: CharacterProgress;
  wealth: Resources;
  settlements: string[];
  createdAt: number;
  lastLogin: number;
  title?: string;
  bio: string;
}

// ============================================================
// RAZAS Y CLASES (datos)
// ============================================================

export interface RaceStage {
  name: string;
  bonus: string;
  requiresClass?: ClassId | ClassId[];
}

export interface RaceData {
  id: RaceId;
  name: string;
  icon: string;
  description: string;
  trait: string;
  stage1: RaceStage;
  stage2: RaceStage[]; // 3 opciones ligadas a clase
  stage3: RaceStage;
  statBonuses: Partial<Record<StatKey, number>>;
  specialNote?: string;
}

export interface ClassData {
  id: ClassId;
  name: string;
  icon: string;
  role: string;
  primaryStats: [StatKey, StatKey];
  ability: string;
  abilityDesc: string;
  description: string;
}

// ============================================================
// EVENTOS
// ============================================================

export interface GameEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  settlementId?: string;
  realmId?: RealmId;
  timestamp: number;
  effects: {
    happiness?: number;
    stability?: number;
    income?: number;
    population?: number;
    gold?: number;
  };
}

// ============================================================
// VISTAS
// ============================================================

export type View =
  | 'creation' | 'world' | 'dashboard' | 'settlements'
  // FASE 2 — combate
  | 'combat-pve' | 'pvp' | 'arena' | 'bounties' | 'siege';
