import type { ReactNode, CSSProperties, ElementType } from 'react'
import backdrop from '../../tokens/backdrop.json'
export type BackdropVariant = keyof typeof backdrop.tokens
type Props = { variant?: BackdropVariant; blur?: string; saturate?: number; brightness?: number; tint?: string; as?: ElementType; className?: string; style?: CSSProperties; children?: ReactNode }
/**
 * Glass panel abstraction. Reads --lm-backdrop-<variant>-* tokens; props override per instance.
 * - `isolation:isolate` so the panel forms its own stacking context (blend modes of children don't leak).
 * - `@supports not (backdrop-filter)` fallback in lab.css: tint is mixed toward opaque with color-mix, so text stays legible.
 */
export default function BackdropSurface({ variant = 'frost', blur, saturate, brightness, tint, as: Tag = 'div', className = '', style, children }: Props) {
  const v = `--lm-backdrop-${variant}`
  const vars = {
    '--bs-blur': blur ?? `var(${v}-blur)`, '--bs-saturate': saturate ?? `var(${v}-saturate)`,
    '--bs-brightness': brightness ?? `var(${v}-brightness)`, '--bs-tint': tint ?? `var(${v}-tint)`, ...style,
  } as CSSProperties
  return <Tag className={`lm-backdrop ${className}`} data-variant={variant} style={vars}>{children}</Tag>
}
