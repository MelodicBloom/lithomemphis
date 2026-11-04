import type { ReactNode } from 'react'
import Icon, { type IconName } from './Icon'
const tones = { commission: 'var(--cherry)', specimen: 'var(--sunflower)', kit: 'var(--lime)' } as const
/** Stamped offer chip — one per product line (commission / specimen / kit). */
export default function OfferChip({ kind, children, icon }: { kind: keyof typeof tones; children: ReactNode; icon?: IconName }) {
  return <span className="lm-offer-chip" style={{ ['--tone' as string]: tones[kind] }}>
    <Icon name={icon ?? (kind === 'commission' ? 'brush' : kind === 'kit' ? 'kit' : 'stamp')} size={16} />{children}</span>
}
