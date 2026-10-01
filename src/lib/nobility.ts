import type { Character, Deed, RankId } from '../types/game';
import { getNextRank, getRank } from '../data/nobilityRanks';
import { updateHouseHighestRank } from '../data/nobleHouses';

// ------------------------------------------------------------
// NOBLEZA: ascensos y hazañas
// ------------------------------------------------------------

let deedCounter = 0;

export function makeDeed(
  title: string,
  description: string,
  type: Deed['type'],
  effects: Deed['effects'],
): Deed {
  return { id: `deed-${Date.now().toString(36)}-${++deedCounter}`, title, description, type, timestamp: Date.now(), effects };
}

const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

/** Aplica los efectos de una hazaña a la reputación del personaje. */
export function applyDeed(c: Character, deed: Deed): Character {
  const rep = { ...c.reputation, deeds: [deed, ...c.reputation.deeds].slice(0, 50) };
  rep.honor = clamp(rep.honor + (deed.effects.honor ?? 0));
  rep.infamy = clamp(rep.infamy + (deed.effects.infamy ?? 0));
  rep.loyalty = clamp(rep.loyalty + (deed.effects.loyalty ?? 0));
  // La influencia puede superar 100 porque se usa como requisito de rango
  rep.influence = Math.max(0, rep.influence + (deed.effects.influence ?? 0));
  return { ...c, reputation: rep };
}

// Catálogo de hazañas predefinidas (Fase 1)
export const DEED_TEMPLATES = {
  defenderAsentamiento: () => makeDeed('Defensa del asentamiento', 'Tu guarnición rechazó un ataque sobre tus tierras.', 'honorable', { honor: 10, loyalty: 5 }),
  donarTemplo: () => makeDeed('Donación al templo', 'Ofrendaste oro al templo; el clero habla bien de ti.', 'honorable', { honor: 15, influence: 5 }),
  comercioJusto: () => makeDeed('Comercio justo', 'Cerraste un trato honesto que benefició a ambas partes.', 'honorable', { honor: 5, influence: 8 }),
  construirCaminos: () => makeDeed('Construcción de caminos', 'Financiaste caminos que unen tus aldeas.', 'honorable', { honor: 12, influence: 10 }),
  saquear: () => makeDeed('Saqueo', 'Tus hombres saquearon una caravana desprotegida.', 'infame', { infamy: 20, honor: -15 }),
  traicionarAliado: () => makeDeed('Traición a un aliado', 'Abandonaste a un aliado en hora de necesidad.', 'infame', { infamy: 30, honor: -25 }),
  subirImpuestos: () => makeDeed('Subida de impuestos', 'Apresuraste tributos extra sobre tu pueblo.', 'infame', { infamy: 10, honor: -8 }),
};

export interface PromotionCheck {
  canPromote: boolean;
  missing: string[];
  nextRankId?: RankId;
}

/** Verifica si el personaje cumple los requisitos del siguiente rango. */
export function checkPromotion(c: Character): PromotionCheck {
  const next = getNextRank(c.rank);
  if (!next) return { canPromote: false, missing: ['No hay rangos superiores al actual.'] };
  const reqs = next.requirements;
  const totalWealth = c.wealth.oro + c.wealth.plata / 100 + c.wealth.cobre / 10_000;
  const missing: string[] = [];
  if (c.level < reqs.level) missing.push(`Nivel ${c.level}/${reqs.level}`);
  if (totalWealth < reqs.wealth) missing.push(`Oro ${Math.round(totalWealth).toLocaleString()}/${reqs.wealth.toLocaleString()}`);
  if (c.reputation.honor < reqs.honor) missing.push(`Honor ${c.reputation.honor}/${reqs.honor}`);
  if (c.settlements.length < reqs.lands) missing.push(`Tierras ${c.settlements.length}/${reqs.lands}`);
  if (c.reputation.influence < reqs.influence) missing.push(`Influencia ${c.reputation.influence}/${reqs.influence}`);
  // La infamia penaliza: con infamia > 50 no se puede ascender
  if (c.reputation.infamy > 50) missing.push(`Infamia demasiado alta (${c.reputation.infamy}/50 máx.)`);
  return { canPromote: missing.length === 0, missing, nextRankId: next.id };
}

/** Ejecuta el ascenso: cambia rango, registra hazaña y actualiza la casa. */
export function promote(c: Character): { character: Character; deed: Deed | null } {
  const check = checkPromotion(c);
  if (!check.canPromote || !check.nextRankId) return { character: c, deed: null };
  const rank = getRank(check.nextRankId);
  const deed = makeDeed(
    `Ascenso a ${rank.name}`,
    `La corona te reconoce el rango de ${rank.name} (${rank.title}).`,
    'honorable',
    { influence: 5 },
  );
  const promoted: Character = { ...c, rank: rank.id, title: rank.title !== '—' ? rank.title : c.title };
  updateHouseHighestRank(promoted.houseId, rank.id);
  return { character: applyDeed(promoted, deed), deed };
}
