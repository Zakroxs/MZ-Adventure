import type {
  Building, BuildingType, FeudalTerritory, Realm, RealmId, Resources,
  Settlement, SettlementType,
} from '../types/game';

// ------------------------------------------------------------
// Generador determinista (PRNG con semilla) para datos estables
// ------------------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const BUILDING_INFO: Record<BuildingType, { name: string; icon: string; production: Partial<Resources>; time: number }> = {
  granja:        { name: 'Granja',           icon: '🌾', production: { alimento: 12 },            time: 2 },
  mina:          { name: 'Mina',             icon: '⛏️', production: { piedra: 6, hierro: 4 },     time: 4 },
  aserradero:    { name: 'Aserradero',       icon: '🪵', production: { madera: 8 },               time: 3 },
  cuartel:       { name: 'Cuartel',          icon: '🎖️', production: {},                          time: 5 },
  mercado:       { name: 'Mercado',          icon: '🏪', production: { oro: 5, cobre: 20 },        time: 4 },
  taberna:       { name: 'Taberna',          icon: '🍺', production: { oro: 3 },                  time: 3 },
  templo:        { name: 'Templo',           icon: '⛪', production: {},                          time: 6 },
  muralla:       { name: 'Muralla',          icon: '🧱', production: {},                          time: 8 },
  alhondiga:     { name: 'Alhóndiga',        icon: '🏦', production: { oro: 2, plata: 8 },        time: 5 },
  taller:        { name: 'Taller',           icon: '🔨', production: { hierro: 3, piedrapreciosa: 1 }, time: 4 },
};

const SETTLEMENT_META: Record<SettlementType, { label: string; icon: string }> = {
  capital:   { label: 'Capital',   icon: '👑' },
  ciudad:    { label: 'Ciudad',    icon: '🏰' },
  villa:     { label: 'Villa',     icon: '🏘️' },
  pueblo:    { label: 'Pueblo',    icon: '🛖' },
  aldea:     { label: 'Aldea',     icon: '🌄' },
  alqueria:  { label: 'Alquería',  icon: '🏚️' },
};

export function settlementMeta(t: SettlementType) {
  return SETTLEMENT_META[t];
}

function emptyResources(): Resources {
  return { oro: 0, plata: 0, cobre: 0, alimento: 0, madera: 0, piedra: 0, hierro: 0, piedrapreciosa: 0 };
}

let idCounter = 0;
function nextId(prefix: string) {
  return `${prefix}-${(++idCounter).toString(36)}`;
}

// ------------------------------------------------------------
// Fábrica de asentamientos
// ------------------------------------------------------------
function makeBuildings(types: BuildingType[], rnd: () => number): Building[] {
  return types.map((type) => {
    const info = BUILDING_INFO[type];
    const level = 1 + Math.floor(rnd() * 3);
    const prod: Partial<Resources> = {};
    for (const [k, v] of Object.entries(info.production)) {
      (prod as Record<string, number>)[k] = (v as number) * level;
    }
    return {
      id: nextId('bld'),
      type,
      name: info.name,
      level,
      maxLevel: 10,
      production: prod,
      constructionTime: info.time,
      isUnderConstruction: false,
    };
  });
}

interface TypeSpec { popMin: number; popMax: number; lvlMin: number; lvlMax: number; walls: number; }

const TYPE_SPECS: Record<SettlementType, TypeSpec> = {
  capital:  { popMin: 135000, popMax: 165000, lvlMin: 10, lvlMax: 10, walls: 8 },
  ciudad:   { popMin: 30000,  popMax: 100000, lvlMin: 5,  lvlMax: 8,  walls: 5 },
  villa:    { popMin: 10000,  popMax: 30000,  lvlMin: 3,  lvlMax: 6,  walls: 3 },
  pueblo:   { popMin: 2000,   popMax: 10000,  lvlMin: 1,  lvlMax: 4,  walls: 1 },
  aldea:    { popMin: 500,    popMax: 2000,   lvlMin: 1,  lvlMax: 2,  walls: 0 },
  alqueria: { popMin: 100,    popMax: 500,    lvlMin: 1,  lvlMax: 1,  walls: 0 },
};

const DESC_FLAVOR = [
  'Mercaderes y artesanos animan sus calles empedradas.',
  'Sus campos dorados se extienden hasta el horizonte.',
  'Antiguas leyendas susurran entre sus muros de piedra.',
  'El humo de las forjas nunca abandona su cielo.',
  'Ríos serenos besan sus puertas de madera.',
  'Los estandartes ondean sobre plazas llenas de vida.',
];

function makeSettlement(type: SettlementType, name: string, rnd: () => number): Settlement {
  const spec = TYPE_SPECS[type];
  const population = Math.round(spec.popMin + rnd() * (spec.popMax - spec.popMin));
  const level = Math.round(spec.lvlMin + rnd() * (spec.lvlMax - spec.lvlMin));
  const stability = Math.round(55 + rnd() * 40);
  const happiness = Math.round(50 + rnd() * 45);
  const buildingPool: BuildingType[] = ['granja', 'mercado', 'taberna', 'aserradero', 'mina', 'taller', 'alhondiga', 'templo', 'cuartel'];
  const count = type === 'capital' ? 9 : type === 'ciudad' ? 6 : type === 'villa' ? 4 : type === 'pueblo' ? 3 : type === 'aldea' ? 2 : 1;
  const chosen: BuildingType[] = [];
  for (let i = 0; i < count; i++) chosen.push(buildingPool[Math.floor(rnd() * buildingPool.length)]);
  if (spec.walls > 0) chosen.push('muralla');

  const resources = emptyResources();
  const buildings = makeBuildings(chosen, rnd);
  for (const b of buildings) {
    for (const [k, v] of Object.entries(b.production)) {
      (resources as unknown as Record<string, number>)[k] += (v as number) * 24; // stock inicial ≈ producción diaria
    }
  }

  const income = Math.round(population * 0.02 * (level / 5) * (stability / 100) * (happiness / 100) + buildings.length * 3);

  return {
    id: nextId('set'),
    name,
    type,
    level,
    population,
    maxPopulation: Math.round(population * (1.2 + rnd() * 0.5)),
    walls: spec.walls,
    garrison: Math.round(population / 100),
    infrastructure: Math.max(1, Math.min(10, Math.round(level * 0.8 + rnd() * 2))),
    development: Math.max(1, Math.min(10, Math.round(level * 0.7 + rnd() * 3))),
    stability,
    loyalty: Math.round(60 + rnd() * 35),
    income,
    happiness,
    canEvolve: type !== 'capital',
    buildings,
    resources,
    upgrades: [],
    description: DESC_FLAVOR[Math.floor(rnd() * DESC_FLAVOR.length)],
    lastTickAt: Date.now(),
  };
}

// ------------------------------------------------------------
// Nombres temáticos por reino
// ------------------------------------------------------------
const NAMES: Record<RealmId, string[]> = {
  aldoria:  ['Valdrago', 'Auren', 'Peñafiel', 'Rosalba', 'Montclar', 'Hierroviejo', 'Albasangre', 'Ferrería', 'Castelmar', 'Vimbral', 'Orophyr', 'Darnhall', 'Belcastro', 'Argenta', 'Sotoverde', 'Fuerteánfor', 'Luminar', 'Pedregoso', 'Altovalle', 'Riberaurea', 'Colinaalta', 'Muroviejo', 'Cerroblanco', 'Puertofranco', 'Hayedal', 'Encinar', 'Zahúr', 'Saliner', 'Torrelarga', 'Camposol', 'Vadohirón', 'Pradomar'],
  valdris:  ['Aurival', 'Comarca', 'Puertosol', 'Mercadal', 'Ámbar', 'Calzada', 'Rutadora', 'Ferialta', 'Tesorería', 'Cambiaria', 'Oropendo', 'Plataforma', 'Tributo', 'Gabela', 'Almojarif', 'Caravansar', 'Posada', 'Cruceoro', 'Medianería', 'Lonja', 'Alfolí', 'Moneder', 'Dorarena', 'Vía Áurea', 'Portmajà', 'Ribaclara', 'Campverd', 'Sedalia', 'Especiera', 'Tiñosa', 'Baluarte', 'Fontdorado', 'Pasodoble', 'Valdelonja'],
  kethmar:  ['Forjapiedra', 'Yunque', 'Carbonera', 'Mena', 'Cinabrio', 'Grafito', 'Basalto', 'Pizarra', 'Cantera', 'Menuda', 'Escoria', 'Crisol', 'Martillo', 'Cavar', 'Tunelargo', 'Vetaprofunda', 'Roca Alta', 'Piedruna', 'Ferruginia', 'Estañal', 'Cobrizo', 'Galena', 'Marmórea', 'Sílex', 'Obsidiana', 'Traquita', 'Diorita', 'Cuarcita', 'Algofre', 'Salgema', 'Bruma', 'Cenizal', 'Pedregal', 'Fragua'],
  sylvanna: ['Hojaclara', 'Raízprofunda', 'Doselargo', 'Musgo', 'Helechal', 'Robleda', 'Avellano', 'Endrinal', 'Mirtal', 'Lauredal', 'Teixedo', 'Arcenal', 'Frondas', 'Ramaje', 'Corteza', ' savia'.trim(), 'Bellota', 'Zarzal', 'Verdagal', 'Pinarcillo', 'Aliseda', 'Fayal', 'Omedal', 'Saucehil', 'Maleza', 'Brezo', 'Tomillar', 'Espinar', 'Juncal', 'Carrascal', 'Encinares', 'Almendro', 'Nogalado', 'Cerezal'],
  drakkar:  ['Truenohogar', 'Maresbravo', 'Vendaval', 'Escarcha', 'Garra', 'Colmillo', 'Berserkr', 'Hielmar', 'Ronco', 'Cuchillazo', 'Tormenta', 'Rayo', 'Maréa', 'Fiordo', 'Drakkar', 'Vaensal', 'Skaldhalla', 'Odal', 'Thingvellir', 'Ragnarok', 'Fénrir', 'Ygmir', 'Balmung', 'Grimnar', 'Hrazdak', 'Kragg', 'Stormgar', 'Ulfhedinn', 'Berserkal', 'Skjolvir', 'Volgrun', 'Dagnir', 'Hargrim', 'Ivasrik'],
};

interface RealmBlueprint {
  id: RealmId;
  name: string;
  motto: string;
  description: string;
  lore: string;
  accent: string;
  kingName: string;
  royalHouse: string;
  capitalName: string;
  duchies: number;
  counties: number;
  marches: number;
  seed: number;
}

const BLUEPRINTS: RealmBlueprint[] = [
  {
    id: 'aldoria', name: 'Aldoria', motto: 'Donde el hierro forja el destino',
    description: 'Reino equilibrado de caballeros y forjas célebres, corazón político del continente.',
    lore: 'Fundado tras la Guerra de las Tres Coronas por Aldric el Justo, Aldoria ha convertido la disciplina y el acero en su sello. Sus torres blancas vigilan llanuras fértiles donde cada aldeano conoce el valor de una promesa cumplida.',
    accent: 'hsl(45 65% 52%)', kingName: 'Aldric III el Justo', royalHouse: 'Valmont', capitalName: 'Aldoria la Blanca',
    duchies: 3, counties: 2, marches: 2, seed: 101,
  },
  {
    id: 'valdris', name: 'Valdris', motto: 'Las rutas doradas nos pertenecen',
    description: 'Potencia comercial de puertos francos y ferias permanentes, gobernada por casas mercantiles.',
    lore: 'Valdris no se conquistó con espadas sino con balanzas. Sus reyes-factor controlan las calzadas que cruzan el continente, y en sus lonjas se decide el precio del pan, la sal y hasta la guerra.',
    accent: 'hsl(38 60% 45%)', kingName: 'Valdemar el Próspero', royalHouse: 'Aurum', capitalName: 'Aurival',
    duchies: 2, counties: 3, marches: 1, seed: 202,
  },
  {
    id: 'kethmar', name: 'Kethmar', motto: 'La piedra recuerda lo que la carne olvida',
    description: 'Reino montañés de minas inagotables, forjas rúnicas y fortalezas excavadas en la roca viva.',
    lore: 'Bajo las cumbres de Kethmar se tallaron salones que ni el tiempo puede derribar. Su rey, Thorgar Barbadepiedra, gobierna desde un trono de granito labrado por sus propios ancestros.',
    accent: 'hsl(25 30% 40%)', kingName: 'Thorgar Barbadepiedra', royalHouse: 'Forjaverde', capitalName: 'Yunque Mayor',
    duchies: 2, counties: 2, marches: 2, seed: 303,
  },
  {
    id: 'sylvanna', name: 'Sylvanna', motto: 'Bajo el dosel, todos somos iguales',
    description: 'Confederación forestal donde la corona comparte poder con los consejos de clanes.',
    lore: 'Sylvanna creció con el bosque: sus ciudades no se construyen, se cultivan. La Reina Elandra Hojaverde escucha antes de hablar, y su corte se reúne bajo el Roble Coronal cada equinoccio.',
    accent: 'hsl(100 20% 38%)', kingName: 'Reina Elandra Hojaverde', royalHouse: 'Raízprofunda', capitalName: 'Doselargo',
    duchies: 2, counties: 2, marches: 1, seed: 404,
  },
  {
    id: 'drakkar', name: 'Drakkar', motto: 'El trueno anuncia a los fuertes',
    description: 'Reino guerrero de fiordos y salones de batalla, donde el honor se mide en cicatrices.',
    lore: 'Los clanes de Drakkar juraron lealtad a Ragnar Tormentson tras sobrevivir al Invierno del Lobo. Desde entonces, sus dragares navegan ríos y mares, y sus jarls gobiernan desde atalayas batidas por el viento.',
    accent: 'hsl(220 25% 42%)', kingName: 'Ragnar Tormentson', royalHouse: 'Maresbravo', capitalName: 'Truenohogar',
    duchies: 2, counties: 2, marches: 2, seed: 505,
  },
];

const RULER_SURNAMES = ['Corven', 'Ashford', 'Grimwald', 'Thornac', 'Belvedere', 'Ironhal', 'Duskmoor', 'Everlake', 'Highmere', 'Stonevale', 'Wyndale', 'Falkhor', 'Emberwyn', 'Draganov', 'Silverton', 'Nightfell', 'Marshgrove', 'Oakenshield'];

function buildRealm(bp: RealmBlueprint): Realm {
  const rnd = mulberry32(bp.seed);
  const pool = [...NAMES[bp.id]];
  const take = () => pool.splice(Math.floor(rnd() * pool.length), 1)[0] ?? `Aldea ${Math.floor(rnd() * 999)}`;

  const capital = makeSettlement('capital', bp.capitalName, rnd);
  capital.description = `Capital de ${bp.name}, sede del trono de la Casa ${bp.royalHouse}.`;

  let totalCities = 1;
  const makeTerritory = (type: 'ducado' | 'condado' | 'marca'): FeudalTerritory => {
    const rulerTitle = type === 'ducado' ? 'Duque' : type === 'condado' ? 'Conde' : 'Marqués';
    const surname = RULER_SURNAMES[Math.floor(rnd() * RULER_SURNAMES.length)];
    const settlements: Settlement[] = [];
    // Cabecera del territorio
    const headType: SettlementType = type === 'ducado' ? 'ciudad' : type === 'condado' ? (rnd() > 0.5 ? 'ciudad' : 'villa') : 'villa';
    const head = makeSettlement(headType, take(), rnd);
    if (headType === 'ciudad') totalCities++;
    settlements.push(head);
    // Asentamientos subordinados
    const subPlan: SettlementType[] =
      type === 'ducado' ? ['ciudad', 'villa', 'pueblo', 'pueblo', 'aldea', 'aldea', 'alqueria']
      : type === 'condado' ? ['villa', 'pueblo', 'pueblo', 'aldea', 'aldea', 'alqueria']
      : ['villa', 'pueblo', 'aldea', 'aldea', 'alqueria', 'alqueria'];
    for (const st of subPlan) {
      const s = makeSettlement(st, take(), rnd);
      if (st === 'ciudad') totalCities++;
      settlements.push(s);
    }
    return {
      id: nextId('terr'),
      name: `${type === 'ducado' ? 'Ducado' : type === 'condado' ? 'Condado' : 'Marca'} de ${head.name}`,
      type,
      rulerTitle: `${rulerTitle} ${surname}`,
      settlements,
      totalPopulation: settlements.reduce((a, s) => a + s.population, 0),
      totalIncome: settlements.reduce((a, s) => a + s.income, 0),
    };
  };

  const duchies = Array.from({ length: bp.duchies }, () => makeTerritory('ducado'));
  const counties = Array.from({ length: bp.counties }, () => makeTerritory('condado'));
  const marches = Array.from({ length: bp.marches }, () => makeTerritory('marca'));

  const totalSettlements = 1 + [...duchies, ...counties, ...marches].reduce((a, t) => a + t.settlements.length, 0);

  return {
    id: bp.id, name: bp.name, motto: bp.motto, description: bp.description, lore: bp.lore,
    capital, duchies, counties, marches, accent: bp.accent,
    totalCities, totalSettlements, kingName: bp.kingName, royalHouse: bp.royalHouse,
  };
}

export const REALMS: Realm[] = BLUEPRINTS.map(buildRealm);

export function getRealm(id: RealmId): Realm {
  return REALMS.find((r) => r.id === id) ?? REALMS[0];
}

export function allSettlements(realm: Realm): Settlement[] {
  return [realm.capital, ...realm.duchies, ...realm.counties, ...realm.marches].flatMap((x) =>
    'settlements' in x ? x.settlements : [x],
  );
}
