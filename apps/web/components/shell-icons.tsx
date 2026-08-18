"use client";

import type { ReactNode, SVGProps } from "react";

type ShellIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

const iconBase = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.9,
  viewBox: "0 0 24 24",
  focusable: "false",
} as const;

function ShellIcon({ size = 16, children, ...props }: ShellIconProps & { children: ReactNode }) {
  return (
    <svg {...iconBase} {...props} width={size} height={size} aria-hidden="true">
      {children}
    </svg>
  );
}

export function HomeIcon(props: ShellIconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M4 11.2 12 4l8 7.2" />
      <path d="M6.5 9.8V20h11V9.8" />
      <path d="M10.2 20v-5h3.6v5" />
    </ShellIcon>
  );
}

export function LibraryIcon(props: ShellIconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M4.5 19h15" />
      <path d="M5.8 6.5h2.8a1.4 1.4 0 0 1 1.4 1.4V19H7.2A1.4 1.4 0 0 1 5.8 17.6Z" />
      <path d="M10.3 5.8h3a1.4 1.4 0 0 1 1.4 1.4V19h-3a1.4 1.4 0 0 1-1.4-1.4Z" />
      <path d="M15.2 7.2h2.2a1.4 1.4 0 0 1 1.4 1.4V19h-2.2a1.4 1.4 0 0 1-1.4-1.4Z" />
    </ShellIcon>
  );
}

export function ReadIcon(props: ShellIconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M12 5.4v12" />
      <path d="M4.7 7.5A2.2 2.2 0 0 1 6.9 5.3H12v12H6.9a2.2 2.2 0 0 0-2.2 2.2Z" />
      <path d="M19.3 7.5A2.2 2.2 0 0 0 17.1 5.3H12v12h5.1a2.2 2.2 0 0 1 2.2 2.2Z" />
      <path d="M16.7 6.1v5.1l1.1-.8 1.1.8V6.1" />
    </ShellIcon>
  );
}

export function StudyIcon(props: ShellIconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M6.5 6.3h11A1.5 1.5 0 0 1 19 7.8v8.4a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 16.2V7.8a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M8.2 10.1h5.6" />
      <path d="M8.2 13.1h3.6" />
      <path d="m13.9 11.6 1 1 1.8-2" />
    </ShellIcon>
  );
}

export function AnalysisIcon(props: ShellIconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M4.5 18.5h15" />
      <path d="M6.5 18.5V13" />
      <path d="M10 18.5V10.4" />
      <path d="M13.5 18.5V7.9" />
      <path d="M17 18.5V5.8" />
      <path d="m6.2 12.3 3.2-1.7 3.4 1.4 3.7-4" />
      <circle cx="6.5" cy="13" r="0.7" />
      <circle cx="10" cy="10.4" r="0.7" />
      <circle cx="13.5" cy="7.9" r="0.7" />
      <circle cx="17" cy="5.8" r="0.7" />
    </ShellIcon>
  );
}

export function SearchIcon(props: ShellIconProps) {
  return (
    <ShellIcon {...props}>
      <circle cx="11" cy="11" r="6.2" />
      <path d="m15.6 15.6 4.2 4.2" />
    </ShellIcon>
  );
}

export function ProgressIcon(props: ShellIconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M5 18.5h14" />
      <path d="M7 15v3.5" />
      <path d="M10.5 11.8v6.7" />
      <path d="M14 8.8v9.7" />
      <path d="M17.5 5.8v12.7" />
      <path d="m6.5 12.8 3.3-1.9 3.5.6 4.2-4.8" />
      <circle cx="6.5" cy="12.8" r="0.7" />
      <circle cx="9.8" cy="10.9" r="0.7" />
      <circle cx="13.3" cy="11.5" r="0.7" />
      <circle cx="17.5" cy="6.7" r="0.7" />
    </ShellIcon>
  );
}

export function ImportIcon(props: ShellIconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M6.3 4.8h7.2l4.2 4.2V19H6.3Z" />
      <path d="M13.5 4.8V9h4.2" />
      <path d="M12 11v6" />
      <path d="m9.8 14.2 2.2 2.2 2.2-2.2" />
    </ShellIcon>
  );
}

export function ActivityIcon(props: ShellIconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M4.8 12h3l1.7-3.8 2.9 7.6 2.2-4 1.5 2.2h2.8" />
      <path d="M5 18.5h14" />
    </ShellIcon>
  );
}

export function RoadmapIcon(props: ShellIconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M6.2 17.2c2.2 0 2.2-3.6 4.4-3.6s2.2 3.6 4.4 3.6 2.2-3.6 4.4-3.6" />
      <circle cx="6.2" cy="17.2" r="1" />
      <circle cx="10.6" cy="13.6" r="1" />
      <circle cx="15" cy="17.2" r="1" />
      <circle cx="19.4" cy="13.6" r="1" />
    </ShellIcon>
  );
}

export function ProfileIcon(props: ShellIconProps) {
  return (
    <ShellIcon {...props}>
      <circle cx="12" cy="8.4" r="3.1" />
      <path d="M5.8 19a6.2 6.2 0 0 1 12.4 0" />
    </ShellIcon>
  );
}

export function SettingsIcon(props: ShellIconProps) {
  return (
    <ShellIcon {...props}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 4.6v2" />
      <path d="M12 17.4v2" />
      <path d="M4.6 12h2" />
      <path d="M17.4 12h2" />
      <path d="m6.8 6.8 1.4 1.4" />
      <path d="m15.8 15.8 1.4 1.4" />
      <path d="m6.8 17.2 1.4-1.4" />
      <path d="m15.8 8.2 1.4-1.4" />
    </ShellIcon>
  );
}

export function AuthIcon(props: ShellIconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M6.5 5.8h5.4v12.4H6.5" />
      <path d="M12.4 12H18" />
      <path d="m15.2 9.2 2.8 2.8-2.8 2.8" />
    </ShellIcon>
  );
}

export function MoreIcon(props: ShellIconProps) {
  return (
    <ShellIcon {...props}>
      <circle cx="6.5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="17.5" cy="12" r="1" />
    </ShellIcon>
  );
}

export function MenuIcon(props: ShellIconProps) {
  return (
    <ShellIcon {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </ShellIcon>
  );
}
