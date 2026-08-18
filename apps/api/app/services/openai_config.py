from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

OPENAI_DEV_API_KEY_ENV = "OPENAI_TEXTPLEX_DEV_EXPERIMENTAL"
OPENAI_LEGACY_API_KEY_ENV = "OPENAI_API_KEY"

OPENAI_FEATURE_API_KEY_ENVS = {
    "ocr": "OPENAI_TEXTPLEX_PROD_READER_OCR",
    "translation_alignment": "OPENAI_TEXTPLEX_PROD_TRANSLATION_ALIGNMENT",
    "practice_articles": "OPENAI_TEXTPLEX_PROD_PRACTICE_ARTICLES",
    "feedback_analysis": "OPENAI_TEXTPLEX_PROD_FEEDBACK_ANALYSIS",
    "theme_generation": "OPENAI_TEXTPLEX_PROD_THEME_GENERATION",
}


def get_openai_api_key(feature: str) -> str:
    """Resolve a feature key, with development and legacy migration fallbacks."""
    feature_env = OPENAI_FEATURE_API_KEY_ENVS.get(feature)
    if feature_env is None:
        raise ValueError(f"Unknown OpenAI feature: {feature}")

    feature_key = os.getenv(feature_env, "").strip()
    if feature_key:
        return feature_key

    app_env = os.getenv("APP_ENV", "development").strip().lower()
    dev_key = os.getenv(OPENAI_DEV_API_KEY_ENV, "").strip()
    if app_env not in {"production", "prod"} and dev_key:
        logger.warning(
            "OpenAI feature %s is using the development key %s because %s is not configured.",
            feature,
            OPENAI_DEV_API_KEY_ENV,
            feature_env,
        )
        return dev_key

    legacy_key = os.getenv(OPENAI_LEGACY_API_KEY_ENV, "").strip()
    if legacy_key:
        logger.warning(
            "OpenAI feature %s is using deprecated shared key %s because %s is not configured.",
            feature,
            OPENAI_LEGACY_API_KEY_ENV,
            feature_env,
        )
    return legacy_key


def get_openai_api_key_env(feature: str) -> str:
    """Return the feature-specific environment variable for diagnostics."""
    try:
        return OPENAI_FEATURE_API_KEY_ENVS[feature]
    except KeyError as exc:
        raise ValueError(f"Unknown OpenAI feature: {feature}") from exc
