import type { Building, BuildingType, Settlement, SettlementType } from '../types/game';
import { BUILDING_INFO } from '../data/realms';

// ------------------------------------------------------------
// EVOLUCIÓN DE ASENTAMIENTOS
// alquería → aldea → pueblo → villa → ciudad → capital
// ------------------------------------------------------------

export const EVOLUTION_ORDER: SettlementType[] = ['alqueria', 'aldea', 'pueblo', 'villa', 'ciudad', 'capital'];

export interface EvolutionRequirements {
  minPopulation: number;
  minLevel: number;
  minBuildings: number;
  minStability: number; // ≥ 70
  minHappiness: number; // ≥ 60
  goldCost: number;
}

export const EVOLUTION_REQS: Record<Exclude<SettlementType, 'capital'>, EvolutionRequirements> = {
  alqueria: { minPopulation: 500,    minLevel: 2, minBuildings: 2, minStability: 70, minHappiness: 60, goldCost: 1_000 },
  aldea:    { minPopulation: 2_000,  minLevel: 3, minBuildings: 3, minStability: 70, minHappiness: 60, goldCost: 5_000 },
  pueblo:   { minPopulation: 10_000, minLevel: 5, minBuildings: 4, minStability: 70, minHappiness: 60, goldCost: 20_000 },
  villa:    { minPopulation: 30_000, minLevel: 7, minBuildings: 6, minStability: 70, minHappiness: 60, goldCost: 80_000 },
  ciudad:   { minPopulation: 100_000, minLevel: 10, minBuildings: 8, minStability: 70, minHappiness: 60, goldCost: 300_000 },
};

export function nextType(t: SettlementType): SettlementType | null {
  const idx = EVOLUTION_ORDER.indexOf(t);
  return idx >= 0 && idx < EVOLUTION_ORDER.length - 1 ? EVOLUTION_ORDER[idx + 1] : null;
}

export interface EvolutionCheck {
  canEvolve: boolean;
  missing: string[];
  reqs?: EvolutionRequirements;
  next?: SettlementType | null;
}

export function checkEvolution(s: Settlement): EvolutionCheck {
  if (s.type === 'capital') return { canEvolve: false, missing: [], next: null };
  const reqs = EVOLUTION_REQS[s.type];
  const next = nextType(s.type);
  const missing: string[] = [];
  if (s.population < reqs.minPopulation) missing.push(`Población ${s.population}/${reqs.minPopulation}`);
  if (s.level < reqs.minLevel) missing.push(`Nivel ${s.level}/${reqs.minLevel}`);
  if (s.buildings.length < reqs.minBuildings) missing.push(`Edificios ${s.buildings.length}/${reqs.minBuildings}`);
  if (s.stability < reqs.minStability) missing.push(`Estabilidad ${Math.round(s.stability)}/${reqs.minStability}`);
  if (s.happiness < reqs.minHappiness) missing.push(`Felicidad ${Math.round(s.happiness)}/${reqs.minHappiness}`);
  return { canEvolve: missing.length === 0, missing, reqs, next };
}

/** Aplica la evolución (asume verificación previa y pago de oro). */
export function evolveSettlement(s: Settlement): Settlement {
  const check = checkEvolution(s);
  if (!check.canEvolve || !check.next) return s;
  const nt = check.next;
  const popBoost = nt === 'ciudad' ? 1.2 : 1.3;
  return {
    ...s,
    type: nt,
    level: Math.max(s.level, nt === 'capital' ? 10 : s.level + 1),
    population: Math.round(s.population * popBoost),
    maxPopulation: Math.round(s.maxPopulation * popBoost),
    walls: Math.max(s.walls, nt === 'ciudad' ? 5 : nt === 'villa' ? 3 : nt === 'capital' ? 8 : s.walls + 1),
    canEvolve: nt !== 'capital',
    description: `${s.name} ha prosperado hasta convertirse en ${nt}.`,
  };
}

// ------------------------------------------------------------
// CONSTRUCCIÓN DE EDIFICIOS
// ------------------------------------------------------------

/** Coste escalable por nivel del edificio. */
export function buildingCost(type: BuildingType, currentLevel: number): Partial<Record<keyof import('../types/game').Resources, number>> & { oro: number } {
  const mult = Math.pow(1.6, currentLevel);
  const base: Record<BuildingType, { oro: number; mats: Partial<Record<'madera' | 'piedra' | 'hierro', number>> }> = {
    granja:    { oro: 200, mats: { madera: 50 } },
    mina:      { oro: 400, mats: { piedra: 40, madera: 30 } },
    aserradero:{ oro: 300, mats: { madera: 20, piedra: 20 } },
    cuartel:   { oro: 600, mats: { madera: 80, piedra: 60 } },
    mercado:   { oro: 500, mats: { madera: 60 } },
    taberna:   { oro: 350, mats: { madera: 50 } },
    templo:    { oro: 800, mats: { piedra: 100 } },
    muralla:   { oro: 1_000, mats: { piedra: 150, hierro: 30 } },
    alhondiga: { oro: 700, mats: { piedra: 80, madera: 40 } },
    taller:    { oro: 450, mats: { madera: 40, hierro: 40 } },
  };
  const b = base[type];
  return { oro: Math.round(b.oro * mult), ...Object.fromEntries(Object.entries(b.mats).map(([k, v]) => [k, Math.round((v as number) * mult)])) } as never;
}

/** ¿El asentamiento tiene espacio para otro edificio? Regla: nivel × 2 edificios máx. */
export function hasSpace(s: Settlement): boolean {
  return s.buildings.length < s.level * 2 + 2;
}

/** Crea un edificio en construcción. El tiempo real = constructionTime(horas juego) × ms/hora. */
export function startConstruction(type: BuildingType, settlementLevel: number, now = Date.now()): Building {
  const info = BUILDING_INFO[type];
  return {
    id: `bld-${now.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    type,
    name: info.name,
    level: 1,
    maxLevel: Math.min(10, settlementLevel + 2),
    production: { ...info.production },
    constructionTime: info.time,
    isUnderConstruction: true,
    constructionEndsAt: now + info.time * 60_000, // 1 hora de juego = 1 min real
  };
}

/** XP que gana el asentamiento para subir de nivel por tick. */
export function settlementXpForLevel(level: number): number {
  return Math.round(100 * Math.pow(1.8, level - 1));
}
