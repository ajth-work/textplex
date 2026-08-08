import Link from "next/link";

import { RoutePage } from "../../components/route-page";

const collectionItems = [
  "Account details you choose to provide, such as email address, display name, and sign-in tokens.",
  "Reading history, vocabulary progress, study activity, and settings tied to your account or local device.",
  "Books, scans, notes, and other material you choose to import or upload.",
  "Technical information needed to operate the app, such as request timing, error logs, and browser session state.",
];

const usageItems = [
  "Authenticate your account and keep you signed in.",
  "Store and restore reading history, learner progress, and settings.",
  "Process imported content into readable pages, vocabulary, and study data.",
  "Support OCR, translation, romanization, and generated reading features when those tools are enabled.",
  "Maintain the app, diagnose problems, and improve reliability.",
];

const providerItems = [
  {
    name: "Supabase",
    detail: "Used for sign-in, hosted account storage, and authenticated sync.",
  },
  {
    name: "OpenAI",
    detail: "Used for OCR, translation alignment, and generated reader articles.",
  },
  {
    name: "Google Cloud Translate",
    detail: "Used for translation and romanization fallback.",
  },
];

const controlItems = [
  "Sign out of your account when you want to stop sharing account-backed data.",
  "Clear browser storage to remove local preferences and local session state.",
  "Stop using hosted features if you prefer a local-only workflow.",
  "Contact TextPlex support about account data questions or deletion requests.",
];

export default function PrivacyPage() {
  return (
    <RoutePage
      eyebrow="Privacy"
      title="Privacy policy"
      description="How TextPlex handles account data, reading history, and third-party service calls."
      links={[
        { href: "/auth?mode=sign-up&returnTo=%2Fhome", label: "Create account" },
        { href: "/", label: "Back to landing" },
      ]}
      metrics={[
        { label: "Scope", value: "Accounts and reading" },
        { label: "Third parties", value: "3 services" },
        { label: "Last updated", value: "Aug 7, 2026" },
      ]}
    >
      <section className="feature-grid">
        <article className="card feature-card" data-inventory-id="privacy.summary-card">
          <h2>Overview</h2>
          <p>
            TextPlex is a reading workspace built to help people import books, study language, and keep reading
            progress tied to an account or local profile.
          </p>
          <p className="small-copy">
            This policy draft explains what information TextPlex collects, how it uses that information, and where
            third-party services may receive it.
          </p>
        </article>

        <article className="card feature-card" data-inventory-id="privacy.collection-card">
          <h2>What we collect</h2>
          <div className="surface-list">
            {collectionItems.map((item) => (
              <article key={item} className="surface-list-item">
                <p>{item}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="card feature-card" data-inventory-id="privacy.usage-card">
          <h2>How we use information</h2>
          <div className="surface-list">
            {usageItems.map((item) => (
              <article key={item} className="surface-list-item">
                <p>{item}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="card feature-card" data-inventory-id="privacy.providers-card">
          <div className="card-topline">
            <h2>Third-party services</h2>
            <span className="pill">External</span>
          </div>
          <div className="surface-list">
            {providerItems.map((item) => (
              <article key={item.name} className="surface-list-item">
                <div className="card-topline">
                  <strong>{item.name}</strong>
                </div>
                <p className="small-copy">{item.detail}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="card feature-card" data-inventory-id="privacy.controls-card">
          <h2>Your choices</h2>
          <div className="surface-list">
            {controlItems.map((item) => (
              <article key={item} className="surface-list-item">
                <p>{item}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="card feature-card" data-inventory-id="privacy.contact-card">
        <h2>Questions</h2>
        <p>
          If you have questions about this policy, contact TextPlex support before using the service for material
          you are unsure about.
        </p>
        <p className="small-copy">
          For uploads and other material you choose to import, see the content-use rules in the app footer and the
          signup policy draft in the repository.
        </p>
        <p className="small-copy">
          <Link href="/auth?mode=sign-up&returnTo=%2Fhome">Create an account</Link> or return to the{" "}
          <Link href="/">landing page</Link>.
        </p>
      </section>
    </RoutePage>
  );
}
