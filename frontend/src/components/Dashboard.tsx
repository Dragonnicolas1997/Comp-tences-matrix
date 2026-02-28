import React, { useMemo, useState } from 'react';
import { Consultant } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { motion } from 'motion/react';
import {
  Users, TrendingUp, Layers, Brain, Building2, Code2, Briefcase, Clock,
} from 'lucide-react';

interface DashboardProps {
  consultants: Consultant[];
  isRealCompany: (name: string) => boolean;
}

// ─── Color palette helpers ───────────────────────────────────────
const BLUE   = '#3b82f6';
const INDIGO = '#6366f1';
const VIOLET = '#8b5cf6';
const EMERALD = '#10b981';
const AMBER  = '#f59e0b';

// Dot intensity classes for heatmap (Tailwind only)
const DOT_CLASSES = [
  'bg-slate-200 dark:bg-slate-700',
  'bg-blue-200 dark:bg-blue-800',
  'bg-blue-300 dark:bg-blue-700',
  'bg-blue-400 dark:bg-blue-600',
  'bg-blue-500 dark:bg-blue-500',
  'bg-blue-600 dark:bg-blue-400',
  'bg-blue-700 dark:bg-blue-300',
];

function dotClass(value: number, max: number): string {
  if (max === 0 || value === 0) return DOT_CLASSES[0];
  const idx = Math.min(Math.round((value / max) * (DOT_CLASSES.length - 1)), DOT_CLASSES.length - 1);
  return DOT_CLASSES[idx];
}

// ─── Reusable tiny card ──────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, delay }: {
  icon: React.ElementType; label: string; value: string | number; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4"
    >
      <div className="w-11 h-11 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
        <Icon size={22} className="text-primary dark:text-blue-400" />
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </motion.div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────
function Section({ title, icon: Icon, delay, children }: {
  title: string; icon: React.ElementType; delay: number; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6"
    >
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white mb-4">
        <Icon size={16} className="text-primary dark:text-blue-400" />
        {title}
      </h3>
      {children}
    </motion.div>
  );
}

// ─── Custom Recharts tooltip ─────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-slate-900 dark:text-white">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-slate-600 dark:text-slate-300">
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function SkillTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-slate-900 dark:text-white">{label}</p>
      <p className="text-slate-600 dark:text-slate-300">Consultants: <span className="font-semibold">{d?.count}</span></p>
      {d?.avgLevel != null && (
        <p className="text-slate-600 dark:text-slate-300">Niveau moyen: <span className="font-semibold">{d.avgLevel.toFixed(1)}/5</span></p>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════
export const Dashboard: React.FC<DashboardProps> = ({ consultants, isRealCompany }) => {

  // ── KPIs ─────────────────────────────────────────────────────
  const totalConsultants = consultants.length;

  const avgExperience = useMemo(() => {
    const withExp = consultants.filter(c => c.years_experience != null);
    if (withExp.length === 0) return 0;
    return +(withExp.reduce((s, c) => s + (c.years_experience ?? 0), 0) / withExp.length).toFixed(1);
  }, [consultants]);

  const distinctSectors = useMemo(() => {
    const set = new Set<string>();
    consultants.forEach(c => c.sectors.forEach(s => set.add(s.name.toLowerCase())));
    return set.size;
  }, [consultants]);

  const distinctSkills = useMemo(() => {
    const set = new Set<string>();
    consultants.forEach(c => {
      c.skills_technical.forEach(s => set.add(s.name.toLowerCase()));
      c.skills_functional.forEach(s => set.add(s.name.toLowerCase()));
    });
    return set.size;
  }, [consultants]);

  // ── Sectors bar chart ────────────────────────────────────────
  const sectorData = useMemo(() => {
    const map = new Map<string, number>();
    consultants.forEach(c => c.sectors.forEach(s => {
      const key = s.name;
      map.set(key, (map.get(key) ?? 0) + 1);
    }));
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }));
  }, [consultants]);

  // ── Experience distribution ──────────────────────────────────
  const expData = useMemo(() => {
    const buckets = [
      { name: '0-3 ans', min: 0, max: 3, count: 0 },
      { name: '3-5 ans', min: 3, max: 5, count: 0 },
      { name: '5-8 ans', min: 5, max: 8, count: 0 },
      { name: '8-12 ans', min: 8, max: 12, count: 0 },
      { name: '12+ ans', min: 12, max: Infinity, count: 0 },
    ];
    consultants.forEach(c => {
      const y = c.years_experience ?? 0;
      const b = buckets.find(b => y >= b.min && y < b.max) ?? buckets[buckets.length - 1];
      b.count++;
    });
    return buckets.map(({ name, count }) => ({ name, count }));
  }, [consultants]);

  const EXP_COLORS = [BLUE, INDIGO, VIOLET, EMERALD, AMBER];

  // ── Technical skills ─────────────────────────────────────────
  const techSkillData = useMemo(() => {
    const map = new Map<string, { count: number; totalLevel: number }>();
    consultants.forEach(c => c.skills_technical.forEach(s => {
      const key = s.name;
      const cur = map.get(key) ?? { count: 0, totalLevel: 0 };
      cur.count++;
      cur.totalLevel += s.level;
      map.set(key, cur);
    }));
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 12)
      .map(([name, { count, totalLevel }]) => ({ name, count, avgLevel: totalLevel / count }));
  }, [consultants]);

  // ── Functional skills ────────────────────────────────────────
  const funcSkillData = useMemo(() => {
    const map = new Map<string, { count: number; totalLevel: number }>();
    consultants.forEach(c => c.skills_functional.forEach(s => {
      const key = s.name;
      const cur = map.get(key) ?? { count: 0, totalLevel: 0 };
      cur.count++;
      cur.totalLevel += s.level;
      map.set(key, cur);
    }));
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 12)
      .map(([name, { count, totalLevel }]) => ({ name, count, avgLevel: totalLevel / count }));
  }, [consultants]);

  // ── Top companies ────────────────────────────────────────────
  const companyData = useMemo(() => {
    const map = new Map<string, number>();
    consultants.forEach(c => c.missions.forEach(m => {
      if (m.client && isRealCompany(m.client)) {
        const key = m.client;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }));
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({ name, count }));
  }, [consultants, isRealCompany]);

  // ── Heatmap: ALL sectors × ALL skills ───────────────────────
  const topHeatSectors = useMemo(() => {
    const map = new Map<string, number>();
    consultants.forEach(c => c.sectors.forEach(s => {
      map.set(s.name, (map.get(s.name) ?? 0) + 1);
    }));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [consultants]);

  const topHeatSkills = useMemo(() => {
    const map = new Map<string, number>();
    consultants.forEach(c => {
      c.skills_technical.forEach(s => {
        map.set(s.name, (map.get(s.name) ?? 0) + 1);
      });
      c.skills_functional.forEach(s => {
        map.set(s.name, (map.get(s.name) ?? 0) + 1);
      });
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [consultants]);

  const heatmapData = useMemo(() => {
    // Build a set of (sector, skill) → count
    const map = new Map<string, number>();
    const sectorSet = new Set(topHeatSectors.map(s => s.toLowerCase()));
    const skillSet  = new Set(topHeatSkills.map(s => s.toLowerCase()));

    consultants.forEach(c => {
      const cSectors = c.sectors.map(s => s.name).filter(s => sectorSet.has(s.toLowerCase()));
      const cSkills  = [
        ...c.skills_technical.map(s => s.name),
        ...c.skills_functional.map(s => s.name),
      ].filter(s => skillSet.has(s.toLowerCase()));
      for (const sec of cSectors) {
        for (const sk of cSkills) {
          const key = `${sec.toLowerCase()}||${sk.toLowerCase()}`;
          map.set(key, (map.get(key) ?? 0) + 1);
        }
      }
    });

    let maxVal = 0;
    map.forEach(v => { if (v > maxVal) maxVal = v; });

    return { map, maxVal };
  }, [consultants, topHeatSectors, topHeatSkills]);

  const [hoveredCell, setHoveredCell] = useState<{ sector: string; skill: string; count: number } | null>(null);

  // ── Empty state ──────────────────────────────────────────────
  if (consultants.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-32 text-center"
      >
        <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
          <Users size={40} className="text-primary/40" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
          Aucune donnée disponible
        </h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium">
          Importez des CVs pour voir les analytics de votre vivier de consultants.
        </p>
      </motion.div>
    );
  }

  // ── Chart tick style helper ──────────────────────────────────
  const tickStyle = { fill: '#64748b', fontSize: 11 };

  return (
    <div className="space-y-6">
      {/* Title */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight text-center">
          Dashboard Analytics
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
          Vue d'ensemble de votre vivier de {totalConsultants} consultants
        </p>
      </motion.div>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users}      label="Consultants"       value={totalConsultants} delay={0.05} />
        <KpiCard icon={Clock}      label="Exp. moyenne"      value={`${avgExperience} ans`} delay={0.1} />
        <KpiCard icon={Layers}     label="Secteurs"          value={distinctSectors}  delay={0.15} />
        <KpiCard icon={Brain}      label="Compétences"       value={distinctSkills}   delay={0.2} />
      </div>

      {/* ── Row 1: Sectors + Experience ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sectors */}
        <Section title="Répartition par Secteur" icon={Briefcase} delay={0.25}>
          <div className="space-y-2.5">
            {sectorData.map((d, i) => {
              const pct = sectorData[0].count > 0 ? (d.count / sectorData[0].count) * 100 : 0;
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs font-medium text-slate-700 dark:text-slate-300 text-right truncate" title={d.name}>
                    {d.name}
                  </span>
                  <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.04 * i, ease: 'easeOut' }}
                      className="h-full rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-end pr-2"
                      style={{ minWidth: d.count > 0 ? '2rem' : 0 }}
                    >
                      <span className="text-[10px] font-bold text-white dark:text-slate-900">{d.count}</span>
                    </motion.div>
                  </div>
                  <span className="w-20 text-xs text-slate-500 dark:text-slate-400">
                    {d.count} consultant{d.count !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Experience distribution */}
        <Section title="Distribution de l'Expérience" icon={TrendingUp} delay={0.3}>
          <div className="space-y-2.5">
            {expData.map((d, i) => {
              const maxCount = Math.max(...expData.map(e => e.count));
              const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
              const colors = [
                'bg-blue-500 dark:bg-blue-400',
                'bg-indigo-500 dark:bg-indigo-400',
                'bg-violet-500 dark:bg-violet-400',
                'bg-emerald-500 dark:bg-emerald-400',
                'bg-amber-500 dark:bg-amber-400',
              ];
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                    {d.name}
                  </span>
                  <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.06 * i, ease: 'easeOut' }}
                      className={`h-full rounded-full flex items-center justify-end pr-2 ${colors[i % colors.length]}`}
                      style={{ minWidth: d.count > 0 ? '2rem' : 0 }}
                    >
                      <span className="text-[10px] font-bold text-white dark:text-slate-900">{d.count}</span>
                    </motion.div>
                  </div>
                  <span className="w-20 text-xs text-slate-500 dark:text-slate-400">
                    {d.count} consultant{d.count !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* ── Row 2: Tech skills + Functional skills ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technical */}
        <Section title="Top Compétences Techniques" icon={Code2} delay={0.35}>
          <div className="space-y-2.5">
            {techSkillData.map((d, i) => {
              const pct = techSkillData[0].count > 0 ? (d.count / techSkillData[0].count) * 100 : 0;
              return (
                <div key={d.name} className="group flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs font-medium text-slate-700 dark:text-slate-300 text-right truncate" title={d.name}>
                    {d.name}
                  </span>
                  <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.05 * i, ease: 'easeOut' }}
                      className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400 flex items-center justify-end pr-2"
                      style={{ minWidth: d.count > 0 ? '2rem' : 0 }}
                    >
                      <span className="text-[10px] font-bold text-white dark:text-slate-900">{d.count}</span>
                    </motion.div>
                  </div>
                  <span className="w-20 text-[10px] text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    Niv. {d.avgLevel.toFixed(1)}/5
                  </span>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Functional */}
        <Section title="Top Compétences Fonctionnelles" icon={Brain} delay={0.4}>
          <div className="space-y-2.5">
            {funcSkillData.map((d, i) => {
              const pct = funcSkillData[0].count > 0 ? (d.count / funcSkillData[0].count) * 100 : 0;
              return (
                <div key={d.name} className="group flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs font-medium text-slate-700 dark:text-slate-300 text-right truncate" title={d.name}>
                    {d.name}
                  </span>
                  <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.05 * i, ease: 'easeOut' }}
                      className="h-full rounded-full bg-violet-500 dark:bg-violet-400 flex items-center justify-end pr-2"
                      style={{ minWidth: d.count > 0 ? '2rem' : 0 }}
                    >
                      <span className="text-[10px] font-bold text-white dark:text-slate-900">{d.count}</span>
                    </motion.div>
                  </div>
                  <span className="w-20 text-[10px] text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    Niv. {d.avgLevel.toFixed(1)}/5
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* ── Heatmap: Sectors × Skills ─────────────────────────── */}
      <Section title="Matrice Secteurs × Compétences" icon={Layers} delay={0.45}>
        {topHeatSectors.length > 0 && topHeatSkills.length > 0 ? (
          <div className="overflow-x-auto pb-2">
            {/* Legend */}
            <div className="flex items-center gap-2 mb-4 text-xs text-slate-500 dark:text-slate-400">
              <span>Faible</span>
              <div className="flex items-center gap-1">
                {DOT_CLASSES.map((cls, i) => (
                  <div key={i} className={`w-2.5 h-2.5 rounded-full ${cls}`} />
                ))}
              </div>
              <span>Fort</span>
              <span className="ml-2 text-slate-400 dark:text-slate-500">({topHeatSkills.length} compétences × {topHeatSectors.length} secteurs)</span>
            </div>

            {/* Table layout — sticky first column, scroll horizontal */}
            <div className="overflow-x-auto pb-2">
              <table className="border-collapse" style={{ borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 z-[2] bg-white dark:bg-slate-900" />
                    {topHeatSkills.map(skill => (
                      <th key={skill} className="p-0 w-5 min-w-5" title={skill}>
                        <div className="relative h-24 w-5">
                          <span
                            className="absolute bottom-0 left-1 text-[7px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap"
                            style={{ transformOrigin: '0% 100%', transform: 'rotate(-65deg)' }}
                          >
                            {skill}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topHeatSectors.map(sector => (
                    <tr key={sector}>
                      <td
                        className="sticky left-0 z-[1] bg-white dark:bg-slate-900 text-[10px] font-semibold text-slate-700 dark:text-slate-300 text-right pr-3 whitespace-nowrap"
                        title={sector}
                      >
                        {sector}
                      </td>
                      {topHeatSkills.map(skill => {
                        const key = `${sector.toLowerCase()}||${skill.toLowerCase()}`;
                        const count = heatmapData.map.get(key) ?? 0;
                        return (
                          <td key={key} className="p-0">
                            <div
                              className="w-5 h-5 flex items-center justify-center relative cursor-default"
                              onMouseEnter={() => setHoveredCell({ sector, skill, count })}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              <div className={`w-2.5 h-2.5 rounded-full transition-transform hover:scale-[2] ${dotClass(count, heatmapData.maxVal)}`} />
                              {hoveredCell?.sector === sector && hoveredCell?.skill === skill && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-xs whitespace-nowrap pointer-events-none">
                                  <p className="font-bold text-slate-900 dark:text-white">{sector} + {skill}</p>
                                  <p className="text-slate-600 dark:text-slate-300">{count} consultant{count !== 1 ? 's' : ''}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
            Pas assez de données pour générer la matrice.
          </p>
        )}
      </Section>

      {/* ── Top Companies ─────────────────────────────────────── */}
      <Section title="Top Entreprises / Clients" icon={Building2} delay={0.5}>
        {companyData.length > 0 ? (
          <div className="space-y-2.5">
            {companyData.map((d, i) => {
              const pct = companyData[0].count > 0 ? (d.count / companyData[0].count) * 100 : 0;
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-xs font-medium text-slate-700 dark:text-slate-300 text-right truncate" title={d.name}>
                    {d.name}
                  </span>
                  <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.05 * i, ease: 'easeOut' }}
                      className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 flex items-center justify-end pr-2"
                      style={{ minWidth: d.count > 0 ? '2rem' : 0 }}
                    >
                      <span className="text-[10px] font-bold text-white dark:text-slate-900">{d.count}</span>
                    </motion.div>
                  </div>
                  <span className="w-16 text-xs text-slate-500 dark:text-slate-400">
                    {d.count} mission{d.count !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
            Aucune entreprise identifiée.
          </p>
        )}
      </Section>
    </div>
  );
};
