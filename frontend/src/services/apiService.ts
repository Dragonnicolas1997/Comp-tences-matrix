import { Consultant, SearchResponse, Stats, CVListResponse } from '../types';

const API_BASE = '/api';

export interface UploadResponse {
  message: string;
  consultant: Consultant;
}

export async function fetchConsultants(params?: {
  sector?: string;
  skill?: string;
  min_experience?: number;
  page?: number;
  page_size?: number;
}): Promise<Consultant[]> {
  const searchParams = new URLSearchParams();
  if (params?.sector) searchParams.set('sector', params.sector);
  if (params?.skill) searchParams.set('skill', params.skill);
  if (params?.min_experience) searchParams.set('min_experience', String(params.min_experience));
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.page_size) searchParams.set('page_size', String(params.page_size));

  const qs = searchParams.toString();
  const res = await fetch(`${API_BASE}/consultants${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Erreur lors du chargement des consultants');
  return res.json();
}

export async function fetchConsultant(id: string): Promise<Consultant> {
  const res = await fetch(`${API_BASE}/consultants/${id}`);
  if (!res.ok) throw new Error('Consultant non trouvé');
  return res.json();
}

export async function searchConsultants(
  query: string,
  filters?: { sectors?: string[]; skills?: string[]; min_experience?: number }
): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, filters }),
  });
  if (!res.ok) throw new Error('Erreur lors de la recherche');
  return res.json();
}

export async function uploadCV(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload échoué' }));
    throw new Error(err.detail || 'Upload échoué');
  }
  return res.json();
}

export async function deleteConsultant(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/consultants/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Suppression échouée');
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Erreur lors du chargement des stats');
  return res.json();
}

export async function fetchCVs(): Promise<CVListResponse> {
  const res = await fetch(`${API_BASE}/cvs`);
  if (!res.ok) throw new Error('Erreur lors du chargement des CVs');
  return res.json();
}

export async function downloadCV(filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cvs/${encodeURIComponent(filename)}/download`);
  if (!res.ok) throw new Error('Erreur lors du téléchargement');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function deleteCV(filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cvs/${encodeURIComponent(filename)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Suppression échouée');
}
