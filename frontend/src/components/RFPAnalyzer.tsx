import React, { useState, useRef } from 'react';
import {
  Upload,
  Loader2,
  AlertCircle,
  FileSearch,
  Code2,
  Briefcase,
  Building2,
  Clock,
  MapPin,
  Globe,
  Award,
  Users,
  Target,
  CalendarClock,
  Wallet,
  RefreshCw,
  ArrowLeft,
  FileText,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RFPAnalysisResponse, SearchResultItem } from '../types';
import { analyzeRFP } from '../services/apiService';
import { MatchScore } from './MatchScore';

interface RFPAnalyzerProps {
  onSelectConsultant: (id: string) => void;
}

export const RFPAnalyzer: React.FC<RFPAnalyzerProps> = ({ onSelectConsultant }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<RFPAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Seuls les fichiers .pdf sont acceptés');
      return;
    }
    setFileName(file.name);
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await analyzeRFP(file);
      if (!abortControllerRef.current?.signal.aborted) {
        setResult(response);
      }
    } catch (e: any) {
      if (!abortControllerRef.current?.signal.aborted) {
        setError(e.message || "Erreur lors de l'analyse");
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsAnalyzing(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const resetAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setResult(null);
    setError(null);
    setFileName(null);
    setIsAnalyzing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const req = result?.requirements;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
          Analyse d'Appels d'Offres
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg mx-auto">
          Importez un appel d'offres en PDF pour identifier les profils consultants correspondants.
        </p>
      </motion.div>

      {/* Upload Zone (shown when no result) */}
      {!result && !isAnalyzing && (
        <div className="w-full max-w-xl mx-auto mb-8">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 bg-white dark:bg-slate-900'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                <FileSearch size={32} className="text-primary" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Glissez un appel d'offres (.pdf) ici ou cliquez pour parcourir
              </p>
              <p className="text-xs text-slate-400">
                Le fichier sera analyse par IA pour extraire les exigences et recommander des profils
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          {/* Nom du fichier + bouton annuler */}
          <div className="flex items-center gap-3 mb-6 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <FileText size={16} className="text-primary shrink-0" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-xs">{fileName}</span>
            <button
              onClick={resetAnalysis}
              className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0"
              title="Annuler et supprimer"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <Loader2 size={48} className="text-primary animate-spin mb-4" />
          <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
            Analyse de l'appel d'offres en cours...
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Extraction des exigences et recherche des profils correspondants
          </p>
        </motion.div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-xl mx-auto mb-8 space-y-3"
          >
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400 flex-1">{error}</p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={resetAnalysis}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all"
              >
                <ArrowLeft size={14} />
                Retour
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {result && req && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Fichier chargé + boutons */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <FileText size={14} className="text-primary shrink-0" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-xs">{fileName}</span>
            </div>
            <button
              onClick={resetAnalysis}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 transition-all"
            >
              <Trash2 size={14} />
              Supprimer
            </button>
            <button
              onClick={() => { resetAnalysis(); setTimeout(() => fileInputRef.current?.click(), 100); }}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all"
            >
              <RefreshCw size={14} />
              Nouvelle analyse
            </button>
          </div>

          {/* Requirements Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">
              {req.title || "Appel d'offres analysé"}
            </h3>
            {req.summary && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                {req.summary}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Technical Skills */}
              {req.skills_technical.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Code2 size={14} className="text-blue-500" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Compétences techniques</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {req.skills_technical.map((skill) => (
                      <span key={skill} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-800">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Functional Skills */}
              {req.skills_functional.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase size={14} className="text-violet-500" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Compétences fonctionnelles</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {req.skills_functional.map((skill) => (
                      <span key={skill} className="px-2.5 py-1 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold rounded-lg border border-violet-100 dark:border-violet-800">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sectors */}
              {req.sectors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={14} className="text-emerald-500" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Secteurs</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {req.sectors.map((sector) => (
                      <span key={sector} className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg border border-emerald-100 dark:border-emerald-800">
                        {sector}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {req.certifications.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Award size={14} className="text-amber-500" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Certifications</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {req.certifications.map((cert) => (
                      <span key={cert} className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-lg border border-amber-100 dark:border-amber-800">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Row */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4">
              {req.min_experience_years && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Clock size={12} />
                  <span className="font-bold">{req.min_experience_years}+ ans</span> d'expérience
                </div>
              )}
              {req.languages.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Globe size={12} />
                  <span className="font-bold">{req.languages.join(', ')}</span>
                </div>
              )}
              {req.location && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin size={12} />
                  <span className="font-bold">{req.location}</span>
                </div>
              )}
              {req.team_size && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Users size={12} />
                  <span className="font-bold">{req.team_size}</span>
                </div>
              )}
              {req.timeline && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <CalendarClock size={12} />
                  <span className="font-bold">{req.timeline}</span>
                </div>
              )}
              {req.budget_info && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Wallet size={12} />
                  <span className="font-bold">{req.budget_info}</span>
                </div>
              )}
            </div>

            {/* Key Criteria */}
            {req.key_criteria.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={14} className="text-red-500" />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Critères clés</span>
                </div>
                <ul className="space-y-1">
                  {req.key_criteria.map((criterion, i) => (
                    <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                      <span className="text-primary mt-0.5 font-black">-</span>
                      {criterion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Matching Results */}
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 tracking-tight flex items-center gap-2">
              <Users size={18} className="text-primary" />
              Profils recommandés
              <span className="text-sm font-bold text-slate-400">({result.total_matches})</span>
            </h3>

            {result.matching_results.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={24} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  Aucun profil correspondant trouvé
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Importez plus de CVs pour enrichir la base de consultants
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {result.matching_results.map((item: SearchResultItem) => (
                  <motion.div
                    key={item.consultant.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    onClick={() => onSelectConsultant(item.consultant.id)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {item.consultant.first_name} {item.consultant.last_name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {item.consultant.title}
                        </p>
                        {item.consultant.years_experience && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {item.consultant.years_experience} ans d'expérience
                          </p>
                        )}
                      </div>
                      <MatchScore score={item.score} size={50} strokeWidth={3} />
                    </div>

                    {/* Explanation */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                      {item.explanation}
                    </p>

                    {/* Highlighted Skills */}
                    {item.highlighted_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.highlighted_skills.slice(0, 6).map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
