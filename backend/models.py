import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, JSON
from database import Base


def generate_id():
    return f"consultant-{uuid.uuid4().hex[:8]}"


class Consultant(Base):
    __tablename__ = "consultants"

    id = Column(String, primary_key=True, default=generate_id)
    source_file = Column(String, nullable=True)
    extracted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Identity
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    title = Column(String, nullable=True)
    years_experience = Column(Integer, nullable=True)
    location = Column(String, nullable=True)
    languages = Column(JSON, default=list)  # ["Français", "Anglais"]

    # Skills - stored as JSON arrays
    skills_technical = Column(JSON, default=list)
    # [{"name": "Python", "level": 5, "years": 6}]

    skills_functional = Column(JSON, default=list)
    # [{"name": "Data Governance", "level": 4}]

    soft_skills = Column(JSON, default=list)
    # ["Leadership", "Communication"]

    # Sectors
    sectors = Column(JSON, default=list)
    # [{"name": "Banque", "missions_count": 4, "years": 5}]

    # Certifications
    certifications = Column(JSON, default=list)
    # [{"name": "Azure Data Engineer", "year": 2023}]

    # Missions
    missions = Column(JSON, default=list)
    # [{"client": "...", "role": "...", "duration_months": 18, "year_end": 2024,
    #   "context": "...", "achievements": [...], "technologies": [...], "sector": "..."}]

    # Education
    education = Column(JSON, default=list)
    # [{"degree": "Master Data Science", "school": "Télécom Paris", "year": 2016}]

    # Summary
    summary = Column(Text, nullable=True)

    # Raw text extracted from the PPTX (for full-text search)
    raw_text = Column(Text, nullable=True)

    @staticmethod
    def _fix_mojibake(text: str | None) -> str | None:
        """Fix UTF-8 text that was decoded as Windows-1252 (cp1252 mojibake)."""
        if not text:
            return text
        try:
            return text.encode('cp1252').decode('utf-8')
        except (UnicodeDecodeError, UnicodeEncodeError):
            return text

    def to_dict(self):
        return {
            "id": self.id,
            "source_file": self.source_file,
            "extracted_at": self.extracted_at.isoformat() if self.extracted_at else None,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "title": self.title,
            "years_experience": self.years_experience,
            "location": self.location,
            "languages": self.languages or [],
            "skills_technical": self.skills_technical or [],
            "skills_functional": self.skills_functional or [],
            "soft_skills": self.soft_skills or [],
            "sectors": self.sectors or [],
            "certifications": self.certifications or [],
            "missions": self.missions or [],
            "education": self.education or [],
            "summary": self.summary,
            "raw_text": self._fix_mojibake(self.raw_text),
        }
