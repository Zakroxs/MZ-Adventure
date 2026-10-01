import { useMemo, useState } from 'react';
import type { Character, RealmId, SettlementType } from '../types/game';
import { REALMS, getRealm, settlementMeta } from '../data/realms';
import { getHousesByRealm } from '../data/nobleHouses';
import { getRank } from '../data/nobilityRanks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

interface Props {
  character: Character;
}

const TYPE_ORDER: SettlementType[] = ['capital', 'ciudad', 'villa', 'pueblo', 'aldea', 'alqueria'];

export default function WorldMap({ character }: Props) {
  const [realmId, setRealmId] = useState<RealmId>(character.realmId);
  const realm = getRealm(realmId);
  const isOwnRealm = realmId === character.realmId;

  const allSettlements = useMemo(() => {
    return [
      realm.capital,
      ...realm.duchies.flatMap((d) => d.settlements),
      ...realm.counties.flatMap((c) => c.settlements),
      ...realm.marches.flatMap((m) => m.settlements),
    ];
  }, [realm]);

  const statsByType = useMemo(() => {
    const map = new Map<SettlementType, { count: number; pop: number; income: number }>();
    for (const s of allSettlements) {
      const cur = map.get(s.type) ?? { count: 0, pop: 0, income: 0 };
      cur.count++;
      cur.pop += s.population;
      cur.income += s.income;
      map.set(s.type, cur);
    }
    return map;
  }, [allSettlements]);

  const houses = getHousesByRealm(realmId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-fade-in">
      <header className="text-center mb-4">
        <h1 className="text-3xl text-gold-gradient font-display">Mapa del Mundo</h1>
        <p className="text-sm text-muted-foreground mt-1 italic">
          {!isOwnRealm && `Estás en tierra extranjera. Tu juramento a ${getRealm(character.realmId).name} te observa. `}
          «{realm.motto}»
        </p>
        <div className="ornament my-3" />
        {/* Selector de reino */}
        <div className="flex justify-center gap-2 flex-wrap">
          {REALMS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRealmId(r.id)}
              className={`px-3 py-1 rounded-sm border text-sm font-body transition-all ${
                realmId === r.id ? 'shadow-gold ring-1' : 'opacity-70 hover:opacity-100 border-border'
              }`}
              style={{ borderColor: r.accent, color: r.id === character.realmId ? r.accent : undefined }}
            >
              {r.name}{r.id === character.realmId ? ' 🏠' : ''}
            </button>
          ))}
        </div>
      </header>

      {/* Resumen del reino */}
      <Card className="parchment-panel mb-4">
        <CardContent className="pt-4 grid gap-3 md:grid-cols-4 text-sm">
          <div><span className="stat-label block">Soberano</span>👑 {realm.kingName} <em className="text-muted-foreground">(Casa {realm.royalHouse})</em></div>
          <div><span className="stat-label block">Capital</span>🏰 {realm.capital.name} — 👥 {realm.capital.population.toLocaleString()}</div>
          <div><span className="stat-label block">Asentamientos</span>{realm.totalSettlements} total · {realm.totalCities} ciudades</div>
          <div><span className="stat-label block">Renta anual estimada</span>🪙 {(realm.capital.income + [...realm.duchies, ...realm.counties, ...realm.marches].reduce((a, t) => a + t.totalIncome, 0)).toLocaleString()}/hora</div>
        </CardContent>
      </Card>

      <Tabs defaultValue="territorial">
        <TabsList>
          <TabsTrigger value="territorial">División Territorial</TabsTrigger>
          <TabsTrigger value="feudal">División Feudal</TabsTrigger>
          <TabsTrigger value="casas">Casas Nobiliarias</TabsTrigger>
        </TabsList>

        {/* ---------------- TAB 1: TERRITORIAL ---------------- */}
        <TabsContent value="territorial">
          <Card className="parchment-panel mb-4">
            <CardHeader><CardTitle>Estadísticas por tipo de asentamiento</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              {TYPE_ORDER.map((t) => {
                const st = statsByType.get(t);
                const meta = settlementMeta(t);
                return (
                  <div key={t} className="rounded-sm border border-border bg-black/20 p-2 text-center">
                    <div className="text-lg">{meta.icon}</div>
                    <div className="font-semibold">{meta.label}</div>
                    <div className="text-muted-foreground">{st?.count ?? 0} lugares</div>
                    <div className="text-muted-foreground">👥 {((st?.pop ?? 0) / 1000).toFixed(0)}k</div>
                    <div className="text-muted-foreground">🪙 {st?.income ?? 0}/h</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Capital destacada */}
          <Card className="parchment-panel mb-4 border-gold/50">
            <CardHeader>
              <CardTitle>👑 Capital: {realm.capital.name}</CardTitle>
              <CardDescription>{realm.capital.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <SettlementStat label="Nivel" value={realm.capital.level} />
              <SettlementStat label="Murallas" value={realm.capital.walls} />
              <SettlementStat label="Población" value={realm.capital.population.toLocaleString()} />
              <SettlementStat label="Ingresos" value={`${realm.capital.income} 🪙/h`} />
            </CardContent>
          </Card>

          <Card className="parchment-panel">
            <CardHeader><CardTitle>Todos los asentamientos</CardTitle></CardHeader>
            <CardContent className="max-h-[480px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-xs">
                <thead className="text-left stat-label sticky top-0 bg-card">
                  <tr><th className="py-1 pr-2">Asentamiento</th><th className="pr-2">Tipo</th><th className="pr-2">Nivel</th><th className="pr-2">Población</th><th className="pr-2">Murallas</th><th className="pr-2">Estabilidad</th><th className="pr-2">Felicidad</th><th>Ingresos</th></tr>
                </thead>
                <tbody>
                  {allSettlements.map((s) => (
                    <tr key={s.id} className="border-t border-border/40 hover:bg-gold/5">
                      <td className="py-1 pr-2 font-semibold">{settlementMeta(s.type).icon} {s.name}</td>
                      <td className="pr-2 capitalize text-muted-foreground">{s.type}</td>
                      <td className="pr-2">{s.level}</td>
                      <td className="pr-2">{s.population.toLocaleString()}</td>
                      <td className="pr-2">{s.walls}</td>
                      <td className="pr-2">{Math.round(s.stability)}</td>
                      <td className="pr-2">{Math.round(s.happiness)}</td>
                      <td>{s.income} 🪙</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- TAB 2: FEUDAL ---------------- */}
        <TabsContent value="feudal">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: '🏰 Ducados', list: realm.duchies },
              { title: '🛡️ Condados', list: realm.counties },
              { title: '⚔️ Marcas fronterizas', list: realm.marches },
            ].map((group) => (
              <Card key={group.title} className="parchment-panel">
                <CardHeader><CardTitle>{group.title}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {group.list.map((t) => (
                    <div key={t.id} className="rounded-sm border border-border bg-black/20 p-3 text-sm">
                      <div className="flex justify-between items-center">
                        <strong className="text-gold-gradient font-display">{t.name}</strong>
                        <Badge variant="outline">{t.rulerTitle}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        👥 {t.totalPopulation.toLocaleString()} habitantes · 🪙 {t.totalIncome}/hora · {t.settlements.length} asentamientos
                      </div>
                      <div className="text-xs mt-2 flex flex-wrap gap-1">
                        {t.settlements.map((s) => (
                          <span key={s.id} className="rounded-sm border border-border/60 px-1.5 py-0.5">
                            {settlementMeta(s.type).icon} {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ---------------- TAB 3: CASAS NOBILIARIAS ---------------- */}
        <TabsContent value="casas">
          <Card className="parchment-panel">
            <CardHeader>
              <CardTitle>Casas Nobiliarias de {realm.name}</CardTitle>
              <CardDescription>{houses.length} casas registradas en el reino</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {houses.map((h) => (
                <div key={h.id} className="rounded-md border p-3 text-sm" style={{ borderColor: h.color }}>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg" style={{ color: h.color }}>
                      {h.coatOfArms} Casa {h.surname}
                    </span>
                    {h.isRoyal && <Badge variant="gold">👑 Real</Badge>}
                  </div>
                  <em className="text-xs text-muted-foreground block mt-1">«{h.motto}»</em>
                  <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                    <span>Rango más alto: <strong>{getRank(h.highestRank).name}</strong></span>
                    <span>Miembros: <strong>{h.members.length}</strong></span>
                    <span>Reputación: <strong>{h.reputation.toLocaleString()}</strong></span>
                    <span>Riqueza: <strong>{h.wealth.toLocaleString()} 🪙</strong></span>
                  </div>
                  {h.members.includes(character.id) && <div className="text-xs text-gold mt-1">⚜️ Tu casa</div>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettlementStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-sm border border-border bg-black/20 p-2 text-center">
      <div className="stat-label">{label}</div>
      <div className="font-display text-lg text-gold">{value}</div>
    </div>
  );
}
