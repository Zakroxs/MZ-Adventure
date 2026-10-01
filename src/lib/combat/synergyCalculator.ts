// ============================================================
// SINERGIAS FASE 1 ↔ FASE 2 — Calculadora de bonificaciones
// ============================================================

import type { Character, Settlement } from '../../types/game';
import type { CombatBonuses } from '../../types/combat';
import { getRank } from '../../data/nobilityRanks';

/**
 * Matriz de sinergias implementada:
 * - Nobleza (rango)        → +1% daño por nivel de nobleza
 * - Producción (taller/herrero) → +1% ataque por nivel de oficio
 * - Producción (templo/alquimista) → +1% maná por nivel
 * - Producción (mina/enano) → +1% HP por nivel
 * - Iglesias (donaciones/fe) → descuento en Piedra de Resurrección
 */
export function calculateCombatBonuses(
  character: Character,
  playerSettlements: Settlement[] = [],
  churchDonations = 0,
): CombatBonuses {
  // --- Nobleza: +1% daño por nivel de rango nobiliario ---
  const nobleBonus = getRank(character.rank).level * 0.01;

  // --- Producción: mejores oficios en tus tierras ---
  let smithLevel = 0; // herrero → ataque
  let alchemyLevel = 0; // alquimista → maná
  let mineLevel = 0; // minero → HP
  for (const s of playerSettlements) {
    for (const b of s.buildings) {
      if (b.isUnderConstruction) continue;
      if (b.type === 'taller') smithLevel += b.level;
      if (b.type === 'templo') alchemyLevel += b.level;
      if (b.type === 'mina') mineLevel += b.level;
    }
  }
  const productionBonus = {
    attack: smithLevel * 0.01,
    mana: alchemyLevel * 0.01,
    hp: mineLevel * 0.01,
    defense: Math.min(smithLevel, mineLevel) * 0.005,
  };

  // --- Raza: sinergias pasivas de Fase 1 ---
  const raceBonus = calculateRaceSynergy(character);

  // --- Iglesia: +5% efectividad de piedra por cada 1.000 oro donado (tope 50%) ---
  const churchBonus = Math.min(0.5, churchDonations * 0.00005);

  return {
    damageMultiplier: +(1 + nobleBonus + productionBonus.attack).toFixed(4),
    defenseMultiplier: +(1 + productionBonus.defense + character.stats.vitalidad * 0.002).toFixed(4),
    hpMultiplier: +(1 + productionBonus.hp + raceBonus.hp).toFixed(4),
    manaMultiplier: +(1 + productionBonus.mana + raceBonus.mana).toFixed(4),
    resurrectionDiscount: +churchBonus.toFixed(4),
  };
}

function calculateRaceSynergy(c: Character): { hp: number; mana: number; dodge: number } {
  switch (c.raceId) {
    case 'enano': return { hp: 0.15, mana: 0, dodge: 0 };          // +15% resistencia
    case 'orco': return { hp: 0.08, mana: 0, dodge: 0 };           // constitución feroz
    case 'elfo': return { hp: 0, mana: 0.10, dodge: 0.03 };        // gracia élfica
    case 'semielfo': return { hp: 0.04, mana: 0.04, dodge: 0.02 }; // equilibrio
    case 'draconiano': return { hp: 0.06, mana: 0.06, dodge: 0 };  // sangre ardiente
    case 'nomuerto': return { hp: 0.12, mana: 0, dodge: 0 };       // no siente el dolor… y paga el doble en la iglesia
    default: return { hp: 0, mana: 0, dodge: 0 };                  // humano: versátil
  }
}

/** Fórmula del orden de turno (Sistema 1.2). */
export function turnSpeed(stats: { destreza: number; suerte: number }, level: number, equipmentBonus = 0): number {
  return stats.destreza * 2 + stats.suerte + level * 0.5 + equipmentBonus;
}

/** Probabilidad de emboscada en ruta: 10% + peligro*0.5% - percepción*0.2%. */
export function ambushChance(routeDanger: number, perception: number, stealthOfAttacker = 0): number {
  const p = 10 + routeDanger * 0.5 - perception * 0.2 + stealthOfAttacker * 0.1;
  return Math.max(2, Math.min(60, p)) / 100;
}

/** Huir con éxito: sigilo propio vs percepción rival. */
export function escapeChance(ownStealth: number, enemyPerception: number): number {
  const p = 40 + ownStealth * 2 - enemyPerception * 1.5;
  return Math.max(10, Math.min(90, p)) / 100;
}
