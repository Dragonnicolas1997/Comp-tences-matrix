import React, { useContext, useMemo } from 'react';
import { Consultant, RadarPoint } from '../types';
import {
  X,
  Mail,
  Download,
  CheckCircle2,
  Award,
  MapPin,
  Clock,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RadarChart } from './RadarChart';
import { SkillGauge } from './SkillGauge';
import { MissionTimeline } from './MissionTimeline';
import { SearchContext } from '../App';

interface ConsultantProfileProps {
  consultant: Consultant | null;
  onClose: () => void;
}

function buildRadarData(consultant: Consultant): RadarPoint[] {
  const techAvg = consultant.skills_technical.length > 0
    ? consultant.skills_technical.reduce((s, sk) => s + sk.level, 0) / consultant.skills_technical.length
    : 0;
  const funcAvg = consultant.skills_functional.length > 0
    ? consultant.skills_functional.reduce((s, sk) => s + sk.level, 0) / consultant.skills_functional.length
    : 0;
  const sectorBreadth = Math.min(consultant.sectors.length / 4, 1);
  const missionDepth = Math.min(consultant.missions.length / 6, 1);
  const softCount = Math.min(consultant.soft_skills.length / 5, 1);

  return [
    { subject: 'Technique', A: Math.round(techAvg * 30), fullMark: 150 },
    { subject: 'Fonctionnel', A: Math.round(funcAvg * 30), fullMark: 150 },
    { subject: 'Secteurs', A: Math.round(sectorBreadth * 150), fullMark: 150 },
    { subject: 'Expérience', A: Math.round(missionDepth * 150), fullMark: 150 },
    { subject: 'Soft Skills', A: Math.round(softCount * 150), fullMark: 150 },
  ];
}

export const ConsultantProfile: React.FC<ConsultantProfileProps> = ({ consultant, onClose }) => {
  const { searchQuery } = useContext(SearchContext);
  const searchWords = searchQuery.trim().length >= 2
    ? searchQuery.toLowerCase().trim().split(/\s+/)
    : [];

  const radarData = useMemo(() => consultant ? buildRadarData(consultant) : [], [consultant]);

  if (!consultant) return null;

  const fullName = `${consultant.first_name} ${consultant.last_name}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{fullName}</h2>
                </div>
                {consultant.title && (
                  <p className="text-sm font-medium text-primary mb-2">{consultant.title}</p>
                )}
                <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-2">
                  {consultant.location && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                      <MapPin size={16} className="text-primary" />
                      <span>{consultant.location}</span>
                    </div>
                  )}
                  {consultant.years_experience && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                      <Clock size={16} className="text-primary" />
                      <span>{consultant.years_experience} ans d'exp.</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                    <Mail size={16} className="text-primary" />
                    <span>{fullName.toLowerCase().replace(' ', '.')}@cabinet.com</span>
                  </div>
                </div>
                {consultant.languages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {consultant.languages.map(lang => (
                      <span key={lang} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {lang}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-colors text-slate-600 dark:text-slate-300"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Left Column */}
              <div className="lg:col-span-8 space-y-12">
                {consultant.summary && (
                  <section>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <span className="w-8 h-px bg-primary"></span>
                      Profil Professionnel
                    </h3>
                    <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">
                      "{consultant.summary}"
                    </p>
                  </section>
                )}

                <section>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <span className="w-8 h-px bg-primary"></span>
                    Expériences & Missions
                  </h3>
                  <MissionTimeline missions={consultant.missions} />
                </section>

                <section>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <span className="w-8 h-px bg-primary"></span>
                    Secteurs d'Expertise
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {consultant.sectors.map(sector => (
                      <div key={sector.name} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        {sector.name}
                        {sector.years && <span className="text-xs text-slate-400">({sector.years} ans)</span>}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Education */}
                {consultant.education.length > 0 && (
                  <section>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <span className="w-8 h-px bg-primary"></span>
                      Formation
                    </h3>
                    <div className="space-y-3">
                      {consultant.education.map((edu, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <GraduationCap size={18} className="text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white text-sm">{edu.degree}</p>
                            <p className="text-xs text-slate-500">
                              {edu.school}{edu.year ? ` — ${edu.year}` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Right Column */}
              <div className="lg:col-span-4 space-y-12">
                <section className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-6 text-center">Matrice de Compétences</h3>
                  <RadarChart data={radarData} />
                </section>

                <section>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-6">Compétences Techniques</h3>
                  <div className="space-y-5">
                    {consultant.skills_technical.map(skill => (
                      <div key={skill.name} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          <span className={searchWords.some(w => skill.name.toLowerCase().includes(w)) ? 'text-primary' : ''}>
                            {skill.name}
                          </span>
                          <span className="text-primary">{skill.level}/5</span>
                        </div>
                        <SkillGauge level={skill.level} />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Functional Skills */}
                {consultant.skills_functional.length > 0 && (
                  <section>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-6">Compétences Fonctionnelles</h3>
                    <div className="space-y-5">
                      {consultant.skills_functional.map(skill => (
                        <div key={skill.name} className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            <span>{skill.name}</span>
                            <span className="text-primary">{skill.level}/5</span>
                          </div>
                          <SkillGauge level={skill.level} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Soft Skills */}
                {consultant.soft_skills.length > 0 && (
                  <section>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-4">Soft Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {consultant.soft_skills.map(skill => (
                        <span key={skill} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-6">Certifications</h3>
                  <div className="space-y-3">
                    {consultant.certifications.map(cert => (
                      <div key={cert.name} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                        <Award size={18} className="text-primary shrink-0" />
                        <span>{cert.name}{cert.year ? ` (${cert.year})` : ''}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="pt-6">
                  <button className="w-full py-5 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-3 group">
                    <Download size={20} className="group-hover:-translate-y-1 transition-transform" />
                    Exporter le CV (PDF)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
