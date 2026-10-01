import type { RaceData } from '../types/game';

export const RACES: RaceData[] = [
  {
    id: 'humano', name: 'Humano', icon: '🧑‍🌾',
    description: 'Adaptables y ambiciosos, dominan la diplomacia y el comercio del continente.',
    trait: '+10% diplomacia',
    stage1: { name: 'Humano', bonus: '+10% diplomacia' },
    stage2: [
      { name: 'Súper Humano', bonus: '+15% fuerza', requiresClass: ['guerrero', 'caballero', 'barbaro'] },
      { name: 'Humano Erudito', bonus: '+15% maná', requiresClass: ['mago'] },
      { name: 'Humano Sombrío', bonus: '+15% sigilo', requiresClass: ['picaro'] },
    ],
    stage3: { name: 'Humano Superior', bonus: '+25% a todo' },
    statBonuses: { carisma: 2 },
  },
  {
    id: 'elfo', name: 'Elfo', icon: '🧝',
    description: 'Longevos guardianes de la magia y la precisión, ligados a los bosques antiguos.',
    trait: '+10% magia y arquería',
    stage1: { name: 'Elfo', bonus: '+10% magia y arquería' },
    stage2: [
      { name: 'Elfo de Sangre', bonus: '+20% ataque', requiresClass: ['guerrero', 'barbaro'] },
      { name: 'Elfo de Noche', bonus: '+25% sigilo', requiresClass: ['picaro'] },
      { name: 'Elfo del Sol', bonus: '+25% magia', requiresClass: ['mago'] },
    ],
    stage3: { name: 'Alto Elfo', bonus: '+30% magia, visión verdadera' },
    statBonuses: { inteligencia: 2, destreza: 1, percepcion: 1 },
  },
  {
    id: 'enano', name: 'Enano', icon: '⛏️',
    description: 'Maestros forjadores de las montañas, resistentes como la piedra que tallan.',
    trait: '+15% minería y resistencia',
    stage1: { name: 'Enano', bonus: '+15% minería y resistencia' },
    stage2: [
      { name: 'Enano de las Forjas', bonus: '+25% forja', requiresClass: ['guerrero', 'caballero'] },
      { name: 'Enano de las Montañas', bonus: '+30% HP', requiresClass: ['barbaro'] },
      { name: 'Enano Rúnico', bonus: '+25% magia rúnica', requiresClass: ['mago'] },
    ],
    stage3: { name: 'Enano Ancestral', bonus: '+40% resistencia, inmune veneno' },
    statBonuses: { vitalidad: 2, fuerza: 1 },
  },
  {
    id: 'orco', name: 'Orco', icon: '👹',
    description: 'Guerreros feroces de las estepas, respetan solo la fuerza y el liderazgo.',
    trait: '+15% fuerza e intimidación',
    stage1: { name: 'Orco', bonus: '+15% fuerza e intimidación' },
    stage2: [
      { name: 'Orco Berserker', bonus: '+35% ataque', requiresClass: ['barbaro'] },
      { name: 'Orco Chamán', bonus: '+25% magia espiritual', requiresClass: ['mago', 'domador'] },
      { name: 'Orco de Guerra', bonus: '+25% liderazgo', requiresClass: ['guerrero', 'caballero'] },
    ],
    stage3: { name: 'Señor de la Horda', bonus: '+50% liderazgo' },
    statBonuses: { fuerza: 3 },
  },
  {
    id: 'semielfo', name: 'Semielfo', icon: '🧝‍♂️',
    description: 'Hijos de dos mundos, equilibrados en todas las disciplinas.',
    trait: '+8% a todo',
    stage1: { name: 'Semielfo', bonus: '+8% a todo' },
    stage2: [
      { name: 'Semielfo Versátil', bonus: '+15% a 2 stats', requiresClass: ['cazador', 'arquero'] },
      { name: 'Semielfo Mágico', bonus: '+20% magia', requiresClass: ['mago'] },
      { name: 'Semielfo Guerrero', bonus: '+20% ataque', requiresClass: ['guerrero', 'caballero'] },
    ],
    stage3: { name: 'Semielfo Supremo', bonus: '+25% a todo' },
    statBonuses: { destreza: 1, inteligencia: 1, carisma: 1 },
  },
  {
    id: 'draconiano', name: 'Draconiano', icon: '🐉',
    description: 'Descendientes de dragones, portadores de sangre ardiente y escamas antiguas.',
    trait: '+10% magia de fuego',
    stage1: { name: 'Draconiano', bonus: '+10% magia de fuego' },
    stage2: [
      { name: 'Draco de Fuego', bonus: '+30% daño fuego', requiresClass: ['mago'] },
      { name: 'Draco de Hielo', bonus: '+30% defensa', requiresClass: ['guerrero', 'caballero'] },
      { name: 'Draco de Tormenta', bonus: '+25% velocidad', requiresClass: ['picaro', 'arquero'] },
    ],
    stage3: { name: 'Draco Ancestral', bonus: '+40% a todo, aliento' },
    statBonuses: { fuerza: 1, vitalidad: 1, inteligencia: 1 },
  },
  {
    id: 'nomuerto', name: 'No-Muerto', icon: '💀',
    description: 'Almas que regresaron del más allá. No envejecen, pero el mundo vivo los teme.',
    trait: 'No envejece, -20% diplomacia',
    stage1: { name: 'No-Muerto', bonus: 'No envejece, -20% diplomacia' },
    stage2: [
      { name: 'Zombi', bonus: '+30% HP, regeneración', requiresClass: ['guerrero', 'barbaro'] },
      { name: 'Ghoul', bonus: '+25% velocidad', requiresClass: ['picaro', 'cazador'] },
      { name: 'Espectro', bonus: '+25% magia, atraviesa paredes', requiresClass: ['mago'] },
    ],
    stage3: { name: 'Vampiro', bonus: '+40% a todo, roba vida' },
    statBonuses: { vitalidad: 2, sigilo: 1 },
    specialNote: 'Los no-muertos pagan el doble en la iglesia y son temidos en muchos reinos.',
  },
];

export function getRace(id: string): RaceData {
  return RACES.find((r) => r.id === id) ?? RACES[0];
}

// Etapa 2 recomendada según clase elegida
export function getStage2ForRace(raceId: string, classId: string) {
  const race = getRace(raceId);
  return (
    race.stage2.find((s) => Array.isArray(s.requiresClass) && s.requiresClass.includes(classId as never)) ??
    race.stage2[0]
  );
}
