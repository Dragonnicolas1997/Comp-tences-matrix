import React, { useContext } from 'react';
import { Consultant } from '../types';
import { ChevronRight, MapPin, Clock } from 'lucide-react';
import { SkillGauge } from './SkillGauge';
import { motion } from 'motion/react';
import { SearchContext } from '../App';

interface ConsultantCardProps {
  consultant: Consultant;
  onClick: (id: string) => void;
}

export const ConsultantCard: React.FC<ConsultantCardProps> = ({ consultant, onClick }) => {
  const { searchQuery } = useContext(SearchContext);
  const searchWords = searchQuery.trim().length >= 2
    ? searchQuery.toLowerCase().trim().split(/\s+/)
    : [];

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

        {/* Sectors */}
        <div className="flex flex-wrap gap-1 mb-4">
          {consultant.sectors.slice(0, 3).map((sector) => (
            <span
              key={sector.name}
              className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wider"
            >
              {sector.name}
            </span>
          ))}
        </div>

        {/* Top skills */}
        <div className="space-y-3">
          {consultant.skills_technical.slice(0, 3).map((skill) => (
            <div key={skill.name} className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <span className={searchWords.some(w => skill.name.toLowerCase().includes(w)) ? 'text-primary' : ''}>
                  {skill.name}
                </span>
                <span>{skill.level}/5</span>
              </div>
              <SkillGauge level={skill.level} />
            </div>
          ))}
        </div>

      </div>

      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
        <div className="flex items-center gap-1 text-primary text-xs font-bold">
          Voir profil <ChevronRight size={14} />
        </div>
      </div>
    </motion.div>
  );
};
