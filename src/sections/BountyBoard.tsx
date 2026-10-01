// ============================================================
// TABLÓN DE RECOMPENSAS — Bounties del Gremio de Aventureros
// ============================================================

import { useState } from 'react';
import type { Bounty, CombatState, Direction } from '../types/combat';
import { DIRECTION_ICON, DIRECTIONS } from '../types/combat';
import type { Character, GameEvent, Settlement } from '../types/game';
import { OPPONENT_POOL } from '../data/arenas';
import { getRank } from '../data/nobilityRanks';
import { claimBounty, issueBounty } from '../lib/combat/warfare';
import {
  characterToCombatant, computeRewards, createCombat, enemyChooseAction,
  opponentToCombatant, resolveTurn,
} from '../lib/combat/directionalCombat';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Progress } from '../components/ui/progress';

interface Props {
  character: Character;
  playerSettlements: Settlement[];
  bounties: Bounty[];
  onBountiesChange: (b: Bounty[]) => void;
  onCharacterChange: (c: Character) => void;
  onNarrativeEvent: (e: GameEvent) => void;
}

const REALM_FILTERS = [
  { id: 'all', name: 'Todos los reinos' },
  { id: 'aldoria', name: 'Aldoria' },
  { id: 'valdris', name: 'Valdris' },
  { id: 'kethmar', name: 'Kethmar' },
  { id: 'sylvanna', name: 'Sylvanna' },
  { id: 'drakkar', name: 'Drakkar' },
] as const;

export default function BountyBoard({ character, playerSettlements, bounties, onBountiesChange, onCharacterChange, onNarrativeEvent }: Props) {
  const [filter, setFilter] = useState<string>('all');
  const [minAmount, setMinAmount] = useState(0);
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [selectedAction, setSelectedAction] = useState('ataque');
  const [claimedLog, setClaimedLog] = useState<string[]>([]);

  const active = bounties.filter((b) => b.active && (filter === 'all' || b.realmId === filter) && b.amount >= minAmount);
  const totalPosted = bounties.reduce((a, b) => a + b.amount, 0);

  // Cazarrecompensas: inicia combate contra el objetivo si es un rival conocido
  const hunt = (b: Bounty) => {
    const offer = OPPONENT_POOL.find((o) => o.id === b.targetId) ?? OPPONENT_POOL[Math.floor(Math.random() * OPPONENT_POOL.length)];
    const p = characterToCombatant(character, undefined, playerSettlements);
    const e = opponentToCombatant(offer);
    setCombat(createCombat('pvp_emboscada', p, e, { level: character.level, ambush: false, betAmount: 0 }));
    setSelectedAction('ataque');
  };

  const attackDir = (dir: Direction) => {
    if (!combat || combat.result) return;
    const cover = Math.random() < 0.45 ? 'frente' : DIRECTIONS[Math.floor(Math.random() * 3)];
    let next = resolveTurn(combat, { actionId: selectedAction, chosenDirection: dir }, cover);
    if (next.turnOrder[next.currentActorIndex] !== character.id && !next.result) {
      const foe = next.participants.find((x) => x.id !== character.id)!;
      const ai = enemyChooseAction(foe);
      next = resolveTurn(next, ai, DIRECTIONS[Math.floor(Math.random() * 3)]);
    }
    setCombat(next);
  };

  // Resolución de la caza
  if (combat?.result === 'victoria') {
    const rewarded = computeRewards(combat, character, playerSettlements);
    const r = rewarded.rewards;
    const nextChar: Character = {
      ...character,
      wealth: { ...character.wealth, oro: character.wealth.oro + (r?.gold ?? 0) },
      progress: { ...character.progress, experience: character.progress.experience + (r?.experience ?? 0) },
      reputation: { ...character.reputation, honor: character.reputation.honor + 10 },
    };
    onCharacterChange(nextChar);
    setClaimedLog((l) => [`🎯 Cazaste a ${combat.participants.find((x) => x.id !== character.id)?.name}: +${r?.gold ?? 0} oro del gremio, +10 honor.`, ...l].slice(0, 8));
    setCombat(null);
  } else if (combat?.result === 'derrota' || combat?.result === 'huida') {
    setClaimedLog((l) => ['Tu presa escapó… o tú escapaste. El gremio anotará esto.', ...l].slice(0, 8));
    setCombat(null);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-5 animate-fade-in">
      <header className="text-center space-y-1">
        <h2 className="text-3xl text-gold-gradient font-display">📜 Tablón de Recompensas</h2>
        <p className="text-sm text-muted-foreground italic">«El Gremio de Aventureros paga al contado. Los cadáveres no negocian.»</p>
      </header>

      {/* Filtros */}
      <Card className="parchment-panel p-3 flex flex-wrap items-center gap-3">
        <span className="stat-label">Filtrar:</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-black/30 border border-border rounded px-2 py-1 text-sm">
          {REALM_FILTERS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <input type="number" min={0} step={1000} value={minAmount} onChange={(e) => setMinAmount(Number(e.target.value))}
          className="w-32 bg-black/30 border border-border rounded px-2 py-1 text-sm" placeholder="Oro mínimo" />
        <Badge variant="gold">{active.length} contratos activos</Badge>
        <Badge variant="outline">Bolsa total: {totalPosted.toLocaleString()} 🪙</Badge>
      </Card>

      {/* Contratos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {active.map((b) => (
          <Card key={b.id} className="parchment-panel p-3 hover:border-gold/60 transition-colors">
            <div className="flex justify-between items-start">
              <p className="font-display text-lg">🎯 {b.targetName}</p>
              <Badge variant="gold">{b.amount.toLocaleString()} 🪙</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{b.reason}</p>
            <p className="text-xs mt-2 opacity-70">Emitido por: <i>{b.issuedBy}</i></p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-red-300">Caduca en {Math.max(0, Math.round((b.expiresAt - Date.now()) / 3_600_000))}h</span>
              <div className="flex gap-1">
                <Button size="sm" onClick={() => hunt(b)}>Cazar</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  const { payout, next } = claimBounty(b, bounties);
                  onBountiesChange(next);
                  onCharacterChange({ ...character, wealth: { ...character.wealth, oro: character.wealth.oro + payout }, reputation: { ...character.reputation, infamy: character.reputation.infamy + 5 } });
                  setClaimedLog((l) => [`Reclamaste la recompensa de ${b.targetName}: +${payout.toLocaleString()} oro (+5 infamia).`, ...l].slice(0, 8));
                  // SINERGIA FASE 1↔2: cada recompensa cobrada queda registrada como crónica del reino
                  onNarrativeEvent({
                    id: `evt-${Date.now().toString(36)}`,
                    type: 'bounty',
                    title: `Recompensa cobrada: ${b.targetName}`,
                    description: `${character.name} ${character.surname} reclamó el contrato del gremio sobre ${b.targetName} por ${payout.toLocaleString()} monedas de oro. El gremio toma nota… y los amigos del caído también.`,
                    realmId: character.realmId,
                    timestamp: Date.now(),
                    effects: {},
                  });
                }}>Reclamar</Button>
              </div>
            </div>
          </Card>
        ))}
        {active.length === 0 && <p className="text-muted-foreground text-sm col-span-full text-center py-8">Ningún contrato cumple tus filtros. Publica uno saqueando una caravana… o esperando.</p>}
      </div>

      {/* Publicar bounty propio */}
      <Card className="parchment-panel p-3">
        <CardHeader className="p-0 pb-2"><CardTitle className="text-base">⚖️ Venganza privada</CardTitle><CardDescription className="text-xs">Publica una recompensa sobre quien te ofendió: coste ×1.2 (gremio cobra comisión).</CardDescription></CardHeader>
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <select id="bounty-target" className="bg-black/30 border border-border rounded px-2 py-1 text-sm">
            {OPPONENT_POOL.slice(0, 8).map((o) => <option key={o.id} value={o.id}>{o.name} {o.surname} ({getRank(o.rank).name})</option>)}
          </select>
          <input id="bounty-amount" type="number" defaultValue={5000} min={1000} className="w-28 bg-black/30 border border-border rounded px-2 py-1" />
          <Button size="sm" disabled={character.wealth.oro < 6000} onClick={() => {
            const sel = document.getElementById('bounty-target') as HTMLSelectElement;
            const amt = Number((document.getElementById('bounty-amount') as HTMLInputElement).value);
            const target = OPPONENT_POOL.find((o) => o.id === sel.value)!;
            const cost = Math.round(amt * 1.2);
            if (character.wealth.oro < cost) return;
            onCharacterChange({ ...character, wealth: { ...character.wealth, oro: character.wealth.oro - cost } });
            onBountiesChange([issueBounty(target.id, `${target.name} ${target.surname}`, amt, 'Ofensa personal contra tu casa', `Casa de ${character.name}`, target.realmId), ...bounties]);
            setClaimedLog((l) => [`Has puesto la cabeza de ${target.name} por ${amt.toLocaleString()} 🪙 (coste total ${cost.toLocaleString()} con comisión).`, ...l].slice(0, 8));
          }}>Publicar bounty</Button>
        </div>
      </Card>

      {/* Combate de caza */}
      {combat && (
        <Card className="parchment-panel p-4">
          <p className="text-center font-display text-xl text-gold-gradient mb-3">🎯 Cacería con recompensa</p>
          <div className="grid grid-cols-2 gap-4 mb-3">
            {combat.participants.map((p) => (
              <div key={p.id}>
                <div className="flex justify-between text-sm"><span className={p.type === 'jugador' ? 'text-gold' : 'text-red-300'}>{p.name}</span><span>{p.hp}/{p.maxHp}</span></div>
                <Progress value={(p.hp / p.maxHp) * 100} indicatorClassName={p.type === 'jugador' ? 'from-green-700 via-green-500 to-green-300' : 'from-red-900 via-red-600 to-red-400'} />
              </div>
            ))}
          </div>
          {!combat.result ? (
            <>
              <div className="flex flex-wrap gap-2 mb-3 justify-center">
                {combat.participants.find((p) => p.type === 'jugador')?.actions.map((a) => (
                  <button key={a.id} onClick={() => setSelectedAction(a.id)} title={a.description}
                    className={`px-3 py-1 rounded-sm border text-sm ${selectedAction === a.id ? 'border-gold bg-gold/10 text-gold' : 'border-border text-muted-foreground'}`}>
                    {a.icon} {a.name}
                  </button>
                ))}
              </div>
              <div className="flex justify-center gap-3">
                {DIRECTIONS.map((d) => (
                  <button key={d} onClick={() => attackDir(d)} className="w-16 h-16 rounded-md border-2 border-gold/50 bg-black/30 hover:bg-gold/10 text-2xl">{DIRECTION_ICON[d]}</button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-lg font-display">{combat.result === 'victoria' ? '🏆 ¡Objetivo neutralizado!' : combat.result === 'derrota' ? '💀 La presa resultó cazadora.' : '🏃 Te marchas sin cobrar.'}</p>
          )}
          <div className="max-h-32 overflow-y-auto scrollbar-thin text-sm mt-3 space-y-1">
            {[...combat.history].reverse().map((h, i) => <p key={i} className={h.critical ? 'text-yellow-300' : h.dodged ? 'text-cyan-300' : ''}>{h.log}</p>)}
          </div>
        </Card>
      )}

      {/* Historial */}
      <Card className="parchment-panel p-3">
        <p className="stat-label mb-2">🧾 Historial de cazarrecompensas</p>
        {claimedLog.length === 0 ? <p className="text-sm text-muted-foreground">Aún no has cobrado ninguna cabeza.</p> : (
          <ul className="text-sm space-y-1">{claimedLog.map((l, i) => <li key={i} className="opacity-90">{l}</li>)}</ul>
        )}
        <div className="mt-2 text-xs text-muted-foreground">Tu honor: {Math.round(character.reputation.honor)} · Infamia: {Math.round(character.reputation.infamy)}</div>
      </Card>
    </div>
  );
}
