import json
from anthropic import Anthropic
from pydantic import ValidationError
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL
from schemas import ConsultantCreate

client = Anthropic(api_key=ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """Tu es un système expert d'extraction de données structurées pour un cabinet de conseil.

À partir du texte brut extrait d'un CV PowerPoint de consultant, tu dois extraire TOUTES les informations et les structurer en JSON strict.

ATTENTION CRITIQUE : Le texte brut provient d'un fichier PowerPoint et peut être désorganisé (texte mélangé entre slides, pas d'ordre logique). Tu dois RECONSTITUER l'information en analysant TOUT le texte, pas seulement les sections clairement labellisées.

FORMAT DE SORTIE OBLIGATOIRE (JSON pur, sans balises markdown) :
{
  "first_name": "Prénom",
  "last_name": "Nom",
  "title": "Titre professionnel (ex: Senior Data Consultant)",
  "years_experience": 8,
  "location": "Ville ou région",
  "languages": ["Français", "Anglais"],
  "skills_technical": [
    {"name": "Python", "level": 5, "years": 6}
  ],
  "skills_functional": [
    {"name": "Data Governance", "level": 4}
  ],
  "soft_skills": ["Leadership", "Communication"],
  "sectors": [
    {"name": "Banque", "missions_count": 4, "years": 5}
  ],
  "certifications": [
    {"name": "Azure Data Engineer", "year": 2023}
  ],
  "missions": [
    {
      "client": "Grande banque française",
      "role": "Lead Data Engineer",
      "duration_months": 18,
      "year_end": 2024,
      "context": "Refonte plateforme data",
      "achievements": ["Migration 200 flux vers Databricks"],
      "technologies": ["Databricks", "Azure", "Python"],
      "sector": "Banque"
    }
  ],
  "education": [
    {"degree": "Master Data Science", "school": "Télécom Paris", "year": 2016}
  ],
  "summary": "Résumé professionnel en 2-3 phrases en français"
}

RÈGLES D'EXTRACTION :

1. **Identité** : Le NOM DU FICHIER est la source la plus fiable pour le prénom et le nom du consultant (ex: "CV - Marie Dupont - 2025.pptx" → first_name="Marie", last_name="Dupont"). Le texte des slides contient souvent des initiales ou acronymes (ex: "NLE", "MD") — ignore-les pour le nom et utilise le nom du fichier en priorité. Extrais le prénom et le nom séparément.

2. **skills_technical** : Compétences techniques/outils (langages, frameworks, plateformes, bases de données...). Note chaque compétence de 1 à 5 :
   - 5 = Expert (mentionné comme expertise principale, utilisé dans de nombreuses missions)
   - 4 = Avancé (utilisé régulièrement dans plusieurs missions)
   - 3 = Intermédiaire (mentionné dans quelques contextes)
   - 2 = Basique (mentionné brièvement)
   - 1 = Notion (mentionné en passant)
   Estime les années d'utilisation si possible.
   IMPORTANT : Ne te limite PAS à une section "compétences". Parcours TOUTES les expériences/missions pour identifier les technologies et outils utilisés, même s'ils ne sont pas listés dans une section dédiée.

3. **skills_functional** : Compétences métier/fonctionnelles (gestion de projet, gouvernance, transformation digitale...). Note de 1 à 5. Déduis-les aussi des descriptions de missions.

4. **soft_skills** : Compétences comportementales identifiées dans le CV (management d'équipe, communication client, leadership, coordination...). Déduis-les des rôles et responsabilités décrits dans les missions.

5. **sectors** : Secteurs d'activité identifiés à travers les missions ET les clients mentionnés. Noms standards : Banque, Assurance, Retail, Santé, Industrie, Énergie, Telecom, Secteur Public, Média, Luxe, Automobile, Transport, Immobilier, Conseil, Tech.

6. **missions** : C'EST LA PARTIE LA PLUS IMPORTANTE. Extrais ABSOLUMENT TOUTES les expériences professionnelles sans aucune limite de nombre. Chaque mission distincte (client différent, période différente, ou rôle différent) doit être une entrée séparée. Cherche dans TOUT le texte :
   - Les noms de clients ou entreprises
   - Les dates, durées, périodes (ex: "2022-2024", "janv. 2023 - mars 2024", "18 mois")
   - Les rôles/postes occupés
   - Les descriptions de projets, contextes, réalisations
   - Les technologies mentionnées dans le contexte d'une mission
   Même si le texte est fragmenté ou mal structuré, reconstitue chaque mission avec autant de détails que possible.
   Pour le champ "client" : anonymise si c'est un vrai nom d'entreprise (ex: "Grande banque française").

7. **certifications** : Toute certification, diplôme professionnel ou accréditation mentionné.

8. **education** : Formations académiques (diplômes, écoles, universités). Cherche dans tout le texte, pas seulement une section "Formation".

9. **summary** : Rédige un résumé professionnel concis en français (2-3 phrases) basé sur l'ENSEMBLE du CV : expériences, compétences, secteurs. Le résumé doit refléter le parcours complet, pas juste les compétences listées.

10. **years_experience** : Calcule à partir des dates des missions les plus anciennes et les plus récentes. Si pas de dates, estime en fonction du nombre et de la séniorité des missions.

RAPPEL IMPORTANT : Analyse le texte en ENTIER. Les CVs PowerPoint ont souvent les expériences réparties sur plusieurs slides. Ne te limite jamais à une seule slide ou section. Si tu vois des noms d'entreprises, des dates, des descriptions de projets QUELQUE PART dans le texte, ce sont des missions à extraire."""


def _strip_markdown_fences(text: str) -> str:
    """Remove markdown code fences from Claude's response if present."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:])
        if text.endswith("```"):
            text = text[:-3].strip()
    return text


def extract_consultant_profile(raw_text: str, filename: str = "") -> ConsultantCreate:
    """Send raw CV text to Claude for structured extraction and validate with Pydantic.

    Args:
        raw_text: The raw text extracted from a PPTX file.
        filename: Original filename of the PPTX (often contains the consultant's name).

    Returns:
        A validated ConsultantCreate Pydantic model.

    Raises:
        ValueError: If Claude's response cannot be parsed or fails validation.
    """
    filename_hint = ""
    if filename:
        filename_hint = f"\n\nNOM DU FICHIER : \"{filename}\"\n(Le nom du fichier contient très souvent le prénom et nom du consultant. Utilise-le en priorité pour les champs first_name et last_name.)"

    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=8192,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Voici le texte brut extrait du CV PowerPoint d'un consultant. Extrais toutes les informations en JSON structuré.{filename_hint}\n\n--- TEXTE DU CV ---\n{raw_text}",
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
        validated = ConsultantCreate.model_validate(raw_data)
    except ValidationError as e:
        raise ValueError(
            f"Les données extraites ne correspondent pas au schéma attendu :\n{e}"
        )

    return validated
