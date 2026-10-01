import { useCallback, useEffect, useRef, useState } from 'react';
import type { Character, GameEvent, Settlement, View } from './types/game';
import type { Bounty, SiegeState } from './types/combat';
import { getRealm } from './data/realms';
import { rankIncomeBonus } from './data/nobilityRanks';
import { tickSettlement, MS_PER_GAME_HOUR } from './lib/economy';
import { rollEvent, applyEvent } from './lib/events';
import { INITIAL_BOUNTIES } from './lib/combat/warfare';
import { calculateCombatBonuses } from './lib/combat/synergyCalculator';
import { resurrectionPrice, priceWithChurchDiscount } from './lib/combat/resurrection';
// ---- Autenticación con Google (ver src/lib/auth.ts para configurarlo) ----
import {
  loadLocal, persistLocal, saveKeyFor, uploadSaveToDrive, downloadSaveFromDrive,
  type PlayerAccount,
} from './lib/auth';
import LoginScreen from './sections/LoginScreen';
import CharacterCreation from './sections/CharacterCreation';
import PlayerDashboard from './sections/PlayerDashboard';
import WorldMap from './sections/WorldMap';
import SettlementManagement from './sections/SettlementManagement';
import CombatArena from './sections/CombatArena';
import DuelChallenge from './sections/DuelChallenge';
import BountyBoard from './sections/BountyBoard';
import SiegeWar from './sections/SiegeWar';

const STORAGE_KEY = 'lur-phase2-state-v1'; // ranura heredada (invitados / jugadores anteriores)

interface PersistedState {
  character: Character | null;
  playerSettlements: Settlement[];
  bounties: Bounty[];
  sieges: SiegeState[];
  churchDonations: number;
  hasResurrectionStone: boolean;
}

function loadPersisted(): Partial<PersistedState> {
  return loadLocal<PersistedState>(STORAGE_KEY);
}

export default function App() {
  const saved = useRef(loadPersisted()).current;

  // ----------------------------------------------------------
  // SESIÓN DEL JUGADOR (cuenta de Google o invitado)
  // ----------------------------------------------------------
  // La sesión se recuerda en el navegador, así al recargar la
  // página no hay que volver a iniciar sesión.
  const [account, setAccount] = useState<PlayerAccount | null>(() => {
    try {
      const raw = sessionStorage.getItem('lur-account');
      return raw ? (JSON.parse(raw) as PlayerAccount) : null;
    } catch {
      return null;
    }
  });
  /** Clave de guardado activa: por cuenta de Google, o genérica si es invitado. */
  const saveKey = saveKeyFor(account);
  const saveKeyRef = useRef(saveKey);
  saveKeyRef.current = saveKey;

  const [view, setView] = useState<View>(saved.character ? 'dashboard' : 'creation');
  const [character, setCharacter] = useState<Character | null>(saved.character ?? null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [playerSettlements, setPlayerSettlements] = useState<Settlement[]>(saved.playerSettlements ?? []);
  const [tickCount, setTickCount] = useState(0);

  // ---- Estado persistente de la Fase 2 ----
  const [bounties, setBounties] = useState<Bounty[]>(saved.bounties ?? INITIAL_BOUNTIES);
  const [sieges, setSieges] = useState<SiegeState[]>(saved.sieges ?? []);
  const [churchDonations, setChurchDonations] = useState<number>(saved.churchDonations ?? 0);
  const [hasResurrectionStone, setHasResurrectionStone] = useState<boolean>(saved.hasResurrectionStone ?? false);

  const characterRef = useRef<Character | null>(character);
  characterRef.current = character;
  const settlementsRef = useRef<Settlement[]>(playerSettlements);
  settlementsRef.current = playerSettlements;

  // ---- Persistencia (guardado automático por cuenta) ----
  useEffect(() => {
    if (!character) return;
    const data: PersistedState = { character, playerSettlements, bounties, sieges, churchDonations, hasResurrectionStone };
    persistLocal(saveKey, data);
  }, [character, playerSettlements, bounties, sieges, churchDonations, hasResurrectionStone, saveKey]);

  // ----------------------------------------------------------
  // ACCIONES DE SESIÓN (login Google / invitado / salida)
  // ----------------------------------------------------------
  /** Entra una cuenta de Google y carga su partida (primero local, luego Drive si existe). */
  const handleLogin = useCallback(async (acc: PlayerAccount) => {
    sessionStorage.setItem('lur-account', JSON.stringify(acc));
    setAccount(acc);
    const key = saveKeyFor(acc);
    // 1) ¿Partida guardada en este navegador para ese correo?
    let loaded = loadLocal<PersistedState>(key);
    // 2) ¿Primera vez con esta cuenta pero había una partida "de invitado"? → heredarla.
    if (!loaded.character) {
      const legacy = loadLocal<PersistedState>(STORAGE_KEY);
      if (legacy.character) loaded = legacy;
    }
    // 3) Si hay una cuenta nueva sin nada, intentar traerla desde Google Drive (nube).
    if (!loaded.character && account?.sub === acc.sub) {
      const cloud = await downloadSaveFromDrive<PersistedState>();
      if (cloud?.character) loaded = cloud;
    }
    if (loaded.character) {
      setCharacter(loaded.character);
      setPlayerSettlements(loaded.playerSettlements ?? []);
      setBounties(loaded.bounties ?? INITIAL_BOUNTIES);
      setSieges(loaded.sieges ?? []);
      setChurchDonations(loaded.churchDonations ?? 0);
      setHasResurrectionStone(loaded.hasResurrectionStone ?? false);
      setView('dashboard');
    } else {
      setView('creation'); // cuenta nueva → crear personaje
    }
  }, []);

  /** Modo invitado: se usa la ranura genérica del navegador. */
  const handleGuest = useCallback(() => {
    const legacy = loadLocal<PersistedState>(STORAGE_KEY);
    if (legacy.character) {
      setCharacter(legacy.character);
      setPlayerSettlements(legacy.playerSettlements ?? []);
      setBounties(legacy.bounties ?? INITIAL_BOUNTIES);
      setSieges(legacy.sieges ?? []);
      setChurchDonations(legacy.churchDonations ?? 0);
      setHasResurrectionStone(legacy.hasResurrectionStone ?? false);
      setView('dashboard');
    } else {
      setView('creation');
    }
  }, []);

  /** Cierra sesión: guarda antes de salir y vuelve a la pantalla de acceso. */
  const handleLogout = useCallback(async () => {
    if (account) {
      // Última foto de la partida → al Drive del jugador (si está configurado).
      const data: PersistedState = { character, playerSettlements, bounties, sieges, churchDonations, hasResurrectionStone };
      try { await uploadSaveToDrive(data); } catch { /* sin Drive: el localStorage ya tiene todo */ }
    }
    sessionStorage.removeItem('lur-account');
    setAccount(null);
  }, [account, character, playerSettlements, bounties, sieges, churchDonations, hasResurrectionStone]);

  /** Sube la partida a Google Drive a petición del jugador. */
  const handleCloudSave = useCallback(async () => {
    if (!character) return;
    const data: PersistedState = { character, playerSettlements, bounties, sieges, churchDonations, hasResurrectionStone };
    const ok = await uploadSaveToDrive(data);
    setEvents((evts) => [...evts, {
      id: `evt-cloud-${Date.now().toString(36)}`,
      type: 'descubrimiento' as const,
      title: ok ? '☁️ Partida sellada en la bóveda celeste' : '☁️ La bóveda celeste no está disponible',
      description: ok
        ? 'Tu crónica viajó a los archivos privados de tu cuenta Google. Podrás retomarla desde cualquier reino… digo, dispositivo.'
        : 'Google Drive no está configurado todavía (mira src/lib/auth.ts). Tu partida sigue segura en este navegador.',
      timestamp: Date.now(),
      effects: {},
    }].slice(-50));
  }, [character, playerSettlements, bounties, sieges, churchDonations, hasResurrectionStone]);

  // Al crear el personaje: la corona concede una aldea inicial como feudo
  const handleCreated = useCallback((c: Character) => {
    try {
      const realm = getRealm(c.realmId);
      const starter =
        realm.counties[0]?.settlements.find((s) => s.type === 'aldea' || s.type === 'alqueria') ??
        realm.counties[0]?.settlements[realm.counties[0].settlements.length - 1];
      if (starter) {
        const owned: Settlement = JSON.parse(JSON.stringify(starter)) as Settlement;
        owned.ownerId = c.id;
        setPlayerSettlements([owned]);
        setCharacter({ ...c, settlements: [owned.id] });
      } else {
        setCharacter(c);
      }
      setView('dashboard');
    } catch (err) {
      console.error('Error al iniciar el feudo', err);
      setCharacter(c);
      setView('dashboard');
    }
  }, []);

  // ----------------------------------------------------------
  // TICK ECONÓMICO: cada minuto real = 1 hora de juego
  // ----------------------------------------------------------
  useEffect(() => {
    if (!character) return;
    const interval = setInterval(() => {
      setPlayerSettlements((prev) => {
        let changed = prev.map(tickSettlement);
        // Eventos narrativos: 10% de probabilidad por asentamiento y tick
        const newEvents: GameEvent[] = [];
        changed = changed.map((s) => {
          const e = rollEvent(s);
          if (e) {
            newEvents.push(e);
            return applyEvent(s, e);
          }
          return s;
        });
        if (newEvents.length > 0) {
          setEvents((evts) => [...evts, ...newEvents].slice(-50));
        }
        return changed;
      });

      // Sinergia nobleza → economía: el rango otorga % extra de ingresos al tesoro
      const c = characterRef.current;
      if (c) {
        const bonus = rankIncomeBonus(c.rank);
        const income = settlementsRef.current.reduce((a, s) => a + s.income, 0);
        if (income > 0 || bonus > 0) {
          setCharacter((cur) =>
            cur ? { ...cur, wealth: { ...cur.wealth, oro: cur.wealth.oro + Math.round(income * (1 + bonus / 100)) } } : cur,
          );
        }
      }

      // FASE 2 — sinergia guerra → economía: las campañas activas tensionan los mercados
      if (sieges.some((s) => s.phase === 'bloqueo' || s.phase === 'bombardero' || s.phase === 'asalto')) {
        setEvents((evts) => {
          if (evts.some((e) => e.type === 'guerra' && Date.now() - e.timestamp < MS_PER_GAME_HOUR)) return evts;
          return [...evts, {
            id: `evt-war-tick-${Date.now().toString(36)}`,
            type: 'guerra' as const,
            title: '🌾 La guerra tensa los mercados',
            description: 'Con campañas en curso, el precio del pan sube y las caravanas se resguardan. Los tributos militares merman las arcas.',
            timestamp: Date.now(),
            effects: { gold: -Math.max(1, Math.round(settlementsRef.current.reduce((a, s) => a + s.income, 0) * 0.1)), stability: -1 },
          }].slice(-50);
        });
        setPlayerSettlements((prev) =>
          prev.map((s) => ({ ...s, happiness: Math.max(0, s.happiness - 0.5), stability: Math.max(0, s.stability - 0.5) })),
        );
      }

      setTickCount((t) => t + 1);
    }, MS_PER_GAME_HOUR);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character !== null]);

  const updateSettlement = (s: Settlement) => {
    setPlayerSettlements((prev) => prev.map((x) => (x.id === s.id ? s : x)));
  };

  // ----------------------------------------------------------
  // FASE 2 — acciones globales (Iglesia, piedra, navegación)
  // ----------------------------------------------------------
  /** Precio actual de la Piedra de Resurrección para el jugador (mercado + iglesia + carisma). */
  const currentStonePrice = useCallback((): number => {
    const c = characterRef.current;
    if (!c) return 0;
    const atWar = sieges.some((s) => s.phase !== 'resuelto');
    const demand = Math.min(100, sieges.filter((s) => s.phase !== 'resuelto').length * 25 + (atWar ? 20 : 0));
    const marketPrice = resurrectionPrice({ demand, atWar }, c);
    const bonuses = calculateCombatBonuses(c, settlementsRef.current, churchDonations);
    return priceWithChurchDiscount(marketPrice, bonuses.resurrectionDiscount);
  }, [sieges, churchDonations]);

  const buyResurrectionStone = useCallback((price: number) => {
    setCharacter((cur) => {
      if (!cur) return cur;
      if (cur.wealth.oro < price) return cur; // fondos insuficientes: no se vende
      return { ...cur, wealth: { ...cur.wealth, oro: cur.wealth.oro - price } };
    });
    setHasResurrectionStone(true);
    setEvents((evts) => [...evts, {
      id: `evt-stone-${Date.now().toString(36)}`,
      type: 'resurreccion' as const,
      title: '💠 Piedra de Resurrección adquirida',
      description: 'El clérgo selló la gema con cera bendita. Mientras la portes, tu alma regresará al instante ante el altar más cercano.',
      timestamp: Date.now(),
      effects: { gold: -price },
    }].slice(-50));
  }, []);

  const donateToChurch = useCallback((amount: number) => {
    let donated = false;
    setCharacter((cur) => {
      if (!cur || cur.wealth.oro < amount) return cur;
      donated = true;
      return {
        ...cur,
        wealth: { ...cur.wealth, oro: cur.wealth.oro - amount },
        reputation: {
          ...cur.reputation,
          honor: Math.min(100000, cur.reputation.honor + Math.round(amount / 100)),
          influence: Math.min(100000, cur.reputation.influence + Math.round(amount / 200)),
          deeds: [
            {
              id: `deed-${Date.now().toString(36)}`,
              title: 'Donación al templo',
              description: `Ofrendaste ${amount.toLocaleString('es-ES')} oro a la Iglesia.`,
              type: 'honorable' as const,
              timestamp: Date.now(),
              effects: { honor: 15, influence: 5 },
            },
            ...cur.reputation.deeds,
          ].slice(0, 30),
        },
      };
    });
    if (donated) {
      setChurchDonations((d) => d + amount);
      setEvents((evts) => [...evts, {
        id: `evt-church-${Date.now().toString(36)}`,
        type: 'festival' as const,
        title: '🕯️ Luz en el santuario',
        description: `Tu donativo de ${amount.toLocaleString('es-ES')} oro iluminó cien velas. La Iglesia recuerda a sus benefactores: las piedras benditas te costarán menos.`,
        timestamp: Date.now(),
        effects: { happiness: 2, gold: -amount },
      }].slice(-50));
    }
  }, []);

  const pushNarrativeEvent = useCallback((e: GameEvent) => {
    setEvents((evts) => [...evts, e].slice(-50));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra superior */}
      <nav className="border-b border-border bg-black/30 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-between gap-4">
          <span className="font-display text-xl text-gold-gradient whitespace-nowrap">⚜️ Reino Eterno</span>
          {character && (
            <div className="flex gap-1 flex-wrap justify-end">
              <NavBtn active={view === 'dashboard'} onClick={() => setView('dashboard')}>🧙 Mi Dashboard</NavBtn>
              <NavBtn active={view === 'world'} onClick={() => setView('world')}>🗺️ Mundo</NavBtn>
              <NavBtn active={view === 'settlements'} onClick={() => setView('settlements')}>🏰 Territorios</NavBtn>
              {/* FASE 2 — navegación de combate */}
              <NavBtn active={view === 'combat-pve'} onClick={() => setView('combat-pve')}>⚔️ Caza PvE</NavBtn>
              <NavBtn active={view === 'arena' || view === 'pvp'} onClick={() => setView('arena')}>🏟️ Arena</NavBtn>
              <NavBtn active={view === 'bounties'} onClick={() => setView('bounties')}>🎯 Recompensas</NavBtn>
              <NavBtn active={view === 'siege'} onClick={() => setView('siege')}>🏰 Asedios</NavBtn>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1">
        {view === 'creation' && <CharacterCreation onCreated={handleCreated} />}
        {view === 'dashboard' && character && (
          <PlayerDashboard
            character={character}
            playerSettlements={playerSettlements}
            events={events}
            onCharacterChange={setCharacter}
            onNavigate={(v) => setView(v)}
          />
        )}
        {view === 'world' && character && <WorldMap character={character} />}
        {view === 'settlements' && character && (
          <SettlementManagement
            character={character}
            playerSettlements={playerSettlements}
            onSettlementChange={updateSettlement}
          />
        )}

        {/* ================= FASE 2 — COMBATE ================= */}
        {view === 'combat-pve' && character && (
          <CombatArena
            character={character}
            playerSettlements={playerSettlements}
            hasResurrectionStone={hasResurrectionStone}
            onCharacterChange={setCharacter}
            onNarrativeEvent={pushNarrativeEvent}
            onOpenDuel={() => setView('arena')}
          />
        )}
        {(view === 'arena' || view === 'pvp') && character && (
          <DuelChallenge
            character={character}
            playerSettlements={playerSettlements}
            churchDonations={churchDonations}
            hasResurrectionStone={hasResurrectionStone}
            onBuyStone={buyResurrectionStone}
            onDonateChurch={donateToChurch}
            onCharacterChange={setCharacter}
            onNarrativeEvent={pushNarrativeEvent}
          />
        )}
        {view === 'bounties' && character && (
          <BountyBoard
            character={character}
            playerSettlements={playerSettlements}
            bounties={bounties}
            onBountiesChange={setBounties}
            onCharacterChange={setCharacter}
            onNarrativeEvent={pushNarrativeEvent}
          />
        )}
        {view === 'siege' && character && (
          <SiegeWar
            character={character}
            playerSettlements={playerSettlements}
            churchDonations={churchDonations}
            onCharacterChange={setCharacter}
            onNarrativeEvent={pushNarrativeEvent}
            sieges={sieges}
            onSiegesChange={setSieges}
          />
        )}
      </main>

      {/* Pie: reloj del mundo */}
      {character && (
        <footer className="border-t border-border bg-black/30 px-4 py-1.5 text-center text-xs text-muted-foreground">
          🕰️ Hora de juego: {tickCount} h transcurridas · 1 min real = 1 hora de juego · Lealtad permanente a{' '}
          <span style={{ color: getRealm(character.realmId).accent }}>{getRealm(character.realmId).name}</span>
          {' '}· 💠 Piedra: {hasResurrectionStone ? 'en tu bolsillo' : currentStonePrice().toLocaleString('es-ES') + ' oro'}
          {' '}· ⛪ Donado: {churchDonations.toLocaleString('es-ES')} oro
          {sieges.some((s) => s.phase !== 'resuelto') ? ' · ⚔️ ¡Guerra en curso!' : ''}
        </footer>
      )}
    </div>
  );
}

function NavBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-sm border text-sm font-body transition-all ${
        active ? 'border-gold bg-gold/15 text-gold shadow-gold' : 'border-border text-muted-foreground hover:text-foreground hover:border-gold/50'
      }`}
    >
      {children}
    </button>
  );
}
