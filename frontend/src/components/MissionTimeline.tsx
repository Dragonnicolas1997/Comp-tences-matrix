import React from 'react';
import { Mission } from '../types';
import { Briefcase } from 'lucide-react';

interface MissionTimelineProps {
  missions: Mission[];
}

export const MissionTimeline: React.FC<MissionTimelineProps> = ({ missions }) => {
  return (
    <div className="space-y-6">
      {missions.map((mission, index) => (
        <div key={index} className="relative pl-8 pb-6 last:pb-0">
          {index !== missions.length - 1 && (
            <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
          )}
          <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">
            <Briefcase size={12} className="text-primary" />
          </div>
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-2">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white">{mission.client}</h4>
                {mission.role && (
                  <span className="text-xs font-medium text-primary">{mission.role}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {mission.duration_months && (
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                    {mission.duration_months} mois
                  </span>
                )}
                {mission.year_end && (
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                    {mission.year_end}
                  </span>
                )}
              </div>
            </div>
            {mission.context && (
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                {mission.context}
              </p>
            )}
            {mission.achievements.length > 0 && (
              <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 mb-2">
                {mission.achievements.map((a, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span>
                    {a}
                  </li>
                ))}
              </ul>
            )}
            {mission.technologies.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {mission.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wider"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
