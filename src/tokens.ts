export const palette = {
  ink: '#0E0E0E', paper: '#F7F6F2', cornflower: '#3B6FF0', sunflower: '#EABF41',
  cherry: '#D54545', lime: '#9BBF49', mauve: '#9B5478', wine: '#58294B',
} as const
export const fonts = { display: 'Fraunces', serif: 'Instrument Serif', mono: 'Space Mono', sans: 'Inter' } as const
export type PaletteKey = keyof typeof palette
