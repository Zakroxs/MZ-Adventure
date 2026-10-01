import type { EventType, GameEvent, Settlement } from '../types/game';

// ------------------------------------------------------------
// EVENTOS NARRATIVOS — 8 tipos, 10% de probabilidad por tick
// ------------------------------------------------------------

export const EVENT_PROBABILITY = 0.1;

interface EventTemplate {
  type: EventType;
  title: string;
  description: (name: string) => string;
  icon: string;
  effects: GameEvent['effects'];
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  { type: 'cosecha', title: '🌾 Cosecha abundante', icon: '🌾', description: (n) => `Los campos de ${n} dieron una cosecha récord.`, effects: { happiness: 8, income: 15 } },
  { type: 'bandolerismo', title: '🏴 Bandidos en los caminos', icon: '🏴', description: (n) => `Partidas de bandidos acosan las rutas de ${n}.`, effects: { stability: -12, income: -10 } },
  { type: 'peste', title: '☠️ Brote de peste', icon: '☠️', description: (n) => `Una fiebre misteriosa se extiende por ${n}.`, effects: { population: -8, happiness: -12 } },
  { type: 'festival', title: '🎉 Festival del reino', icon: '🎉', description: (n) => `${n} celebra tres días de música, vino y torneos.`, effects: { happiness: 12, income: 10 } },
  { type: 'comercio', title: '💰 Caravana comercial', icon: '💰', description: (n) => `Una rica caravana hizo escala en ${n}.`, effects: { income: 20, happiness: 4 } },
  { type: 'reclutamiento', title: '🛡️ Leva de voluntarios', icon: '🛡️', description: (n) => `Jóvenes de ${n} se ofrecen como milicia.`, effects: { stability: 10 } },
  { type: 'tormenta', title: '⛈️ Tormenta devastadora', icon: '⛈️', description: (n) => `Vientos y lluvias azotaron ${n} toda la noche.`, effects: { happiness: -8, income: -12 } },
  { type: 'descubrimiento', title: '💎 Veta descubierta', icon: '💎', description: (n) => `Un minero halló una veta prometedora cerca de ${n}.`, effects: { income: 18, happiness: 6 } },
];

let eventCounter = 0;

/** Genera un evento aleatorio para un asentamiento (o null si no ocurre). */
export function rollEvent(settlement: Settlement): GameEvent | null {
  if (Math.random() > EVENT_PROBABILITY) return null;
  const tpl = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
  return {
    id: `evt-${Date.now().toString(36)}-${++eventCounter}`,
    type: tpl.type,
    title: tpl.title,
    description: tpl.description(settlement.name),
    settlementId: settlement.id,
    timestamp: Date.now(),
    effects: { ...tpl.effects },
  };
}

/** Aplica los efectos del evento al asentamiento. */
export function applyEvent(s: Settlement, e: GameEvent): Settlement {
  const next = { ...s };
  if (e.effects.happiness) next.happiness = Math.min(100, Math.max(0, next.happiness + e.effects.happiness));
  if (e.effects.stability) next.stability = Math.min(100, Math.max(0, next.stability + e.effects.stability));
  if (e.effects.income) next.resources = { ...next.resources, oro: Math.max(0, next.resources.oro + e.effects.income) };
  if (e.effects.population) next.population = Math.max(50, Math.round(next.population * (1 + e.effects.population / 100)));
  return next;
}
