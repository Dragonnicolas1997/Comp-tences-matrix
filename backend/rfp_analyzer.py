import json
from anthropic import Anthropic
from pydantic import ValidationError
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL
from schemas import RFPRequirements

client = Anthropic(api_key=ANTHROPIC_API_KEY)

RFP_SYSTEM_PROMPT = """Tu es un système expert d'analyse d'appels d'offres (AO) pour un cabinet de conseil.

À partir du texte brut extrait d'un document PDF d'appel d'offres, tu dois extraire TOUTES les exigences et les structurer en JSON strict.

FORMAT DE SORTIE OBLIGATOIRE (JSON pur, sans balises markdown) :
{
  "title": "Titre ou objet de l'appel d'offres",
  "summary": "Résumé en 2-3 phrases de ce que demande l'AO",
  "skills_technical": ["Python", "Azure", "Databricks", "SQL"],
  "skills_functional": ["Gestion de projet", "Data Governance", "AMOA"],
  "sectors": ["Banque", "Assurance"],
  "min_experience_years": 5,
  "certifications": ["Azure Data Engineer", "PMP"],
  "languages": ["Français", "Anglais"],
  "team_size": "3-5 consultants",
  "budget_info": "Budget estimé : 500K€",
  "timeline": "Démarrage mars 2025, durée 12 mois",
  "location": "Paris, télétravail partiel possible",
  "key_criteria": [
    "Expérience avérée en migration cloud",
    "Connaissance du secteur bancaire obligatoire",
    "Certification Azure requise"
  ]
}

RÈGLES D'EXTRACTION :

1. **title** : Le titre ou l'objet principal de l'appel d'offres. S'il n'y a pas de titre clair, synthétise un titre descriptif.

2. **summary** : Un résumé concis (2-3 phrases) décrivant le besoin principal, le contexte et les objectifs.

3. **skills_technical** : TOUTES les compétences techniques mentionnées dans l'AO (langages, frameworks, outils, plateformes, bases de données, méthodologies techniques). Cherche dans tout le texte : description du projet, profils demandés, livrables, critères de sélection.

4. **skills_functional** : Compétences métier/fonctionnelles requises (gestion de projet, gouvernance, transformation digitale, AMOA, conduite du changement...).

5. **sectors** : Secteurs d'activité concernés par l'AO. Utilise les noms standards : Banque, Assurance, Retail, Santé, Industrie, Énergie, Telecom, Secteur Public, Média, Luxe, Automobile, Transport, Immobilier, Conseil, Tech.

6. **min_experience_years** : L'expérience minimum demandée en années. S'il y a plusieurs profils avec des niveaux différents, prends le minimum le plus bas. Si non mentionné, mets null.

7. **certifications** : Toutes les certifications mentionnées ou recommandées.

8. **languages** : Langues requises ou préférées.

9. **team_size** : Taille de l'équipe demandée si mentionné, sinon null.

10. **budget_info** : Toute information budgétaire mentionnée, sinon null.

11. **timeline** : Dates, durée, planning mentionnés, sinon null.

12. **location** : Lieu de mission, politique télétravail, sinon null.

13. **key_criteria** : Liste des critères de sélection clés, exigences obligatoires, ou points d'attention spécifiques mentionnés dans l'AO. C'est le résumé des éléments déterminants pour la sélection.

RAPPEL : Analyse le texte en ENTIER. Les AO sont souvent longs avec des exigences réparties sur plusieurs sections. Ne te limite jamais à une seule section."""


def _strip_markdown_fences(text: str) -> str:
    """Remove markdown code fences from Claude's response if present."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:])
        if text.endswith("```"):
            text = text[:-3].strip()
    return text


def analyze_rfp(raw_text: str) -> RFPRequirements:
    """Send raw RFP text to Claude for structured extraction and validate with Pydantic.

    Args:
        raw_text: The raw text extracted from a PDF file.

    Returns:
        A validated RFPRequirements Pydantic model.

    Raises:
        ValueError: If Claude's response cannot be parsed or fails validation.
    """
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=4096,
        system=RFP_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Voici le texte brut extrait d'un appel d'offres PDF. Extrais toutes les exigences en JSON structuré.\n\n--- TEXTE DE L'APPEL D'OFFRES ---\n{raw_text}",
            }
        ],
    )

    response_text = _strip_markdown_fences(message.content[0].text)

    # Parse JSON
    try:
        raw_data = json.loads(response_text)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Claude a retourné un JSON invalide : {e}\n\nRéponse :\n{response_text[:500]}"
        )

    # Validate with Pydantic
    try:
        validated = RFPRequirements.model_validate(raw_data)
    except ValidationError as e:
        raise ValueError(
            f"Les données extraites ne correspondent pas au schéma attendu :\n{e}"
        )

    return validated


def build_rfp_search_query(requirements: RFPRequirements) -> str:
    """Convert structured RFP requirements into a natural language search query.

    This query is passed to search_consultants() for semantic matching.

    Args:
        requirements: Validated RFP requirements.

    Returns:
        A natural language query string for consultant matching.
    """
    parts = []

    parts.append("Je recherche un consultant")

    if requirements.skills_technical:
        parts.append(f"maîtrisant {', '.join(requirements.skills_technical)}")

    if requirements.skills_functional:
        parts.append(f"avec des compétences en {', '.join(requirements.skills_functional)}")

    if requirements.sectors:
        parts.append(f"dans le secteur {', '.join(requirements.sectors)}")

    if requirements.min_experience_years:
        parts.append(f"avec minimum {requirements.min_experience_years} ans d'expérience")

    if requirements.certifications:
        parts.append(f"certifié {', '.join(requirements.certifications)}")

    if requirements.languages:
        parts.append(f"parlant {', '.join(requirements.languages)}")

    if requirements.key_criteria:
        parts.append(f"Critères clés : {'; '.join(requirements.key_criteria[:3])}")

    return ". ".join(parts) + "."
