# Layout Density and Presentation Modes

TextPlex can adapt its default layout to the user's declared reading style and support needs without splitting the product into different experiences.

## Principle

Change the amount of detail shown by default, not the underlying functionality.

## Preset model

| Preset | Best for | Default feel | What to show first |
| --- | --- | --- | --- |
| Compact | Fast reading and low-friction use | Minimal chrome, low distraction | Core content, primary navigation, essential actions |
| Balanced | Most users | Moderate structure with clear affordances | Core content, common helpers, light progress cues |
| Detailed | Study-heavy or support-seeking use | More visible context and controls | Definitions, traces, stats, helper text, and study tools |

## Inputs that can drive the preset

- Declared use case
  - quick reading
  - study
  - deep review
  - returning after a break
- Desired level of detail
  - compact
  - balanced
  - detailed
- Desired support level
  - minimal
  - guided
  - full context

## What can vary by preset

- Chrome density
- Whether helper text is inline or tucked behind affordances
- Whether definitions and traces are expanded by default
- Whether progress indicators are prominent
- Whether study controls are always visible or secondary

## What must stay stable

- Navigation structure
- Core reading content
- Meaning of controls
- Available features
- Data model and underlying behavior

## Guardrails

- Keep the preset reversible.
- Do not lock a user into a layout based on inference.
- Do not hide core functionality in compact mode.
- Use the preset as a default, not a label of learner ability.

## Suggested onboarding copy

- "How do you want TextPlex to look by default?"
- "You can change this later."
- "Choose the amount of detail you want on screen."

