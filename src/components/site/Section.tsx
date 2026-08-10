import type { ElementType, ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Tone = 'white' | 'surface' | 'navy'
type Size = 'sm' | 'md' | 'lg'

interface SectionProps {
  children: ReactNode
  /**
   * The surface the section sits on. Alternating these is what gives the page
   * its rhythm — two `white` sections in a row read as one long section.
   */
  tone?: Tone
  /** Vertical rhythm. Three steps, not a free-form padding value. */
  size?: Size
  /** Quiet dot grid, only meaningful on `navy`. */
  patterned?: boolean
  as?: ElementType
  className?: string
  containerClassName?: string
  id?: string
}

/**
 * A public page section.
 *
 * Every public section goes through here. Before it existed the eight pages
 * carried 28 hand-rolled `<section>` wrappers between them, and the same
 * `py-16` base resolved to `sm:py-24` on some pages and `sm:py-20` on others —
 * so the vertical rhythm drifted page to page. Three sizes, three tones, and
 * the drift has nowhere to live.
 */
const TONES: Record<Tone, string> = {
  white: 'bg-white',
  surface: 'bg-surface border-y border-border',
  navy: 'bg-navy-900 text-white',
}

const SIZES: Record<Size, string> = {
  sm: 'py-12 sm:py-16',
  md: 'py-16 sm:py-20',
  lg: 'py-20 sm:py-28',
}

export function Section({
  children,
  tone = 'white',
  size = 'md',
  patterned = false,
  as: Tag = 'section',
  className,
  containerClassName,
  id,
}: SectionProps) {
  return (
    <Tag id={id} className={cn('relative', TONES[tone], patterned && 'overflow-hidden', className)}>
      {patterned && tone === 'navy' && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-route-dots bg-[size:22px_22px] opacity-[0.07]"
        />
      )}
      <div className={cn('container-page relative', SIZES[size], containerClassName)}>{children}</div>
    </Tag>
  )
}
