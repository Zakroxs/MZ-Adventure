import type { NobilityRank, RankId } from '../types/game';

// 16 rangos de nobleza — tabla de requisitos de la Fase 1
export const NOBILITY_RANKS: NobilityRank[] = [
  { id: 'plebeyo', name: 'Plebeyo', title: '—', level: 0, power: 0, military: 0, taxRate: 0, maxSettlements: 0, requirements: { level: 0, wealth: 0, honor: 0, lands: 0, influence: 0 }, privileges: ['Derecho a comerciar en mercados públicos'] },
  { id: 'gentilhombre', name: 'Gentilhombre', title: 'Señor', level: 1, power: 5, military: 2, taxRate: 1, maxSettlements: 0, requirements: { level: 3, wealth: 500, honor: 100, lands: 0, influence: 0 }, privileges: ['Acceso a salones nobles', 'Voto menor en asambleas locales'] },
  { id: 'hidalgo', name: 'Hidalgo', title: 'Don', level: 2, power: 10, military: 4, taxRate: 2, maxSettlements: 0, requirements: { level: 5, wealth: 2000, honor: 300, lands: 0, influence: 5 }, privileges: ['Portar espada en público', 'Exención de impuestos menores'] },
  { id: 'escudero', name: 'Escudero', title: '—', level: 3, power: 15, military: 8, taxRate: 2, maxSettlements: 0, requirements: { level: 8, wealth: 3000, honor: 400, lands: 0, influence: 10 }, privileges: ['Servir bajo un caballero', 'Entrenamiento militar oficial'] },
  { id: 'caballero', name: 'Caballero', title: 'Sir', level: 4, power: 25, military: 15, taxRate: 3, maxSettlements: 1, requirements: { level: 12, wealth: 8000, honor: 700, lands: 1, influence: 15 }, privileges: ['Título heráldico propio', 'Comandar una pequeña guarnición', 'Recibir homenaje'] },
  { id: 'baronet', name: 'Baronet', title: 'Sir', level: 5, power: 35, military: 22, taxRate: 4, maxSettlements: 1, requirements: { level: 16, wealth: 15000, honor: 1200, lands: 1, influence: 25 }, privileges: ['Jurisdicción sobre una aldea', 'Cobrar peajes menores'] },
  { id: 'baron', name: 'Barón', title: 'Su Señoría', level: 6, power: 50, military: 35, taxRate: 5, maxSettlements: 2, requirements: { level: 20, wealth: 30000, honor: 2000, lands: 2, influence: 35 }, privileges: ['Gobernar una baronía', 'Impuestos propios', 'Justicia menor'] },
  { id: 'vizconde', name: 'Vizconde', title: 'Su Señoría', level: 7, power: 65, military: 48, taxRate: 6, maxSettlements: 3, requirements: { level: 25, wealth: 60000, honor: 3500, lands: 3, influence: 50 }, privileges: ['Administrar tierras en nombre del conde', 'Levantar milicia local'] },
  { id: 'conde', name: 'Conde', title: 'Su Excelencia', level: 8, power: 85, military: 65, taxRate: 8, maxSettlements: 5, requirements: { level: 30, wealth: 120000, honor: 6000, lands: 5, influence: 70 }, privileges: ['Gobernar un condado', 'Moneda propia limitada', 'Asiento en el consejo real'] },
  { id: 'marques', name: 'Marqués', title: 'Su Excelencia', level: 9, power: 100, military: 85, taxRate: 9, maxSettlements: 7, requirements: { level: 35, wealth: 250000, honor: 10000, lands: 7, influence: 90 }, privileges: ['Defensa de una frontera', 'Ejército propio', 'Tratados locales'] },
  { id: 'duque', name: 'Duque', title: 'Su Gracia', level: 10, power: 130, military: 110, taxRate: 10, maxSettlements: 10, requirements: { level: 40, wealth: 500000, honor: 18000, lands: 10, influence: 110 }, privileges: ['Gobernar un ducado', 'Alta justicia', 'Comandar ejércitos regionales'] },
  { id: 'principe', name: 'Príncipe', title: 'Su Alteza', level: 11, power: 160, military: 135, taxRate: 12, maxSettlements: 15, requirements: { level: 45, wealth: 1000000, honor: 30000, lands: 15, influence: 130 }, privileges: ['Sangre real o reconocida', 'Pretensión al trono', 'Consejo privado'] },
  { id: 'gran_duque', name: 'Gran Duque', title: 'Su Alteza', level: 12, power: 190, military: 160, taxRate: 13, maxSettlements: 20, requirements: { level: 50, wealth: 2500000, honor: 50000, lands: 20, influence: 150 }, privileges: ['Gobernar varios ducados', 'Veto en leyes regionales'] },
  { id: 'archiduque', name: 'Archiduque', title: 'Su Alteza Imperial', level: 13, power: 220, military: 190, taxRate: 15, maxSettlements: 25, requirements: { level: 55, wealth: 6000000, honor: 80000, lands: 25, influence: 170 }, privileges: ['Rango casi regio', 'Nombrar marqueses y condes'] },
  { id: 'rey', name: 'Rey', title: 'Su Majestad', level: 14, power: 260, military: 240, taxRate: 18, maxSettlements: 30, requirements: { level: 60, wealth: 15000000, honor: 150000, lands: 30, influence: 200 }, privileges: ['Corona del reino', 'Ley suprema', 'Comandar ejércitos reales'] },
  { id: 'emperador', name: 'Emperador', title: 'Su Majestad Imperial', level: 15, power: 320, military: 300, taxRate: 20, maxSettlements: 50, requirements: { level: 70, wealth: 50000000, honor: 300000, lands: 50, influence: 250 }, privileges: ['Dominio sobre varios reinos', 'Título máximo', 'Legado inmortal'] },
];

export const RANK_ORDER: RankId[] = NOBILITY_RANKS.map((r) => r.id);

export function getRank(id: RankId): NobilityRank {
  return NOBILITY_RANKS.find((r) => r.id === id) ?? NOBILITY_RANKS[0];
}

export function getNextRank(id: RankId): NobilityRank | null {
  const idx = RANK_ORDER.indexOf(id);
  return idx >= 0 && idx < NOBILITY_RANKS.length - 1 ? NOBILITY_RANKS[idx + 1] : null;
}

// Bonus de ingresos por rango (% adicional)
export function rankIncomeBonus(id: RankId): number {
  return getRank(id).level * 2; // 0% plebeyo → 30% emperador
}
