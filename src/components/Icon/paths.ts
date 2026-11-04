// Stamp-cut icon set, 24×24, 2px ink stroke, square-ish caps — drawn to read like rubber stamps.
export const iconPaths = {
  stamp: 'M9 3h6v5l3 2v3H6v-3l3-2zM4 16h16v3H4zM7 21h10',
  brush: 'M14 3l7 7-8 8-4-4zM9 14l-3 3c-2 0-3 1-3 4 3 0 4-1 4-3l3-3',
  press: 'M3 7h18v4H3zM6 11v6M18 11v6M4 17h16v4H4zM9 3h6v4H9z',
  ink: 'M12 3c3 5 6 8 6 12a6 6 0 01-12 0c0-4 3-7 6-12zM9 15a3 3 0 003 3',
  registration: 'M12 2v20M2 12h20M12 7a5 5 0 110 10 5 5 0 010-10z',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  spring: 'M5 4h14M5 20h14M7 4c10 2-10 3 0 5s-10 3 0 5 10 3 0 6',
  sparkle: 'M12 2l2 7 7 3-7 3-2 7-2-7-7-3 7-3z',
  star: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.4 6.6 19.4l1.3-6L3.4 9.3l6-.7z',
  kit: 'M3 8h18v12H3zM8 8V5h8v3M3 13h18M11 12h2v3h-2z',
  ticket: 'M3 6h18v4a2 2 0 000 4v4H3v-4a2 2 0 000-4zM14 6v12',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 110 6 3 3 0 010-6z',
} as const
export type IconName = keyof typeof iconPaths
