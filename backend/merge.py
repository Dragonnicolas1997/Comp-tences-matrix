"""Merge logic for consultant profiles.

When a CV is uploaded for a consultant that already exists in the database,
we merge the new data into the existing profile:
- Lists (skills, missions, certifications, etc.) are merged with deduplication
- Scalar fields (title, experience, location) take the newer value if present
- The summary is regenerated from the merged data
"""

import re
from datetime import datetime, timezone


# ---- Fuzzy name matching ----

_NOISE_TOKENS = frozenset({
    "ms", "microsoft", "adobe", "google", "aws", "amazon",
    "ibm", "oracle", "sap", "apache",
})


def _stem(token: str) -> str:
    """Simple plural stemming: remove trailing 's' on words longer than 3 chars."""
    return token[:-1] if len(token) > 3 and token.endswith('s') else token


def _tokenize(name: str) -> frozenset[str]:
    """Split a name into normalized lowercase tokens with plural stemming."""
    tokens = set(re.split(r'[\s\-_/,\.()]+', name.lower().strip()))
    tokens.discard('')
    return frozenset(_stem(t) for t in tokens)


def _are_similar_names(a: str, b: str) -> bool:
    """Check if two names refer to the same concept using token comparison.

    Handles cases like:
    - "Office Suite" vs "MS Office Suite" vs "MS Suite Office"
    - "Power BI" vs "Microsoft Power BI"
    - "python" vs "Python"
    """
    if a.lower().strip() == b.lower().strip():
        return True

    ta, tb = _tokenize(a), _tokenize(b)
    if not ta or not tb:
        return False

    # Same tokens in any order ("Suite Office" == "Office Suite")
    if ta == tb:
        return True

    # One is a subset with at most 1 extra token
    # e.g. {"office", "suite"} ⊂ {"ms", "office", "suite"}
    if ta < tb and len(tb) - len(ta) <= 1:
        return True
    if tb < ta and len(ta) - len(tb) <= 1:
        return True

    # Same core tokens after removing known vendor prefixes
    # e.g. "MS Office" and "Microsoft Office" → both core = {"office"}
    ta_core = ta - _NOISE_TOKENS
    tb_core = tb - _NOISE_TOKENS
    if ta_core and tb_core and ta_core == tb_core:
        return True

    return False


def _find_similar(name: str, existing_names: list[str]) -> str | None:
    """Find an already-seen name that is similar to the given name."""
    for seen in existing_names:
        if _are_similar_names(name, seen):
            return seen
    return None


# ---- Merge helpers ----

def _merge_list_of_dicts(existing: list[dict], new: list[dict], key: str) -> list[dict]:
    """Merge two lists of dicts, deduplicating by fuzzy name matching on a key field.
    If the same key exists in both, merge fields (new values override).
    """
    merged: dict[str, dict] = {}
    for item in existing:
        name = item.get(key, "").strip()
        if not name:
            continue
        similar = _find_similar(name, list(merged.keys()))
        if similar:
            old = merged[similar]
            merged[similar] = {**old, **{fk: fv for fk, fv in item.items() if fv is not None}}
        else:
            merged[name] = item

    for item in new:
        name = item.get(key, "").strip()
        if not name:
            continue
        similar = _find_similar(name, list(merged.keys()))
        if similar:
            old = merged[similar]
            merged[similar] = {**old, **{fk: fv for fk, fv in item.items() if fv is not None}}
        else:
            merged[name] = item

    return list(merged.values())


def _merge_string_lists(existing: list[str], new: list[str]) -> list[str]:
    """Merge two string lists, deduplicating with fuzzy matching."""
    result: list[str] = []
    for item in existing + new:
        item = item.strip()
        if not item:
            continue
        if _find_similar(item, result) is None:
            result.append(item)
    return result


def _merge_missions(existing: list[dict], new: list[dict]) -> list[dict]:
    """Merge missions, deduplicating by (client + role + year_end + duration) combo."""
    def mission_key(m: dict) -> str:
        client = (m.get("client") or "").lower().strip()
        role = (m.get("role") or "").lower().strip()
        year = str(m.get("year_end") or "")
        duration = str(m.get("duration_months") or "")
        return f"{client}|{role}|{year}|{duration}"

    merged = {}
    for m in existing:
        k = mission_key(m)
        merged[k] = m
    for m in new:
        k = mission_key(m)
        if k in merged:
            # Merge: combine achievements and technologies
            old = merged[k]
            combined = {**old, **{fk: fv for fk, fv in m.items() if fv is not None}}
            combined["achievements"] = _merge_string_lists(
                old.get("achievements", []), m.get("achievements", [])
            )
            combined["technologies"] = _merge_string_lists(
                old.get("technologies", []), m.get("technologies", [])
            )
            merged[k] = combined
        else:
            merged[k] = m

    # Sort by year_end descending
    result = list(merged.values())
    result.sort(key=lambda m: m.get("year_end") or 0, reverse=True)
    return result


def _merge_education(existing: list[dict], new: list[dict]) -> list[dict]:
    """Merge education entries, deduplicating by degree name."""
    return _merge_list_of_dicts(existing, new, "degree")


def deduplicate_profile_data(data: dict) -> dict:
    """Remove duplicates within a single consultant's profile using fuzzy matching.

    Applied after Claude extraction to ensure no duplicate skills, sectors,
    certifications, missions, languages, or soft_skills exist in the raw data.
    Uses token-based comparison to catch near-duplicates like
    "Office Suite" / "MS Office Suite" / "MS Suite Office".
    """
    def dedup_dicts(items: list[dict], key: str) -> list[dict]:
        result: dict[str, dict] = {}
        for item in items:
            name = item.get(key, "").strip()
            if not name:
                continue
            similar = _find_similar(name, list(result.keys()))
            if similar is None:
                result[name] = item
        return list(result.values())

    def dedup_strings(items: list[str]) -> list[str]:
        result: list[str] = []
        for item in items:
            item = item.strip()
            if not item:
                continue
            if _find_similar(item, result) is None:
                result.append(item)
        return result

    def dedup_missions(items: list[dict]) -> list[dict]:
        seen: dict[str, dict] = {}
        for m in items:
            client = (m.get("client") or "").lower().strip()
            role = (m.get("role") or "").lower().strip()
            year = str(m.get("year_end") or "")
            duration = str(m.get("duration_months") or "")
            k = f"{client}|{role}|{year}|{duration}"
            if k not in seen:
                seen[k] = m
        return list(seen.values())

    result = dict(data)
    result["skills_technical"] = dedup_dicts(data.get("skills_technical", []), "name")
    result["skills_functional"] = dedup_dicts(data.get("skills_functional", []), "name")
    result["sectors"] = dedup_dicts(data.get("sectors", []), "name")
    result["certifications"] = dedup_dicts(data.get("certifications", []), "name")
    result["education"] = dedup_dicts(data.get("education", []), "degree")
    result["missions"] = dedup_missions(data.get("missions", []))
    result["languages"] = dedup_strings(data.get("languages", []))
    result["soft_skills"] = dedup_strings(data.get("soft_skills", []))
    return result


def merge_consultant_data(existing: dict, new_profile) -> dict:
    """Merge a new extracted profile into existing consultant data.

    Args:
        existing: The current consultant data as a dict (from to_dict()).
        new_profile: The newly extracted ConsultantCreate Pydantic model.

    Returns:
        A dict with the merged fields to update on the Consultant model.
    """
    new = new_profile.model_dump()

    updates = {}

    # Scalar fields: take newer non-None value
    for field in ["title", "years_experience", "location"]:
        new_val = new.get(field)
        if new_val is not None:
            updates[field] = new_val

    # Take the higher experience count
    old_exp = existing.get("years_experience") or 0
    new_exp = new.get("years_experience") or 0
    if new_exp > 0 or old_exp > 0:
        updates["years_experience"] = max(old_exp, new_exp)

    # String lists: merge with dedup
    updates["languages"] = _merge_string_lists(
        existing.get("languages", []), new.get("languages", [])
    )
    updates["soft_skills"] = _merge_string_lists(
        existing.get("soft_skills", []), new.get("soft_skills", [])
    )

    # Dict lists: merge by name key
    updates["skills_technical"] = _merge_list_of_dicts(
        existing.get("skills_technical", []),
        new.get("skills_technical", []),
        "name",
    )
    updates["skills_functional"] = _merge_list_of_dicts(
        existing.get("skills_functional", []),
        new.get("skills_functional", []),
        "name",
    )
    updates["sectors"] = _merge_list_of_dicts(
        existing.get("sectors", []),
        new.get("sectors", []),
        "name",
    )
    updates["certifications"] = _merge_list_of_dicts(
        existing.get("certifications", []),
        new.get("certifications", []),
        "name",
    )

    # Missions: merge by client+role+year combo
    updates["missions"] = _merge_missions(
        existing.get("missions", []),
        new.get("missions", []),
    )

    # Education: merge by degree
    updates["education"] = _merge_education(
        existing.get("education", []),
        new.get("education", []),
    )

    # Summary: take the newer one (it's regenerated each time by Claude)
    if new.get("summary"):
        updates["summary"] = new["summary"]

    # Update timestamp
    updates["extracted_at"] = datetime.now(timezone.utc)

    return updates
