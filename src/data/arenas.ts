import type { ArenaData, League, OpponentOffer } from '../types/combat';

// ------------------------------------------------------------
// ARENAS — una por reino (Fase 2)
// ------------------------------------------------------------

export const ARENAS: ArenaData[] = [
  { id: 'arena-aldoria', name: 'Arena de Aldorheim', realm: 'aldoria', league: 'bronce', capacity: 500, icon: '🏟️' },
  { id: 'arena-valdris', name: 'Coliseo Dorado', realm: 'valdris', league: 'plata', capacity: 1200, icon: '🏛️' },
  { id: 'arena-kethmar', name: 'Foso de Piedra', realm: 'kethmar', league: 'oro', capacity: 800, icon: '⛰️' },
  { id: 'arena-sylvanna', name: 'Claros del Juicio', realm: 'sylvanna', league: 'platino', capacity: 600, icon: '🌲' },
  { id: 'arena-drakkar', name: 'Anillo del Trueno', realm: 'drakkar', league: 'diamante', capacity: 1500, icon: '⚡' },
];

// ------------------------------------------------------------
// LIGAS DE ARENA
// ------------------------------------------------------------

export const LEAGUES: League[] = [
  { id: 'bronce', name: 'Bronce', icon: '🥉', minLevel: 1, maxLevel: 20, entryFee: 100 },
  { id: 'plata', name: 'Plata', icon: '🥈', minLevel: 21, maxLevel: 40, entryFee: 500 },
  { id: 'oro', name: 'Oro', icon: '🥇', minLevel: 41, maxLevel: 60, entryFee: 2000 },
  { id: 'platino', name: 'Platino', icon: '💠', minLevel: 61, maxLevel: 80, entryFee: 10000 },
  { id: 'diamante', name: 'Diamante', icon: '💎', minLevel: 81, maxLevel: 100, entryFee: 50000 },
  { id: 'leyenda', name: 'Leyenda', icon: '👑', minLevel: 1, maxLevel: 100, entryFee: 0 }, // solo invitados, apuestas libres
];

export function leagueForLevel(level: number): League {
  return LEAGUES.find((l) => l.id !== 'leyenda' && level >= l.minLevel && level <= l.maxLevel) ?? LEAGUES[0];
}

// ------------------------------------------------------------
// RIVALES DISPONIBLES PARA DUELO (NPCs nobles de los 5 reinos)
// ------------------------------------------------------------

export const OPPONENT_POOL: OpponentOffer[] = [
  { id: 'opp-1', name: 'Cedric', surname: 'de Torvald', realmId: 'aldoria', raceIcon: '🧑‍🌾', classIcon: '⚔️', level: 3, rank: 'plebeyo', hp: 95, attack: 14, speed: 42, wager: 150, bio: 'Hijo de un herrero que sueña con la espada larga.' },
  { id: 'opp-2', name: 'Marlen', surname: 'Voss', realmId: 'aldoria', raceIcon: '🧝', classIcon: '🏹', level: 7, rank: 'gentilhombre', hp: 120, attack: 19, speed: 61, wager: 400, bio: 'Arquera silente; rara vez parpadea antes de disparar.' },
  { id: 'opp-3', name: 'Aldous', surname: 'Valmont', realmId: 'aldoria', raceIcon: '🛡️', classIcon: '🛡️', level: 14, rank: 'escudero', hp: 210, attack: 26, speed: 38, wager: 1200, bio: 'Pariente menor de la casa real; orgullo herido tras cada derrota.' },
  { id: 'opp-4', name: 'Serwyn', surname: 'Galvadon', realmId: 'aldoria', raceIcon: '🧑‍🌾', classIcon: '🗡️', level: 22, rank: 'caballero', hp: 260, attack: 34, speed: 55, wager: 3000, bio: 'Caballero errante que cobra por lecciones y por cabezas.' },
  { id: 'opp-5', name: 'Isolde', surname: 'Aurum', realmId: 'valdris', raceIcon: '🧝‍♀️', classIcon: '🔮', level: 9, rank: 'hidalgo', hp: 140, attack: 30, speed: 47, wager: 800, bio: 'Hechicera contable: calcula cada chispa en oro y consecuencias.' },
  { id: 'opp-6', name: 'Bartolome', surname: 'Grasso', realmId: 'valdris', raceIcon: '🧑‍🌾', classIcon: '🪓', level: 17, rank: 'escudero', hp: 230, attack: 31, speed: 40, wager: 1800, bio: 'Excontrabandista convertido en matón a sueldo de gremios.' },
  { id: 'opp-7', name: 'Nerida', surname: 'Falco', realmId: 'valdris', raceIcon: '🧑‍🌾', classIcon: '🗡️', level: 28, rank: 'baron', hp: 300, attack: 41, speed: 66, wager: 5000, bio: 'Baronesa de las rutas; nadie pasa sus peajes sin pagar dientes.' },
  { id: 'opp-8', name: 'Thrum', surname: 'Barbadiablo', realmId: 'kethmar', raceIcon: '⛏️', classIcon: '🛡️', level: 12, rank: 'gentilhombre', hp: 280, attack: 24, speed: 30, wager: 900, bio: 'Enano pacífico… hasta que tocan su yunque.' },
  { id: 'opp-9', name: 'Grimna', surname: 'Piedra Oscura', realmId: 'kethmar', raceIcon: '⛏️', classIcon: '⚔️', level: 24, rank: 'baronet', hp: 340, attack: 38, speed: 34, wager: 3500, bio: 'Guardia de las profundidades; huele el acero antes que el pan.' },
  { id: 'opp-10', name: 'Vaskarr', surname: 'Colmillo', realmId: 'kethmar', raceIcon: '👹', classIcon: '🪓', level: 33, rank: 'baron', hp: 420, attack: 52, speed: 44, wager: 7000, bio: 'Bárbaro orco adoptado por un clan enano. Nadie entiende su risa.' },
  { id: 'opp-11', name: 'Elandriel', surname: 'Rocaverde', realmId: 'sylvanna', raceIcon: '🧝', classIcon: '🏹', level: 15, rank: 'escudero', hp: 190, attack: 33, speed: 63, wager: 1400, bio: 'Prima de la reina; odia que la llamen princesa, ama que la retin.' },
  { id: 'opp-12', name: 'Fenwyn', surname: 'Nieblar', realmId: 'sylvanna', raceIcon: '🧝‍♂️', classIcon: '🗡️', level: 26, rank: 'vizconde', hp: 280, attack: 43, speed: 71, wager: 4500, bio: 'Vizconde de los claros; desaparece entre helechos imposibles.' },
  { id: 'opp-13', name: 'Sylas', surname: 'Raízprofunda', realmId: 'sylvanna', raceIcon: '🧝', classIcon: '🔮', level: 38, rank: 'conde', hp: 360, attack: 58, speed: 49, wager: 9000, bio: 'Conde druida: discute con árboles y gana discusiones.' },
  { id: 'opp-14', name: 'Hrogar', surname: 'Maresbravo', realmId: 'drakkar', raceIcon: '🐉', classIcon: '⚔️', level: 19, rank: 'caballero', hp: 320, attack: 40, speed: 45, wager: 2200, bio: 'Draconiano de la tormenta; sus espadones crujen como truenos.' },
  { id: 'opp-15', name: 'Signy', surname: 'Tormentson', realmId: 'drakkar', raceIcon: '🧑‍🦰', classIcon: '🪓', level: 31, rank: 'baron', hp: 400, attack: 50, speed: 52, wager: 6500, bio: 'Sobrina del rey; apuesta su hacha contra lo que sea.' },
  { id: 'opp-16', name: 'Kael', surname: 'Umbrasis', realmId: 'drakkar', raceIcon: '🧛', classIcon: '🗡️', level: 44, rank: 'vizconde', hp: 380, attack: 62, speed: 78, wager: 14000, bio: 'No-muerto elegante; paga el doble en la iglesia y se ríe de ello.' },
  { id: 'opp-17', name: 'Duquesa Ysolde', surname: 'de Marlock', realmId: 'aldoria', raceIcon: '🦢', classIcon: '🛡️', level: 55, rank: 'duque', hp: 620, attack: 74, speed: 58, wager: 30000, bio: 'Dama de hierro de Aldoria. Tres duelos a muerte, tres tumbas vacías.' },
  { id: 'opp-18', name: 'Marqués Draven', surname: 'Blackmarch', realmId: 'valdris', raceIcon: '🐺', classIcon: '⚔️', level: 68, rank: 'marques', hp: 780, attack: 92, speed: 64, wager: 60000, bio: 'Señor de la marca dorada; colecciona promesas rotas.' },
];
