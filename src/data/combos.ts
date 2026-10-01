import type { SkillCombo } from '../types/combat';

// ------------------------------------------------------------
// COMBOS DE HABILIDADES — 15+ combos (Fase 2)
// Cada clase tiene habilidades base; los combos unen dos de ellas.
// ------------------------------------------------------------

export interface Skill {
  id: string;
  name: string;
  classId: string;
  icon: string;
  damage: number; // daño base multiplicado por stat al crear combatiente
  manaCost: number;
  cooldown: number;
  description: string;
}

export const SKILLS: Skill[] = [
  // Guerrero
  { id: 'golpe-poderoso', name: 'Golpe Poderoso', classId: 'guerrero', icon: '⚔️', damage: 30, manaCost: 10, cooldown: 2, description: 'Tajo devastador que ignora parte de la armadura.' },
  { id: 'grito-guerra', name: 'Grito de Guerra', classId: 'guerrero', icon: '📢', damage: 0, manaCost: 8, cooldown: 3, description: '+25% ataque propio durante 3 turnos.' },
  // Caballero
  { id: 'orden-carga', name: 'Orden de Carga', classId: 'caballero', icon: '🐎', damage: 26, manaCost: 12, cooldown: 2, description: 'Embestida ordenada; golpea y empuja.' },
  { id: 'escudo-fe', name: 'Escudo de Fe', classId: 'caballero', icon: '🛡️', damage: 0, manaCost: 10, cooldown: 3, description: 'Absorbe el próximo gran impacto.' },
  // Arquero
  { id: 'disparo-certero', name: 'Disparo Certero', classId: 'arquero', icon: '🏹', damage: 28, manaCost: 8, cooldown: 2, description: 'Flecha precisa con chance de aturdimiento.' },
  { id: 'lluvia-flechas', name: 'Lluvia de Flechas', classId: 'arquero', icon: '🎯', damage: 22, manaCost: 14, cooldown: 3, description: 'Cobertura en las tres direcciones.' },
  // Mago
  { id: 'bola-fuego', name: 'Bola de Fuego', classId: 'mago', icon: '🔥', damage: 34, manaCost: 16, cooldown: 2, description: 'Esfera ardiente que explota en área.' },
  { id: 'rafaga-viento', name: 'Ráfaga de Viento', classId: 'mago', icon: '🌪️', damage: 18, manaCost: 10, cooldown: 2, description: 'Desequilibra al rival y revela su intención.' },
  { id: 'relampago-arcano', name: 'Relámpago Arcano', classId: 'mago', icon: '⚡', damage: 30, manaCost: 18, cooldown: 3, description: 'Rayo que atraviesa defensas.' },
  // Pícaro
  { id: 'ataque-furtivo', name: 'Ataque Furtivo', classId: 'picaro', icon: '🗡️', damage: 32, manaCost: 10, cooldown: 2, description: 'Golpe desde las sombras; crítico ampliado.' },
  { id: 'veneno-cuchilla', name: 'Veneno en la Cuchilla', classId: 'picaro', icon: '🧪', damage: 12, manaCost: 8, cooldown: 3, description: 'Envenena: daño persistente 3 turnos.' },
  // Bárbaro
  { id: 'furia', name: 'Furia', classId: 'barbaro', icon: '😡', damage: 0, manaCost: 12, cooldown: 4, description: '+50% ataque, -10% defensa durante 3 turnos.' },
  { id: 'terremoto', name: 'Terremoto', classId: 'barbaro', icon: '💥', damage: 27, manaCost: 15, cooldown: 3, description: 'Zancada sísmica en área.' },
  // Cazador
  { id: 'marca-cazador', name: 'Marca del Cazador', classId: 'cazador', icon: '🎯', damage: 20, manaCost: 9, cooldown: 2, description: 'Marca al objetivo: +20% daño contra él.' },
  { id: 'trampa-osos', name: 'Trampa de Osos', classId: 'cazador', icon: '🪤', damage: 16, manaCost: 10, cooldown: 3, description: 'Inmoviliza y reduce velocidad rival.' },
  // Domador
  { id: 'domar-criatura', name: 'Domar Criatura', classId: 'domador', icon: '🐾', damage: 0, manaCost: 30, cooldown: 5, description: 'Intento de domar una bestia herida (<30% HP).' },
  { id: 'garras-lealtad', name: 'Garras de Lealtad', classId: 'domador', icon: '🦁', damage: 24, manaCost: 10, cooldown: 2, description: 'Tu criatura atacada responde con ferocidad.' },
];

export function skillsForClass(classId: string): Skill[] {
  return SKILLS.filter((s) => s.classId === classId);
}

export function getSkill(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

// ------------------------------------------------------------
// COMBOS — 6 ranuras de habilidad → combinaciones de 2 skills
// ------------------------------------------------------------

export const SKILL_COMBOS: SkillCombo[] = [
  { id: 'tormenta-fuego', name: 'Tormenta de Fuego', skills: ['bola-fuego', 'rafaga-viento'], effect: 'area', damageMultiplier: 1.8, manaCost: 40, requires: { classId: 'mago', raceStage: 'Elfo del Sol', level: 25 }, icon: '☄️', description: 'Daño en área: cubre las 3 direcciones simultáneamente.' },
  { id: 'ejecucion', name: 'Ejecución', skills: ['veneno-cuchilla', 'ataque-furtivo'], effect: 'critico', damageMultiplier: 2.5, manaCost: 25, requires: { classId: 'picaro', level: 18 }, icon: '💀', description: 'Si el rival está envenenado, crítico garantizado.' },
  { id: 'muro-acerio', name: 'Muro Acerio', skills: ['escudo-fe', 'grito-guerra'], effect: 'escudo', damageMultiplier: 0.5, manaCost: 22, requires: { classId: 'guerrero', level: 15 }, icon: '🛡️', description: 'Convierte la defensa en contraataque: -50% daño recibido 2 turnos.' },
  { id: 'carga-implacable', name: 'Carga Implacable', skills: ['orden-carga', 'golpe-poderoso'], effect: 'penetracion', damageMultiplier: 2.0, manaCost: 28, requires: { classId: 'caballero', level: 20 }, icon: '🐎', description: 'Ignora la mitad de la defensa enemiga.' },
  { id: 'flechamiento', name: 'Flechamiento', skills: ['disparo-certero', 'lluvia-flechas'], effect: 'aturdido', damageMultiplier: 1.6, manaCost: 26, requires: { classId: 'arquero', level: 16 }, icon: '🏹', description: 'Probabilidad alta de aturdir: rival pierde 1 turno.' },
  { id: 'pacto-salvaje', name: 'Pacto Salvaje', skills: ['garras-lealtad', 'domar-criatura'], effect: 'curacion', damageMultiplier: 1.2, manaCost: 30, requires: { classId: 'domador', level: 14 }, icon: '🐺', description: 'Tu criatura te lame las heridas: +15% HP máximo.' },
  { id: 'tempestad-rúnica', name: 'Tempestad Rúnica', skills: ['relampago-arcano', 'rafaga-viento'], effect: 'penetracion', damageMultiplier: 1.9, manaCost: 34, requires: { classId: 'mago', level: 22 }, icon: '🌩️', description: 'Rayo canalizado por viento: ignora armaduras ligeras.' },
  { id: 'sismo-furia', name: 'Sismo en Furia', skills: ['furia', 'terremoto'], effect: 'area', damageMultiplier: 2.2, manaCost: 30, requires: { classId: 'barbaro', level: 24 }, icon: '🌋', description: 'Terremoto amplificado por la furia: área total.' },
  { id: 'acecho-perfecto', name: 'Acecho Perfecto', skills: ['marca-cazador', 'trampa-osos'], effect: 'critico', damageMultiplier: 2.1, manaCost: 24, requires: { classId: 'cazador', level: 17 }, icon: '🪤', description: 'Rival atrapado y marcado: impacto crítico seguro.' },
  { id: 'sangre-y-hierro', name: 'Sangre y Hierro', skills: ['golpe-poderoso', 'grito-guerra'], effect: 'dreno', damageMultiplier: 1.7, manaCost: 20, requires: { classId: 'guerrero', level: 12 }, icon: '🩸', description: 'Roba vida: cura el 30% del daño infligido.' },
  { id: 'juramento-roto', name: 'Juramento Roto', skills: ['escudo-fe', 'orden-carga'], effect: 'critico', damageMultiplier: 2.3, manaCost: 26, requires: { classId: 'caballero', level: 26 }, icon: '⚖️', description: 'Dejas caer el escudo para golpear con todo: crítico si aciertas dirección.' },
  { id: 'veneno-arcando', name: 'Veneno Arcano', skills: ['veneno-cuchilla', 'relampago-arcano'], effect: 'veneno', damageMultiplier: 1.5, manaCost: 28, requires: { classId: 'picaro', level: 21 }, icon: '☣️', description: 'El veneno se electrifica: daño por turno duplicado.' },
  { id: 'ojos-bosque', name: 'Ojos del Bosque', skills: ['lluvia-flechas', 'marca-cazador'], effect: 'area', damageMultiplier: 1.6, manaCost: 24, requires: { classId: 'cazador', level: 19 }, icon: '🌲', description: 'Lluvia dirigida a la marca: área reducida pero certera.' },
  { id: 'manada-feroz', name: 'Manada Feroz', skills: ['garras-lealtad', 'terremoto'], effect: 'aturdido', damageMultiplier: 1.8, manaCost: 27, requires: { classId: 'domador', level: 23 }, icon: '🐾', description: 'La sacudida lanza a tu criatura sobre el rival aturdido.' },
  { id: 'noche-eterna', name: 'Noche Eterna', skills: ['ataque-furtivo', 'escudo-fe'], effect: 'dreno', damageMultiplier: 1.9, manaCost: 25, requires: { level: 30 }, icon: '🌑', description: 'Golpeas desde un escudo de sombras: roba maná junto a la vida.' },
];

/** Combos disponibles para un personaje dado. */
export function combosForCharacter(classId: string, level: number, raceStage?: string): SkillCombo[] {
  return SKILL_COMBOS.filter((c) => {
    const r = c.requires;
    if (r?.classId && r.classId !== classId) return false;
    if (r?.level && level < r.level) return false;
    if (r?.raceStage && raceStage !== r.raceStage) return false;
    return true;
  });
}
