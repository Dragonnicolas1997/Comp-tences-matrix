import React from 'react';

interface SkillGaugeProps {
  level: number;
  max?: number;
}

export const SkillGauge: React.FC<SkillGaugeProps> = ({ level, max = 5 }) => {
  return (
    <div className="flex gap-1 w-full">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
            i < level ? 'bg-primary' : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  );
};
