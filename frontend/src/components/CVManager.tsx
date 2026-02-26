import React, { useState, useEffect, useCallback } from 'react';
import { CVFileInfo } from '../types';
import { fetchCVs, downloadCV, deleteCV } from '../services/apiService';
import { Download, Trash2, FileText, Loader2, AlertCircle, X, Check } from 'lucide-react';

interface CVManagerProps {
  onDataChanged: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CVManager({ onDataChanged }: CVManagerProps) {
  const [files, setFiles] = useState<CVFileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCVs();
      setFiles(data.files);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async (filename: string) => {
    try {
      await downloadCV(filename);
    } catch (e) {
      console.error('Download failed:', e);
    }
  };

  const handleDelete = async (filename: string) => {
    setDeletingFile(filename);
    try {
      await deleteCV(filename);
      setConfirmingDelete(null);
      await load();
      onDataChanged();
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      setDeletingFile(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Loader2 size={40} className="text-primary animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Chargement des CVs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={32} className="text-red-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Erreur</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-4">{error}</p>
        <button
          onClick={load}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
          <FileText size={40} className="text-primary/40" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
          Aucun CV uploadé
        </h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium">
          Importez un fichier .pptx depuis l'onglet Recherche pour commencer.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {files.length} fichier{files.length > 1 ? 's' : ''} CV
        </h2>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Desktop table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fichier</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Consultant</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Taille</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr
                  key={file.filename}
                  className="border-b last:border-b-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-primary shrink-0" />
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[200px]" title={file.filename}>
                        {file.filename}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {file.consultant_name || <span className="text-slate-400 italic">Non associé</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(file.modified_at)}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{formatBytes(file.size_bytes)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {confirmingDelete === file.filename ? (
                        <>
                          <span className="text-xs text-red-500 font-medium mr-1">Supprimer ?</span>
                          <button
                            onClick={() => handleDelete(file.filename)}
                            disabled={deletingFile === file.filename}
                            className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
                            title="Confirmer"
                          >
                            {deletingFile === file.filename ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button
                            onClick={() => setConfirmingDelete(null)}
                            disabled={deletingFile === file.filename}
                            className="p-1.5 text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Annuler"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleDownload(file.filename)}
                            className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            title="Télécharger"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmingDelete(file.filename)}
                            className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
