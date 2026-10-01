import type { EnemyTemplate } from '../types/combat';

// ------------------------------------------------------------
// PLANTILLAS DE ENEMIGOS PvE — 20+ enemigos (Fase 2)
// danger: 1-10 → afecta probabilidad de emboscada en rutas
// ------------------------------------------------------------

export const ENEMY_TEMPLATES: EnemyTemplate[] = [
  // --- Comunes (nivel bajo) ---
  { id: 'rata_gigante', name: 'Rata Gigante', icon: '🐀', hp: 45, attack: 10, defense: 2, speed: 55, loot: 'comun', danger: 1, xp: 20, gold: 15, description: 'Alimaña del tamaño de un perro que infesta las alcantarillas.' },
  { id: 'bandido', name: 'Bandido de Camino', icon: '🏴', hp: 80, attack: 15, defense: 5, speed: 40, loot: 'comun', danger: 3, xp: 40, gold: 60, description: 'Desertor con hambre y una daga mellada.' },
  { id: 'lobo', name: 'Lobo Hambriento', icon: '🐺', hp: 60, attack: 20, defense: 3, speed: 70, loot: 'comun', danger: 2, xp: 35, gold: 10, description: 'Caza en manada; el aullido es su antesala.' },
  { id: 'goblin', name: 'Goblin Saqueador', icon: '👺', hp: 55, attack: 14, defense: 3, speed: 60, loot: 'comun', danger: 2, xp: 30, gold: 40, description: 'Pequeño, cruel y sorprendentemente rápido robando.' },
  { id: 'bandido_jefe', name: 'Capitán Bandido', icon: '🗡️', hp: 140, attack: 24, defense: 9, speed: 45, loot: 'raro', danger: 5, xp: 110, gold: 220, description: 'Lidera una partida que cobra peaje en sangre.' },
  { id: 'esqueleto', name: 'Esqueleto Errante', icon: '💀', hp: 70, attack: 18, defense: 6, speed: 35, loot: 'comun', danger: 3, xp: 50, gold: 30, description: 'Ossamenta animada por magia necromántica residual.' },
  { id: 'arana_selva', name: 'Araña de la Selva', icon: '🕷️', hp: 90, attack: 21, defense: 4, speed: 58, loot: 'comun', danger: 3, xp: 60, gold: 25, description: 'Teje trampas invisibles entre los árboles de Sylvanna.' },
  { id: 'jabali', name: 'Jabalí Colmilargo', icon: '🐗', hp: 110, attack: 22, defense: 8, speed: 50, loot: 'comun', danger: 3, xp: 65, gold: 20, description: 'Embiste sin avisar; mejor no darle la espalda.' },

  // --- Raros (nivel medio) ---
  { id: 'orco_guerrero', name: 'Orco Guerrero', icon: '👹', hp: 200, attack: 35, defense: 15, speed: 30, loot: 'raro', danger: 6, xp: 180, gold: 150, description: 'Veterano de las estepas, cicatrices como condecoraciones.' },
  { id: 'no_muerto', name: 'No-Muerto Soldado', icon: '🧟', hp: 150, attack: 25, defense: 8, speed: 50, loot: 'raro', danger: 5, xp: 160, gold: 120, description: 'Sigue luchando por inercia y odio puro.' },
  { id: 'hombre_lobo', name: 'Hombre Lobo', icon: '🐺', hp: 180, attack: 38, defense: 10, speed: 65, loot: 'raro', danger: 6, xp: 200, gold: 130, description: 'Maldición lunar; solo plata lo detiene.' },
  { id: 'troll_puente', name: 'Troll del Puente', icon: '🧌', hp: 260, attack: 32, defense: 18, speed: 25, loot: 'raro', danger: 6, xp: 220, gold: 180, description: 'Regenera miembros; exige tributo o cena.' },
  { id: 'bandido_noble', name: 'Noble Renegado', icon: '🎭', hp: 190, attack: 34, defense: 14, speed: 52, loot: 'raro', danger: 5, xp: 210, gold: 300, description: 'Decaído que ataca caravanas con armadura robada.' },
  { id: 'chaman_orco', name: 'Chamán Orco', icon: '🪶', hp: 140, attack: 40, defense: 8, speed: 42, loot: 'raro', danger: 6, xp: 230, gold: 200, description: 'Invoca tormentas y maldiciones con huesos de cuervo.' },
  { id: 'espectro', name: 'Espectro Lamentoso', icon: '👻', hp: 130, attack: 36, defense: 5, speed: 72, loot: 'raro', danger: 6, xp: 240, gold: 160, description: 'Traspasa puertas; hiela la sangre antes que el acero.' },

  // --- Épicos (nivel alto) ---
  { id: 'golem_piedra', name: 'Golem de Piedra', icon: '🗿', hp: 420, attack: 45, defense: 35, speed: 15, loot: 'epico', danger: 7, xp: 420, gold: 400, description: 'Guardián animado de las minas de Kethmar.' },
  { id: 'vampiro_señor', name: 'Señor Vampiro', icon: '🧛', hp: 350, attack: 55, defense: 20, speed: 68, loot: 'epico', danger: 8, xp: 500, gold: 600, description: 'Noble inmortal que colecciona linajes completos.' },
  { id: 'wyvern', name: 'Wyvern de las Marcas', icon: '🦅', hp: 380, attack: 58, defense: 22, speed: 75, loot: 'epico', danger: 8, xp: 520, gold: 450, description: 'Ataca desde el cielo; sus crías anidan en las marcas.' },
  { id: 'berserker_orco', name: 'Berserker Orco', icon: '🪓', hp: 400, attack: 65, defense: 15, speed: 55, loot: 'epico', danger: 8, xp: 550, gold: 480, description: 'Pintado de sangre y ceniza; no conoce el dolor.' },
  { id: 'caballero_maldito', name: 'Caballero Maldito', icon: '🖤', hp: 450, attack: 60, defense: 30, speed: 40, loot: 'epico', danger: 8, xp: 600, gold: 700, description: 'Armadura vacía juramentada ante un dios olvidado.' },

  // --- Legendarios / Jefes ---
  { id: 'dragon_joven', name: 'Dragón Joven', icon: '🐉', hp: 800, attack: 80, defense: 40, speed: 60, loot: 'legendario', danger: 10, xp: 1200, gold: 2000, isBoss: true, description: 'Aún no domina el aliento, pero arrasa aldeas enteras.' },
  { id: 'lied_elderbrown', name: 'Lich Antiguo', icon: '☠️', hp: 750, attack: 90, defense: 25, speed: 50, loot: 'legendario', danger: 10, xp: 1400, gold: 2500, isBoss: true, description: 'Hechicero que venció a la muerte… y se aburrió de ganar.' },
  { id: 'minotauro_rey', name: 'Minotauro Rey', icon: '🐂', hp: 900, attack: 85, defense: 45, speed: 35, loot: 'legendario', danger: 9, xp: 1500, gold: 1800, isBoss: true, description: 'Señor del laberinto bajo Drakkar; cobra en héroes.' },
  { id: 'hydra_laguna', name: 'Hidra de la Laguna', icon: '🐍', hp: 1000, attack: 70, defense: 30, speed: 30, loot: 'legendario', danger: 9, xp: 1600, gold: 2200, isBoss: true, description: 'Por cada cabeza cortada, dos juran venganza.' },
];

export function getEnemy(id: string): EnemyTemplate {
  return ENEMY_TEMPLATES.find((e) => e.id === id) ?? ENEMY_TEMPLATES[0];
}

/** Enemigos recomendados para el nivel del personaje (± ventana). */
export function enemiesForLevel(level: number): EnemyTemplate[] {
  const tier = level <= 10 ? [1, 3] : level <= 25 ? [2, 6] : level <= 45 ? [5, 8] : [7, 10];
  return ENEMY_TEMPLATES.filter((e) => e.danger >= tier[0] && e.danger <= tier[1]);
}

/** Botín posible según rareza. */
export const LOOT_TABLE: Record<string, string[]> = {
  comun: ['Daga mellada', 'Ración de viaje', 'Vendas limpias', 'Monedero pequeño'],
  raro: ['Espa corta de hierro', 'Cota de malla ligera', 'Poción de maná', 'Anillo de cobre grabado'],
  epico: ['Hacha rúnica', 'Coraza de placas', 'Amuleto de sombra', 'Báculo de cuarzo'],
  legendario: ['Espada "Verdad de Acero"', 'Corona rota de los reyes', 'Escama de dragón', 'Cáliz del Lich'],
};
