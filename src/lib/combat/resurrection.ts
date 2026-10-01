// ============================================================
// PIEDRA DE RESURRECCIÓN — Economía e Iglesia (Fase 2, Sistema 2)
// ============================================================

import type { Character } from '../../types/game';

export const RESURRECTION_BASE_PRICE = 50_000;

export interface ResurrectionMarket {
  demand: number; // 0-100 (sube con guerras y emboscadas)
  atWar: boolean;
}

/**
 * precio_final = base × (1 + demanda/100) × (¿no-muerto? 2.0 : 1.0)
 *               × (¿guerra? 1.5 : 1.0) × (1 - carisma×0.002)
 */
export function resurrectionPrice(
  market: ResurrectionMarket,
  character: Pick<Character, 'raceId' | 'stats'>,
): number {
  const undeadFactor = character.raceId === 'nomuerto' ? 2.0 : 1.0; // los no-muertos pagan el doble en la iglesia
  const warFactor = market.atWar ? 1.5 : 1.0;
  const charismaDiscount = Math.max(0.5, 1 - character.stats.carisma * 0.002);
  return Math.round(RESURRECTION_BASE_PRICE * (1 + market.demand / 100) * undeadFactor * warFactor * charismaDiscount);
}

/** Descuento adicional por donaciones a la Iglesia (sinergia Fase 1 → 2). */
export function priceWithChurchDiscount(price: number, discount: number): number {
  return Math.round(price * Math.max(0.5, 1 - discount));
}

/** Coste de una donación a la iglesia (los no-muertos pagan el doble). */
export function titheCost(base: number, raceId: string): number {
  return raceId === 'nomuerto' ? base * 2 : base;
}

/** Horas reales de espera al morir según piedra y reino (Sistema 2.1). */
export function waitHoursAfterDeath(hasStone: boolean, hasRealm: boolean): number {
  if (hasStone) return 0; // resurrección inmediata, 50% HP/MP
  return hasRealm ? 5 : 8;
}

/** Efecto de resurrección con piedra: 50% HP/MP. */
export function applyResurrection(hp: number, maxHp: number, mana: number, maxMana: number, effectivenessBonus = 0): { hp: number; mana: number } {
  const eff = Math.min(1, 0.5 + effectivenessBonus); // +5% por sinergia eclesiástica
  return { hp: Math.round(maxHp * eff), mana: Math.round(maxMana * eff) };
}
