import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadCV, UploadResponse } from '../services/apiService';

interface UploadCVProps {
  onUploadSuccess: () => void;
}

export const UploadCV: React.FC<UploadCVProps> = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.pptx') && !lower.endsWith('.pdf')) {
      setError('Seuls les fichiers .pptx et .pdf sont acceptés');
      return;
    }
    setIsUploading(true);
    setError(null);
    setResult(null);
    try {
      const response = await uploadCV(file);
      setResult(response);
      onUploadSuccess();
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full max-w-xl mx-auto mb-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 bg-white dark:bg-slate-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pptx,.pdf"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          className="hidden"
        />
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-primary animate-spin" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Extraction en cours via IA...
            </p>
            <p className="text-xs text-slate-400">Cela peut prendre quelques secondes</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={32} className="text-slate-400" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Glissez un CV (.pptx ou .pdf) ici ou cliquez pour parcourir
            </p>
            <p className="text-xs text-slate-400">
              Le fichier sera analysé par IA pour extraire le profil consultant
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3"
          >
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{result.message}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {result.consultant.first_name} {result.consultant.last_name} — {result.consultant.title}
              </p>
            </div>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"
          >
            <AlertCircle size={20} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
