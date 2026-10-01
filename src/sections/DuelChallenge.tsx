// ============================================================
// DUELOS FORMALES — Arena + PvP abierto (emboscadas) + Piedra de Resurrección
// ============================================================

import { useEffect, useRef, useState } from 'react';
import type { Character, GameEvent, Settlement } from '../types/game';
import type { CombatState, Direction, DuelType } from '../types/combat';
import { DIRECTION_ICON, DIRECTIONS } from '../types/combat';
import { ARENAS, LEAGUES, OPPONENT_POOL, leagueForLevel } from '../data/arenas';
import { combosForCharacter } from '../data/combos';
import { getRank } from '../data/nobilityRanks';
import { getRealm } from '../data/realms';
import {
  characterToCombatant, computeRewards, createCombat, deathWaitHours,
  enemyChooseAction, lootTableForVictimRank, opponentToCombatant, resolveTurn,
} from '../lib/combat/directionalCombat';
import {
  RESURRECTION_BASE_PRICE, applyResurrection, priceWithChurchDiscount,
  resurrectionPrice, waitHoursAfterDeath,
} from '../lib/combat/resurrection';
import { ambushChance } from '../lib/combat/synergyCalculator';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

interface Props {
  character: Character;
  playerSettlements: Settlement[];
  churchDonations: number;
  hasResurrectionStone: boolean;
  onBuyStone: (price: number) => void;
  onDonateChurch: (amount: number) => void;
  onCharacterChange: (c: Character) => void;
  onNarrativeEvent: (e: GameEvent) => void;
}

const DUEL_TYPES: { id: DuelType; icon: string; label: string; desc: string }[] = [
  { id: 'amistoso', icon: '🤝', label: 'Amistoso', desc: 'Solo honor: +5 vencedor / -3 perdedor.' },
  { id: 'apuesta', icon: '💰', label: 'Con apuesta', desc: 'Oro y objetos; transacción automática.' },
  { id: 'rango', icon: '👑', label: 'A rango', desc: 'Se apuesta el título nobiliario. Ascenso/descenso automático.' },
  { id: 'muerte', icon: '☠️', label: 'A muerte', desc: 'Todo o nada: captura, saqueo o ejecución en guerra declarada.' },
];

export default function DuelChallenge({
  character, playerSettlements, churchDonations, hasResurrectionStone,
  onBuyStone, onDonateChurch, onCharacterChange, onNarrativeEvent,
}: Props) {
  const [tab, setTab] = useState<'duelo' | 'ruta' | 'iglesia'>('duelo');
  const [duelType, setDuelType] = useState<DuelType>('apuesta');
  const [bet, setBet] = useState(100);
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [selectedAction, setSelectedAction] = useState('ataque');
  const [outcome, setOutcome] = useState<string | null>(null);
  const combatRef = useRef<CombatState | null>(null);
  combatRef.current = combat;

  // Emboscada en ruta
  const [routeDanger, setRouteDanger] = useState(6);
  const chance = ambushChance(routeDanger, character.stats.percepcion, 10);

  const league = leagueForLevel(character.level);
  const market = { demand: Math.min(100, 20 + character.level), atWar: false };
  const basePrice = resurrectionPrice(market, character);
  const bonuses = characterToCombatant(character, undefined, playerSettlements).synergy!;
  const stonePrice = priceWithChurchDiscount(basePrice, bonuses.resurrectionDiscount);

  const player = combat?.participants.find((p) => p.type === 'jugador');
  const foe = combat?.participants.find((p) => p.type !== 'jugador');
  const isPlayerTurn = combat ? combat.turnOrder[combat.currentActorIndex] === character.id : false;

  // IA rival
  useEffect(() => {
    if (!combat || combat.result || isPlayerTurn || !foe) return;
    const t = setTimeout(() => {
      const st = combatRef.current;
      if (!st || st.result) return;
      const ai = enemyChooseAction(foe);
      setCombat(resolveTurn(st, ai, DIRECTIONS[Math.floor(Math.random() * 3)]));
    }, 600);
    return () => clearTimeout(t);
  }, [combat, isPlayerTurn, foe]);

  // Resolución del duelo
  useEffect(() => {
    if (!combat?.result) return;
    const victimRank = foe?.rank ?? 'plebeyo';
    if (combat.result === 'victoria') {
      const rewarded = computeRewards(combat, character, playerSettlements);
      const r = rewarded.rewards;
      let nextChar: Character = { ...character };
      if (r) {
        nextChar = {
          ...nextChar,
          level: Math.min(100, nextChar.level + (r.experience > 200 ? 1 : 0)),
          progress: { ...nextChar.progress, experience: nextChar.progress.experience + r.experience },
          wealth: { ...nextChar.wealth, oro: nextChar.wealth.oro + r.gold },
          reputation: {
            ...nextChar.reputation,
            honor: Math.max(0, nextChar.reputation.honor + (r.reputation?.honor ?? 0)),
            infamy: Math.max(0, nextChar.reputation.infamy + (r.reputation?.infamy ?? 0)),
            influence: Math.max(0, nextChar.reputation.influence + (r.reputation?.influence ?? 0)),
          },
        };
      }
      // Duelo a rango: ascenso simbólico si el rival es superior
      if (combat.duelType === 'rango' && getRank(victimRank).level > getRank(character.rank).level) {
        nextChar = { ...nextChar, rank: victimRank, title: getRank(victimRank).title };
        setOutcome(`👑 ¡Has ganado el título de ${getRank(victimRank).name} por derecho de armas!`);
      } else if (r) {
        setOutcome(`🏆 Victoria en la arena. Botín: ${r.gold} oro, +${r.experience} XP.`);
      }
      onCharacterChange(nextChar);
      onNarrativeEvent({
        id: `evt-duel-${Date.now().toString(36)}`,
        type: 'festival',
        title: `🏟️ Duelo en ${ARENAS.find((a) => a.id === combat.arenaId)?.name ?? 'la arena'}`,
        description: `${character.name} derrotó a ${foe?.name} en un duelo ${DUEL_TYPES.find((d) => d.id === combat.duelType)?.label.toLowerCase()}. La multitud corea tu título.`,
        timestamp: Date.now(),
        effects: { happiness: 6 },
      });
      setCombat(rewarded);
    } else if (combat.result === 'derrota') {
      // Consecuencias según rango de la VÍCTIMA (aquí, el jugador)
      const loot = lootTableForVictimRank(character.rank);
      const stolen = Math.round(character.wealth.oro * loot.lootPercent);
      let nextChar: Character = {
        ...character,
        wealth: { ...character.wealth, oro: Math.max(0, character.wealth.oro - stolen) },
        reputation: { ...character.reputation, honor: Math.max(0, character.reputation.honor - 3) },
      };
      let msg = `💀 Derrota ante ${foe?.name}. Te saqueó el ${Math.round(loot.lootPercent * 100)}% del oro (${stolen}).`;
      if (hasResurrectionStone) {
        const rev = applyResurrection(player?.maxHp ?? 100, player?.maxMana ?? 50, bonuses.resurrectionDiscount * 0.1);
        msg += ` La piedra te devolvió con ${rev.hp} HP.`;
      } else {
        msg += ` Sin piedra sagrada: ${waitHoursAfterDeath(false, playerSettlements.length > 0)}h de espera hasta el templo.`;
      }
      if (loot.crisis && playerSettlements.length > 0) {
        msg += ' ⚠️ Tu caída provoca una crisis política en la frontera.';
        onNarrativeEvent({
          id: `evt-crisis-${Date.now().toString(36)}`,
          type: 'bandolerismo',
          title: '⚡ Crisis política tras un duelo',
          description: `La derrota de ${character.name} ante ${foe?.name} sacude los salones de ${getRealm(character.realmId).name}. Casas rivales olfatean sangre.`,
          settlementId: playerSettlements[0]?.id,
          timestamp: Date.now(),
          effects: { stability: -15 },
        });
      }
      setOutcome(msg);
      onCharacterChange(nextChar);
    } else if (combat.result === 'huida') {
      setOutcome('🏃 Escapaste del círculo de combate. Nadie habla del incidente.');
    }
  }, [combat?.result]);

  const beginDuel = (opponentId: string, mode: 'pvp_duelo' | 'pvp_emboscada', ambushed = false) => {
    const offer = OPPONENT_POOL.find((o) => o.id === opponentId)!;
    const arena = ARENAS.find((a) => a.realm === offer.realmId)!;
    const p = characterToCombatant(character, undefined, playerSettlements);
    const e = opponentToCombatant(offer);
    setOutcome(null);
    const wager = mode === 'pvp_duelo' && duelType === 'apuesta' ? bet : 0;
    setCombat(createCombat(mode, p, e, {
      level: character.level, ambush: ambushed, betAmount: wager,
      arenaId: arena.id, duelType: mode === 'pvp_duelo' ? duelType : undefined,
    }));
    setSelectedAction('ataque');
  };

  const attackDir = (dir: Direction) => {
    const st = combatRef.current;
    if (!st || st.result || !isPlayerTurn) return;
    const cover = Math.random() < 0.45 ? 'frente' : DIRECTIONS[Math.floor(Math.random() * 3)];
    setCombat(resolveTurn(st, { actionId: selectedAction, chosenDirection: dir }, cover));
  };

  // ----------------------------------------------------------
  // Vista de combate activo (comparte UI con PvE)
  // ----------------------------------------------------------
  if (combat) {
    const hpPct = player ? (player.hp / player.maxHp) * 100 : 0;
    const fHpPct = foe ? (foe.hp / foe.maxHp) * 100 : 0;
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-4 animate-fade-in">
        <p className="text-center font-display text-xl text-gold-gradient">
          {combat.mode === 'pvp_emboscada' ? '🌲 Emboscada en el camino' : `🏟️ Duelo ${DUEL_TYPES.find((d) => d.id === combat.duelType)?.label ?? 'formal'} — ${ARENAS.find((a) => a.id === combat.arenaId)?.name}`}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Card className="parchment-panel p-3">
            <div className="flex justify-between text-sm mb-1"><span className="font-display text-gold">{player?.name}</span><span>{player?.hp}/{player?.maxHp}</span></div>
            <Progress value={hpPct} indicatorClassName="from-green-700 via-green-500 to-green-300" />
          </Card>
          <Card className="parchment-panel p-3">
            <div className="flex justify-between text-sm mb-1"><span className="font-display text-red-300">{foe?.name}</span><span>{foe?.hp}/{foe?.maxHp}</span></div>
            <Progress value={fHpPct} indicatorClassName="from-red-900 via-red-600 to-red-400" />
          </Card>
        </div>

        {combat.result ? (
          <Card className="parchment-panel p-4 text-center space-y-2">
            <p className="font-display text-2xl text-gold-gradient">
              {combat.result === 'victoria' ? '🏆 ¡VICTORIA!' : combat.result === 'derrota' ? '💀 DERROTA' : '🏃 HUIDA'}
            </p>
            {combat.rewards && (
              <div className="flex flex-wrap gap-2 justify-center text-sm">
                <Badge variant="gold">+{combat.rewards.gold} oro</Badge>
                <Badge variant="gold">+{combat.rewards.experience} XP</Badge>
                {combat.rewards.reputation?.honor ? <Badge variant="outline">Honor +{combat.rewards.reputation.honor}</Badge> : null}
                {combat.rewards.reputation?.infamy ? <Badge variant="destructive">Infamia +{combat.rewards.reputation.infamy}</Badge> : null}
                {combat.rewards.reputation?.influence ? <Badge variant="outline">Influencia +{combat.rewards.reputation.influence}</Badge> : null}
              </div>
            )}
            {outcome && <p className="text-sm text-amber-200">{outcome}</p>}
            <Button onClick={() => setCombat(null)}>Regresar</Button>
          </Card>
        ) : (
          <Card className="parchment-panel p-3">
            <p className="stat-label mb-2">{isPlayerTurn ? 'Tu turno — acción y dirección' : 'El rival se prepara…'}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {player?.actions.map((a) => (
                <button key={a.id} disabled={!isPlayerTurn || (a.manaCost ? player.mana < a.manaCost : false)}
                  onClick={() => setSelectedAction(a.id)} title={a.description}
                  className={`px-3 py-1.5 rounded-sm border text-sm disabled:opacity-40 ${selectedAction === a.id ? 'border-gold bg-gold/15 text-gold' : 'border-border text-muted-foreground'}`}>
                  {a.icon} {a.name}{a.manaCost ? ` (${a.manaCost} MP)` : ''}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-4">
              {DIRECTIONS.map((d) => (
                <button key={d} disabled={!isPlayerTurn} onClick={() => attackDir(d)}
                  className="w-20 h-20 rounded-md border-2 border-gold/50 bg-black/30 hover:bg-gold/10 hover:border-gold transition-all disabled:opacity-40">
                  <span className="text-2xl block">{DIRECTION_ICON[d]}</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        <Card className="parchment-panel p-3">
          <p className="stat-label mb-2">📜 Crónica del duelo</p>
          <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-1 text-sm">
            {[...combat.history].reverse().map((h, i) => (
              <p key={i} className={h.critical ? 'text-yellow-300' : h.dodged ? 'text-cyan-300' : ''}>{h.log}</p>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Pantallas previas al combate
  // ----------------------------------------------------------
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-5 animate-fade-in">
      <header className="text-center space-y-1">
        <h2 className="text-3xl text-gold-gradient font-display">🏟️ Duelos y PvP</h2>
        <p className="text-sm text-muted-foreground italic">«La espada decide destinos; la arena los formaliza.»</p>
      </header>

      <div className="flex justify-center gap-2">
        {([['duelo', '⚔️ Arena'], ['ruta', '🌲 Caminos'], ['iglesia', '⛪ Piedra de Resurrección']] as const).map(([id, label]) => (
          <Button key={id} variant={tab === id ? 'default' : 'outline'} size="sm" onClick={() => setTab(id)}>{label}</Button>
        ))}
      </div>

      {outcome && !combat && <p className="text-center text-sm text-amber-200 parchment-panel py-2 rounded">{outcome}</p>}

      {/* --- ARENA --- */}
      {tab === 'duelo' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {LEAGUES.map((l) => (
              <Card key={l.id} className={`parchment-panel p-2 text-center text-xs ${l.id === league.id ? 'ring-1 ring-gold' : 'opacity-70'}`}>
                <p className="text-lg">{l.icon}</p>
                <p className="font-display">{l.name}</p>
                <p className="text-muted-foreground">Nv {l.minLevel}–{l.maxLevel}</p>
                <p className="text-gold">{l.entryFee.toLocaleString()} oro</p>
              </Card>
            ))}
          </div>

          <Card className="parchment-panel">
            <CardHeader className="pb-2">
              <CardTitle>📜 Reglas del duelo — Liga {league.icon} {league.name}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                {DUEL_TYPES.map((d) => (
                  <button key={d.id} onClick={() => setDuelType(d.id)} title={d.desc}
                    className={`px-3 py-1 rounded-sm border text-sm ${duelType === d.id ? 'border-gold bg-gold/10 text-gold' : 'border-border text-muted-foreground'}`}>
                    {d.icon} {d.label}
                  </button>
                ))}
              </div>
              {duelType === 'apuesta' && (
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <span>Apuesta:</span>
                  <input type="number" min={100} max={character.wealth.oro} value={bet}
                    onChange={(e) => setBet(Math.max(100, Number(e.target.value)))}
                    className="w-28 bg-black/30 border border-border rounded px-2 py-1" />
                  <span className="text-muted-foreground">oro (tienes {Math.round(character.wealth.oro).toLocaleString()})</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {OPPONENT_POOL.filter((o) => Math.abs(o.level - character.level) <= 12).slice(0, 9).map((o) => (
                <div key={o.id} className="rounded-md border border-border bg-black/20 p-3 hover:border-gold/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <p className="font-display">{o.raceIcon} {o.classIcon} {o.name} <span className="text-muted-foreground">{o.surname}</span></p>
                    <Badge variant="gold">{getRank(o.rank).name}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 italic">{o.bio}</p>
                  <div className="flex gap-3 text-xs mt-2 text-muted-foreground">
                    <span>Nv {o.level}</span><span>❤️ {o.hp}</span><span>⚔️ {o.attack}</span><span>💨 {o.speed}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gold">Apuesta sugerida: {o.wager.toLocaleString()} 🪙</span>
                    <Button size="sm" onClick={() => beginDuel(o.id, 'pvp_duelo')} disabled={duelType === 'apuesta' && bet > character.wealth.oro}>Desafiar</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="parchment-panel">
            <CardHeader><CardTitle>🧩 Combos de habilidades disponibles</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
              {combosForCharacter(character.classId, character.level).map((c) => (
                <div key={c.id} className="rounded border border-border px-3 py-2">
                  <p className="font-display text-gold">{c.icon} {c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                  <p className="text-xs mt-1">Skills: {c.skills.join(' + ')} · ×{c.damageMultiplier} daño · {c.manaCost} MP</p>
                </div>
              ))}
              {combosForCharacter(character.classId, character.level).length === 0 && (
                <p className="text-muted-foreground text-sm col-span-full">Aún no dominas combos. Sube de nivel y clase para desbloquear cadenas de habilidades.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* --- EMBOSCADAS EN RUTAS --- */}
      {tab === 'ruta' && (
        <Card className="parchment-panel">
          <CardHeader>
            <CardTitle>🌲 Viaje por caminos peligrosos</CardTitle>
            <CardDescription>
              Probabilidad de emboscada = 10% + peligro×0.5% − percepción×0.2%. Tu percepción ({character.stats.percepcion}) reduce el riesgo.
              Si tienes sigilo &gt; percepción del atacante, la evitas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm stat-label">Peligro de la ruta:</span>
              <input type="range" min={1} max={10} value={routeDanger} onChange={(e) => setRouteDanger(Number(e.target.value))} className="accent-[hsl(45_65%_52%)]" />
              <Badge variant="gold">{routeDanger}/10</Badge>
            </div>
            <p className="text-sm">Riesgo actual: <b className={chance > 0.3 ? 'text-red-400' : 'text-green-400'}>{Math.round(chance * 100)}%</b></p>
            <Button onClick={() => {
              const rolled = Math.random() < chance;
              const foes = OPPONENT_POOL.filter((o) => o.level <= character.level + 5);
              const foe = foes[Math.floor(Math.random() * foes.length)];
              if (rolled) {
                setOutcome(`🌲 ¡EMBOSCADA de ${foe.name} ${foe.surname}! El atacante actúa primero con un turno extra gratuito.`);
                beginDuel(foe.id, 'pvp_emboscada', true);
              } else {
                setOutcome(`Tu percepción detectó trampas en ${getRealm(character.realmId).motto ? 'la calzada' : 'la vereda'}… evitaste la emboscada y sigues de largo.`);
              }
            }}>Viajar por la ruta</Button>
            <p className="text-xs text-muted-foreground italic">
              Saquear caravanas ajenas requiere nivel 10+, rango Caballero+ e infamia &gt; 20. Éxito: 30% del cargamento. Fracaso: −500 honor y bounty de 5.000 oro sobre tu cabeza.
            </p>
          </CardContent>
        </Card>
      )}

      {/* --- IGLESIA / PIEDRA --- */}
      {tab === 'iglesia' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="parchment-panel">
            <CardHeader>
              <CardTitle>⛪ Mercado de Piedras de Resurrección</CardTitle>
              <CardDescription>Precio base {RESURRECTION_BASE_PRICE.toLocaleString()} 🪙 · demanda actual {market.demand}% · carisma {character.stats.carisma} reduce el coste.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Precio de mercado:</span><b>{basePrice.toLocaleString()} 🪙</b></div>
              <div className="flex justify-between"><span>Descuento por donaciones ({Math.round(bonuses.resurrectionDiscount * 100)}%):</span><b className="text-green-400">−{(basePrice - stonePrice).toLocaleString()}</b></div>
              <div className="flex justify-between text-gold font-display text-lg"><span>Precio final:</span><span>{stonePrice.toLocaleString()} 🪙</span></div>
              <Button disabled={hasResurrectionStone || character.wealth.oro < stonePrice} onClick={() => { onBuyStone(stonePrice); setOutcome(hasResurrectionStone ? 'Ya portas una piedra sagrada.' : `⛪ Adquiriste una Piedra de Resurrección por ${stonePrice.toLocaleString()} oro.`); }}>
                {hasResurrectionStone ? '✔ Ya portas una piedra' : 'Comprar piedra sagrada'}
              </Button>
              <p className="text-xs text-muted-foreground">Al morir con piedra: resurrección inmediata al 50% de HP/MP. Sin piedra: {deathWaitHours(playerSettlements.length > 0)}h reales de espera{playerSettlements.length === 0 ? ' (8h sin reino)' : ''}.</p>
            </CardContent>
          </Card>
          <Card className="parchment-panel">
            <CardHeader>
              <CardTitle>🕯️ Donativos a la Iglesia</CardTitle>
              <CardDescription>Cada 1.000 🪙 donado → +5% de efectividad de piedra (tope 50%). Los No-Muertos pagan diezmos dobles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Donado acumulado:</span><b>{churchDonations.toLocaleString()} 🪙</b></div>
              <div className="flex justify-between"><span>Influencia religiosa ganada:</span><b>{Math.floor(churchDonations / 2000)}</b></div>
              {[5000, 25000, 100000].map((amt) => (
                <Button key={amt} variant="outline" size="sm" disabled={character.wealth.oro < amt}
                  onClick={() => { onDonateChurch(amt); setOutcome(`⛪ Donaste ${amt.toLocaleString()} oro; el obispo bendice tus murallas (+5% defensa).`); }}>
                  Donar {amt.toLocaleString()} 🪙
                </Button>
              ))}
              <p className="text-xs text-muted-foreground italic">Cadena de sinergia: donación → descuento en piedras → supervivencia en asedios → victoria en guerra.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
