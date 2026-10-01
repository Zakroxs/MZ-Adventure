import { useMemo, useState } from 'react';
import type { Character, GameEvent, Settlement } from '../types/game';
import { getRealm } from '../data/realms';
import { getRace } from '../data/races';
import { getClass } from '../data/classes';
import { getHouseBySurname } from '../data/nobleHouses';
import { getRank, getNextRank } from '../data/nobilityRanks';
import { checkPromotion, promote, DEED_TEMPLATES, applyDeed } from '../lib/nobility';
import { settlementNet } from '../lib/economy';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';

const RESOURCE_ICONS: Record<string, string> = {
  oro: '🪙', plata: '🥈', cobre: '🥉', alimento: '🌾', madera: '🪵', piedra: '🪨', hierro: '⚙️', piedrapreciosa: '💎',
};

interface Props {
  character: Character;
  playerSettlements: Settlement[];
  events: GameEvent[];
  onCharacterChange: (c: Character) => void;
  onNavigate: (view: 'world' | 'settlements') => void;
}

export default function PlayerDashboard({ character, playerSettlements, events, onCharacterChange, onNavigate }: Props) {
  const realm = getRealm(character.realmId);
  const race = getRace(character.raceId);
  const cls = getClass(character.classId);
  const house = getHouseBySurname(character.surname);
  const rank = getRank(character.rank);
  const nextRank = getNextRank(character.rank);
  const [promotionMsg, setPromotionMsg] = useState<string | null>(null);

  const promoCheck = useMemo(() => checkPromotion(character), [character]);

  const totalIncome = playerSettlements.reduce((a, s) => a + settlementNet(s), 0);
  const xpPct = Math.min(100, (character.progress.experience / character.progress.experienceToNext) * 100);

  const doPromote = () => {
    const { character: updated, deed } = promote(character);
    if (deed) {
      onCharacterChange(updated);
      // Usamos directamente el nuevo rango del personaje (más fiable que leer el título de la hazaña).
      setPromotionMsg(`¡Has ascendido a ${getRank(updated.rank).name}! ${deed.title}`);
      setTimeout(() => setPromotionMsg(null), 5000);
    }
  };

  const quickDeed = (key: keyof typeof DEED_TEMPLATES) => {
    const deed = DEED_TEMPLATES[key]();
    onCharacterChange(applyDeed(character, deed));
  };

  const repBar = (label: string, value: number, max = 100, color?: string) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="stat-label">{label}</span>
        <span style={{ color }}>{Math.round(value)}</span>
      </div>
      <Progress value={(value / max) * 100} indicatorClassName={color ? `bg-gradient-to-r from-current to-current opacity-90` : undefined} />
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-fade-in">
      {/* Cabecera del personaje */}
      <header className="text-center mb-6">
        <h1 className="text-3xl text-gold-gradient font-display">
          {character.title && character.title !== '—' ? `${character.title} ` : ''}{character.name} {character.surname}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {house?.coatOfArms ?? '🏰'} Casa {house?.surname ?? character.surname} · «{house?.motto ?? 'aún por escribir'}»
        </p>
        <div className="flex justify-center gap-2 mt-2 flex-wrap">
          <Badge variant="gold" style={{ color: realm.accent }}>{rank.name} — {realm.name}</Badge>
          <Badge variant="outline">{race.icon} {race.name}</Badge>
          <Badge variant="outline">{cls.icon} {cls.name}</Badge>
          {character.isTraitor && <Badge variant="destructive">⚠️ Traidor</Badge>}
        </div>
        <div className="ornament my-4" />
      </header>

      {promotionMsg && (
        <div className="mb-4 rounded-md border border-gold bg-gold/15 p-3 text-center text-gold animate-fade-in">⚜️ {promotionMsg}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ================= COLUMNA IZQUIERDA ================= */}
        <div className="space-y-4">
          {/* Progresión */}
          <Card className="parchment-panel">
            <CardHeader><CardTitle>Progresión</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Nivel <strong className="text-gold">{character.level}</strong></span>
                <span className="text-xs text-muted-foreground">{character.progress.experience} / {character.progress.experienceToNext} XP</span>
              </div>
              <Progress value={xpPct} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Puntos de habilidad: <strong className="text-foreground">{character.progress.skillPoints}</strong></span>
              </div>
              <div>
                <div className="stat-label mb-1">Habilidades</div>
                <div className="flex flex-wrap gap-1">
                  {character.progress.abilities.map((a) => <Badge key={a} variant="outline">✨ {a}</Badge>)}
                </div>
              </div>
              <div>
                <div className="stat-label mb-1">Misiones</div>
                <ul className="space-y-1">
                  {character.progress.quests.map((q) => (
                    <li key={q.id} className="text-xs border-l-2 border-gold/40 pl-2">
                      <span className="capitalize text-gold">[{q.type}]</span> <strong>{q.title}</strong>
                      <span className="text-muted-foreground"> — {q.status.replace(/_/g, ' ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Reputación */}
          <Card className="parchment-panel">
            <CardHeader><CardTitle>Reputación</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {repBar('Honor', character.reputation.honor, 100, '#d4c27a')}
              {repBar('Lealtad al reino', character.reputation.loyalty, 100, '#8fae7e')}
              {repBar('Influencia', Math.min(100, character.reputation.influence), 100, '#b095d1')}
              {repBar('Infamia', character.reputation.infamy, 100, '#c0605a')}
            </CardContent>
          </Card>

          {/* Historial de hazañas */}
          <Card className="parchment-panel">
            <CardHeader>
              <CardTitle>Hazañas</CardTitle>
              <CardDescription>Tu crónica personal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
              {character.reputation.deeds.length === 0 && <p className="text-xs text-muted-foreground italic">Aún no has realizado hazañas memorables.</p>}
              {character.reputation.deeds.map((d) => (
                <div key={d.id} className={`text-xs rounded-sm border p-2 ${d.type === 'honorable' ? 'border-gold/40 bg-gold/5' : d.type === 'infame' ? 'border-destructive/50 bg-destructive/10' : 'border-border'}`}>
                  <div className="font-semibold">{d.type === 'honorable' ? '🏅' : d.type === 'infame' ? '🗡️' : '📜'} {d.title}</div>
                  <div className="text-muted-foreground">{d.description}</div>
                </div>
              ))}
              {/* Acciones rápidas de hazaña (demo Fase 1) */}
              <div className="pt-2 grid grid-cols-2 gap-1">
                <Button size="sm" variant="outline" onClick={() => quickDeed('donarTemplo')}>⛪ Donar al templo</Button>
                <Button size="sm" variant="outline" onClick={() => quickDeed('comercioJusto')}>🤝 Comercio justo</Button>
                <Button size="sm" variant="outline" onClick={() => quickDeed('construirCaminos')}>🛤️ Construir caminos</Button>
                <Button size="sm" variant="destructive" onClick={() => quickDeed('subirImpuestos')}>💸 Subir impuestos</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================= COLUMNA CENTRAL ================= */}
        <div className="space-y-4">
          {/* Atributos */}
          <Card className="parchment-panel">
            <CardHeader>
              <CardTitle>Atributos</CardTitle>
              <CardDescription>{cls.icon} {cls.name} · stats principales marcadas ⭐</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {Object.entries(character.stats).map(([k, v]) => {
                const primary = cls.primaryStats.includes(k as never);
                return (
                  <div key={k} className="flex justify-between border-b border-border/50 py-1">
                    <span className="capitalize text-muted-foreground">{k} {primary && '⭐'}</span>
                    <strong className={primary ? 'text-gold' : ''}>{v}</strong>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Próximo rango */}
          <Card className="parchment-panel">
            <CardHeader>
              <CardTitle>Próximo rango</CardTitle>
              <CardDescription>{rank.name} → {nextRank ? nextRank.name : 'Rango máximo alcanzado'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {nextRank ? (
                <>
                  <ul className="space-y-1 text-xs">
                    <RequirementLine label={`Nivel ${character.level}/${nextRank.requirements.level}`} ok={character.level >= nextRank.requirements.level} />
                    <RequirementLine label={`Oro ${Math.round(character.wealth.oro + character.wealth.plata / 100).toLocaleString()}/${nextRank.requirements.wealth.toLocaleString()}`} ok={character.wealth.oro + character.wealth.plata / 100 >= nextRank.requirements.wealth} />
                    <RequirementLine label={`Honor ${character.reputation.honor}/${nextRank.requirements.honor}`} ok={character.reputation.honor >= nextRank.requirements.honor} />
                    <RequirementLine label={`Tierras ${character.settlements.length}/${nextRank.requirements.lands}`} ok={character.settlements.length >= nextRank.requirements.lands} />
                    <RequirementLine label={`Influencia ${character.reputation.influence}/${nextRank.requirements.influence}`} ok={character.reputation.influence >= nextRank.requirements.influence} />
                  </ul>
                  {!promoCheck.canPromote && promoCheck.missing.length > 0 && (
                    <p className="text-xs text-muted-foreground italic">Falta: {promoCheck.missing.join(' · ')}</p>
                  )}
                  <div>
                    <div className="stat-label mb-1">Privilegios de {nextRank.name}</div>
                    <ul className="text-xs list-disc list-inside text-muted-foreground">
                      {nextRank.privileges.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                  </div>
                  <Button className="w-full" disabled={!promoCheck.canPromote} onClick={doPromote}>⚜️ Solicitar ascenso ante la corona</Button>
                </>
              ) : (
                <p className="text-xs italic text-muted-foreground">No hay título por encima del tuyo. El mundo entero te observa.</p>
              )}
            </CardContent>
          </Card>

          {/* Linaje */}
          {house && (
            <Card className="parchment-panel">
              <CardHeader><CardTitle>Tu Casa</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between"><span className="stat-label">Escudo</span><span className="text-xl">{house.coatOfArms}</span></div>
                <div className="flex justify-between"><span className="stat-label">Lema</span><em>«{house.motto}»</em></div>
                <div className="flex justify-between"><span className="stat-label">Rango más alto</span><span>{getRank(house.highestRank).name}</span></div>
                <div className="flex justify-between"><span className="stat-label">Miembros</span><span>{house.members.length}</span></div>
                <div className="flex justify-between"><span className="stat-label">Reputación</span><span>{house.reputation}</span></div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ================= COLUMNA DERECHA ================= */}
        <div className="space-y-4">
          {/* Tesoro */}
          <Card className="parchment-panel">
            <CardHeader>
              <CardTitle>Tesoro</CardTitle>
              <CardDescription>Ingreso neto estimado: <span className={totalIncome >= 0 ? 'text-green-400' : 'text-red-400'}>{totalIncome >= 0 ? '+' : ''}{totalIncome} 🪙/hora</span></CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(character.wealth).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-sm border border-border bg-black/20 px-2 py-1">
                  <span className="text-muted-foreground">{RESOURCE_ICONS[k]} {k === 'piedrapreciosa' ? 'p. preciosa' : k}</span>
                  <strong>{Math.round(v).toLocaleString()}</strong>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Dominios */}
          <Card className="parchment-panel">
            <CardHeader><CardTitle>Dominios</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {playerSettlements.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">Aún no posees tierras. La corona concede aldeas a los caballeros...</p>
              ) : (
                playerSettlements.map((s) => (
                  <div key={s.id} className="rounded-sm border border-border bg-black/20 p-2">
                    <div className="flex justify-between"><strong>{s.name}</strong><Badge variant="outline">{s.type}</Badge></div>
                    <div className="text-xs text-muted-foreground">👥 {s.population.toLocaleString()} · 🪙 {settlementNet(s)}/h · 😊 {Math.round(s.happiness)}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Crónicas recientes */}
          <Card className="parchment-panel">
            <CardHeader><CardTitle>Crónicas recientes</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {events.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">El reino duerme en calma... por ahora.</p>
              ) : (
                events.slice(-8).reverse().map((e) => (
                  <div key={e.id} className="text-xs border-l-2 border-gold/40 pl-2 animate-fade-in">
                    <div className="font-semibold">{e.title}</div>
                    <div className="text-muted-foreground">{e.description}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Acciones rápidas */}
          <Card className="parchment-panel">
            <CardHeader><CardTitle>Acciones</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-2">
              <Button variant="outline" onClick={() => onNavigate('world')}>🗺️ Ver el mundo</Button>
              <Button variant="outline" onClick={() => onNavigate('settlements')}>🏰 Gestionar territorios</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RequirementLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className={`flex items-center gap-1 ${ok ? 'text-green-400' : 'text-red-400/90'}`}>
      <span>{ok ? '✔' : '✘'}</span> {label}
    </li>
  );
}
