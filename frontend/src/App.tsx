import React, { createContext, useState, useMemo, useEffect, useCallback } from 'react';
import { SearchBar } from './components/SearchBar';
import { FilterSidebar } from './components/FilterSidebar';
import { ConsultantCard } from './components/ConsultantCard';
import { ConsultantProfile } from './components/ConsultantProfile';
import { UploadCV } from './components/UploadCV';
import { CVManager } from './components/CVManager';
import { RFPAnalyzer } from './components/RFPAnalyzer';
import { Dashboard } from './components/Dashboard';
import { Consultant, Filters } from './types';
import { fetchConsultants } from './services/apiService';
import {
  Users,
  Moon,
  Sun,
  ArrowUpDown,
  Search as SearchIcon,
  FileText,
  FileSearch,
  Loader2,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Context to share search state with child components
export const SearchContext = createContext<{
  searchQuery: string;
}>({ searchQuery: '' });

export default function App() {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ sectors: [], companies: [], skills: [] });
  const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'cvs' | 'rfp' | 'dashboard'>('search');

  // Load consultants from API
  const loadConsultants = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchConsultants();
      setConsultants(data);
    } catch (e) {
      console.error('Failed to load consultants:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadConsultants(); }, [loadConsultants]);

  // --- Fuzzy name matching (token-based) ---
  const areSimilarNames = useCallback((a: string, b: string): boolean => {
    const NOISE = new Set(['ms', 'microsoft', 'adobe', 'google', 'aws', 'amazon', 'ibm', 'oracle', 'sap', 'apache']);
    // Normalize: lowercase, strip trailing 's' for plural handling (but keep short words intact)
    const stem = (t: string) => t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t;
    const tokenize = (s: string) => new Set(s.toLowerCase().trim().split(/[\s\-_/,\.()]+/).filter(Boolean).map(stem));
    if (a.toLowerCase().trim() === b.toLowerCase().trim()) return true;
    const ta = tokenize(a), tb = tokenize(b);
    if (ta.size === 0 || tb.size === 0) return false;
    if (ta.size === tb.size && [...ta].every(t => tb.has(t))) return true;
    const [smaller, larger] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
    if ([...smaller].every(t => larger.has(t)) && larger.size - smaller.size <= 1) return true;
    const coreA = new Set([...ta].filter(t => !NOISE.has(t)));
    const coreB = new Set([...tb].filter(t => !NOISE.has(t)));
    if (coreA.size > 0 && coreB.size > 0 && coreA.size === coreB.size && [...coreA].every(t => coreB.has(t))) return true;
    return false;
  }, []);

  const deduplicateNames = useCallback((names: string[]): string[] => {
    const result: string[] = [];
    for (const name of names) {
      if (!result.some(existing => areSimilarNames(name, existing))) {
        result.push(name);
      }
    }
    return result.sort();
  }, [areSimilarNames]);

  // Detect vague company descriptions vs real company names
  const isRealCompany = useCallback((name: string): boolean => {
    const lower = name.toLowerCase().trim();
    const vagueWords = [
      'grand', 'grande', 'grands', 'grandes',
      'groupe', 'leader', 'opérateur', 'operateur',
      'entreprise', 'cabinet', 'marketplace',
      'acteur', 'société', 'societe',
      'mondial', 'mondiale', 'européen', 'européenne',
      'international', 'internationale',
      'industriel', 'industrielle',
      'majeur', 'majeure',
      'compte', 'institution',
    ];
    const words = lower.split(/\s+/);
    // If any word is a vague descriptor, it's not a real company name
    if (words.some(w => vagueWords.includes(w))) return false;
    // Very long names are likely descriptions (e.g. "opérateur postal européen")
    if (words.length > 4) return false;
    return true;
  }, []);

  // Extract a sector keyword from a vague client description
  const extractSectorFromClient = useCallback((name: string): string | null => {
    const lower = name.toLowerCase().trim();
    const sectorMap: [RegExp, string][] = [
      [/industri/,        'Industrie'],
      [/transport/,       'Transport'],
      [/hôtel|hotel|hospitali/, 'Hôtellerie'],
      [/assurance/,       'Assurance'],
      [/banque|bancaire/, 'Banque'],
      [/beauté|beauty|cosmétique/, 'Luxe'],
      [/postal/,          'Transport'],
      [/presse|média|media/, 'Média'],
      [/télécom|telecom|téléphon|telephon/, 'Telecom'],
      [/énergie|energie|energy/, 'Énergie'],
      [/santé|sante|pharma|médical|medical/, 'Santé'],
      [/retail|distribution|commerce/, 'Retail'],
      [/immobilier/,      'Immobilier'],
      [/aéro|aero|aviation/, 'Aérospatial'],
      [/auto|véhicul|vehicul/, 'Automobile'],
      [/aliment|agro|food/, 'Agroalimentaire'],
      [/conseil|consult/, 'Conseil'],
      [/financ|invest/,   'Finance'],
      [/technolog|numérique|numerique|digital|tech/, 'Tech'],
      [/luxe/,            'Luxe'],
      [/défense|defense|militaire/, 'Défense'],
      [/public|état|etat|gouvern|européen|européenne/, 'Secteur public'],
    ];
    for (const [regex, sector] of sectorMap) {
      if (regex.test(lower)) return sector;
    }
    return null;
  }, []);

  // Available filters derived from loaded consultants (fuzzy dedup)
  const allClients = useMemo(() =>
    consultants.flatMap(c => c.missions.map(m => m.client)).filter(Boolean),
  [consultants]);

  // Map vague client names to sector keywords
  const sectorsFromClients = useMemo(() => {
    const sectors: string[] = [];
    for (const client of allClients) {
      if (!isRealCompany(client)) {
        const sector = extractSectorFromClient(client);
        if (sector) sectors.push(sector);
      }
    }
    return sectors;
  }, [allClients, isRealCompany, extractSectorFromClient]);

  const availableSectors = useMemo(() =>
    deduplicateNames([
      ...consultants.flatMap(c => c.sectors.map(s => s.name)),
      ...sectorsFromClients,
    ]),
  [consultants, sectorsFromClients, deduplicateNames]);

  const availableCompanies = useMemo(() =>
    deduplicateNames(allClients.filter(c => isRealCompany(c))),
  [allClients, isRealCompany, deduplicateNames]);

  const availableSkills = useMemo(() =>
    deduplicateNames(consultants.flatMap(c => [
      ...c.skills_technical.map(s => s.name),
      ...c.skills_functional.map(s => s.name),
    ])),
  [consultants, deduplicateNames]);

  const suggestions = useMemo(() =>
    [...availableSectors, ...availableCompanies, ...availableSkills],
  [availableSectors, availableCompanies, availableSkills]);

  // Build a searchable text blob from all consultant CV data + raw PPTX text
  const consultantSearchText = useCallback((c: Consultant): string => {
    return [
      c.first_name, c.last_name, c.title || '', c.location || '', c.summary || '',
      c.raw_text || '',
      ...c.skills_technical.map(s => s.name),
      ...c.skills_functional.map(s => s.name),
      ...c.soft_skills,
      ...c.sectors.map(s => s.name),
      ...c.certifications.map(cert => cert.name),
      ...c.languages,
      ...c.missions.flatMap(m => [
        m.client, m.role || '', m.context || '', m.sector || '',
        ...m.technologies, ...m.achievements,
      ]),
      ...c.education.map(e => `${e.degree} ${e.school || ''}`),
    ].join(' ').toLowerCase();
  }, []);

  // Displayed consultants: local text search + sidebar filters
  const displayedConsultants = useMemo(() => {
    let source = consultants;

    // Local text search: each word of the query must appear in the CV data
    if (searchQuery.trim().length >= 2) {
      const words = searchQuery.toLowerCase().trim().split(/\s+/);
      source = source.filter(c => {
        const text = consultantSearchText(c);
        return words.every(w => text.includes(w));
      });
    }

    // Sidebar filters (fuzzy matching)
    return source.filter(c => {
      // Sectors: match on sector names + mapped sectors from vague client descriptions
      const cSectorNames = [...c.sectors.map(s => s.name)];
      for (const m of c.missions) {
        if (m.client && !isRealCompany(m.client)) {
          const mapped = extractSectorFromClient(m.client);
          if (mapped) cSectorNames.push(mapped);
        }
      }
      const matchesSectors = filters.sectors.length === 0 ||
        filters.sectors.some(fs => cSectorNames.some(s => areSimilarNames(s, fs)));
      // Companies: only match real company names
      const matchesCompanies = filters.companies.length === 0 ||
        filters.companies.some(fc => c.missions.some(m => m.client && isRealCompany(m.client) && areSimilarNames(m.client, fc)));
      const allSkillNames = [
        ...c.skills_technical.map(sk => sk.name),
        ...c.skills_functional.map(sk => sk.name),
        ...c.soft_skills,
      ];
      const matchesSkills = filters.skills.length === 0 ||
        filters.skills.every(fs => allSkillNames.some(sk => areSimilarNames(sk, fs)));
      return matchesSectors && matchesCompanies && matchesSkills;
    });
  }, [searchQuery, consultants, filters, areSimilarNames, consultantSearchText, isRealCompany, extractSectorFromClient]);

  const selectedConsultant = useMemo(() =>
    consultants.find(c => c.id === selectedConsultantId) || null,
  [selectedConsultantId, consultants]);

  const resetFilters = () => {
    setFilters({ sectors: [], companies: [], skills: [] });
    setSearchQuery('');
  };

  const hasActiveSearch = searchQuery.trim().length > 0 || filters.skills.length > 0 || filters.sectors.length > 0 || filters.companies.length > 0;

  return (
    <SearchContext.Provider value={{ searchQuery }}>
      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950' : 'bg-background'}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black text-xs">TM</div>
              <h1 className="text-xl font-bold text-primary dark:text-white tracking-tight">TalentMatrix</h1>
            </div>

            {/* Pill-shaped tab toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveTab('search')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'search'
                    ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <SearchIcon size={13} />
                <span className="hidden sm:inline">Recherche</span>
              </button>
              <button
                onClick={() => setActiveTab('cvs')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'cvs'
                    ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <FileText size={13} />
                <span className="hidden sm:inline">CVs</span>
              </button>
              <button
                onClick={() => setActiveTab('rfp')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'rfp'
                    ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <FileSearch size={13} />
                <span className="hidden sm:inline">Appels d'Offres</span>
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <LayoutDashboard size={13} />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                <Users size={14} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{consultants.length} consultants</span>
              </div>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 text-slate-500 hover:text-primary dark:hover:text-white transition-colors"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {activeTab === 'cvs' ? (
          <CVManager onDataChanged={loadConsultants} />
        ) : activeTab === 'rfp' ? (
          <RFPAnalyzer onSelectConsultant={setSelectedConsultantId} />
        ) : activeTab === 'dashboard' ? (
          <Dashboard consultants={consultants} isRealCompany={isRealCompany} />
        ) : (
        <>
        {/* Hero Section */}
        <section className="mb-12 text-center">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-6 tracking-tight"
          >
            Trouvez l'expert qu'il vous faut
          </motion.h2>

          <SearchBar onSearch={setSearchQuery} suggestions={suggestions} />

          {/* Upload Zone */}
          <div className="mt-8">
            <UploadCV onUploadSuccess={loadConsultants} />
          </div>

          {/* Quick Skills Selection */}
          {availableSkills.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-6 flex flex-wrap justify-center gap-2 max-w-4xl mx-auto"
            >
              <span className="w-full text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Recherche rapide par compétence</span>
              {availableSkills.slice(0, 8).map(skill => (
                <button
                  key={skill}
                  onClick={() => {
                    const newSkills = filters.skills.includes(skill) ? [] : [skill];
                    setFilters({ ...filters, skills: newSkills });
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    filters.skills.includes(skill)
                      ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-primary hover:text-primary'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </motion.div>
          )}
        </section>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <FilterSidebar
            filters={filters}
            onChange={setFilters}
            onReset={resetFilters}
            availableSectors={availableSectors}
            availableCompanies={availableCompanies}
            availableSkills={availableSkills}
          />

          {/* Results Area */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div className="text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                {displayedConsultants.length} résultats trouvés
              </div>

            </div>

            <AnimatePresence mode="popLayout">
              {isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-32 text-center"
                >
                  <Loader2 size={40} className="text-primary animate-spin mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Chargement des consultants...</p>
                </motion.div>
              ) : consultants.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-32 text-center"
                >
                  <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                    <SearchIcon size={40} className="text-primary/40" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
                    Importez vos premiers CVs
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium">
                    Glissez un fichier .pptx dans la zone ci-dessus pour démarrer.
                  </p>
                </motion.div>
              ) : displayedConsultants.length > 0 ? (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                >
                  {displayedConsultants.map((consultant) => (
                    <ConsultantCard
                      key={consultant.id}
                      consultant={consultant}
                      onClick={setSelectedConsultantId}
                      activeFilterSkills={filters.skills}
                      activeFilterSectors={filters.sectors}
                      activeFilterCompanies={filters.companies}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <SearchIcon size={32} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Aucun consultant trouvé</h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-xs">
                    Essayez de modifier votre recherche pour trouver d'autres profils.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </>
        )}
      </main>

      {/* Profile Modal */}
      <ConsultantProfile
        consultant={selectedConsultant}
        onClose={() => setSelectedConsultantId(null)}
      />

      {/* Footer */}
      <footer className="mt-20 py-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-white font-bold text-[10px]">TM</div>
            <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">TalentMatrix</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Plateforme de recherche d'experts par compétences.
          </p>
        </div>
      </footer>
    </div>
    </SearchContext.Provider>
  );
}
