import { useCallback, useEffect, useRef, useState } from 'react';
import type { Character, GameEvent, Settlement, View } from './types/game';
import { getRealm } from './data/realms';
import { rankIncomeBonus } from './data/nobilityRanks';
import { tickSettlement, MS_PER_GAME_HOUR } from './lib/economy';
import { rollEvent, applyEvent } from './lib/events';
import CharacterCreation from './sections/CharacterCreation';
import PlayerDashboard from './sections/PlayerDashboard';
import WorldMap from './sections/WorldMap';
import SettlementManagement from './sections/SettlementManagement';

export default function App() {
  const [view, setView] = useState<View>('creation');
  const [character, setCharacter] = useState<Character | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [playerSettlements, setPlayerSettlements] = useState<Settlement[]>([]);
  const [tickCount, setTickCount] = useState(0);

  const characterRef = useRef<Character | null>(character);
  characterRef.current = character;
  const settlementsRef = useRef<Settlement[]>(playerSettlements);
  settlementsRef.current = playerSettlements;

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
      setTickCount((t) => t + 1);
    }, MS_PER_GAME_HOUR);
    return () => clearInterval(interval);
  }, [character !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSettlement = (s: Settlement) => {
    setPlayerSettlements((prev) => prev.map((x) => (x.id === s.id ? s : x)));
  };

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
      </main>

      {/* Pie: reloj del mundo */}
      {character && (
        <footer className="border-t border-border bg-black/30 px-4 py-1.5 text-center text-xs text-muted-foreground">
          🕰️ Hora de juego: {tickCount} h transcurridas · 1 min real = 1 hora de juego · Lealtad permanente a{' '}
          <span style={{ color: getRealm(character.realmId).accent }}>{getRealm(character.realmId).name}</span>
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
