import type { NobleHouse, RankId, RealmId } from '../types/game';

// ------------------------------------------------------------
// Registro global de Casas Nobiliarias
// ------------------------------------------------------------

const COATS = ['🦁', '🐺', '🦅', '🐉', '🦌', '🐻', '⚔️', '🛡️', '🏰', '🌲', '🔥', '❄️', '⚡', '🌙', '☀️', '🦂'];
const HOUSE_MOTTOS = [
  'Fortis in arma', 'Semper fidelis', 'Por honor y sangre', 'La luz guía mi espada',
  'Nunca postrado', 'Firme como la roca', 'En la sombra, lealtad', 'El deber primero',
  'Vencer o morir', 'Raíces profundas', 'Fuego en el corazón', 'Palabra dada, palabra santa',
];
const HOUSE_COLORS = ['hsl(45 65% 52%)', 'hsl(0 55% 48%)', 'hsl(210 50% 48%)', 'hsl(120 30% 42%)', 'hsl(275 40% 50%)', 'hsl(20 55% 48%)'];

let houseCounter = 0;

export const NOBLE_HOUSES: Map<string, NobleHouse> = new Map(); // clave: surname en minúsculas

// Casas reales precargadas (los tronos ya establecidos del mundo)
const ROYAL_PRESET: Array<{ surname: string; realmId: RealmId; motto: string; coat: string }> = [
  { surname: 'Valmont', realmId: 'aldoria', motto: 'El acero y la justicia', coat: '🦁' },
  { surname: 'Aurum', realmId: 'valdris', motto: 'Todo tiene su precio', coat: '☀️' },
  { surname: 'Forjaverde', realmId: 'kethmar', motto: 'La piedra recuerda', coat: '⛏️' },
  { surname: 'Raízprofunda', realmId: 'sylvanna', motto: 'Bajo el dosel', coat: '🌲' },
  { surname: 'Maresbravo', realmId: 'drakkar', motto: 'El trueno anuncia a los fuertes', coat: '⚡' },
];

for (const rp of ROYAL_PRESET) {
  NOBLE_HOUSES.set(rp.surname.toLowerCase(), {
    id: `house-royal-${rp.realmId}`,
    surname: rp.surname,
    realmId: rp.realmId,
    foundedAt: Date.now() - 1000 * 60 * 60 * 24 * 365 * 120, // ~120 años de fundación
    members: [],
    highestRank: 'rey',
    reputation: 1000,
    wealth: 10_000_000,
    lands: [],
    isRoyal: true,
    coatOfArms: rp.coat,
    motto: rp.motto,
    color: HOUSE_COLORS[0],
  });
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Registra una casa nueva o devuelve la existente (mismo apellido = misma familia). */
export function registerHouse(surname: string, realmId: RealmId, playerId: string): NobleHouse {
  const key = surname.trim().toLowerCase();
  const existing = NOBLE_HOUSES.get(key);
  if (existing) {
    if (!existing.members.includes(playerId)) existing.members.push(playerId);
    return existing;
  }
  const house: NobleHouse = {
    id: `house-${++houseCounter}-${key}`,
    surname: surname.trim(),
    realmId,
    foundedAt: Date.now(),
    members: [playerId],
    highestRank: 'plebeyo',
    reputation: 0,
    wealth: 0,
    lands: [],
    isRoyal: false,
    coatOfArms: pick(COATS),
    motto: pick(HOUSE_MOTTOS),
    color: pick(HOUSE_COLORS),
  };
  NOBLE_HOUSES.set(key, house);
  return house;
}

/** Detección de traición: ¿existe el apellido en OTRO reino? */
export function checkSurnameInOtherRealms(
  surname: string,
  currentRealmId: RealmId,
): { exists: boolean; realmId?: RealmId; house?: NobleHouse } {
  const key = surname.trim().toLowerCase();
  const house = NOBLE_HOUSES.get(key);
  if (house && house.realmId !== currentRealmId) {
    return { exists: true, realmId: house.realmId, house };
  }
  return { exists: false };
}

export function getHouseBySurname(surname: string): NobleHouse | undefined {
  return NOBLE_HOUSES.get(surname.trim().toLowerCase());
}

export function getHousesByRealm(realmId: RealmId): NobleHouse[] {
  return [...NOBLE_HOUSES.values()].filter((h) => h.realmId === realmId);
}

const RANK_LEVELS: RankId[] = [
  'plebeyo', 'gentilhombre', 'hidalgo', 'escudero', 'caballero', 'baronet', 'baron',
  'vizconde', 'conde', 'marques', 'duque', 'principe', 'gran_duque', 'archiduque', 'rey', 'emperador',
];

/** Actualiza el rango más alto de la casa cuando un miembro asciende. */
export function updateHouseHighestRank(houseId: string, rank: RankId) {
  for (const house of NOBLE_HOUSES.values()) {
    if (house.id !== houseId || house.isRoyal) continue;
    const cur = RANK_LEVELS.indexOf(house.highestRank);
    const next = RANK_LEVELS.indexOf(rank);
    if (next > cur) house.highestRank = rank;
  }
}

export function addHouseWealthAndReputation(houseId: string, wealth: number, reputation: number) {
  const house = [...NOBLE_HOUSES.values()].find((h) => h.id === houseId);
  if (house) {
    house.wealth += wealth;
    house.reputation += reputation;
  }
}
