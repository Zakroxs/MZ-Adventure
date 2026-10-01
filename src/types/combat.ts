// ============================================================
// TIPOS DE COMBATE — FASE 2
// Combate direccional por turnos, PvP, arenas, asedios
// ============================================================

import type { Equipment, RankId, RealmId, Resources, StatKey } from './game';

export type Direction = 'izquierda' | 'frente' | 'derecha';
export type CombatActionType = 'ataque' | 'habilidad' | 'defensa' | 'objeto' | 'domar' | 'huir';
export type CombatMode = 'pve' | 'pvp_duelo' | 'pvp_emboscada' | 'pvp_asedio';
export type CombatResult = 'victoria' | 'derrota' | 'huida' | 'captura' | 'ejecucion';
export type DuelType = 'amistoso' | 'apuesta' | 'rango' | 'muerte';
export type LeagueId = 'bronce' | 'plata' | 'oro' | 'platino' | 'diamante' | 'leyenda';
export type SiegePhase = 'votacion' | 'preaviso' | 'bloqueo' | 'bombardero' | 'asalto' | 'saqueo' | 'resuelto';

export const DIRECTIONS: Direction[] = ['izquierda', 'frente', 'derecha'];

export const DIRECTION_ICON: Record<Direction, string> = {
  izquierda: '↖️',
  frente: '⬆️',
  derecha: '↗️',
};

export const DIRECTION_LABEL: Record<Direction, string> = {
  izquierda: 'Izquierda',
  frente: 'Frente',
  derecha: 'Derecha',
};

// ------------------------------------------------------------
// Acciones y combatientes
// ------------------------------------------------------------

export interface CombatAction {
  id: string;
  name: string;
  type: CombatActionType;
  direction?: Direction;
  damage?: number;
  manaCost?: number;
  staminaCost?: number;
  cooldown: number; // turnos
  comboWith?: string[]; // ids de otras acciones/habilidades
  description: string;
  icon: string;
}

export interface StatusEffect {
  id: string;
  name: string;
  icon: string;
  duration: number; // turnos restantes
  type: 'buff' | 'debuff';
  modifier: Partial<{ attack: number; defense: number; dodge: number; speed: number }>; // % (0.5 = +50%)
}

export interface TamedCreature {
  id: string;
  name: string;
  species: string;
  icon: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  loyalty: number; // 0-100
}

export interface Combatant {
  id: string;
  name: string;
  type: 'jugador' | 'enemigo' | 'criatura' | 'npc';
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stats: Record<StatKey, number>;
  actions: CombatAction[];
  equippedItems: Equipment[];
  statusEffects: StatusEffect[];
  tamedCreatures?: TamedCreature[];
  rank?: RankId;
  houseId?: string;
  realmId?: RealmId;
  defending?: boolean; // acción de defensa activa (-50% daño)
  dodgeBonus?: number; // % extra de esquiva el siguiente turno
  bonusTurns?: number; // turnos extra (emboscadas)
}

// ------------------------------------------------------------
// Estado del combate
// ------------------------------------------------------------

export interface CombatTurn {
  turnNumber: number;
  actorId: string;
  action: CombatAction;
  chosenDirection: Direction;
  targetDirection: Direction;
  damageDealt: number;
  damageReceived: number;
  critical: boolean;
  dodged: boolean;
  log: string;
}

export interface CombatRewards {
  experience: number;
  gold: number;
  items: string[];
  resources: Partial<Resources>;
  reputation?: {
    honor?: number;
    infamy?: number;
    influence?: number;
  };
  territory?: string; // ID de ciudad capturada
  title?: string;
}

export interface CombatState {
  id: string;
  mode: CombatMode;
  participants: Combatant[];
  turnOrder: string[];
  currentTurn: number;
  currentActorIndex: number;
  history: CombatTurn[];
  result?: CombatResult;
  rewards?: CombatRewards;
  startedAt: number;
  arenaId?: string;
  betAmount?: number;
  duelType?: DuelType;
  ambushed?: boolean; // el jugador sufrió emboscada
  enemyTemplateId?: string;
  settlementId?: string; // objetivo de asedio
}

// ------------------------------------------------------------
// Recompensas por cabeza (bounties)
// ------------------------------------------------------------

export interface Bounty {
  id: string;
  targetId: string;
  targetName: string;
  amount: number;
  reason: string;
  issuedBy: string;
  expiresAt: number;
  active: boolean;
  realmId?: RealmId;
  rank?: RankId;
}

// ------------------------------------------------------------
// Sinergias de combate (calculadas desde datos de Fase 1)
// ------------------------------------------------------------

export interface CombatBonuses {
  damageMultiplier: number;
  defenseMultiplier: number;
  hpMultiplier: number;
  manaMultiplier: number;
  resurrectionDiscount: number; // fracción de descuento al comprar piedra
}

// ------------------------------------------------------------
// Arena / Ligas
// ------------------------------------------------------------

export interface ArenaData {
  id: string;
  name: string;
  realm: RealmId;
  league: LeagueId;
  capacity: number;
  icon: string;
}

export interface League {
  id: LeagueId;
  name: string;
  icon: string;
  minLevel: number;
  maxLevel: number;
  entryFee: number; // oro
}

export interface OpponentOffer {
  id: string;
  name: string;
  surname: string;
  realmId: RealmId;
  raceIcon: string;
  classIcon: string;
  level: number;
  rank: RankId;
  hp: number;
  attack: number;
  speed: number;
  wager: number; // apuesta sugerida en oro
  bio: string;
}

// ------------------------------------------------------------
// Enemigos (PvE)
// ------------------------------------------------------------

export type LootRarity = 'comun' | 'raro' | 'epico' | 'legendario';

export interface EnemyTemplate {
  id: string;
  name: string;
  icon: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  loot: LootRarity;
  danger: number; // 1-10 (afecta probabilidad de emboscada en rutas)
  xp: number;
  gold: number;
  description: string;
  isBoss?: boolean;
}

// ------------------------------------------------------------
// Combos de habilidades (6 ranuras → combos de 2)
// ------------------------------------------------------------

export interface SkillCombo {
  id: string;
  name: string;
  skills: string[]; // skillIds que la componen
  effect: 'area' | 'critico' | 'dreno' | 'aturdido' | 'escudo' | 'veneno' | 'curacion' | 'penetracion';
  damageMultiplier: number;
  manaCost: number;
  requires?: { classId?: string; raceStage?: string; level?: number };
  description: string;
  icon: string;
}

// ------------------------------------------------------------
// Muerte y resurrección
// ------------------------------------------------------------

export interface DeathInfo {
  mode: CombatMode;
  waitHours: number; // horas reales de espera si no hay piedra
  lootPercent: number; // % del oro saqueado por el vencedor
  itemTaken?: string;
  politicalCrisis?: boolean;
  landsTaken?: string[];
  executed?: boolean;
  houseExtinct?: boolean;
}

// ------------------------------------------------------------
// Asedios
// ------------------------------------------------------------

export interface WarVote {
  nobleName: string;
  rank: RankId;
  inFavor: boolean;
}

export interface SiegeState {
  id: string;
  attackerRealm: RealmId;
  defenderRealm: RealmId;
  targetSettlementName: string;
  targetWalls: number; // nivel actual de muralla (0-10, puede ser decimal)
  casusBelli: string;
  phase: SiegePhase;
  votes: WarVote[];
  startedAt: number;
  phaseEndsAt: number; // timestamp ms
  stabilityPenalty: number; // acumulada durante bloqueo
  ChronicleEntry?: string;
}

export const SIEGE_PHASE_INFO: Record<SiegePhase, { name: string; icon: string; hours: number; desc: string }> = {
  votacion:    { name: 'Votación de nobles', icon: '🗳️', hours: 0,  desc: 'Se requieren 3 votos de Condes o superiores.' },
  preaviso:    { name: 'Preaviso diplomático', icon: '📯', hours: 24, desc: 'El reino objetivo recibe 24h para prepararse.' },
  bloqueo:     { name: 'Bloqueo', icon: '⛓️', hours: 24, desc: 'Rutas cortadas: -5% estabilidad por hora de juego.' },
  bombardero:  { name: 'Bombardero', icon: '💥', hours: 12, desc: 'Catapultas erosionan las murallas (1% por hora).' },
  asalto:      { name: 'Asalto', icon: '⚔️', hours: 1,  desc: 'Combate masivo por turnos bajo los muros.' },
  saqueo:      { name: 'Saqueo', icon: '🔥', hours: 6,  desc: 'Si la plaza cae, el botín se reparte entre los atacantes.' },
  resuelto:    { name: 'Resuelto', icon: '📜', hours: 0, desc: 'El asedio ha concluido; las crónicas registran el resultado.' },
};

// ------------------------------------------------------------
// Vistas nuevas de la Fase 2
// ------------------------------------------------------------

export type CombatView = 'combat-pve' | 'arena' | 'bounties' | 'siege';
