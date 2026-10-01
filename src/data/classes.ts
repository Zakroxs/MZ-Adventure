import type { ClassData } from '../types/game';

export const CLASSES: ClassData[] = [
  {
    id: 'guerrero', name: 'Guerrero', icon: '⚔️', role: 'Tanque / DPS',
    primaryStats: ['fuerza', 'vitalidad'],
    ability: 'Golpe Poderoso', abilityDesc: 'Un tajo devastador que ignora parte de la armadura enemiga.',
    description: 'Veterano del campo de batalla, maestro del combate cuerpo a cuerpo.',
  },
  {
    id: 'caballero', name: 'Caballero', icon: '🛡️', role: 'Híbrido líder',
    primaryStats: ['fuerza', 'liderazgo'],
    ability: 'Órdenes de Batalla', abilityDesc: 'Inspiras a tus tropas y coordinas formaciones tácticas.',
    description: 'Noble guerrero juramentado, líder nato en el frente y en la corte.',
  },
  {
    id: 'arquero', name: 'Arquero', icon: '🏹', role: 'DPS distancia',
    primaryStats: ['destreza', 'percepcion'],
    ability: 'Disparo Certero', abilityDesc: 'Flecha precisa que puede aturdir al objetivo.',
    description: 'Ojos de halcón y manos firmes; la muerte llega desde lejos.',
  },
  {
    id: 'mago', name: 'Mago', icon: '🔮', role: 'DPS mágico',
    primaryStats: ['inteligencia', 'sabiduria'],
    ability: 'Bola de Fuego', abilityDesc: 'Conjura una esfera ardiente que explota en área.',
    description: 'Estudioso de los arcanos, canaliza fuerzas que otros temen nombrar.',
  },
  {
    id: 'picaro', name: 'Pícaro', icon: '🗡️', role: 'DPS sigilo',
    primaryStats: ['destreza', 'sigilo'],
    ability: 'Ataque Furtivo', abilityDesc: 'Golpe desde las sombras con daño crítico aumentado.',
    description: 'Sombras, navajas y secretos; nadie escucha sus pasos.',
  },
  {
    id: 'barbaro', name: 'Bárbaro', icon: '🪓', role: 'DPS puro',
    primaryStats: ['fuerza', 'destreza'],
    ability: 'Furia', abilityDesc: 'Entra en un frenesí que aumenta el daño y la resistencia.',
    description: 'Fuerza bruta sin cadenas, criado por tierras salvajes.',
  },
  {
    id: 'cazador', name: 'Cazador', icon: '🎯', role: 'DPS / rango',
    primaryStats: ['destreza', 'percepcion'],
    ability: 'Marca del Cazador', abilityDesc: 'Marca a la presa: rastreo perfecto y bonus contra ella.',
    description: 'Rastreador implacable; si te caza, no hay escapatoria.',
  },
  {
    id: 'domador', name: 'Domador', icon: '🐺', role: 'Control',
    primaryStats: ['carisma', 'liderazgo'],
    ability: 'Domar Criatura', abilityDesc: 'Subyuga bestias salvajes y las convierte en aliadas.',
    description: 'Voz amable con las fieras; su manada es su ejército.',
  },
];

export function getClass(id: string): ClassData {
  return CLASSES.find((c) => c.id === id) ?? CLASSES[0];
}
