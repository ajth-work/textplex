"use client";

import type { TesterBuildChangelogEntry } from "../lib/tester-build-updates";

type TesterBuildUpdateGateProps = {
  currentBuild: string;
  lastBuild: string | null;
  entries: readonly TesterBuildChangelogEntry[];
  onAcknowledge: () => void;
};

export function TesterBuildUpdateGate({ currentBuild, lastBuild, entries, onAcknowledge }: TesterBuildUpdateGateProps) {
  return (
    <main className="tester-build-update-shell" data-inventory-id="shell.tester-build-update-gate">
      <section className="card tester-build-update-card" aria-labelledby="tester-build-update-title">
        <div className="tester-build-update-heading">
          <span className="eyebrow">New build for testing</span>
          <span className="tester-build-update-build">Build {currentBuild}</span>
        </div>
        <div>
          <h1 id="tester-build-update-title">What changed since you last visited</h1>
          <p className="route-description">
            {lastBuild
              ? `You last acknowledged build ${lastBuild}. Here is what changed before build ${currentBuild}.`
              : "This is your first recorded tester visit. Here is what is included in the current build."}
          </p>
        </div>

        <div className="tester-build-update-list" data-inventory-id="shell.tester-build-update-sections">
          {entries.map((entry) => (
            <article className="tester-build-update-release" key={entry.build}>
              <div className="tester-build-update-release-heading">
                <h2>Build {entry.build}</h2>
                <p>{entry.summary}</p>
              </div>
              <div className="tester-build-update-sections">
                {entry.sections.map((section) => (
                  <section className="tester-build-update-section" key={section.id} data-inventory-id="shell.tester-build-update-section">
                    <h3>{section.title}</h3>
                    <p>{section.summary}</p>
                    <ul data-inventory-id="shell.tester-build-update-items">
                      {section.changes.map((change) => <li key={change}>{change}</li>)}
                    </ul>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="tester-build-update-actions">
          <p className="small-copy">After you continue, you can explore any of these areas and send feedback from inside the app.</p>
          <button className="button button-primary" type="button" onClick={onAcknowledge} data-inventory-id="shell.tester-build-update-acknowledge">
            Acknowledge and continue
          </button>
        </div>
      </section>
    </main>
  );
}
