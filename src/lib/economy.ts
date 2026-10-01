import type { Resources, Settlement } from '../types/game';

// ------------------------------------------------------------
// ECONOMÍA — 1 min real = 1 hora de juego
// ------------------------------------------------------------

export const MS_PER_GAME_HOUR = 60_000; // 1 minuto real = 1 hora de juego

// Conversión de monedas: 1 oro = 100 plata = 10.000 cobre
export const PLATA_PER_ORO = 100;
export const COBRE_PER_ORO = 10_000;

export function emptyResources(): Resources {
  return { oro: 0, plata: 0, cobre: 0, alimento: 0, madera: 0, piedra: 0, hierro: 0, piedrapreciosa: 0 };
}

export function addResources(a: Resources, b: Partial<Resources>): Resources {
  const out = { ...a };
  for (const k of Object.keys(b) as (keyof Resources)[]) {
    out[k] += b[k] ?? 0;
  }
  return out;
}

/** Ingresos por hora de un asentamiento (oro). */
export function settlementIncome(s: Settlement): number {
  const buildingGold = s.buildings
    .filter((b) => !b.isUnderConstruction)
    .reduce((acc, b) => acc + (b.production.oro ?? 0), 0);
  const base = s.population * 0.02 * (s.level / 5);
  const modifiers = (s.stability / 100) * (s.happiness / 100);
  return Math.round((base + buildingGold) * modifiers);
}

/** Gastos por hora: guarnición + mantenimiento de edificios + población. */
export function settlementExpenses(s: Settlement): number {
  const garrisonCost = s.garrison * 0.01;
  const upkeep = s.buildings.length * 0.5 * (s.level / 3);
  const populationCost = s.population * 0.002;
  return Math.round(garrisonCost + upkeep + populationCost);
}

export function settlementNet(s: Settlement): number {
  return settlementIncome(s) - settlementExpenses(s);
}

/** Producción horaria de recursos (no monetarios) de un asentamiento. */
export function settlementProduction(s: Settlement): Partial<Resources> {
  const prod: Partial<Resources> = {};
  for (const b of s.buildings) {
    if (b.isUnderConstruction) continue;
    for (const [k, v] of Object.entries(b.production)) {
      prod[k as keyof Resources] = (prod[k as keyof Resources] ?? 0) + (v as number);
    }
  }
  return prod;
}

/** Precio de mercado dinámico: sube si hay poca oferta, baja si sobra stock. */
export function marketPrice(resource: keyof Resources, stock: number, demand: number): number {
  const basePrices: Record<keyof Resources, number> = {
    oro: 1, plata: 0.01, cobre: 0.0001, alimento: 0.5, madera: 0.8,
    piedra: 1.2, hierro: 2.5, piedrapreciosa: 15,
  };
  const ratio = stock === 0 ? 2 : Math.min(2, Math.max(0.4, demand / stock));
  return +(basePrices[resource] * ratio).toFixed(4);
}

/**
 * Tick económico: procesa 1 hora de juego para un asentamiento.
 * - Ingresos/gastos → recursos
 * - Crecimiento poblacional si hay comida y felicidad ≥ 50
 * - Decaimiento si falta alimento o la felicidad cae
 */
export function tickSettlement(s: Settlement): Settlement {
  const next: Settlement = {
    ...s,
    resources: { ...s.resources },
    buildings: s.buildings.map((b) => ({ ...b })),
  };

  // Terminar construcciones pendientes
  const now = Date.now();
  for (const b of next.buildings) {
    if (b.isUnderConstruction && b.constructionEndsAt && now >= b.constructionEndsAt) {
      b.isUnderConstruction = false;
      b.constructionEndsAt = undefined;
    }
  }

  const income = settlementIncome(next);
  const expenses = settlementExpenses(next);
  next.resources.oro += income - expenses;
  if (next.resources.oro < 0) next.resources.oro = 0;

  const prod = settlementProduction(next);
  for (const [k, v] of Object.entries(prod)) {
    next.resources[k as keyof Resources] += v as number;
  }

  // Consumo de alimento: 1 unidad por cada 100 habitantes/hora
  const foodConsumption = Math.round(next.population / 100);
  next.resources.alimento -= foodConsumption;

  if (next.resources.alimento > 0 && next.happiness >= 50) {
    // crecimiento moderado
    next.population = Math.min(next.maxPopulation, Math.round(next.population * 1.005) + 5);
  } else if (next.resources.alimento <= 0) {
    next.resources.alimento = 0;
    next.population = Math.max(50, Math.round(next.population * 0.995));
    next.happiness = Math.max(0, next.happiness - 1);
  }

  // Deriva suave de estabilidad/felicidad hacia el equilibrio
  next.stability = Math.min(100, Math.max(0, next.stability + (next.garrison > next.population / 150 ? 0.2 : -0.1)));
  next.income = income;
  next.lastTickAt = now;
  return next;
}
