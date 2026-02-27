import os
import logging
from collections import Counter

from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from config import MAX_UPLOAD_SIZE_MB
from database import get_db
from models import Consultant
from merge import merge_consultant_data, deduplicate_profile_data

logger = logging.getLogger("talentmatrix")
from schemas import (
    ConsultantResponse,
    SearchQuery,
    SearchResponse,
    SearchResultItem,
    UploadResponse,
    StatsResponse,
    SectorStat,
    SkillStat,
    CVFileInfo,
    CVListResponse,
)
from pptx_parser import extract_text_from_pptx
from claude_extractor import extract_consultant_profile
from semantic_search import search_consultants

router = APIRouter(prefix="/api")

# Directory to save uploaded CVs (follows DATABASE_PATH dir in production)
_data_dir = os.path.dirname(os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "data", "talent_matrix.db")))
CVS_DIR = os.path.join(_data_dir, "cvs")
os.makedirs(CVS_DIR, exist_ok=True)


# ----- POST /api/upload -----

@router.post("/upload", response_model=UploadResponse)
async def upload_cv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a PPTX CV, save file, extract profile via Claude, store in DB."""
    if not file.filename.endswith(".pptx"):
        raise HTTPException(status_code=400, detail="Seuls les fichiers .pptx sont acceptés")

    file_bytes = await file.read()

    if len(file_bytes) > MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Fichier trop volumineux (max {MAX_UPLOAD_SIZE_MB}MB)",
        )

    # 1. Save original file to ./data/cvs/
    save_path = os.path.join(CVS_DIR, file.filename)
    with open(save_path, "wb") as f:
        f.write(file_bytes)

    # 2. Extract raw text from PPTX
    raw_text = extract_text_from_pptx(file_bytes)

    if len(raw_text.strip()) < 50:
        raise HTTPException(
            status_code=422,
            detail=f"Texte insuffisant extrait de '{file.filename}' ({len(raw_text)} caractères). "
            "Le fichier est peut-être basé sur des images.",
        )

    logger.info(f"Texte extrait de {file.filename}: {len(raw_text)} caracteres")

    # 3. Extract structured profile via Claude + validate with Pydantic
    try:
        profile = extract_consultant_profile(raw_text, filename=file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'extraction IA : {str(e)}",
        )

    # 4. Deduplicate extracted data (Claude can produce duplicates within a single CV)
    deduped = deduplicate_profile_data(profile.model_dump())

    # 5. Check if consultant already exists (match by first_name + last_name, case-insensitive)
    existing = db.query(Consultant).filter(
        func.lower(Consultant.first_name) == profile.first_name.lower(),
        func.lower(Consultant.last_name) == profile.last_name.lower(),
    ).first()

    if existing:
        # Merge new deduplicated data into existing profile
        updates = merge_consultant_data(existing.to_dict(), profile)
        # Apply dedup on the merged result too
        updates = deduplicate_profile_data(updates)
        existing.source_file = file.filename
        existing.raw_text = raw_text
        for field, value in updates.items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)

        return UploadResponse(
            message=f"CV de {existing.first_name} {existing.last_name} mis à jour (fusion avec le profil existant)",
            consultant=ConsultantResponse(**existing.to_dict()),
        )

    # 6. New consultant — create from deduplicated data
    consultant = Consultant(
        source_file=file.filename,
        first_name=deduped["first_name"],
        last_name=deduped["last_name"],
        title=deduped.get("title"),
        years_experience=deduped.get("years_experience"),
        location=deduped.get("location"),
        languages=deduped.get("languages", []),
        skills_technical=deduped.get("skills_technical", []),
        skills_functional=deduped.get("skills_functional", []),
        soft_skills=deduped.get("soft_skills", []),
        sectors=deduped.get("sectors", []),
        certifications=deduped.get("certifications", []),
        missions=deduped.get("missions", []),
        education=deduped.get("education", []),
        summary=deduped.get("summary"),
        raw_text=raw_text,
    )
    db.add(consultant)
    db.commit()
    db.refresh(consultant)

    return UploadResponse(
        message=f"CV de {consultant.first_name} {consultant.last_name} importé avec succès",
        consultant=ConsultantResponse(**consultant.to_dict()),
    )


# ----- GET /api/consultants -----

@router.get("/consultants", response_model=list[ConsultantResponse])
def list_consultants(
    sector: str | None = Query(None, description="Filtrer par secteur"),
    skill: str | None = Query(None, description="Filtrer par compétence technique"),
    min_experience: int | None = Query(None, ge=0, description="Expérience minimum (années)"),
    page: int = Query(1, ge=1, description="Numéro de page"),
    page_size: int = Query(50, ge=1, le=100, description="Taille de page"),
    db: Session = Depends(get_db),
):
    """List all consultants with optional filters and pagination."""
    query = db.query(Consultant)

    # Filter by minimum experience
    if min_experience is not None:
        query = query.filter(Consultant.years_experience >= min_experience)

    consultants = query.order_by(Consultant.last_name).all()

    # JSON field filters (applied in Python since SQLite JSON support is limited)
    results = []
    for c in consultants:
        # Filter by sector
        if sector:
            sector_names = [s["name"].lower() for s in (c.sectors or [])]
            if sector.lower() not in sector_names:
                continue

        # Filter by skill
        if skill:
            skill_names = [s["name"].lower() for s in (c.skills_technical or [])]
            if skill.lower() not in skill_names:
                continue

        results.append(c.to_dict())

    # Pagination
    total = len(results)
    start = (page - 1) * page_size
    end = start + page_size
    paginated = results[start:end]

    return paginated


# ----- GET /api/consultants/{id} -----

@router.get("/consultants/{consultant_id}", response_model=ConsultantResponse)
def get_consultant(consultant_id: str, db: Session = Depends(get_db)):
    """Get a single consultant by ID."""
    consultant = db.query(Consultant).filter(Consultant.id == consultant_id).first()
    if not consultant:
        raise HTTPException(status_code=404, detail="Consultant non trouvé")
    return consultant.to_dict()


# ----- POST /api/search -----

@router.post("/search", response_model=SearchResponse)
def search(body: SearchQuery, db: Session = Depends(get_db)):
    """Natural language search across all consultants using Claude.

    Returns consultants ranked by relevance with:
    - score (0-100)
    - explanation (why this match)
    - highlighted_skills (relevant skills for the query)
    """
    all_consultants = db.query(Consultant).all()
    if not all_consultants:
        return SearchResponse(query=body.query, total_results=0, results=[])

    consultants_dicts = [c.to_dict() for c in all_consultants]

    # Apply pre-filters before sending to Claude (reduces token usage)
    if body.filters:
        filtered = []
        for c in consultants_dicts:
            # Filter by sectors
            if body.filters.sectors:
                c_sectors = [s["name"].lower() for s in c.get("sectors", [])]
                if not any(fs.lower() in c_sectors for fs in body.filters.sectors):
                    continue

            # Filter by skills
            if body.filters.skills:
                c_skills = [s["name"].lower() for s in c.get("skills_technical", [])]
                if not any(fs.lower() in c_skills for fs in body.filters.skills):
                    continue

            # Filter by min experience
            if body.filters.min_experience is not None:
                if (c.get("years_experience") or 0) < body.filters.min_experience:
                    continue

            filtered.append(c)
        consultants_dicts = filtered

    if not consultants_dicts:
        return SearchResponse(query=body.query, total_results=0, results=[])

    results = search_consultants(body.query, consultants_dicts)

    return SearchResponse(
        query=body.query,
        total_results=len(results),
        results=results,
    )


# ----- DELETE /api/consultants/{id} -----

@router.delete("/consultants/{consultant_id}")
def delete_consultant(consultant_id: str, db: Session = Depends(get_db)):
    """Delete a consultant."""
    consultant = db.query(Consultant).filter(Consultant.id == consultant_id).first()
    if not consultant:
        raise HTTPException(status_code=404, detail="Consultant non trouvé")
    db.delete(consultant)
    db.commit()
    return {"message": f"{consultant.first_name} {consultant.last_name} supprimé"}


# ----- GET /api/stats -----

@router.get("/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    """Global statistics: total consultants, sector distribution, top skills."""
    all_consultants = db.query(Consultant).all()

    if not all_consultants:
        return StatsResponse(
            total_consultants=0,
            sectors=[],
            top_skills_technical=[],
            top_skills_functional=[],
            avg_experience_years=None,
        )

    # Sector distribution
    sector_counter: Counter = Counter()
    for c in all_consultants:
        for s in (c.sectors or []):
            sector_counter[s["name"]] += 1

    sectors = [
        SectorStat(name=name, count=count)
        for name, count in sector_counter.most_common(20)
    ]

    # Top technical skills (by count + avg level)
    tech_skill_counts: Counter = Counter()
    tech_skill_levels: dict[str, list[int]] = {}
    for c in all_consultants:
        for s in (c.skills_technical or []):
            name = s["name"]
            tech_skill_counts[name] += 1
            tech_skill_levels.setdefault(name, []).append(s.get("level", 3))

    top_tech = [
        SkillStat(
            name=name,
            count=count,
            avg_level=round(sum(tech_skill_levels[name]) / len(tech_skill_levels[name]), 1),
        )
        for name, count in tech_skill_counts.most_common(15)
    ]

    # Top functional skills
    func_skill_counts: Counter = Counter()
    func_skill_levels: dict[str, list[int]] = {}
    for c in all_consultants:
        for s in (c.skills_functional or []):
            name = s["name"]
            func_skill_counts[name] += 1
            func_skill_levels.setdefault(name, []).append(s.get("level", 3))

    top_func = [
        SkillStat(
            name=name,
            count=count,
            avg_level=round(sum(func_skill_levels[name]) / len(func_skill_levels[name]), 1),
        )
        for name, count in func_skill_counts.most_common(15)
    ]

    # Average experience
    exp_values = [c.years_experience for c in all_consultants if c.years_experience]
    avg_exp = round(sum(exp_values) / len(exp_values), 1) if exp_values else None

    return StatsResponse(
        total_consultants=len(all_consultants),
        sectors=sectors,
        top_skills_technical=top_tech,
        top_skills_functional=top_func,
        avg_experience_years=avg_exp,
    )


# ----- GET /api/cvs -----

@router.get("/cvs", response_model=CVListResponse)
def list_cvs(db: Session = Depends(get_db)):
    """List all uploaded CV files with associated consultant info."""
    files: list[CVFileInfo] = []

    if not os.path.isdir(CVS_DIR):
        return CVListResponse(files=[], total=0)

    for filename in os.listdir(CVS_DIR):
        if not filename.endswith(".pptx"):
            continue
        filepath = os.path.join(CVS_DIR, filename)
        stat = os.stat(filepath)

        # Find associated consultant
        consultant = db.query(Consultant).filter(
            Consultant.source_file == filename
        ).first()

        files.append(CVFileInfo(
            filename=filename,
            size_bytes=stat.st_size,
            modified_at=datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc),
            consultant_name=f"{consultant.first_name} {consultant.last_name}" if consultant else None,
            consultant_id=consultant.id if consultant else None,
        ))

    files.sort(key=lambda f: f.modified_at, reverse=True)
    return CVListResponse(files=files, total=len(files))


# ----- GET /api/cvs/{filename}/download -----

@router.get("/cvs/{filename}/download")
def download_cv(filename: str):
    """Download a CV file. Protected against path traversal."""
    filepath = os.path.join(CVS_DIR, filename)
    real_path = os.path.realpath(filepath)
    real_cvs_dir = os.path.realpath(CVS_DIR)

    if not real_path.startswith(real_cvs_dir):
        raise HTTPException(status_code=400, detail="Chemin invalide")

    if not os.path.isfile(real_path):
        raise HTTPException(status_code=404, detail="Fichier non trouvé")

    return FileResponse(
        real_path,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename=filename,
    )


# ----- DELETE /api/cvs/{filename} -----

@router.delete("/cvs/{filename}")
def delete_cv(filename: str, db: Session = Depends(get_db)):
    """Delete a CV file from disk and its associated consultant from DB."""
    filepath = os.path.join(CVS_DIR, filename)
    real_path = os.path.realpath(filepath)
    real_cvs_dir = os.path.realpath(CVS_DIR)

    if not real_path.startswith(real_cvs_dir):
        raise HTTPException(status_code=400, detail="Chemin invalide")

    if not os.path.isfile(real_path):
        raise HTTPException(status_code=404, detail="Fichier non trouvé")

    # Delete associated consultant
    consultant = db.query(Consultant).filter(
        Consultant.source_file == filename
    ).first()

    consultant_name = None
    if consultant:
        consultant_name = f"{consultant.first_name} {consultant.last_name}"
        db.delete(consultant)
        db.commit()

    # Delete file from disk
    os.remove(real_path)

    return {
        "message": f"CV '{filename}' supprimé" + (f" ainsi que le consultant {consultant_name}" if consultant_name else ""),
    }
