import { useMemo, useState } from 'react';
import type { Character, ClassId, RaceId, RealmId, Resources, StatKey } from '../types/game';
import { REALMS, getRealm } from '../data/realms';
import { RACES, getRace, getStage2ForRace } from '../data/races';
import { CLASSES, getClass } from '../data/classes';
import { checkSurnameInOtherRealms, getHouseBySurname, registerHouse } from '../data/nobleHouses';
import { emptyResources } from '../lib/economy';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';

const STATS: { key: StatKey; label: string }[] = [
  { key: 'fuerza', label: 'Fuerza' },
  { key: 'destreza', label: 'Destreza' },
  { key: 'inteligencia', label: 'Inteligencia' },
  { key: 'vitalidad', label: 'Vitalidad' },
  { key: 'sabiduria', label: 'Sabiduría' },
  { key: 'carisma', label: 'Carisma' },
  { key: 'suerte', label: 'Suerte' },
  { key: 'liderazgo', label: 'Liderazgo' },
  { key: 'sigilo', label: 'Sigilo' },
  { key: 'percepcion', label: 'Percepción' },
];

const TOTAL_POINTS = 20;
const BASE_STAT = 5;

interface Props {
  onCreated: (character: Character) => void;
}

export default function CharacterCreation({ onCreated }: Props) {
  const [step, setStep] = useState(1);
  // Paso 1
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  // Paso 2
  const [realmId, setRealmId] = useState<RealmId | null>(null);
  // Paso 3
  const [raceId, setRaceId] = useState<RaceId | null>(null);
  // Paso 4
  const [classId, setClassId] = useState<ClassId | null>(null);
  // Paso 5
  const [alloc, setAlloc] = useState<Record<StatKey, number>>(
    Object.fromEntries(STATS.map((s) => [s.key, 0])) as Record<StatKey, number>,
  );
  const [sworn, setSworn] = useState(false);

  const spent = Object.values(alloc).reduce((a, b) => a + b, 0);
  const remaining = TOTAL_POINTS - spent;

  // Detección de traición / casa existente
  const betrayal = useMemo(() => {
    if (!surname.trim() || !realmId) return null;
    const other = checkSurnameInOtherRealms(surname, realmId);
    if (other.exists) return other;
    const same = getHouseBySurname(surname);
    if (same && same.realmId === realmId) return { sameHouse: same };
    return null;
  }, [surname, realmId]);

  const isBetrayalWarning = betrayal && 'exists' in betrayal && betrayal.exists;
  const isSameHouse = betrayal && 'sameHouse' in betrayal;

  const canNext = () => {
    switch (step) {
      case 1: return name.trim().length >= 2 && surname.trim().length >= 2;
      case 2: return realmId !== null;
      case 3: return raceId !== null;
      case 4: return classId !== null;
      case 5: return remaining === 0;
      case 6: return sworn;
      default: return false;
    }
  };

  const adjust = (key: StatKey, delta: number) => {
    setAlloc((prev) => {
      const cur = prev[key];
      const nextVal = cur + delta;
      if (nextVal < 0 || nextVal > 10) return prev;
      if (delta > 0 && remaining <= 0) return prev;
      return { ...prev, [key]: nextVal };
    });
  };

  const finalStats = (): Record<StatKey, number> => {
    const race = raceId ? getRace(raceId) : null;
    const out = {} as Record<StatKey, number>;
    for (const s of STATS) {
      out[s.key] = BASE_STAT + alloc[s.key] + (race?.statBonuses[s.key] ?? 0);
    }
    return out;
  };

  const createCharacter = () => {
    if (!realmId || !raceId || !classId) return;
    try {
      const playerId = `player-${Date.now().toString(36)}`;
      const house = registerHouse(surname, realmId, playerId);
      const wealth: Resources = { ...emptyResources(), oro: 100, plata: 500, cobre: 2000, alimento: 50 };
      const cls = getClass(classId);
      const race = getRace(raceId);
      const stage2 = getStage2ForRace(raceId, classId);
      const character: Character = {
        id: playerId,
        name: name.trim(),
        surname: surname.trim(),
        houseId: house.id,
        realmId,
        raceId,
        classId,
        stats: finalStats(),
        level: 1,
        loyalty: 'permanente',
        isTraitor: Boolean(isBetrayalWarning),
        rank: 'plebeyo',
        reputation: { honor: 10, infamy: isBetrayalWarning ? 25 : 0, loyalty: 50, influence: 0, relations: {}, deeds: [] },
        progress: {
          experience: 0,
          experienceToNext: 100,
          skillPoints: 1,
          abilities: [cls.ability],
          equipment: [],
          quests: [
            { id: 'q-main-1', title: 'El juramento de la corona', description: `Presentate ante la corte de ${getRealm(realmId).name} y demuestra tu valía.`, type: 'principal', status: 'en_progreso', rewards: { experience: 150, gold: 200, reputation: 10 } },
            { id: 'q-side-1', title: 'Caminos del reino', description: 'Ayuda a reparar los caminos cercanos a tu aldea natal.', type: 'secundaria', status: 'disponible', rewards: { experience: 80, gold: 120, honor: 12 } },
            { id: 'q-daily-1', title: 'Ofrenda diaria', description: 'Visita el templo local y realiza una ofrenda.', type: 'diaria', status: 'disponible', rewards: { experience: 20, honor: 5 } },
          ],
        },
        wealth,
        settlements: [],
        createdAt: Date.now(),
        lastLogin: Date.now(),
        bio: `${race.stage1.name} de la Casa ${house.surname}, ${cls.name.toLowerCase()} del reino de ${getRealm(realmId).name}. Etapa evolutiva prevista: ${stage2.name} (${stage2.bonus}).`,
      };
      onCreated(character);
    } catch (err) {
      console.error('Error creando personaje', err);
    }
  };

  const stepTitles = ['Nombre y Casa', 'Reino', 'Raza', 'Clase', 'Atributos', 'Juramento'];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 animate-fade-in">
      {/* Cabecera */}
      <header className="text-center mb-6">
        <h1 className="text-4xl text-gold-gradient font-display">Crónica de tu Linaje</h1>
        <p className="text-muted-foreground mt-2 italic">Todo héroe comienza con un nombre, una casa y un juramento.</p>
        <div className="ornament my-4" />
        {/* Indicador de pasos */}
        <div className="flex justify-center gap-2 flex-wrap">
          {stepTitles.map((t, i) => (
            <button
              key={t}
              onClick={() => i + 1 < step && setStep(i + 1)}
              className={`px-3 py-1 rounded-sm border text-xs font-body transition-colors ${
                i + 1 === step
                  ? 'border-gold bg-gold/15 text-gold'
                  : i + 1 < step
                    ? 'border-border bg-card text-foreground cursor-pointer hover:border-gold/60'
                    : 'border-border/50 text-muted-foreground'
              }`}
            >
              {i + 1}. {t}
            </button>
          ))}
        </div>
      </header>

      <Card className="parchment-panel">
        <CardContent className="pt-6">
          {/* ---------------- PASO 1: NOMBRE Y CASA ---------------- */}
          {step === 1 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h2 className="text-2xl text-gold-gradient">Paso I — Nombre y Casa</h2>
              <div>
                <label className="stat-label block mb-1">Nombre de pila</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Aldara, Torvald, Cael..." maxLength={20} />
              </div>
              <div>
                <label className="stat-label block mb-1">Apellido (fundará tu Casa Noble)</label>
                <Input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Ej. Valmont, Aurum, Maresbravo..." maxLength={20} />
                <p className="text-xs text-muted-foreground mt-1">
                  El apellido se convierte en el nombre de tu dinastía. Todos los que lo compartan serán familia.
                </p>
              </div>
              {isBetrayalWarning && (
                <div className="rounded-md border border-destructive bg-destructive/15 p-3 text-sm">
                  ⚠️ <strong>Advertencia de traición:</strong> el apellido «{surname}» ya pertenece a una casa del reino de{' '}
                  {betrayal.realmId ? getRealm(betrayal.realmId as RealmId).name : ''}. Usarlo aquí te marcará como <em>traidor</em>:
                  serás leal formalmente a otro reino, y tu linaje cargará con la infamia.
                </div>
              )}
              {isSameHouse && (
                <div className="rounded-md border border-gold/60 bg-gold/10 p-3 text-sm">
                  🏰 El apellido «{surname}» ya existe en este reino: <strong>te unirás a la Casa {betrayal.sameHouse.surname}</strong>{' '}
                  ({betrayal.sameHouse.coatOfArms} «{betrayal.sameHouse.motto}»). Heredarás su escudo y su honor.
                </div>
              )}
              {!betrayal && surname.trim().length >= 2 && realmId === null && (
                <p className="text-xs text-muted-foreground italic">Elige un reino en el siguiente paso para comprobar si tu apellido está libre.</p>
              )}
            </div>
          )}

          {/* ---------------- PASO 2: REINO ---------------- */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl text-gold-gradient">Paso II — Reino</h2>
              <p className="text-sm text-muted-foreground italic">
                ⚔️ El juramento de lealtad es <strong>permanente</strong>. No podrás cambiar de reino sin ser declarado traidor.
              </p>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {REALMS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRealmId(r.id)}
                    className={`parchment-panel text-left p-4 transition-all hover:shadow-lg ${
                      realmId === r.id ? 'ring-2 ring-gold shadow-gold' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ borderLeft: `3px solid ${r.accent}` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xl" style={{ color: r.accent }}>{r.name}</span>
                      {realmId === r.id && <Badge variant="gold">Elegido</Badge>}
                    </div>
                    <p className="text-xs italic text-muted-foreground mt-1">«{r.motto}»</p>
                    <p className="text-sm mt-2">{r.description}</p>
                    <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                      <span>👑 {r.kingName}</span>
                      <span>🏙️ {r.totalCities} ciudades</span>
                      <span>🛡️ {r.totalSettlements} asentamientos</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ---------------- PASO 3: RAZA ---------------- */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl text-gold-gradient">Paso III — Raza</h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {RACES.map((rc) => (
                  <button
                    key={rc.id}
                    onClick={() => setRaceId(rc.id)}
                    className={`parchment-panel text-left p-4 transition-all hover:shadow-lg ${
                      raceId === rc.id ? 'ring-2 ring-gold shadow-gold' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{rc.icon}</span>
                      <span className="font-display text-lg text-gold-gradient">{rc.name}</span>
                    </div>
                    <Badge variant="outline" className="mt-2">{rc.trait}</Badge>
                    <p className="text-sm mt-2">{rc.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Etapa I: <strong>{rc.stage1.name}</strong> · La Etapa II dependerá de tu clase.
                    </p>
                    {rc.specialNote && <p className="text-xs text-destructive mt-1">† {rc.specialNote}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ---------------- PASO 4: CLASE ---------------- */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-2xl text-gold-gradient">Paso IV — Clase</h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {CLASSES.map((cl) => (
                  <button
                    key={cl.id}
                    onClick={() => setClassId(cl.id)}
                    className={`parchment-panel text-left p-4 transition-all hover:shadow-lg ${
                      classId === cl.id ? 'ring-2 ring-gold shadow-gold' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{cl.icon}</span>
                      <div>
                        <div className="font-display text-lg text-gold-gradient">{cl.name}</div>
                        <div className="text-xs text-muted-foreground">{cl.role}</div>
                      </div>
                    </div>
                    <p className="text-xs mt-2">{cl.description}</p>
                    <div className="text-xs mt-2 text-muted-foreground">
                      Stats: <strong className="text-foreground">{cl.primaryStats.join(', ')}</strong>
                    </div>
                    <div className="text-xs mt-1">✨ {cl.ability}</div>
                    {raceId && (
                      <div className="text-[11px] mt-2 italic text-gold/90">
                        Evolución: {getStage2ForRace(raceId, cl.id).name} — {getStage2ForRace(raceId, cl.id).bonus}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ---------------- PASO 5: ATRIBUTOS ---------------- */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-2xl text-gold-gradient">Paso V — Atributos</h2>
              <div className="flex items-center justify-between max-w-xl mx-auto">
                <p className="text-sm text-muted-foreground">Cada atributo base: {BASE_STAT}. Máximo por atributo: {BASE_STAT + 10}.</p>
                <Badge variant={remaining === 0 ? 'gold' : 'destructive'}>{remaining} puntos restantes</Badge>
              </div>
              <div className="grid gap-2 md:grid-cols-2 max-w-2xl mx-auto">
                {STATS.map((s) => {
                  const primary = classId ? getClass(classId).primaryStats.includes(s.key) : false;
                  const bonus = raceId ? getRace(raceId).statBonuses[s.key] ?? 0 : 0;
                  const total = BASE_STAT + alloc[s.key] + bonus;
                  return (
                    <div key={s.key} className={`flex items-center justify-between rounded-md border p-2 ${primary ? 'border-gold/70 bg-gold/5' : 'border-border bg-black/20'}`}>
                      <span className="text-sm w-32">
                        {s.label} {primary && <span title="Stat principal de tu clase">⭐</span>}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => adjust(s.key, -1)}>−</Button>
                        <span className="w-14 text-center font-display text-lg">
                          {total}
                          {bonus > 0 && <span className="text-xs text-gold"> (+{bonus})</span>}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => adjust(s.key, 1)}>+</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Progress value={(spent / TOTAL_POINTS) * 100} className="max-w-xl mx-auto" />
            </div>
          )}

          {/* ---------------- PASO 6: JURAMENTO ---------------- */}
          {step === 6 && realmId && raceId && classId && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <h2 className="text-2xl text-gold-gradient">Paso VI — El Juramento</h2>
              <div className="parchment-panel p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="stat-label">Nombre</span><span>{name} {surname}</span></div>
                <div className="flex justify-between"><span className="stat-label">Casa</span><span>{getHouseBySurname(surname)?.coatOfArms ?? '🏰'} Casa {surname} — «{getHouseBySurname(surname)?.motto ?? 'lema pendiente'}»</span></div>
                <div className="flex justify-between"><span className="stat-label">Reino</span><span style={{ color: getRealm(realmId).accent }}>{getRealm(realmId).name}</span></div>
                <div className="flex justify-between"><span className="stat-label">Soberano</span><span>{getRealm(realmId).kingName}</span></div>
                <div className="flex justify-between"><span className="stat-label">Raza</span><span>{getRace(raceId).icon} {getRace(raceId).name}</span></div>
                <div className="flex justify-between"><span className="stat-label">Clase</span><span>{getClass(classId).icon} {getClass(classId).name} ({getClass(classId).role})</span></div>
                <div className="flex justify-between"><span className="stat-label">Evolución prevista</span><span>{getStage2ForRace(raceId, classId).name}</span></div>
                <div className="flex justify-between flex-wrap gap-1"><span className="stat-label">Atributos</span>
                  <span className="text-right">{STATS.map((s) => `${s.label.slice(0, 3)} ${finalStats()[s.key]}`).join(' · ')}</span>
                </div>
                {isBetrayalWarning && (
                  <div className="text-destructive text-xs border-t border-border pt-2">
                    ⚠️ Serás registrado como <strong>traidor</strong>: tu Casa {surname} pertenece a otro reino.
                  </div>
                )}
              </div>
              <label className="flex items-start gap-2 text-sm cursor-pointer parchment-panel p-3">
                <input type="checkbox" checked={sworn} onChange={(e) => setSworn(e.target.checked)} className="mt-1 accent-[hsl(45_65%_52%)]" />
                <span className="italic">
                  Yo, {name || '...'} de la Casa {surname || '...'}, juro ante {getRealm(realmId).kingName} lealtad <strong>permanente</strong> al reino de{' '}
                  {getRealm(realmId).name}. Mi sangre responderá por esta palabra, y mi linaje la heredará.
                </span>
              </label>
            </div>
          )}
        </CardContent>

        {/* Navegación */}
        <CardFooter className="justify-between border-t border-border pt-4">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>← Anterior</Button>
          <CardHeader className="p-0"><CardDescription>Paso {step} de 6</CardDescription></CardHeader>
          {step < 6 ? (
            <Button disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>Siguiente →</Button>
          ) : (
            <Button disabled={!canNext()} onClick={createCharacter} className="shadow-gold">⚜️ Pronunciar el juramento</Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
