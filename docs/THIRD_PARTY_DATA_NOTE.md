# TextPlex Third-Party Services and Data Flow

Last reviewed: 2026-08-08.

This note records the third-party services used by TextPlex, what each service does,
and the kinds of information that may pass through it. It separates services that
process user or book content from infrastructure services that primarily handle
traffic, domains, hosting, or deployment.

## Services that may receive user or book content

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

## Infrastructure, hosting, and operations

### Cloudflare

TextPlex uses Cloudflare for domain DNS and may use its proxy, CDN, and security
features for the public web service.

Depending on the Cloudflare features enabled, Cloudflare may receive:

- IP address and approximate network location
- request URLs, timestamps, headers, and response status information
- browser, device, and connection information
- web traffic that passes through a Cloudflare proxy

Cloudflare is not an application feature provider. It should not receive book or
learner content unless that content is sent through a proxied Cloudflare endpoint
or another Cloudflare product is enabled for it.

### GoDaddy

TextPlex uses GoDaddy for domain-registration and related domain-account services.

GoDaddy may receive:

- domain-registration and account information
- registrant or administrative contact information required for the domain
- DNS or domain-management requests

If GoDaddy is only the registrar and is not hosting or proxying the application,
TextPlex does not send reader content, uploaded books, or learner history to
GoDaddy as part of normal app use.

### GitHub, GitHub Pages, and GitHub Actions

TextPlex uses GitHub for source-code hosting, automated checks, and deployment of
the public static GitHub Pages demo.

GitHub may receive or process:

- repository source code, documentation, and deployment configuration
- CI build output and workflow logs
- technical information associated with visitors to the public GitHub Pages site

The GitHub Pages shell can call a separately hosted processor API. Book uploads
and reader requests are sent to the configured processor API, not stored in the
static GitHub Pages files.

## Local application components

The following are application technologies rather than independent third-party
data processors in the privacy-policy sense:

- Next.js and React for the web interface
- FastAPI and Python for the API
- SQLite for local book and learner-profile databases
- Docker for local or self-managed deployment
- Node.js, npm, and Python package registries for development dependencies

If TextPlex moves the API, databases, or uploaded books to a managed cloud host,
that hosting provider must be added to this note before the public policy is
updated.

## Services not currently active for user data

- The theme checkout flow is sandboxed and does not call a live payment processor.
- No Sentry, Google Analytics, PostHog, PayPal, Stripe, Twilio, or transactional
  email provider is currently wired into the application.
- The `@vercel/speed-insights` package is present as a dependency, but no active
  Speed Insights integration was found in the application code.

## Maintenance notes

- Confirm the exact Cloudflare products and proxy settings before publishing a
  final legal policy.
- Confirm whether GoDaddy is used only as registrar/DNS or also for hosting,
  email, or other products.
- Add any production API, database, object-storage, email, payment, monitoring,
  or analytics provider before that service handles user data.
- Update this note before shipping a feature that adds a new provider.
