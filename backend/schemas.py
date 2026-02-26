from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# --- Nested schemas for JSON fields ---

class TechnicalSkill(BaseModel):
    name: str
    level: int = Field(ge=1, le=5)
    years: Optional[int] = None


class FunctionalSkill(BaseModel):
    name: str
    level: int = Field(ge=1, le=5)


class Sector(BaseModel):
    name: str
    missions_count: Optional[int] = None
    years: Optional[int] = None


class Certification(BaseModel):
    name: str
    year: Optional[int] = None


class Mission(BaseModel):
    client: str
    role: Optional[str] = None
    duration_months: Optional[int] = None
    year_end: Optional[int] = None
    context: Optional[str] = None
    achievements: list[str] = []
    technologies: list[str] = []
    sector: Optional[str] = None


class Education(BaseModel):
    degree: str
    school: Optional[str] = None
    year: Optional[int] = None


# --- Main consultant schema ---

class ConsultantBase(BaseModel):
    first_name: str
    last_name: str
    title: Optional[str] = None
    years_experience: Optional[int] = None
    location: Optional[str] = None
    languages: list[str] = []
    skills_technical: list[TechnicalSkill] = []
    skills_functional: list[FunctionalSkill] = []
    soft_skills: list[str] = []
    sectors: list[Sector] = []
    certifications: list[Certification] = []
    missions: list[Mission] = []
    education: list[Education] = []
    summary: Optional[str] = None


class ConsultantCreate(ConsultantBase):
    """Used when Claude extracts data from a CV. Validates the raw JSON."""
    pass


class ConsultantResponse(ConsultantBase):
    id: str
    source_file: Optional[str] = None
    extracted_at: Optional[datetime] = None
    raw_text: Optional[str] = None

    model_config = {"from_attributes": True}


# --- Search ---

class SearchFilters(BaseModel):
    sectors: list[str] = []
    skills: list[str] = []
    min_experience: Optional[int] = None


class SearchQuery(BaseModel):
    query: str = Field(min_length=2)
    filters: Optional[SearchFilters] = None


class SearchResultItem(BaseModel):
    consultant: ConsultantResponse
    score: int = Field(ge=0, le=100)
    explanation: str = ""
    highlighted_skills: list[str] = []
    match_keywords: list[str] = []


class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: list[SearchResultItem]


# --- Upload ---

class UploadResponse(BaseModel):
    message: str
    consultant: ConsultantResponse


# --- Stats ---

class SectorStat(BaseModel):
    name: str
    count: int


class SkillStat(BaseModel):
    name: str
    count: int
    avg_level: float


class StatsResponse(BaseModel):
    total_consultants: int
    sectors: list[SectorStat]
    top_skills_technical: list[SkillStat]
    top_skills_functional: list[SkillStat]
    avg_experience_years: Optional[float] = None


# --- CV Files ---

class CVFileInfo(BaseModel):
    filename: str
    size_bytes: int
    modified_at: datetime
    consultant_name: Optional[str] = None
    consultant_id: Optional[str] = None


class CVListResponse(BaseModel):
    files: list[CVFileInfo]
    total: int
