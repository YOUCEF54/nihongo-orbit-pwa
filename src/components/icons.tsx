interface IconProps {
  className?: string;
}

function baseProps(className?: string) {
  return {
    viewBox: "0 0 24 24",
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    "aria-hidden": true,
  } as const;
}

export function IconHome({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-8Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconArchive({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5Z" strokeLinejoin="round" />
      <path d="M8 9h8M8 13h5" strokeLinecap="round" />
    </svg>
  );
}

export function IconDojo({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M7 4v7a5 5 0 0 0 10 0V4" strokeLinecap="round" />
      <path d="M7 5H4v6c0 2 .8 3.6 2.2 4.6M17 5h3v6c0 2-.8 3.6-2.2 4.6M12 16v4M9 20h6" strokeLinecap="round" />
    </svg>
  );
}

export function IconOrbit({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M12 3l2.2 5.4L20 11l-5.8 2.6L12 19l-2.2-5.4L4 11l5.8-2.6L12 3Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPhone({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M10 5h4" strokeLinecap="round" />
      <path d="M11 18.5h2" strokeLinecap="round" />
    </svg>
  );
}

export function IconBolt({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconShield({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconWave({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M2 12c2.5-4 5.5-4 8 0s5.5 4 8 0M2 17c2.5-4 5.5-4 8 0s5.5 4 8 0" strokeLinecap="round" />
    </svg>
  );
}

export function IconSpark({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M12 2 14 9l7 2-7 2-2 7-2-7-7-2 7-2 2-7Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconUser({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
    </svg>
  );
}

export function IconGear({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.13-1.35l2-1.55-2-3.5-2.35.95A7 7 0 0 0 14 5.6L13.9 3h-4L9.7 5.6a7 7 0 0 0-2.52 1.3l-2.35-.95-2 3.5 2 1.55A7 7 0 0 0 4.7 12c0 .46.05.9.13 1.35l-2 1.55 2 3.5 2.35-.95A7 7 0 0 0 9.7 18.4l.2 2.6h4l.2-2.6a7 7 0 0 0 2.52-1.3l2.35.95 2-3.5-2-1.55c.08-.45.13-.9.13-1.35Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTrophy({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" strokeLinejoin="round" />
      <path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3M10 17h4M9 21h6M12 13v4" strokeLinecap="round" />
    </svg>
  );
}

export function IconChart({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M5 20V11M12 20V4M19 20v-6" strokeLinecap="round" />
    </svg>
  );
}

export function IconJade({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M12 3.5l1.7 3.9 4.3.4-3.3 2.8 1 4.2L12 12.6 8.3 14.8l1-4.2L6 7.8l4.3-.4L12 3.5Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconExpand({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCollapse({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCredit({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10h4M9.5 14h4" strokeLinecap="round" />
    </svg>
  );
}

export function IconRotateCw({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRotateCcw({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconVolume({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M4 9v6h3.5L12 19V5L7.5 9H4Z" strokeLinejoin="round" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" strokeLinecap="round" />
    </svg>
  );
}

export function IconPause({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M9 5v14M15 5v14" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlay({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M7 5l12 7-12 7V5Z" strokeLinejoin="round" />
    </svg>
  );
}