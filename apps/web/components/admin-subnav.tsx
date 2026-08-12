"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminSections = [
  { href: "/admin", label: "Platform usage" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/themes", label: "Themes" },
  { href: "/roadmap", label: "Roadmap" },
];

export function AdminSubnav() {
  const pathname = usePathname();

  return (
    <nav className="admin-subnav" aria-label="Admin sections" data-inventory-id="admin.nav">
      <span className="admin-subnav-label">Admin</span>
      <div className="admin-subnav-links">
        {adminSections.map((section) => {
          const active = section.href === "/admin" ? pathname === section.href : pathname.startsWith(section.href);
          return (
            <Link className={`admin-subnav-link${active ? " is-active" : ""}`} href={section.href} aria-current={active ? "page" : undefined} key={section.href}>
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
