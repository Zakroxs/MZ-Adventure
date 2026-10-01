// ============================================================
// MOTOR DE COMBATE DIRECCIONAL POR TURNOS — FASE 2
// ↖️ ⬆️ ↗️ : leer al rival es tan importante como golpear
// ============================================================

import type { Character, RankId, Resources, Settlement } from '../../types/game';
import type {
  CombatAction, CombatBonuses, CombatMode, CombatResult, CombatState,
  Combatant, CombatTurn, Direction, EnemyTemplate, OpponentOffer,
} from '../../types/combat';
import { DIRECTION_LABEL } from '../../types/combat';
import { LOOT_TABLE } from '../../data/enemies';
import { skillsForClass } from '../../data/combos';
import { calculateCombatBonuses, escapeChance, turnSpeed } from './synergyCalculator';
import { getRank } from '../../data/nobilityRanks';

let combatCounter = 0;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Bonificaciones de sinergia que viajan con el combatiente jugador. */
interface SynergyCarrier {
  synergy?: CombatBonuses;
  characterRef?: Character;
  settlementsRef?: Settlement[];
}
type CarrierCombatant = Combatant & SynergyCarrier;

// ------------------------------------------------------------
// Acciones estándar de un combatiente
// ------------------------------------------------------------

export const BASIC_ACTIONS: CombatAction[] = [
  { id: 'ataque', name: 'Atacar', type: 'ataque', damage: 18, cooldown: 0, icon: '⚔️', description: 'Golpe físico según fuerza + arma. Elige dirección.' },
  { id: 'defensa', name: 'Defender', type: 'defensa', cooldown: 0, icon: '🛡️', description: 'Reduce el daño 50% y +10% esquiva el siguiente turno.' },
  { id: 'huir', name: 'Huir', type: 'huir', cooldown: 0, icon: '🏃', description: 'Éxito según sigilo vs percepción del rival.' },
];

/** Construye la lista de acciones de un personaje (básicas + habilidades de clase). */
export function actionsForCharacter(c: Character): CombatAction[] {
  const skillActions: CombatAction[] = skillsForClass(c.classId).map((s) => ({
    id: s.id,
    name: s.name,
    type: s.id === 'domar-criatura' ? 'domar' : 'habilidad',
    damage: s.damage || undefined,
    manaCost: s.manaCost,
    cooldown: s.cooldown,
    comboWith: undefined,
    description: s.description,
    icon: s.icon,
  }));
  return [...BASIC_ACTIONS.filter((a) => a.type !== 'huir'), ...skillActions, BASIC_ACTIONS[2]];
}

// ------------------------------------------------------------
// Fábricas de combatientes
// ------------------------------------------------------------

export function characterToCombatant(
  c: Character,
  bonuses?: CombatBonuses,
  settlements?: Settlement[],
): CarrierCombatant {
  const b = bonuses ?? calculateCombatBonuses(c, settlements);
  const equipmentBonus = c.progress.equipment.reduce(
    (acc, e) => acc + Object.values(e.stats).reduce((s, v) => s + (v ?? 0), 0),
    0,
  );
  const maxHp = Math.round((80 + c.stats.vitalidad * 12 + c.level * 6) * b.hpMultiplier);
  const maxMana = Math.round((40 + c.stats.inteligencia * 8 + c.stats.sabiduria * 4) * b.manaMultiplier);
  return {
    id: c.id,
    name: `${c.name} ${c.surname}`,
    type: 'jugador',
    hp: maxHp,
    maxHp,
    mana: maxMana,
    maxMana,
    stats: { ...c.stats },
    actions: actionsForCharacter(c),
    equippedItems: c.progress.equipment,
    statusEffects: [],
    rank: c.rank,
    houseId: c.houseId,
    realmId: c.realmId,
    dodgeBonus: 0,
    synergy: b,
    characterRef: c,
    settlementsRef: settlements ?? [],
    // Bonus de equipo aplicado a las stats efectivas en combate
    ...(equipmentBonus > 0 ? {} : {}),
  };
}

export function enemyToCombatant(t: EnemyTemplate): Combatant {
  const fakeStats = {
    fuerza: Math.round(t.attack / 3), destreza: Math.round(t.speed / 6), inteligencia: 5,
    vitalidad: Math.round(t.hp / 25), sabiduria: 5, carisma: 5, suerte: 5,
    liderazgo: 5, sigilo: 5, percepcion: Math.round(t.speed / 8),
  };
  return {
    id: `enemy-${t.id}-${++combatCounter}`,
    name: t.name,
    type: t.isBoss ? 'npc' : 'enemigo',
    hp: t.hp, maxHp: t.hp, mana: 50, maxMana: 50,
    stats: fakeStats as Record<never, number> & typeof fakeStats,
    actions: [
      { id: 'ataque', name: 'Ataque', type: 'ataque', damage: t.attack, cooldown: 0, icon: '👊', description: '' },
      { id: 'defensa', name: 'Guardia', type: 'defensa', cooldown: 0, icon: '🛡️', description: '' },
    ],
    equippedItems: [],
    statusEffects: [],
  };
}

export function opponentToCombatant(o: OpponentOffer): Combatant {
  const stats = {
    fuerza: Math.round(o.attack / 2.5), destreza: Math.round(o.speed / 5), inteligencia: 8,
    vitalidad: Math.round(o.hp / 25), sabiduria: 8, carisma: 10, suerte: 7,
    liderazgo: 8, sigilo: 8, percepcion: Math.round(o.speed / 7),
  };
  return {
    id: o.id,
    name: `${o.name} ${o.surname}`,
    type: 'npc',
    hp: o.hp, maxHp: o.hp, mana: 80, maxMana: 80,
    stats: stats as Record<never, number> & typeof stats,
    actions: [
      { id: 'ataque', name: 'Ataque', type: 'ataque', damage: o.attack, cooldown: 0, icon: '⚔️', description: '' },
      { id: 'defensa', name: 'Guardia', type: 'defensa', cooldown: 0, icon: '🛡️', description: '' },
    ],
    equippedItems: [],
    statusEffects: [],
    rank: o.rank,
    realmId: o.realmId,
  };
}

// ------------------------------------------------------------
// Inicio de combate
// ------------------------------------------------------------

export function createCombat(
  mode: CombatMode,
  player: Combatant,
  enemy: Combatant,
  opts: { level: number; ambush?: boolean; betAmount?: number; arenaId?: string; duelType?: CombatState['duelType']; enemyTemplateId?: string } = {},
): CombatState {
  // Orden por velocidad; empates → suerte
  const ps = turnSpeed(player.stats, opts.level);
  const es = turnSpeed(enemy.stats, Math.max(1, opts.level - 1));
  const order =
    ps === es
      ? player.stats.suerte >= enemy.stats.suerte ? [player.id, enemy.id] : [enemy.id, player.id]
      : ps > es ? [player.id, enemy.id] : [enemy.id, player.id];

  // Emboscada: el atacante enemigo obtiene 1 turno extra gratuito
  if (opts.ambush && order[0] === enemy.id) {
    order.unshift(enemy.id);
    enemy.bonusTurns = 1;
  } else if (opts.ambush) {
    order.splice(1, 0, enemy.id);
    enemy.bonusTurns = 1;
  }

  return {
    id: `cmb-${Date.now().toString(36)}-${++combatCounter}`,
    mode,
    participants: [player, enemy],
    turnOrder: order,
    currentTurn: 1,
    currentActorIndex: 0,
    history: [],
    startedAt: Date.now(),
    arenaId: opts.arenaId,
    betAmount: opts.betAmount,
    duelType: opts.duelType,
    ambushed: opts.ambush,
    enemyTemplateId: opts.enemyTemplateId,
  };
}

// ------------------------------------------------------------
// Resolución direccional
// ------------------------------------------------------------

export interface TurnInput {
  actionId: string;
  chosenDirection: Direction;
}

/** IA enemiga simple: elige acción y dirección pseudoaleatoria con sesgo. */
export function enemyChooseAction(enemy: Combatant): TurnInput {
  const defendChance = enemy.hp < enemy.maxHp * 0.25 ? 0.35 : 0.12;
  const useDefense = Math.random() < defendChance;
  const action = useDefense
    ? enemy.actions.find((a) => a.type === 'defensa') ?? enemy.actions[0]
    : enemy.actions.find((a) => a.type === 'ataque') ?? enemy.actions[0];
  const dirs: Direction[] = ['izquierda', 'frente', 'derecha'];
  // Sesgo: los enemigos "predecibles" atacan al frente más a menudo
  const dir = Math.random() < 0.45 ? 'frente' : dirs[Math.floor(Math.random() * 3)];
  return { actionId: action.id, chosenDirection: dir };
}

/**
 * Resuelve un turno de combate direccional.
 * Reglas:
 *  - Dirección X contra Dirección X → esquiva perfecta (0 daño)
 *  - Dirección X contra Dirección Y → impacto completo (100%)
 *  - Defensa fallida / sin esquivar → crítico (120% + bonus)
 */
export function resolveTurn(
  state: CombatState,
  attackerInput: TurnInput,
  defenderDirection: Direction,
): CombatState {
  if (state.result) return state;

  const actorId = state.turnOrder[state.currentActorIndex];
  // Copia profunda de participants para mutar hp/mana sin tocar el estado anterior
  const participants: CarrierCombatant[] = state.participants.map((p) => ({ ...p, statusEffects: [...p.statusEffects] }));
  const attacker = participants.find((p) => p.id === actorId);
  const defender = participants.find((p) => p.id !== actorId);
  if (!attacker || !defender) return state;

  const action = attacker.actions.find((a) => a.id === attackerInput.actionId) ?? attacker.actions[0];
  const isPlayerAttacking = attacker.type === 'jugador';

  // --- HUIR ---
  if (action.type === 'huir') {
    const chance = escapeChance(attacker.stats.sigilo, defender.stats.percepcion);
    const success = Math.random() < chance;
    const log = success
      ? `${attacker.name} escapa entre la maleza. ¡Huida exitosa!`
      : `${attacker.name} intenta huir, pero ${defender.name} le corta el paso.`;
    const turn: CombatTurn = {
      turnNumber: state.currentTurn, actorId, action,
      chosenDirection: attackerInput.chosenDirection, targetDirection: defenderDirection,
      damageDealt: 0, damageReceived: 0, critical: false, dodged: false, log,
    };
    if (success) {
      return finalize({ ...state, participants, history: [...state.history, turn] }, 'huida');
    }
    return advance({ ...state, participants, history: [...state.history, turn] });
  }

  // --- DEFENSA ---
  if (action.type === 'defensa') {
    attacker.defending = true;
    attacker.dodgeBonus = (attacker.dodgeBonus ?? 0) + 0.1;
    const turn: CombatTurn = {
      turnNumber: state.currentTurn, actorId, action,
      chosenDirection: attackerInput.chosenDirection, targetDirection: defenderDirection,
      damageDealt: 0, damageReceived: 0, critical: false, dodged: false,
      log: `${attacker.name} se cubre tras el escudo (-50% daño, +10% esquiva).`,
    };
    return advance({ ...state, participants, history: [...state.history, turn] });
  }

  // --- OBJETO / DOMAR (simplificados) ---
  if (action.type === 'objeto') {
    attacker.hp = clamp(attacker.hp + 40, 0, attacker.maxHp);
    const turn: CombatTurn = {
      turnNumber: state.currentTurn, actorId, action,
      chosenDirection: attackerInput.chosenDirection, targetDirection: defenderDirection,
      damageDealt: 0, damageReceived: 0, critical: false, dodged: false,
      log: `${attacker.name} bebe una poción (+40 HP).`,
    };
    return advance({ ...state, participants, history: [...state.history, turn] });
  }

  if (action.type === 'domar') {
    const canTame = defender.type === 'enemigo' && defender.hp <= defender.maxHp * 0.3;
    const success = canTame && attacker.mana >= (action.manaCost ?? 30) && Math.random() < 0.5;
    let log: string;
    if (success) {
      attacker.mana -= action.manaCost ?? 30;
      attacker.tamedCreatures = [
        ...(attacker.tamedCreatures ?? []),
        { id: `tamed-${++combatCounter}`, name: defender.name, species: defender.name, icon: '🐾', level: 1, hp: defender.hp, maxHp: defender.maxHp, attack: Math.round(action.damage ?? 10), loyalty: 60 },
      ];
      log = `🐾 ¡${defender.name} se arrodilla! ${attacker.name} ha domado una criatura.`;
      const turn: CombatTurn = { turnNumber: state.currentTurn, actorId, action, chosenDirection: attackerInput.chosenDirection, targetDirection: defenderDirection, damageDealt: 0, damageReceived: 0, critical: false, dodged: false, log };
      return finalize({ ...state, participants, history: [...state.history, turn] }, 'victoria');
    }
    log = canTame ? `El intento de doma falla; ${defender.name} gruñe.` : `No se puede domar a un rival tan entero.`;
    const turn: CombatTurn = { turnNumber: state.currentTurn, actorId, action, chosenDirection: attackerInput.chosenDirection, targetDirection: defenderDirection, damageDealt: 0, damageReceived: 0, critical: false, dodged: false, log };
    return advance({ ...state, participants, history: [...state.history, turn] });
  }

  // --- ATAQUE / HABILIDAD ---
  if (action.manaCost && attacker.mana < action.manaCost) {
    const turn: CombatTurn = {
      turnNumber: state.currentTurn, actorId, action,
      chosenDirection: attackerInput.chosenDirection, targetDirection: defenderDirection,
      damageDealt: 0, damageReceived: 0, critical: false, dodged: false,
      log: `${attacker.name} intenta usar «${action.name}»… ¡maná insuficiente! Pierde el turno.`,
    };
    return advance({ ...state, participants, history: [...state.history, turn] });
  }
  if (action.manaCost) attacker.mana -= action.manaCost;

  // 1. Resolver dirección
  const sameDirection = attackerInput.chosenDirection === defenderDirection;
  const perfectDodge = sameDirection; // X vs X → esquiva perfecta
  const noDodgeAttempt = defender.defending !== true && Math.random() < 0.15; // "sin esquivar" ocasional
  const critical = !perfectDodge && (noDodgeAttempt || (action.type === 'habilidad' && Math.random() < 0.2));

  // 2. Calcular daño base (stat principal + bonificación de equipo)
  const statScale = action.type === 'habilidad'
    ? Math.max(attacker.stats.inteligencia, attacker.stats.fuerza)
    : attacker.stats.fuerza;
  const equipDamage = attacker.equippedItems.reduce((acc, e) => acc + (e.stats.fuerza ?? 0) + (e.stats.inteligencia ?? 0), 0);
  const rawBase = (action.damage ?? 15) + statScale * 1.2 + equipDamage;

  // Sinergias Fase 1: nobleza (+1%/nivel) + herreros locales aplicadas al jugador
  const carrier = attacker as CarrierCombatant;
  const dmgMult = isPlayerAttacking ? (carrier.synergy?.damageMultiplier ?? 1) : 1;

  // Efectos de estado del atacante
  const atkBuff = attacker.statusEffects.reduce((m, s) => m + (s.modifier.attack ?? 0), 0);

  // Defensa del receptor (las sinergias del jugador también protegen su HP efectivo)
  const defStat = defender.stats.vitalidad * 1.5 + defender.equippedItems.reduce((acc, e) => acc + (e.stats.vitalidad ?? 0), 0);
  const defMult = isPlayerAttacking ? 1 : ((attacker as CarrierCombatant).synergy?.defenseMultiplier ?? 1);

  let finalDamage = 0;
  let dodged = perfectDodge;
  // Esquiva aleatoria adicional por destreza/dodgeBonus
  const evadeChance = defender.stats.destreza * 0.004 + (defender.dodgeBonus ?? 0);
  if (!dodged && Math.random() < evadeChance) dodged = true;

  let multiplier = 1;
  if (dodged) multiplier = 0;
  else if (critical) multiplier = 1.2 + statScale * 0.004; // crítico: 120% + bonus
  if (!dodged && defender.defending) multiplier *= 0.5;

  finalDamage = Math.max(0, Math.round(((rawBase * (1 + atkBuff) * dmgMult) - defStat * defMult * 0.35) * multiplier));
  if (dodged) finalDamage = 0;

  defender.hp = clamp(defender.hp - finalDamage, 0, defender.maxHp);
  defender.defending = false; // se consume al recibir (o al finalizar turno previo)
  attacker.dodgeBonus = 0;

  // 3. Registrar en historial
  const dirTxt = DIRECTION_LABEL[attackerInput.chosenDirection];
  const defDirTxt = DIRECTION_LABEL[defenderDirection];
  let log: string;
  if (dodged) {
    log = `✨ ${defender.name} lee el golpe: ambos apuntan a ${dirTxt} → ESQUIVA PERFECTA (0 daño).`;
  } else if (critical) {
    log = `💥 ¡CRÍTICO! ${attacker.name} ataca por ${dirTxt} y ${defender.name} cae abierto ante ${defDirTxt}: ${finalDamage} de daño (${action.name}).`;
  } else {
    log = `${attacker.name} golpea por ${dirTxt}; ${defender.name} intenta cubrir ${defDirTxt}: ${finalDamage} de daño (${action.name}).`;
  }

  const turn: CombatTurn = {
    turnNumber: state.currentTurn, actorId, action,
    chosenDirection: attackerInput.chosenDirection, targetDirection: defenderDirection,
    damageDealt: finalDamage, damageReceived: 0, critical, dodged, log,
  };

  let next: CombatState = { ...state, participants, history: [...state.history, turn] };

  // 5. Verificar fin de combate
  if (defender.hp <= 0) {
    const winnerIsPlayer = attacker.type === 'jugador';
    next = finalize(next, winnerIsPlayer ? 'victoria' : 'derrota');
  } else {
    next = advance(next);
  }
  return next;
}

// ------------------------------------------------------------
// Utilidades internas
// ------------------------------------------------------------

function advance(state: CombatState): CombatState {
  const nextIndex = (state.currentActorIndex + 1) % state.turnOrder.length;
  // Vuelta completa → incrementa número de turno
  const wrap = nextIndex === 0 || (state.turnOrder.length === 2 && nextIndex < state.currentActorIndex);
  return {
    ...state,
    currentActorIndex: nextIndex,
    currentTurn: wrap ? state.currentTurn + 1 : state.currentTurn,
  };
}

function finalize(state: CombatState, result: CombatResult): CombatState {
  return { ...state, result };
}

// ------------------------------------------------------------
// Recompensas con sinergias de Fase 1
// ------------------------------------------------------------

export function computeRewards(
  state: CombatState,
  character: Character,
  playerSettlements: Parameters<typeof calculateCombatBonuses>[1] = [],
): CombatState {
  if (state.result !== 'victoria') return state;
  const enemy = state.participants.find((p) => p.id !== character.id);
  if (!enemy) return state;

  const bonuses = calculateCombatBonuses(character, playerSettlements);
  const influenceBonus = character.reputation.influence * 0.002; // política → botín

  let gold = 0;
  let xp = 0;
  let items: string[] = [];
  let resources: Partial<Resources> = {};
  const reputation: { honor?: number; infamy?: number; influence?: number } = {};

  if (state.mode === 'pve') {
    const scale = 1 + influenceBonus;
    gold = Math.round((enemy.maxHp * 0.3 + (enemy.stats.fuerza ?? 5) * 4) * bonuses.damageMultiplier * scale);
    xp = Math.round(enemy.maxHp * 0.8 * scale);
    const lootKey = enemy.maxHp >= 700 ? 'legendario' : enemy.maxHp >= 350 ? 'epico' : enemy.maxHp >= 150 ? 'raro' : 'comun';
    const table = LOOT_TABLE[lootKey];
    items = [table[Math.floor(Math.random() * table.length)]];
    reputation.honor = 2;
    if (Math.random() < 0.4) resources.alimento = Math.round(10 + Math.random() * 30);
  } else if (state.mode === 'pvp_duelo') {
    gold = state.betAmount ? state.betAmount * 2 : 0;
    xp = Math.round(enemy.maxHp * 0.5);
    reputation.influence = 3;
    if (state.duelType === 'amistoso') reputation.honor = 5;
    if (state.duelType === 'muerte') reputation.infamy = 10;
  } else if (state.mode === 'pvp_emboscada') {
    gold = Math.round(enemy.maxHp * 0.6);
    xp = Math.round(enemy.maxHp * 0.6);
    reputation.infamy = state.ambushed ? 0 : 8; // saquear sube infamia
    reputation.honor = state.ambushed ? 8 : 0;  // repeler emboscada da honor
  } else if (state.mode === 'pvp_asedio') {
    gold = Math.round(enemy.maxHp * 1.2);
    xp = Math.round(enemy.maxHp);
    reputation.influence = 10;
    reputation.honor = 5;
  }

  return { ...state, rewards: { experience: xp, gold, items, resources, reputation } };
}

// ------------------------------------------------------------
// Consecuencias de muerte en PvP (Sistema 2.2)
// ------------------------------------------------------------

export interface LootByRank {
  lootPercent: number;
  takesItem: boolean;
  politicalReputation: boolean;
  landsTaken: boolean;
  crisis: boolean;
}

export function lootTableForVictimRank(rank: RankId | undefined): LootByRank {
  const lvl = getRank(rank ?? 'plebeyo').level;
  if (lvl <= 2) return { lootPercent: 0.2, takesItem: false, politicalReputation: false, landsTaken: false, crisis: false };   // Plebeyo–Hidalgo
  if (lvl <= 6) return { lootPercent: 0.3, takesItem: true, politicalReputation: false, landsTaken: false, crisis: false };     // Escudero–Barón
  if (lvl <= 10) return { lootPercent: 0.4, takesItem: true, politicalReputation: true, landsTaken: false, crisis: false };     // Vizconde–Duque
  return { lootPercent: 0.5, takesItem: true, politicalReputation: true, landsTaken: true, crisis: true };                        // Marqués–Rey+
}

/** Horas reales de espera al morir en PvE sin piedra. */
export function deathWaitHours(hasRealm: boolean): number {
  return hasRealm ? 5 : 8;
}
