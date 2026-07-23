import Link from "next/link";
import type { ReactNode } from "react";

type RouteLink = {
  href: string;
  label: string;
};

type Metric = {
  label: string;
  value: string;
  detail?: string;
};

interface RoutePageProps {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  links?: RouteLink[];
  metrics?: Metric[];
  className?: string;
  children?: ReactNode;
}

export function RoutePage({
  eyebrow,
  title,
  description,
  badge,
  links = [],
  metrics = [],
  className,
  children,
}: RoutePageProps) {
  return (
    <main className="app-shell">
      <section className={`home-hero card${className ? ` ${className}` : ""}`}>
        <span className="eyebrow">{eyebrow}</span>
        <div className="card-topline">
          <h1>{title}</h1>
          {badge ? <span className="pill">{badge}</span> : null}
        </div>
        {description.trim().length > 0 ? <p className="lede">{description}</p> : null}
        {links.length > 0 ? (
          <div className="button-row">
            {links.map((link) => (
              <Link key={link.href} className="button button-secondary" href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
        {metrics.length > 0 ? (
          <section className="metric-grid" aria-label={`${title} metrics`}>
            {metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.value === "Loading" ? <span className="metric-skeleton" aria-label="Loading" /> : metric.value}</dd>
                {metric.detail ? <p className="small-copy">{metric.detail}</p> : null}
              </div>
            ))}
          </section>
        ) : null}
      </section>

      {children}
    </main>
  );
}
