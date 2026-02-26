import json
from anthropic import Anthropic
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL
from schemas import SearchResultItem, ConsultantResponse

client = Anthropic(api_key=ANTHROPIC_API_KEY)

SEARCH_SYSTEM_PROMPT = """Tu es un système expert de matching de talents pour un cabinet de conseil.

Tu reçois une requête de recherche en langage naturel et une base de profils de consultants.
Tu dois analyser chaque profil et déterminer sa pertinence par rapport à la requête.

INSTRUCTIONS D'ANALYSE :

1. **Compréhension de la requête** : Identifie les critères implicites et explicites :
   - Compétences techniques recherchées
   - Compétences fonctionnelles/métier
   - Secteurs d'activité visés
   - Niveau d'expérience attendu
   - Type de mission ou contexte projet

2. **Scoring** (0-100) :
   - 90-100 : Correspondance quasi parfaite (toutes les compétences clés + secteur + expérience)
   - 70-89 : Très bonne correspondance (majorité des critères satisfaits)
   - 50-69 : Correspondance partielle (certains critères clés satisfaits)
   - 20-49 : Correspondance faible (quelques éléments pertinents)
   - 0-19 : Non pertinent (à exclure des résultats)

3. **Pour chaque consultant pertinent (score >= 20)**, fournis :
   - `id` : l'identifiant exact du consultant
   - `score` : score de pertinence (0-100)
   - `explanation` : une phrase en français expliquant POURQUOI ce consultant correspond
   - `highlighted_skills` : les compétences spécifiques du consultant qui répondent à la requête
   - `match_keywords` : 3-5 mots-clés du profil qui matchent la requête

FORMAT DE SORTIE (JSON strict, sans balises markdown) :
[
  {
    "id": "consultant-xxx",
    "score": 85,
    "explanation": "Consultante senior avec 8 ans d'expérience en architecture data, maîtrise avancée de Databricks et forte expertise dans le secteur bancaire.",
    "highlighted_skills": ["Databricks", "Python", "Architecture Data", "Azure"],
    "match_keywords": ["Databricks", "Banque", "Data Engineer", "8 ans"]
  }
]

RÈGLES :
- Trie par score décroissant
- N'inclus que les consultants avec score >= 20
- Si aucun consultant ne correspond, retourne []
- Retourne UNIQUEMENT le tableau JSON, rien d'autre
- L'explanation doit être concise et factuelle (1-2 phrases max)
- highlighted_skills ne doit contenir que des compétences réellement présentes dans le profil du consultant"""


def _build_compact_profile(c: dict) -> dict:
    """Build a compact consultant representation to minimize token usage."""
    skills_tech = [
        f"{s['name']} ({s.get('level', '?')}/5, {s.get('years', '?')} ans)"
        for s in c.get("skills_technical", [])
    ]
    skills_func = [
        f"{s['name']} ({s.get('level', '?')}/5)"
        for s in c.get("skills_functional", [])
    ]
    sectors = [
        f"{s['name']} ({s.get('years', '?')} ans, {s.get('missions_count', '?')} missions)"
        for s in c.get("sectors", [])
    ]
    missions_summary = [
        f"{m.get('role', '?')} chez {m.get('client', '?')} ({m.get('year_end', '?')}) - {m.get('context', '')} [{', '.join(m.get('technologies', []))}]"
        for m in c.get("missions", [])[:5]  # limit to 5 most recent
    ]
    certs = [
        f"{cert['name']} ({cert.get('year', '?')})"
        for cert in c.get("certifications", [])
    ]

    return {
        "id": c["id"],
        "name": f"{c['first_name']} {c['last_name']}",
        "title": c.get("title", ""),
        "years_experience": c.get("years_experience"),
        "location": c.get("location"),
        "skills_technical": skills_tech,
        "skills_functional": skills_func,
        "soft_skills": c.get("soft_skills", []),
        "sectors": sectors,
        "certifications": certs,
        "missions": missions_summary,
        "summary": c.get("summary", ""),
    }


def _strip_markdown_fences(text: str) -> str:
    """Remove markdown code fences if present."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:])
        if text.endswith("```"):
            text = text[:-3].strip()
    return text


def search_consultants(query: str, consultants: list[dict]) -> list[SearchResultItem]:
    """Use Claude to semantically search and rank consultants.

    Args:
        query: Natural language search query (e.g., "qui connaît Databricks dans la banque ?")
        consultants: List of consultant dictionaries from the database.

    Returns:
        List of SearchResultItem sorted by relevance score descending.
    """
    # Build compact profiles
    compact_profiles = [_build_compact_profile(c) for c in consultants]
    consultants_json = json.dumps(compact_profiles, ensure_ascii=False, indent=2)

    user_prompt = f"""REQUÊTE DE RECHERCHE : "{query}"

BASE DE CONSULTANTS ({len(consultants)} profils) :
{consultants_json}

Analyse chaque profil et retourne le classement par pertinence."""

    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=4096,
        system=SEARCH_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    response_text = _strip_markdown_fences(message.content[0].text)

    try:
        raw_results = json.loads(response_text)
    except json.JSONDecodeError:
        return []

    # Map results back to full consultant data
    consultant_map = {c["id"]: c for c in consultants}
    results = []
    for r in raw_results:
        consultant_data = consultant_map.get(r.get("id"))
        if not consultant_data:
            continue

        score = r.get("score", 0)
        if score < 20:
            continue

        results.append(
            SearchResultItem(
                consultant=ConsultantResponse(**consultant_data),
                score=score,
                explanation=r.get("explanation", ""),
                highlighted_skills=r.get("highlighted_skills", []),
                match_keywords=r.get("match_keywords", []),
            )
        )

    # Ensure sorted by score desc
    results.sort(key=lambda x: x.score, reverse=True)

    return results
