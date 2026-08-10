# Onboarding and Profile Intake

This note describes how TextPlex should gather learner context without turning signup into a survey.

## Principle

Collect the hard account details first, then ask for a small amount of learning context once the user has a reason to trust the product.

## Recommended flow

1. Account creation
   - Keep this to the minimum required for identity and access.
   - Do not attach a long questionnaire to the signup form.

2. First-use profile
   - Ask 2 to 4 high-value questions after signup.
   - Make every question skippable.
   - Explain why the question is being asked.

3. Progressive profiling
   - Ask richer context after the user has started reading or studying.
   - Use later prompts for relationship-to-language details, confidence sliders, and certification history.
   - Use the same profile inputs to choose a default layout density or presentation mode.

## Beta tester ingestion

For invited beta testers, add one required introduction immediately after account creation and before the protected app surfaces open. Keep the gate short and explain the purpose:

- Confirm or choose the target language already captured at signup, using friendly labels alongside the standard language codes such as `Japanese (ja)`.
- Explain that the product is changing, that imported material must be authorized, and where to send feedback.
- Ask the tester's first-use intent, current confidence, preferred support level, and an optional first-week goal.
- Require an acknowledgement of the beta expectations, but do not require certification history, demographics, or a long research survey.

Store the completed answers in the authenticated `user_settings` rows under the `onboarding.*` namespace. This keeps tester intake account-owned and lets the product gate new accounts without introducing a second profile record.

## Early questions

Suggested first-pass questions:

- Which language or languages are you interested in?
- What are you using TextPlex for?
  - general reading
  - study or test prep
  - heritage or family language
  - work
  - travel
  - other
- How confident do you feel right now?
- What kind of support do you want?
  - light
  - moderate
  - detailed

## Later questions

Once the user has gotten value from the app, ask optional follow-ups such as:

- What is your relationship to this language?
- Have you taken any exams or certifications?
- If yes, which level or framework?
  - JLPT, for example N5 to N1
  - TOPIK
  - CEFR-based exam
  - other
- Would you like to set separate comfort levels for reading, vocabulary, grammar, or listening?

## Layout follow-up

If the user wants a different experience shape, ask a separate preference question such as:

- How much detail do you want on screen?
  - compact
  - balanced
  - detailed

Use that choice to set a default presentation mode, but keep the user able to change it later.

## What to avoid

- Requiring a full profile survey before account creation finishes
- Forcing certification disclosure
- Using certification as the main proxy for ability
- Asking for more detail than the product can actually use

## Copy guidance

Use short, low-pressure language such as:

- "Help us tailor your reading experience."
- "This takes less than a minute."
- "You can skip any question."
- "We use this only to personalize your reading and study tools."

## Practical rule

If a question does not improve onboarding, recommendations, or support quality, do not ask it yet.
