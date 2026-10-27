// Thin, local shadcn-style primitives (Button / Switch / Tabs / Dialog) on native elements + litho tokens.
// Same API ergonomics as shadcn (variant/size, controlled value), none of the default gray.
import { useEffect, useRef, type ReactNode, type ButtonHTMLAttributes } from 'react'
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'ink' | 'paper' | 'accent'; size?: 'sm' | 'md' }
export function Button({ variant = 'paper', size = 'md', className = '', ...p }: BtnProps) {
  return <button {...p} className={`lm-btn lm-btn--${variant} lm-btn--${size} ${className}`} />
}
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="lm-switch" onClick={() => onChange(!checked)}><span className="lm-switch__knob" /></button>
}
export function Tabs<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: readonly T[]; label: string }) {
  return <div role="tablist" aria-label={label} className="lm-tabs">{items.map(i =>
    <button key={i} role="tab" type="button" aria-selected={value === i} className="lm-tab" onClick={() => onChange(i)}>{i}</button>)}</div>
}
/** Native <dialog> with closedby="any" (light dismiss) + Esc; entry/exit animated in CSS via @starting-style. */
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const d = ref.current!; if (open && !d.open) d.showModal(); if (!open && d.open) d.close() }, [open])
  return <dialog ref={ref} className="lm-dialog paper" onClose={onClose} {...{ closedby: 'any' }} aria-labelledby="lm-dlg-t"
    onClick={e => { if (e.target === ref.current) onClose() }}>
    <div className="lm-dialog__head"><h2 id="lm-dlg-t" className="font-display font-black text-2xl">{title}</h2><Button size="sm" onClick={onClose} aria-label="Close">✕</Button></div>{children}</dialog>
}
