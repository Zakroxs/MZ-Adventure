// ============================================================
// COMBATE PvE DIRECCIONAL — Caza de criaturas y bandidos
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Character, GameEvent, Settlement } from '../types/game';
import type { CombatState, Direction, EnemyTemplate } from '../types/combat';
import { DIRECTION_ICON, DIRECTION_LABEL, DIRECTIONS } from '../types/combat';
import { ENEMY_TEMPLATES, enemiesForLevel, getEnemy } from '../data/enemies';
import {
  characterToCombatant, computeRewards, createCombat, enemyChooseAction,
  enemyToCombatant, resolveTurn,
} from '../lib/combat/directionalCombat';
import { deathWaitHours } from '../lib/combat/directionalCombat';
import { waitHoursAfterDeath } from '../lib/combat/resurrection';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

interface Props {
  character: Character;
  playerSettlements: Settlement[];
  hasResurrectionStone: boolean;
  onCharacterChange: (c: Character) => void;
  onNarrativeEvent: (e: GameEvent) => void;
  onOpenDuel?: () => void;
}

export default function CombatArena({ character, playerSettlements, hasResurrectionStone, onCharacterChange, onNarrativeEvent }: Props) {
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('ataque');
  const [busy, setBusy] = useState(false);
  const [deathMsg, setDeathMsg] = useState<string | null>(null);
  const combatRef = useRef<CombatState | null>(null);
  combatRef.current = combat;

  const player = combat?.participants.find((p) => p.type === 'jugador');
  const enemy = combat?.participants.find((p) => p.type !== 'jugador');
  const isPlayerTurn = combat ? combat.turnOrder[combat.currentActorIndex] === character.id : false;

  // --- IA enemiga: cuando el turno es del enemigo, resuelve automáticamente ---
  useEffect(() => {
    if (!combat || combat.result || !enemy) return;
    if (isPlayerTurn) return;
    const t = setTimeout(() => {
      const st = combatRef.current;
      if (!st || st.result) return;
      const ai = enemyChooseAction(enemy);
      // El jugador "cubre" una dirección defensiva elegida al azar si no decide
      const playerDefDir = DIRECTIONS[Math.floor(Math.random() * 3)];
      setCombat(resolveTurn(st, ai, playerDefDir));
    }, 650);
    return () => clearTimeout(t);
  }, [combat, isPlayerTurn, enemy]);

  // --- Finalización: aplicar recompensas o consecuencias de muerte ---
  useEffect(() => {
    if (!combat || !combat.result) return;
    if (combat.result === 'victoria') {
      const rewarded = computeRewards(combat, character, playerSettlements);
      const r = rewarded.rewards;
      if (r) {
        const xpTotal = character.progress.experience + r.experience;
        const level = Math.min(100, 1 + Math.floor(xpTotal / 250));
        const next: Character = {
          ...character,
          level: Math.max(character.level, level),
          progress: { ...character.progress, experience: xpTotal },
          wealth: { ...character.wealth, oro: character.wealth.oro + r.gold },
        };
        onCharacterChange(next);
        const tpl = combat.enemyTemplateId ? getEnemy(combat.enemyTemplateId) : null;
        onNarrativeEvent({
          id: `evt-combat-${Date.now().toString(36)}`,
          type: 'descubrimiento',
          title: `⚔️ Victoria contra ${tpl?.name ?? 'un rival'}`,
          description: `${character.name} derrotó a ${enemy?.name}. Botín: ${r.gold} oro, ${r.experience} XP${r.items.length ? `, botín: ${r.items.join(', ')}` : ''}.`,
          timestamp: Date.now(),
          effects: { gold: r.gold },
        });
      }
      setCombat(rewarded);
    } else if (combat.result === 'derrota') {
      const hours = waitHoursAfterDeath(hasResurrectionStone, true);
      const msg = hasResurrectionStone
        ? `💀 Caíste en combate… pero la Piedra de Resurrección te devuelve al mundo con 50% de tus fuerzas.`
        : `💀 Has caído. Deberás esperar ${deathWaitHours(true)} horas reales (o ${hours}h con reino) hasta que los monjes del templo recojan tu cuerpo.`;
      setDeathMsg(msg);
      onNarrativeEvent({
        id: `evt-death-${Date.now().toString(36)}`,
        type: 'peste',
        title: '☠️ Caída en combate',
        description: `${character.name} cayó ante ${enemy?.name}. ${hasResurrectionStone ? 'Resucitado por piedra sagrada.' : 'El templo prepara el rito de retorno.'}`,
        settlementId: playerSettlements[0]?.id,
        timestamp: Date.now(),
        effects: { happiness: -8 },
      });
    } else if (combat.result === 'huida') {
      setDeathMsg('🏃 Has huido del combate con vida. Los bardos no cantarán esto… pero estás vivo.');
    }
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat?.result]);

  const startFight = useCallback((tpl: EnemyTemplate) => {
    const p = characterToCombatant(character, undefined, playerSettlements);
    const e = enemyToCombatant(tpl);
    setDeathMsg(null);
    setCombat(createCombat('pve', p, e, { level: character.level, enemyTemplateId: tpl.id }));
    setSelectedAction('ataque');
  }, [character, playerSettlements]);

  const attackWithDirection = (dir: Direction) => {
    const st = combatRef.current;
    if (!st || st.result || busy || !isPlayerTurn) return;
    setBusy(true);
    // El enemigo intenta cubrir una dirección; si coincide → esquiva perfecta
    const defDirs: Direction[] = ['izquierda', 'frente', 'derecha'];
    const enemyCover = Math.random() < 0.45 ? 'frente' : defDirs[Math.floor(Math.random() * 3)];
    setCombat(resolveTurn(st, { actionId: selectedAction, chosenDirection: dir }, enemyCover));
  };

  // ----------------------------------------------------------
  // Pantalla de selección de enemigo
  // ----------------------------------------------------------
  if (!combat) {
    const recommended = enemiesForLevel(character.level);
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6 animate-fade-in">
        <header className="text-center space-y-1">
          <h2 className="text-3xl text-gold-gradient font-display">⚔️ Caza y Combate PvE</h2>
          <p className="text-sm text-muted-foreground italic">
            «En los campos de Aldoria, no basta con ser fuerte. Debes saber dónde caerá el acero de tu enemigo antes de que él lo sepa.»
          </p>
          {deathMsg && <p className="mt-2 text-sm text-red-400 parchment-panel inline-block px-4 py-2">{deathMsg}</p>}
        </header>

        <Card className="parchment-panel">
          <CardHeader>
            <CardTitle>🎯 Presas recomendadas (nivel {character.level})</CardTitle>
            <CardDescription>Elige una presa. Cada combate es direccional: ↖️ ⬆️ ↗️ lee a tu rival.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommended.map((e) => (
              <button
                key={e.id}
                onClick={() => startFight(e)}
                className="text-left rounded-md border border-border bg-black/20 hover:border-gold/60 hover:bg-gold/5 p-3 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg">{e.icon} {e.name}</span>
                  <Badge variant="gold">{e.danger}⚠</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span>❤️ {e.hp}</span><span>⚔️ {e.attack}</span><span>🛡️ {e.defense}</span><span>💰 {e.gold}</span>
                </div>
                {e.isBoss && <p className="text-xs text-gold mt-1">👑 JEFE — botín legendario</p>}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="parchment-panel">
          <CardHeader><CardTitle>📜 Bestiario completo ({ENEMY_TEMPLATES.length} criaturas)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
            {ENEMY_TEMPLATES.map((e) => (
              <div key={e.id} className={`rounded border border-border px-2 py-1 flex justify-between ${e.danger > character.level / 4 + 4 ? 'opacity-50' : ''}`}>
                <span>{e.icon} {e.name}</span>
                <span className="text-muted-foreground">{e.loot}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Pantalla de combate activo
  // ----------------------------------------------------------
  const hpPct = player ? (player.hp / player.maxHp) * 100 : 0;
  const eHpPct = enemy ? (enemy.hp / enemy.maxHp) * 100 : 0;
  const mpPct = player ? (player.mana / player.maxMana) * 100 : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-4 animate-fade-in">
      {/* Marcadores */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="parchment-panel p-3">
          <div className="flex justify-between text-sm mb-1"><span className="font-display text-gold">{player?.name}</span><span>{player?.hp}/{player?.maxHp}</span></div>
          <Progress value={hpPct} indicatorClassName="from-green-700 via-green-500 to-green-300" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Maná</span><span>{player?.mana}/{player?.maxMana}</span></div>
          <Progress value={mpPct} className="h-1.5 mt-0.5" indicatorClassName="from-blue-800 via-blue-500 to-cyan-300" />
        </Card>
        <Card className="parchment-panel p-3">
          <div className="flex justify-between text-sm mb-1"><span className="font-display text-red-300">{enemy?.name}</span><span>{enemy?.hp}/{enemy?.maxHp}</span></div>
          <Progress value={eHpPct} indicatorClassName="from-red-900 via-red-600 to-red-400" />
          {combat.ambushed && <p className="text-xs text-red-400 mt-1">🌲 ¡Emboscada! El rival tuvo un turno extra gratuito.</p>}
        </Card>
      </div>

      {/* Resultado */}
      {combat.result && (
        <Card className="parchment-panel p-4 text-center space-y-2">
          <p className="font-display text-2xl text-gold-gradient">
            {combat.result === 'victoria' ? '🏆 ¡VICTORIA!' : combat.result === 'derrota' ? '💀 DERROTA' : '🏃 HUIDA'}
          </p>
          {combat.rewards && (
            <div className="text-sm flex flex-wrap gap-3 justify-center">
              <Badge variant="gold">+{combat.rewards.experience} XP</Badge>
              <Badge variant="gold">+{combat.rewards.gold} oro</Badge>
              {combat.rewards.items.map((i) => <Badge key={i} variant="outline">{i}</Badge>)}
            </div>
          )}
          {deathMsg && <p className="text-sm text-red-300">{deathMsg}</p>}
          <Button onClick={() => { setCombat(null); setDeathMsg(null); }}>Volver a la caza</Button>
        </Card>
      )}

      {/* Selector de acción */}
      {!combat.result && (
        <Card className="parchment-panel p-3">
          <p className="stat-label mb-2">{isPlayerTurn ? 'Tu turno — elige acción y dirección' : 'Turno del rival…'}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {player?.actions.map((a) => (
              <button
                key={a.id}
                disabled={!isPlayerTurn || busy || (a.manaCost ? (player.mana < a.manaCost) : false)}
                onClick={() => setSelectedAction(a.id)}
                title={a.description}
                className={`px-3 py-1.5 rounded-sm border text-sm transition-all disabled:opacity-40 ${
                  selectedAction === a.id ? 'border-gold bg-gold/15 text-gold shadow-gold' : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {a.icon} {a.name}{a.manaCost ? <span className="text-xs ml-1 opacity-70">({a.manaCost} MP)</span> : null}
              </button>
            ))}
          </div>
          {/* Botones direccionales ↖️ ⬆️ ↗️ */}
          <div className="flex justify-center gap-4">
            {DIRECTIONS.map((d) => (
              <button
                key={d}
                disabled={!isPlayerTurn || busy}
                onClick={() => attackWithDirection(d)}
                className="w-24 h-24 rounded-md border-2 border-gold/50 bg-black/30 hover:bg-gold/10 hover:border-gold hover:scale-105 active:scale-95 transition-all text-center disabled:opacity-40 disabled:hover:scale-100"
              >
                <span className="text-3xl block">{DIRECTION_ICON[d]}</span>
                <span className="text-xs text-muted-foreground">{DIRECTION_LABEL[d]}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Si el rival cubre tu misma dirección → <b>esquiva perfecta</b>. Si falla su guardia → <b>crítico 120%</b>.
          </p>
        </Card>
      )}

      {/* Log de combate */}
      <Card className="parchment-panel p-3">
        <p className="stat-label mb-2">📜 Crónica del combate · Turno {combat.currentTurn}</p>
        <div className="max-h-56 overflow-y-auto scrollbar-thin space-y-1 text-sm">
          {[...combat.history].reverse().map((h, i) => (
            <p key={i} className={`${h.critical ? 'text-yellow-300' : h.dodged ? 'text-cyan-300' : h.damageDealt > 0 ? '' : 'text-muted-foreground'} ${i === 0 ? 'animate-fade-in' : ''}`}>
              <span className="opacity-60">T{h.turnNumber}·</span> {h.log}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}
