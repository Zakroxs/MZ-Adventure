// ============================================================
// ASEDIOS Y GUERRAS — PvP de guerra entre reinos (Fase 2, Sistema 5)
// ============================================================

import { useState } from 'react';
import type { SiegeState, WarVote } from '../types/combat';
import { SIEGE_PHASE_INFO } from '../types/combat';
import type { Character, GameEvent, RealmId, Settlement } from '../types/game';
import { REALMS, allSettlements, getRealm } from '../data/realms';
import { getRank } from '../data/nobilityRanks';
import {
  CASUS_BELLI, advanceSiegePhase, canVoteForWar, generateWarVotes,
  resolveAssault, startSiege, wallDefense, warApproved,
} from '../lib/combat/warfare';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Progress } from '../components/ui/progress';

interface Props {
  character: Character;
  playerSettlements: Settlement[];
  churchDonations: number;
  onCharacterChange: (c: Character) => void;
  onNarrativeEvent: (e: GameEvent) => void;
  sieges: SiegeState[];
  onSiegesChange: (s: SiegeState[]) => void;
}

// Línea temporal visible del asedio: incluye la fase previa de votación nobiliaria.
const PHASES_TIMELINE = ['votacion', 'preaviso', 'bloqueo', 'bombardero', 'asalto', 'saqueo', 'resuelto'] as const;

export default function SiegeWar({ character, playerSettlements, churchDonations, onCharacterChange, onNarrativeEvent, sieges, onSiegesChange }: Props) {
  const [targetRealmId, setTargetRealmId] = useState<RealmId>('valdris');
  const [casusIdx, setCasusIdx] = useState(0);
  const [votes, setVotes] = useState<WarVote[] | null>(null);
  const [chronicles, setChronicles] = useState<string[]>([]);

  const homeRealm = getRealm(character.realmId);
  const targetRealm = getRealm(targetRealmId);
  const hasVoteRight = canVoteForWar(character.rank);
  // Influencia política (Fase 1) → +1 voto extra si > 100 (sinergia 6.1)
  const influenceVeto = character.reputation.influence >= 100;

  // Murallas del objetivo (usando datos reales de Fase 1)
  const targetCapital = targetRealm.capital;
  const baseWalls = Math.max(...allSettlements(targetRealm).map((s) => s.walls));
  const smithLevel = Math.min(50, 5 + Math.round(churchDonations / 10000)); // herreros locales simulados por economía
  const defense = wallDefense(baseWalls, {
    pact: 0.5,                                     // Pacto de Muralla activo
    blessing: churchDonations > 50000 ? 1 : 0.2,   // bendición de la iglesia
    enchantment: 0.3,                              // mago contratista
    smithLevel,                                    // herrero local × nivel
    sabotage: 0,                                   // sin espías detectados
  });

  const callVote = () => {
    const v = generateWarVotes(true, character.rank);
    if (influenceVeto) v.push({ nobleName: 'Tu influencia (+1 voto)', rank: character.rank, inFavor: true });
    setVotes(v);
  };

  const declareWar = () => {
    if (!votes || !warApproved(votes)) return;
    const s = startSiege(homeRealm.id, targetRealm.id, `${targetCapital.name}, plaza fuerte de ${targetRealm.name}`, CASUS_BELLI[casusIdx], baseWalls, votes);
    onSiegesChange([s, ...sieges]);
    onNarrativeEvent({
      id: `evt-war-${Date.now().toString(36)}`,
      type: 'guerra',
      title: `⚔️ ¡Guerra declarada! ${homeRealm.name} contra ${targetRealm.name}`,
      description: `El consejo de nobles aprobó la campaña. Casus belli: ${CASUS_BELLI[casusIdx]}. El reino enemigo dispone de 24 horas de preaviso antes del bloqueo.`,
      settlementId: playerSettlements[0]?.id,
      timestamp: Date.now(),
      effects: { stability: -5 },
    });
    setChronicles((c) => [`📯 Heroldos a caballo partieron al alba: ${homeRealm.name} ha declarado la guerra a ${targetRealm.name} por «${CASUS_BELLI[casusIdx]}».`, ...c].slice(0, 6));
    setVotes(null);
  };

  const advance = (s: SiegeState) => {
    let next = advanceSiegePhase(s);
    if (next.phase === 'resuelto' && s.phase === 'asalto') {
      const force = 800 + character.level * 40 + character.reputation.influence * 3 + playerSettlements.length * 200;
      const res = resolveAssault(next, force);
      next = { ...next, ChronicleEntry: res.chronicle };
      setChronicles((c) => [res.chronicle, ...c].slice(0, 6));
      onNarrativeEvent({
        id: `evt-siege-${Date.now().toString(36)}`,
        type: res.captured ? 'construccion_completada' : 'bandolerismo',
        title: res.captured ? '🔥 Asedio: plaza caída' : '🛡️ Asedio: murallas resisten',
        description: res.chronicle,
        settlementId: playerSettlements[0]?.id,
        timestamp: Date.now(),
        effects: res.captured ? { gold: 20000, stability: -10 } : { stability: 5 },
      });
      if (res.captured) {
        // Captura: +tierras e influencia; recompensa de 20.000 oro simbólica
        onCharacterChange({
          ...character,
          wealth: { ...character.wealth, oro: character.wealth.oro + 20000 },
          reputation: { ...character.reputation, influence: character.reputation.influence + 500 },
        });
      } else {
        onCharacterChange({ ...character, reputation: { ...character.reputation, honor: character.reputation.honor + 200 } });
      }
    }
    onSiegesChange(sieges.map((x) => (x.id === next.id ? next : x)));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-5 animate-fade-in">
      <header className="text-center space-y-1">
        <h2 className="text-3xl text-gold-gradient font-display">🏰 Asedios y Guerra entre Reinos</h2>
        <p className="text-sm text-muted-foreground italic">«Las murallas no caen ante ejércitos: caen ante el tiempo, el hambre y un buen herrero traidor.»</p>
      </header>

      {/* --- Declaración de guerra --- */}
      <Card className="parchment-panel">
        <CardHeader>
          <CardTitle>🗳️ Consejo de Guerra — {homeRealm.name}</CardTitle>
          <CardDescription>
            Requisitos: 3 nobles de rango Conde+ votan a favor · casus belli válido · 24h de preaviso.
            Tu rango: {getRank(character.rank).name} {hasVoteRight ? '(con derecho a voto)' : '(sin derecho a voto — necesitas Conde+)'}
            {influenceVeto ? ' · 🏛️ tu influencia ≥100 otorga +1 voto' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 items-center text-sm">
            <label>Reino objetivo:</label>
            <select value={targetRealmId} onChange={(e) => setTargetRealmId(e.target.value as RealmId)} className="bg-black/30 border border-border rounded px-2 py-1">
              {REALMS.filter((r) => r.id !== homeRealm.id).map((r) => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
            </select>
            <label>Casus belli:</label>
            <select value={casusIdx} onChange={(e) => setCasusIdx(Number(e.target.value))} className="bg-black/30 border border-border rounded px-2 py-1">
              {CASUS_BELLI.map((c, i) => <option key={i} value={i}>{c}</option>)}
            </select>
            {!votes && <Button size="sm" onClick={callVote}>Convocar votación</Button>}
          </div>

          {/* Estado de las defensas enemigas */}
          <div className="rounded border border-border bg-black/20 p-3 text-sm grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div><span className="stat-label block">Muralla base</span><b>{baseWalls}/10</b></div>
            <div><span className="stat-label block">Pacto de Muralla</span><b>+15%</b></div>
            <div><span className="stat-label block">Bendición eclesiástica</span><b>+{Math.round((churchDonations > 50000 ? 1 : 0.2) * 5)}%</b></div>
            <div><span className="stat-label block">Defensa final estimada</span><b className="text-gold">{defense.toFixed(2)}</b></div>
          </div>

          {votes && (
            <div className="space-y-2">
              <p className="stat-label">Votos emitidos:</p>
              <ul className="text-sm space-y-1">
                {votes.map((v, i) => (
                  <li key={i} className="flex justify-between rounded border border-border px-3 py-1">
                    <span>{v.inFavor ? '🟢' : '🔴'} {v.nobleName} <span className="opacity-60">({getRank(v.rank).name})</span></span>
                    <span className={v.inFavor ? 'text-green-400' : 'text-red-400'}>{v.inFavor ? 'A favor' : 'En contra'}</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button size="sm" disabled={!warApproved(votes)} onClick={declareWar}>
                  {warApproved(votes) ? '⚔️ Firmar la declaración de guerra' : 'Se requieren 3 votos afirmativos de Condes+'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setVotes(null)}>Disolver consejo</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Fases del asedio en curso --- */}
      <Card className="parchment-panel">
        <CardHeader><CardTitle>🔥 Campañas activas</CardTitle>
          <CardDescription>Fases: Bloqueo (24h) → Bombardero (12h) → Asalto (1h) → Saqueo (6h). En esta demo puedes avanzar de fase manualmente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sieges.length === 0 && <p className="text-sm text-muted-foreground">No hay guerras en curso. Los bardos se aburren.</p>}
          {sieges.map((s) => {
            const info = SIEGE_PHASE_INFO[s.phase];
            const phaseIdx = PHASES_TIMELINE.indexOf(s.phase);
            return (
              <div key={s.id} className="rounded-md border border-border bg-black/20 p-3 space-y-2">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <p className="font-display">{getRealm(s.attackerRealm).icon} {getRealm(s.attackerRealm).name} <span className="text-red-400">vs</span> {getRealm(s.defenderRealm).icon} {getRealm(s.defenderRealm).name}</p>
                  <Badge variant="gold">{info.icon} {info.name} ({info.hours}h)</Badge>
                </div>
                <p className="text-xs text-muted-foreground italic">🎯 {s.targetSettlementName} — «{s.casusBelli}»</p>
                {/* Timeline de fases */}
                <div className="flex items-center gap-1">
                  {PHASES_TIMELINE.map((ph, i) => (
                    <div key={ph} className={`flex-1 h-1.5 rounded-full ${i <= phaseIdx ? 'bg-gold' : 'bg-white/10'}`} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{info.desc}</p>
                <div className="flex justify-between items-center text-sm">
                  <span>Murallas restantes: <b>{s.targetWalls.toFixed(2)}/10</b> · Penalización de estabilidad: <b className="text-red-300">-{s.stabilityPenalty}%</b></span>
                  {s.phase !== 'resuelto' ? (
                    <Button size="sm" variant="outline" onClick={() => advance(s)}>Avanzar fase ▶</Button>
                  ) : (
                    <span className="text-gold font-display">📜 {s.ChronicleEntry ?? 'Fin de la campaña.'}</span>
                  )}
                </div>
                <Progress value={(s.targetWalls / 10) * 100} indicatorClassName="from-stone-600 via-stone-400 to-stone-300" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* --- Crónicas de guerra --- */}
      <Card className="parchment-panel p-3">
        <p className="stat-label mb-2">📖 Crónicas del conflicto</p>
        {chronicles.length === 0 ? <p className="text-sm text-muted-foreground">La historia aún no tiene tinta derramada aquí.</p> : (
          <ul className="text-sm space-y-2">{chronicles.map((c, i) => <li key={i} className="border-l-2 border-gold/40 pl-3 italic">{c}</li>)}</ul>
        )}
      </Card>

      {/* --- Ejecución de nobles capturados --- */}
      <Card className="parchment-panel p-3">
        <CardHeader className="p-0 pb-2"><CardTitle className="text-base">⚰️ Prisioneros ilustres</CardTitle>
          <CardDescription className="text-xs">La ejecución requiere voto de 3 Condes+ del reino atacante. La víctima pierde títulos, tierras y reputación; su Casa queda «Extinta» 30 días.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {sieges.filter((s) => s.phase === 'resuelto' && s.ChronicleEntry?.includes('caído')).length === 0 ? (
            <p className="text-muted-foreground">Ningún noble enemigo aguarda en tus celdas… por ahora.</p>
          ) : (
            <div className="flex justify-between items-center rounded border border-red-900/50 bg-red-950/20 p-3">
              <span>🪓 Un duque vencido pide clemencia. Su cabeza vale una paz.</span>
              <Button size="sm" variant="destructive" onClick={() => {
                setChronicles((c) => ['☠️ El verdugo del reino cumplió su oficio: una Casa noble ha sido marcada como EXTINTA durante 30 días. Las crónicas narrarán este día.', ...c].slice(0, 6));
                onCharacterChange({ ...character, reputation: { ...character.reputation, infamy: character.reputation.infamy + 100, influence: character.reputation.influence + 300 } });
              }}>Ejecutar tras votación</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
