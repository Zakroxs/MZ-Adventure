import { useState } from 'react';
import type { BuildingType, Character, Settlement } from '../types/game';
import { BUILDING_INFO, settlementMeta } from '../data/realms';
import { settlementIncome, settlementExpenses, settlementNet } from '../lib/economy';
import { buildingCost, checkEvolution, hasSpace, startConstruction } from '../lib/settlements';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const RESOURCE_ICONS: Record<string, string> = {
  oro: '🪙', plata: '🥈', cobre: '🥉', alimento: '🌾', madera: '🪵', piedra: '🪨', hierro: '⚙️', piedrapreciosa: '💎',
};

interface Props {
  character: Character;
  playerSettlements: Settlement[];
  onSettlementChange: (s: Settlement) => void;
}

export default function SettlementManagement({ playerSettlements, onSettlementChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(playerSettlements[0]?.id ?? null);
  const settlement = playerSettlements.find((s) => s.id === selectedId) ?? playerSettlements[0];

  if (!settlement) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center animate-fade-in">
        <h1 className="text-3xl text-gold-gradient font-display mb-4">Gestión de Territorios</h1>
        <div className="ornament my-4" />
        <p className="text-muted-foreground italic">
          🏚️ No posees tierras. La corona solo concede asentamientos a quienes demuestran su valía...
          Asciende de rango y recibe tu primera aldea como feudo.
        </p>
      </div>
    );
  }

  const meta = settlementMeta(settlement.type);
  const evoCheck = checkEvolution(settlement);

  const build = (type: BuildingType) => {
    if (!hasSpace(settlement)) return;
    const b = startConstruction(type, settlement.level);
    onSettlementChange({ ...settlement, buildings: [...settlement.buildings, b] });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 animate-fade-in">
      <header className="text-center mb-4">
        <h1 className="text-3xl text-gold-gradient font-display">Gestión de Territorios</h1>
        <div className="ornament my-3" />
      </header>

      {/* Selector de asentamiento */}
      <div className="flex gap-2 flex-wrap justify-center mb-4">
        {playerSettlements.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedId(s.id)}
            className={`px-3 py-1 rounded-sm border text-sm ${
              s.id === settlement.id ? 'border-gold bg-gold/15 text-gold shadow-gold' : 'border-border hover:border-gold/50'
            }`}
          >
            {settlementMeta(s.type).icon} {s.name}
          </button>
        ))}
      </div>

      <Card className="parchment-panel">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{meta.icon} {settlement.name}</CardTitle>
            <CardDescription>{settlement.description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="gold" className="capitalize">{meta.label} · Nivel {settlement.level}</Badge>
            {evoCheck.canEvolve && <Badge variant="outline">✨ Puede evolucionar</Badge>}
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="stats">
            <TabsList>
              <TabsTrigger value="stats">Estadísticas</TabsTrigger>
              <TabsTrigger value="buildings">Edificios</TabsTrigger>
              <TabsTrigger value="economy">Economía</TabsTrigger>
              <TabsTrigger value="resources">Recursos</TabsTrigger>
            </TabsList>

            {/* ---------- TAB ESTADÍSTICAS ---------- */}
            <TabsContent value="stats">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                <Stat label="Población" value={`${settlement.population.toLocaleString()} / ${settlement.maxPopulation.toLocaleString()}`} progress={(settlement.population / settlement.maxPopulation) * 100} />
                <Stat label="Felicidad" value={`${Math.round(settlement.happiness)}%`} progress={settlement.happiness} />
                <Stat label="Estabilidad" value={`${Math.round(settlement.stability)}%`} progress={settlement.stability} />
                <Stat label="Lealtad" value={`${Math.round(settlement.loyalty)}%`} progress={settlement.loyalty} />
                <Stat label="Murallas" value={`🧱 ${settlement.walls}/10`} progress={settlement.walls * 10} />
                <Stat label="Infraestructura" value={`${settlement.infrastructure}/10`} progress={settlement.infrastructure * 10} />
                <Stat label="Desarrollo" value={`${settlement.development}/10`} progress={settlement.development * 10} />
                <Stat label="Guarnición" value={`🎖️ ${settlement.garrison.toLocaleString()}`} />
              </div>

              {/* Evolución */}
              <div className="rounded-md border border-border bg-black/20 p-3 text-sm">
                <div className="stat-label mb-2">Evolución del asentamiento</div>
                {settlement.type === 'capital' ? (
                  <p className="text-xs italic text-muted-foreground">Este asentamiento ya es una capital.</p>
                ) : evoCheck.canEvolve ? (
                  <div className="flex items-center justify-between">
                    <span>✅ Listo para evolucionar a <strong className="capitalize">{evoCheck.next}</strong> (coste: {evoCheck.reqs?.goldCost.toLocaleString()} 🪙)</span>
                  </div>
                ) : (
                  <ul className="text-xs space-y-1">
                    {evoCheck.missing.map((m) => <li key={m} className="text-muted-foreground">✘ {m}</li>)}
                    <li className="text-muted-foreground">✘ Oro: coste {evoCheck.reqs?.goldCost.toLocaleString()} 🪙</li>
                  </ul>
                )}
              </div>
            </TabsContent>

            {/* ---------- TAB EDIFICIOS ---------- */}
            <TabsContent value="buildings">
              <div className="grid gap-2 mb-4">
                {settlement.buildings.map((b) => {
                  const info = BUILDING_INFO[b.type];
                  return (
                    <div key={b.id} className="flex items-center justify-between rounded-sm border border-border bg-black/20 p-2 text-sm">
                      <span>{info.icon} <strong>{b.name}</strong> <em className="text-xs text-muted-foreground">Nv. {b.level}/{b.maxLevel}</em></span>
                      <div className="flex items-center gap-2 text-xs">
                        {Object.entries(b.production).map(([k, v]) => (
                          <span key={k}>{RESOURCE_ICONS[k]} +{v}/h</span>
                        ))}
                        {b.isUnderConstruction ? (
                          <Badge variant="destructive">🚧 En construcción</Badge>
                        ) : (
                          <Badge variant="outline">Activo</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="stat-label mb-2">Construir nuevo edificio {hasSpace(settlement) ? '' : '(sin espacio: mejora el nivel del asentamiento)'}</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {(Object.keys(BUILDING_INFO) as BuildingType[]).map((type) => {
                  const info = BUILDING_INFO[type];
                  const cost = buildingCost(type, 0);
                  return (
                    <Button key={type} size="sm" variant="outline" disabled={!hasSpace(settlement)} onClick={() => build(type)} className="flex-col h-auto py-2">
                      <span className="text-lg">{info.icon}</span>
                      <span>{info.name}</span>
                      <span className="text-[10px] text-muted-foreground">{cost.oro} 🪙 · {info.time}h</span>
                    </Button>
                  );
                })}
              </div>
            </TabsContent>

            {/* ---------- TAB ECONOMÍA ---------- */}
            <TabsContent value="economy">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="parchment-panel p-3">
                  <div className="stat-label">Ingresos</div>
                  <div className="text-2xl font-display text-green-400">+{settlementIncome(settlement)} 🪙/h</div>
                </div>
                <div className="parchment-panel p-3">
                  <div className="stat-label">Gastos</div>
                  <div className="text-2xl font-display text-red-400">−{settlementExpenses(settlement)} 🪙/h</div>
                </div>
                <div className="parchment-panel p-3">
                  <div className="stat-label">Balance neto</div>
                  <div className={`text-2xl font-display ${settlementNet(settlement) >= 0 ? 'text-gold' : 'text-red-400'}`}>
                    {settlementNet(settlement) >= 0 ? '+' : ''}{settlementNet(settlement)} 🪙/h
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Los ingresos dependen de población, nivel, edificios, estabilidad y felicidad. Los gastos cubren guarnición, mantenimiento y población. 1 hora de juego = 1 minuto real.
              </p>
            </TabsContent>

            {/* ---------- TAB RECURSOS ---------- */}
            <TabsContent value="resources">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {Object.entries(settlement.resources).map(([k, v]) => (
                  <div key={k} className="rounded-sm border border-border bg-black/20 p-2 text-center">
                    <div className="text-lg">{RESOURCE_ICONS[k]}</div>
                    <div className="stat-label capitalize">{k === 'piedrapreciosa' ? 'Piedras preciosas' : k}</div>
                    <div className="font-display text-lg text-gold">{Math.round(v).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, progress }: { label: string; value: string; progress?: number }) {
  return (
    <div className="rounded-sm border border-border bg-black/20 p-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="stat-label">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      {progress !== undefined && <Progress value={progress} />}
    </div>
  );
}
