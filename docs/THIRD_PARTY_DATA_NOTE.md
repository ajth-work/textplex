# TextPlex Third-Party Data Flow Note

This note records where TextPlex currently sends data to third-party service providers.

## Supabase

TextPlex uses Supabase for authentication and hosted account data.

Data sent can include:

- sign-in and session tokens from the browser client
- hosted profile and settings requests
- authenticated learner sync payloads
- hosted theme catalog and entitlement reads

## OpenAI

TextPlex uses OpenAI for best-effort OCR, translation alignment, and generated article features.

Data sent can include:

- page images or extracted page content for OCR
- book title, language code, and page number in OCR prompts
- sentence text, translation text, and token payloads for alignment
- learner-window terms, curriculum settings, genre, tone, and language settings for generated articles

## Google Cloud Translate

TextPlex uses Google Cloud Translate for translation and romanization fallback.

Data sent can include:

- source text or term text
- source and target language codes
- access tokens and project-scoped request headers required by Google Cloud

## Notes

- The theme checkout flow is still sandboxed and does not call a live payment processor yet.
- If a new provider is added later, this note should be updated before the feature ships.
