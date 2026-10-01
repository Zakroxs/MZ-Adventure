// ============================================================
// BOUNTIES Y ASEDIOS — Lógica de guerra (Fase 2, Sistemas 4-5)
// ============================================================

import type { Bounty, SiegePhase, SiegeState, WarVote } from '../../types/combat';
import { SIEGE_PHASE_INFO } from '../../types/combat';
import type { RankId, RealmId } from '../../types/game';
import { getRank } from '../../data/nobilityRanks';

let bountyCounter = 0;

const NOBLE_NAMES = [
  'Conde Aurelio Vess', 'Vizcondesa Marlene Daub', 'Marqués Torvin Blackmarch',
  'Duquesa Ysolde de Marlock', 'Consorte Idris Falco', 'Baronesa Nerida Colonnata',
];

/** Crea un bounty sobre la cabeza de un jugador/NPC. */
export function issueBounty(
  targetId: string,
  targetName: string,
  amount: number,
  reason: string,
  issuedBy: string,
  realmId?: RealmId,
): Bounty {
  return {
    id: `bty-${Date.now().toString(36)}-${++bountyCounter}`,
    targetId, targetName, amount, reason, issuedBy,
    expiresAt: Date.now() + 1000 * 60 * 60 * 72, // 72h reales
    active: true,
    realmId,
  };
}

/** Bounties iniciales del gremio de aventureros. */
export const INITIAL_BOUNTIES: Bounty[] = [
  { id: 'bty-1', targetId: 'npc-serwyn', targetName: 'Serwyn Galvadon', amount: 5000, reason: 'Asalto a caravanas en la Ruta Dorada', issuedBy: 'Gremio de Aventureros de Valdris', expiresAt: Date.now() + 86400_000 * 5, active: true, realmId: 'valdris' },
  { id: 'bty-2', targetId: 'npc-vaskarr', targetName: 'Vaskarr Colmillo', amount: 9000, reason: 'Saqueo de la aldea de Piedrahundida', issuedBy: 'Casa Forjaverde', expiresAt: Date.now() + 86400_000 * 4, active: true, realmId: 'kethmar' },
  { id: 'bty-3', targetId: 'npc-kael', targetName: 'Kael Umbrasis', amount: 18000, reason: 'Asesinato ritual de dos hidalgos', issuedBy: 'Corona de Drakkar', expiresAt: Date.now() + 86400_000 * 10, active: true, realmId: 'drakkar' },
  { id: 'bty-4', targetId: 'npc-fenwyn', targetName: 'Fenwyn Nieblar', amount: 7000, reason: 'Caza furtiva en el Dosel Real', issuedBy: 'Guardianes de Sylvanna', expiresAt: Date.now() + 86400_000 * 3, active: true, realmId: 'sylvanna' },
  { id: 'bty-5', targetId: 'npc-bartolome', targetName: 'Bartolome Grasso', amount: 3000, reason: 'Extorsión a mercaderes del puerto', issuedBy: 'Gremio Mercantil de Valdris', expiresAt: Date.now() + 86400_000 * 2, active: true, realmId: 'valdris' },
  { id: 'bty-6', targetId: 'npc-caballero-maldito', targetName: 'Caballero Maldito de la Laguna', amount: 25000, reason: 'Terror en los caminos del norte', issuedBy: 'Templo de la Luz Pálida', expiresAt: Date.now() + 86400_000 * 14, active: true, realmId: 'aldoria' },
];

/** Reclamar un bounty: cobra el cazarrecompensas. */
export function claimBounty(b: Bounty, bounties: Bounty[]): { payout: number; next: Bounty[] } {
  const next = bounties.map((x) => (x.id === b.id ? { ...x, active: false } : x));
  return { payout: b.amount, next };
}

// ------------------------------------------------------------
// Declaración de guerra y asedios
// ------------------------------------------------------------

const RANKS_WITH_VOTE: RankId[] = ['conde', 'marques', 'duque', 'principe', 'gran_duque', 'archiduque', 'rey', 'emperador'];

export function canVoteForWar(rank: RankId): boolean {
  return RANKS_WITH_VOTE.includes(rank) || getRank(rank).level >= getRank('conde').level;
}

export const CASUS_BELLI = [
  'Frontera disputada en las marcas',
  'Traición verificada de un noble fronterizo',
  'Monopolio de un recurso estratégico (minas de hierro)',
  'Saqueo de una caravana real',
  'Asesinato de un emisario',
];

/** Genera votos simulados de nobles del reino atacante. */
export function generateWarVotes(playerInFavor: boolean, playerRank: RankId): WarVote[] {
  const votes: WarVote[] = [];
  if (canVoteForWar(playerRank)) votes.push({ nobleName: 'Tu voto', rank: playerRank, inFavor: playerInFavor });
  for (let i = 0; i < 5; i++) {
    votes.push({ nobleName: NOBLE_NAMES[i % NOBLE_NAMES.length], rank: i < 2 ? 'conde' : i < 4 ? 'marques' : 'duque', inFavor: Math.random() < 0.65 });
  }
  return votes;
}

export function warApproved(votes: WarVote[]): boolean {
  return votes.filter((v) => v.inFavor && canVoteForWar(v.rank)).length >= 3;
}

const PHASE_ORDER: SiegePhase[] = ['preaviso', 'bloqueo', 'bombardero', 'asalto', 'saqueo', 'resuelto'];

/** Inicia el asedio tras aprobación de la votación. */
export function startSiege(attackerRealm: RealmId, defenderRealm: RealmId, targetSettlementName: string, casusBelli: string, targetWalls: number, votes: WarVote[]): SiegeState {
  const now = Date.now();
  return {
    id: `sg-${now.toString(36)}`,
    attackerRealm, defenderRealm, targetSettlementName, targetWalls, casusBelli,
    phase: 'preaviso',
    votes,
    startedAt: now,
    phaseEndsAt: now + SIEGE_PHASE_INFO.preaviso.hours * 3_600_000,
    stabilityPenalty: 0,
  };
}

/** Avanza una fase del asedio (acelerado para demostración). */
export function advanceSiegePhase(s: SiegeState): SiegeState {
  const idx = PHASE_ORDER.indexOf(s.phase);
  const nextPhase = PHASE_ORDER[Math.min(idx + 1, PHASE_ORDER.length - 1)];
  const now = Date.now();
  let walls = s.targetWalls;
  let penalty = s.stabilityPenalty;
  if (s.phase === 'bloqueo') penalty += 24 * 5; // -5% estabilidad/hora durante 24h
  if (s.phase === 'bombardero') walls = Math.max(0, walls - 12 * 0.01 * walls - 0.12); // ~1%/hora
  return {
    ...s,
    phase: nextPhase,
    targetWalls: +walls.toFixed(2),
    stabilityPenalty: penalty,
    phaseEndsAt: now + SIEGE_PHASE_INFO[nextPhase].hours * 3_600_000,
  };
}

/**
 * Defensa final de muralla (Sistema 5.3):
 * defensa = base × (1+pacto×0.3) × (1+bendición×0.05) × (1+encantamiento×0.1)
 *           × (1+herrero×0.01×nivel) × (1-sabotaje×0.2)
 */
export function wallDefense(
  base: number,
  opts: { pact?: number; blessing?: number; enchantment?: number; smithLevel?: number; sabotage?: number },
): number {
  const d =
    base *
    (1 + (opts.pact ?? 0) * 0.3) *
    (1 + (opts.blessing ?? 0) * 0.05) *
    (1 + (opts.enchantment ?? 0) * 0.1) *
    (1 + (opts.smithLevel ?? 0) * 0.01) *
    (1 - (opts.sabotage ?? 0) * 0.2);
  return +d.toFixed(2);
}

/** Resultado del asalto: ¿resisten las murallas? */
export function resolveAssault(siege: SiegeState, attackingForce: number): { captured: boolean; chronicle: string } {
  const defense = wallDefense(siege.targetWalls, { pact: 0.5, blessing: 0.2, smithLevel: 6 });
  const ratio = attackingForce / Math.max(1, defense * 100);
  const captured = ratio > 0.9 + Math.random() * 0.3;
  const chronicle = captured
    ? `🔥 ${siege.targetSettlementName} ha caído ante las hordas de ${siege.attackerRealm}. El saqueo durará seis horas y las crónicas recordarán esta afrenta por generaciones.`
    : `🛡️ ¡${siege.targetSettlementName} resiste! Las murallas de ${siege.defenderRealm} se mantuvieron en pie bajo el asalto; los atacantes se repliegan entre el barro y las banderas rotas.`;
  return { captured, chronicle };
}
