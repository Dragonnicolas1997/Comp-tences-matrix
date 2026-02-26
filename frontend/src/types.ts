// --- Types matching the backend schema ---

export interface TechnicalSkill {
  name: string;
  level: number;
  years?: number;
}

export interface FunctionalSkill {
  name: string;
  level: number;
}

export interface Sector {
  name: string;
  missions_count?: number;
  years?: number;
}

export interface Certification {
  name: string;
  year?: number;
}

export interface Mission {
  client: string;
  role?: string;
  duration_months?: number;
  year_end?: number;
  context?: string;
  achievements: string[];
  technologies: string[];
  sector?: string;
}

export interface Education {
  degree: string;
  school?: string;
  year?: number;
}

export interface Consultant {
  id: string;
  source_file?: string;
  extracted_at?: string;
  first_name: string;
  last_name: string;
  title?: string;
  years_experience?: number;
  location?: string;
  languages: string[];
  skills_technical: TechnicalSkill[];
  skills_functional: FunctionalSkill[];
  soft_skills: string[];
  sectors: Sector[];
  certifications: Certification[];
  missions: Mission[];
  education: Education[];
  summary?: string;
  raw_text?: string;
}

// --- Radar chart (computed from consultant data) ---

export interface RadarPoint {
  subject: string;
  A: number;
  fullMark: number;
}

// --- Search ---

export interface SearchResultItem {
  consultant: Consultant;
  score: number;
  explanation: string;
  highlighted_skills: string[];
  match_keywords: string[];
}

export interface SearchResponse {
  query: string;
  total_results: number;
  results: SearchResultItem[];
}

// --- Filters ---

export interface Filters {
  sectors: string[];
  companies: string[];
  skills: string[];
}

// --- Stats ---

export interface SectorStat {
  name: string;
  count: number;
}

export interface SkillStat {
  name: string;
  count: number;
  avg_level: number;
}

export interface Stats {
  total_consultants: number;
  sectors: SectorStat[];
  top_skills_technical: SkillStat[];
  top_skills_functional: SkillStat[];
  avg_experience_years?: number;
}

// --- CV Files ---

export interface CVFileInfo {
  filename: string;
  size_bytes: number;
  modified_at: string;
  consultant_name?: string;
  consultant_id?: string;
}

export interface CVListResponse {
  files: CVFileInfo[];
  total: number;
}
