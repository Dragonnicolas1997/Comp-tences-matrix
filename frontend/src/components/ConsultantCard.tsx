import React, { useContext, useMemo } from 'react';
import { Consultant, Mission } from '../types';
import { ChevronRight, MapPin, Clock, Briefcase } from 'lucide-react';
import { SkillGauge } from './SkillGauge';
import { motion } from 'motion/react';
import { SearchContext } from '../App';

/** Fix mojibake: UTF-8 text decoded as Windows-1252 (e.g. "SantÃ©" → "Santé") */
function fixMojibake(text: string): string {
  try {
    // Map cp1252-specific chars (128-159 range) back to their byte values
    const cp1252Extras: Record<number, number> = {
      8364:0x80,8218:0x82,402:0x83,8222:0x84,8230:0x85,8224:0x86,
      8225:0x87,710:0x88,8240:0x89,352:0x8A,8249:0x8B,338:0x8C,
      381:0x8E,8216:0x91,8217:0x92,8220:0x93,8221:0x94,8226:0x95,
      8211:0x96,8212:0x97,732:0x98,8482:0x99,353:0x9A,8250:0x9B,
      339:0x9C,382:0x9E,376:0x9F
    };
    const bytes = new Uint8Array([...text].map(c => {
      const code = c.charCodeAt(0);
      if (code <= 255) return code;
      return cp1252Extras[code] ?? (code & 0xFF);
    }));
    // fatal: true ensures we throw (and return original) if text is already valid UTF-8
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return text;
  }
}

interface ConsultantCardProps {
  consultant: Consultant;
  onClick: (id: string) => void;
  activeFilterSkills?: string[];
  activeFilterSectors?: string[];
  activeFilterCompanies?: string[];
}

export const ConsultantCard: React.FC<ConsultantCardProps> = ({ consultant, onClick, activeFilterSkills = [], activeFilterSectors = [], activeFilterCompanies = [] }) => {
  const { searchQuery } = useContext(SearchContext);
  const searchWords = searchQuery.trim().length >= 2
    ? searchQuery.toLowerCase().trim().split(/\s+/)
    : [];

  // Find missions relevant to the active sector filters
  const relevantMissions = useMemo((): Mission[] => {
    if (activeFilterSectors.length === 0) return [];
    const matched: Mission[] = [];
    // Keywords related to each sector (to match missions more precisely)
    const sectorKeywords: Record<string, string[]> = {
      'aérospatial': ['aéro', 'aero', 'aviation', 'aéroport', 'aeroport', 'spatial', 'airbus', 'boeing', 'safran', 'thales', 'dassault', 'adp'],
      'transport': ['transport', 'logistique', 'mobilité', 'sncf', 'ratp', 'ferroviaire', 'maritime', 'postal', 'fret'],
      'énergie': ['énergie', 'energie', 'energy', 'edf', 'engie', 'total', 'nucléaire', 'renouvelable', 'pétrole', 'gaz', 'hyara'],
      'industrie': ['industri', 'manufactur', 'usine', 'production'],
      'banque': ['banque', 'bancaire', 'bank', 'crédit', 'bnp', 'société générale', 'caisse'],
      'assurance': ['assurance', 'assuran', 'mutuelle', 'prévoyance', 'axa', 'allianz'],
      'santé': ['santé', 'sante', 'pharma', 'médical', 'medical', 'hôpital', 'hopital', 'clinique', 'sanofi'],
      'tech': ['tech', 'digital', 'numérique', 'logiciel', 'software', 'saas', 'startup', 'plateforme data', 'ia'],
      'retail': ['retail', 'commerce', 'distribution', 'magasin', 'e-commerce', 'marketplace', 'swapstore'],
      'telecom': ['télécom', 'telecom', 'téléphon', 'telephon', 'opérateur téléphon', 'orange', 'sfr', 'bouygues tel', 'free mobile'],
      'télécommunications': ['télécom', 'telecom', 'téléphon', 'telephon', 'opérateur téléphon', 'orange', 'sfr', 'bouygues tel', 'free mobile'],
      'luxe': ['luxe', 'beauté', 'cosmétique', 'mode', 'fashion', 'lvmh', 'kering', 'hermès', 'loréal', "l'oréal"],
      'beauté': ['beauté', 'beauty', 'cosmétique', 'loréal', "l'oréal", 'sephora'],
      'hôtellerie': ['hôtel', 'hotel', 'hospitali', 'tourisme', 'restauration', 'accor'],
      'média': ['média', 'media', 'presse', 'édition', 'audiovisuel', 'journal', 'tv', 'radio'],
      'conseil': ['conseil', 'consult', 'cabinet'],
      'finance': ['financ', 'invest', 'bourse', 'trading', 'asset', 'gestion actif'],
      'immobilier': ['immobilier', 'real estate', 'foncier', 'promotion'],
      'automobile': ['auto', 'véhicul', 'vehicul', 'renault', 'peugeot', 'stellantis', 'toyota'],
      'agroalimentaire': ['aliment', 'agro', 'food', 'nestlé', 'danone'],
      'défense': ['défense', 'defense', 'militaire', 'armée', 'naval'],
      'secteur public': ['public', 'état', 'etat', 'gouvern', 'ministère', 'administration', 'européen', 'européenne'],
      'services postaux': ['postal', 'poste', 'courrier', 'colis', 'la poste'],
    };

    // Collect all keywords for the active sector filters
    const allKeywords: string[] = [];
    for (const fs of activeFilterSectors) {
      const fsLower = fs.toLowerCase();
      allKeywords.push(fsLower);
      // Add all matching keyword lists
      for (const [key, kws] of Object.entries(sectorKeywords)) {
        if (fsLower.includes(key) || key.includes(fsLower)) {
          allKeywords.push(...kws);
        }
      }
    }

    for (const m of consultant.missions) {
      const parts = [m.sector || '', m.client || '', m.context || '', ...(m.technologies || [])];
      const missionText = parts.join(' ').toLowerCase();

      if (allKeywords.some(kw => missionText.includes(kw))) {
        matched.push(m);
      }
    }
    return matched;
  }, [consultant.missions, activeFilterSectors]);

  // Find missions matching the active company filters
  const companyMissions = useMemo((): Mission[] => {
    if (activeFilterCompanies.length === 0) return [];
    return consultant.missions.filter(m =>
      m.client && activeFilterCompanies.some(fc =>
        m.client.toLowerCase().includes(fc.toLowerCase()) || fc.toLowerCase().includes(m.client.toLowerCase())
      )
    );
  }, [consultant.missions, activeFilterCompanies]);

  const showCompanyMissions = activeFilterCompanies.length > 0 && companyMissions.length > 0;

  // Check if a skill is relevant to the current search/filters/sectors
  const isRelevantSkill = (skillName: string): boolean => {
    const lower = skillName.toLowerCase();
    if (searchWords.some(w => lower.includes(w))) return true;
    if (activeFilterSkills.some(f => lower.includes(f.toLowerCase()) || f.toLowerCase().includes(lower))) return true;
    // Match skills used in relevant missions (sector or company)
    for (const m of [...relevantMissions, ...companyMissions]) {
      if (m.technologies.some(t => lower.includes(t.toLowerCase()) || t.toLowerCase().includes(lower))) return true;
    }
    return false;
  };

  // Sort skills: matching ones first, then by level
  const allSkills = [...consultant.skills_technical, ...consultant.skills_functional];
  const hasActiveQuery = searchWords.length > 0 || activeFilterSkills.length > 0 || activeFilterSectors.length > 0 || activeFilterCompanies.length > 0;
  const sortedSkills = hasActiveQuery
    ? [...allSkills].sort((a, b) => {
        const aMatch = isRelevantSkill(a.name) ? 1 : 0;
        const bMatch = isRelevantSkill(b.name) ? 1 : 0;
        if (bMatch !== aMatch) return bMatch - aMatch;
        return b.level - a.level;
      })
    : consultant.skills_technical;

  // Show sector-relevant missions or default skills
  const showMissions = activeFilterSectors.length > 0 && relevantMissions.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full cursor-pointer transition-shadow hover:shadow-lg"
      onClick={() => onClick(consultant.id)}
    >
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white leading-tight">
              {consultant.first_name} {consultant.last_name}
            </h3>
            {consultant.title && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{consultant.title}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-slate-500 dark:text-slate-400">
          {consultant.years_experience && (
            <div className="flex items-center gap-1">
              <Clock size={12} className="text-primary" />
              <span className="font-medium">{consultant.years_experience} ans</span>
            </div>
          )}
          {consultant.location && (
            <div className="flex items-center gap-1">
              <MapPin size={12} className="text-primary" />
              <span className="font-medium">{consultant.location}</span>
            </div>
          )}
        </div>

        {/* Relevant missions when sector filter is active */}
        {showMissions && (
          <div className="space-y-2 mb-4">
            {relevantMissions.slice(0, 2).map((m, i) => (
              <div key={i} className="flex items-start gap-2">
                <Briefcase size={14} className="text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{m.client}</p>
                  {m.role && <p className="text-[11px] text-primary font-medium">{m.role}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Relevant missions when company filter is active */}
        {showCompanyMissions && (
          <div className="space-y-2 mb-4">
            {companyMissions.slice(0, 2).map((m, i) => (
              <div key={i} className="flex items-start gap-2">
                <Briefcase size={14} className="text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{m.client}</p>
                  {m.role && <p className="text-[11px] text-primary font-medium">{m.role}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sectors — highlight matching ones when sector filter is active */}
        <div className="flex flex-wrap gap-1 mb-4">
          {(activeFilterSectors.length > 0
            ? // Sort: matching sectors first
              [...consultant.sectors].sort((a, b) => {
                const aMatch = activeFilterSectors.some(fs => a.name.toLowerCase().includes(fs.toLowerCase()) || fs.toLowerCase().includes(a.name.toLowerCase())) ? 1 : 0;
                const bMatch = activeFilterSectors.some(fs => b.name.toLowerCase().includes(fs.toLowerCase()) || fs.toLowerCase().includes(b.name.toLowerCase())) ? 1 : 0;
                return bMatch - aMatch;
              })
            : consultant.sectors
          ).slice(0, 4).map((sector) => {
            const isActive = activeFilterSectors.some(fs =>
              sector.name.toLowerCase().includes(fs.toLowerCase()) || fs.toLowerCase().includes(sector.name.toLowerCase())
            );
            return (
              <span
                key={sector.name}
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {sector.name}
              </span>
            );
          })}
        </div>

        {/* Top skills */}
        <div className="space-y-3">
          {sortedSkills.slice(0, 3).map((skill) => (
            <div key={skill.name} className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <span className={isRelevantSkill(skill.name) ? 'text-primary' : ''}>
                  {skill.name}
                </span>
                <span>{skill.level}/5</span>
              </div>
              <SkillGauge level={skill.level} />
            </div>
          ))}
        </div>

        {/* Achievements from matching missions or raw text */}
        {(activeFilterSectors.length > 0 || activeFilterCompanies.length > 0) && (() => {
          // First try structured mission achievements
          const achievements = [...relevantMissions, ...companyMissions].flatMap(m => m.achievements).filter(Boolean);

          // If no structured achievements, extract relevant lines from raw CV text
          if (achievements.length === 0 && consultant.raw_text) {
            const filterTerms = [...activeFilterSectors, ...activeFilterCompanies].map(f => f.toLowerCase());
            // Fix mojibake encoding before searching
            const fixedText = fixMojibake(consultant.raw_text);
            const lines = fixedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            // Find the section related to the filter term, then grab the next descriptive lines
            let capturing = false;
            const rawAchievements: string[] = [];
            for (const line of lines) {
              const lower = line.toLowerCase();
              if (filterTerms.some(t => lower.includes(t))) {
                capturing = true;
                continue;
              }
              if (capturing) {
                // Stop at next section header (short lines with dates/durations, or year-only lines)
                if (line.length < 25 && /\d{4}|mois|jours|–|—/.test(line)) {
                  capturing = false;
                  continue;
                }
                // Keep meaningful lines (descriptions, achievements — min 30 chars)
                if (line.length > 30) {
                  rawAchievements.push(line);
                }
                if (rawAchievements.length >= 5) break;
              }
            }
            if (rawAchievements.length > 0) {
              return (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <ul className="space-y-1.5">
                    {rawAchievements.map((a, i) => (
                      <li key={i} className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight flex gap-1.5">
                        <span className="text-primary shrink-0">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
          }

          if (achievements.length === 0) return null;
          return (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <ul className="space-y-1.5">
                {achievements.map((a, i) => (
                  <li key={i} className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight flex gap-1.5">
                    <span className="text-primary shrink-0">•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}
      </div>

      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
        <div className="flex items-center gap-1 text-primary text-xs font-bold">
          Voir profil <ChevronRight size={14} />
        </div>
      </div>
    </motion.div>
  );
};
