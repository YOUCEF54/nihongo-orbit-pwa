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

export function IconClose({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------
   Activity sigils — one distinct mark per dojo activity + game.
   Same contract as the set above: 24×24, currentColor, stroke 1.8,
   readable down to 12px (chips).
   ------------------------------------------------------------ */

/** Strokes — writing brush. */
export function IconBrush({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M4 20l.9-4.2L15.4 5.3a2.1 2.1 0 0 1 3 3L7.8 18.9 4 20Z" strokeLinejoin="round" />
      <path d="M14 6.8l3.2 3.2" />
    </svg>
  );
}

/** Scramble — reorder the blocks. */
export function IconShuffle({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M4 7h3.8l8.4 10H20" strokeLinejoin="round" />
      <path d="M4 17h3.8l8.4-10H20" strokeLinejoin="round" />
      <path d="M17.6 4.4 20 7l-2.4 2.6" strokeLinejoin="round" />
      <path d="M17.6 14.4 20 17l-2.4 2.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Review — FSRS card stack. */
export function IconCards({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <rect x="3.5" y="7" width="11" height="13.5" rx="2" />
      <path d="M8 4h9.5a2 2 0 0 1 2 2v11" strokeLinecap="round" />
    </svg>
  );
}

/** Pitch / echo — ear. */
export function IconEar({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path
        d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M15 8.2a3 3 0 0 0-6 0" strokeLinecap="round" />
    </svg>
  );
}

/** Matrix — stroke-order grid. */
export function IconGrid({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9.33 4v16M14.67 4v16M4 9.33h16M4 14.67h16" />
    </svg>
  );
}

/** Listen — headphones. */
export function IconHeadphones({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M4.8 15.2v-3.4a7.2 7.2 0 0 1 14.4 0v3.4" strokeLinecap="round" />
      <rect x="3.2" y="13.6" width="4" height="6.6" rx="1.7" />
      <rect x="16.8" y="13.6" width="4" height="6.6" rx="1.7" />
    </svg>
  );
}

/** Assemble — insert a block into the slots. */
export function IconBlocks({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <rect x="4" y="15" width="6.6" height="5.5" rx="1.4" />
      <rect x="13.4" y="15" width="6.6" height="5.5" rx="1.4" />
      <path d="M12 3.5v7" strokeLinecap="round" />
      <path d="M9.2 7.7 12 10.5l2.8-2.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Grammar — particles orbiting a nucleus. */
export function IconParticles({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <circle cx="12" cy="12" r="2.2" />
      <ellipse cx="12" cy="12" rx="8.8" ry="3.5" />
      <ellipse cx="12" cy="12" rx="8.8" ry="3.5" transform="rotate(60 12 12)" />
    </svg>
  );
}

/** Taiko — drum head with its rim and a bachi. */
export function IconDrum({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <ellipse cx="11" cy="14" rx="7.6" ry="6.2" />
      <path d="M4 12c2 1.2 4.3 1.8 7 1.8s5-.6 7-1.8" strokeLinecap="round" />
      <path d="M14.6 8.6 19.8 3.4" strokeLinecap="round" />
    </svg>
  );
}

/** Astral Abacus — hex ring around a hub. */
export function IconHexRing({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M12 2.8 19.8 7.3v9L12 20.8 4.2 16.3v-9L12 2.8Z" strokeLinejoin="round" />
      <circle cx="12" cy="11.8" r="2.6" />
    </svg>
  );
}

/** Radical Confluence — flood one region of the grid. */
export function IconFlood({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.4" />
      <path d="M12 3.5v17M3.5 12h17" />
      <path
        d="M5.9 3.5h6.1v8.5H3.5V5.9a2.4 2.4 0 0 1 2.4-2.4Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

/** Resonance Crystals — the hard currency: a cut gem. */
export function IconCrystal({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M6 3h12l4 6-10 13L2 9l4-6Z" strokeLinejoin="round" />
      <path d="M11 3 8 9l4 13 4-13-3-6" strokeLinejoin="round" />
      <path d="M2 9h20" />
    </svg>
  );
}

/** Standard Signal Ticket — the pull pass. */
export function IconTicket({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path
        d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2Z"
        strokeLinejoin="round"
      />
      <path d="M13 5v2" strokeLinecap="round" />
      <path d="M13 11v2" strokeLinecap="round" />
      <path d="M13 17v2" strokeLinecap="round" />
    </svg>
  );
}

/** Resonance Shards — recycling dust: a pair of glass chips. */
export function IconShard({ className }: IconProps) {
  return (
    <svg {...baseProps(className)}>
      <path d="M9.5 3.8 14 8.3l-4.5 4.5L5 8.3l4.5-4.5Z" strokeLinejoin="round" />
      <path d="M16.5 11.5 20 15l-3.5 3.5L13 15l3.5-3.5Z" strokeLinejoin="round" />
      <path d="M7.5 15.5 9.5 17.5 7.5 19.5 5.5 17.5 7.5 15.5Z" strokeLinejoin="round" />
    </svg>
  );
}