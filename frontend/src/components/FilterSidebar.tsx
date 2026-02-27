import React from 'react';
import { Filters } from '../types';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FilterSidebarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onReset: () => void;
  availableSectors: string[];
  availableCompanies: string[];
  availableSkills: string[];
}

const Accordion: React.FC<{
  title: string;
  defaultOpen?: boolean;
  activeCount?: number;
  children: React.ReactNode;
}> = ({ title, defaultOpen = false, activeCount = 0, children }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 dark:border-slate-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{title}</span>
          {!isOpen && activeCount > 0 && (
            <span className="text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {activeCount}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {isOpen && (
        <div className="pb-3 max-h-48 overflow-y-auto">
          <div className="space-y-2">{children}</div>
        </div>
      )}
    </div>
  );
};

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onChange,
  onReset,
  availableSectors,
  availableCompanies,
  availableSkills
}) => {
  const toggleSector = (sector: string) => {
    const newSectors = filters.sectors.includes(sector)
      ? filters.sectors.filter(s => s !== sector)
      : [...filters.sectors, sector];
    onChange({ ...filters, sectors: newSectors });
  };

  const toggleCompany = (company: string) => {
    const newCompanies = filters.companies.includes(company)
      ? filters.companies.filter(c => c !== company)
      : [...filters.companies, company];
    onChange({ ...filters, companies: newCompanies });
  };

  const toggleSkill = (skill: string) => {
    const newSkills = filters.skills.includes(skill)
      ? filters.skills.filter(s => s !== skill)
      : [...filters.skills, skill];
    onChange({ ...filters, skills: newSkills });
  };

  const totalActive = filters.sectors.length + filters.companies.length + filters.skills.length;

  return (
    <aside className="w-64 flex-shrink-0 hidden lg:block">
      <div className="sticky top-24">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Filtres</h2>
          {totalActive > 0 && (
            <button
              onClick={onReset}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <Accordion title="Secteurs" activeCount={filters.sectors.length}>
          {availableSectors.map(sector => (
            <label key={sector} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.sectors.includes(sector)}
                onChange={() => toggleSector(sector)}
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{sector}</span>
            </label>
          ))}
        </Accordion>

        <Accordion title="Entreprises" activeCount={filters.companies.length}>
          {availableCompanies.map(company => (
            <label key={company} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.companies.includes(company)}
                onChange={() => toggleCompany(company)}
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors truncate">{company}</span>
            </label>
          ))}
        </Accordion>

        <Accordion title="Compétences" activeCount={filters.skills.length}>
          {availableSkills.map(skill => (
            <label key={skill} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.skills.includes(skill)}
                onChange={() => toggleSkill(skill)}
                className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{skill}</span>
            </label>
          ))}
        </Accordion>
      </div>
    </aside>
  );
};
