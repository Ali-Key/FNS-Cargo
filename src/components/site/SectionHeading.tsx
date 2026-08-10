import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Reveal } from './Reveal'

interface SectionHeadingProps {
  /** Small uppercase label above the title. */
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  /** Centre the block (default) or align left for asymmetric layouts. */
  align?: 'center' | 'left'
  /** Render on a dark band. */
  tone?: 'light' | 'dark'
  className?: string
}

/**
 * Eyebrow → title → description, in one type scale.
 *
 * Every section on the public site opens with one of these, so the entry
 * rhythm is identical everywhere. The pages used to inline this markup — four
 * copies on the home page alone — and the copies had already drifted apart on
 * eyebrow colour and heading size.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  tone = 'light',
  className,
}: SectionHeadingProps) {
  const dark = tone === 'dark'
  return (
    <div className={cn(align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl', className)}>
      {eyebrow && (
        <Reveal>
          <p
            className={cn(
              'inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.14em]',
              dark ? 'text-accent-400' : 'text-primary-600',
            )}
          >
            <span
              aria-hidden
              className={cn('h-px w-6', dark ? 'bg-accent-400' : 'bg-primary-400')}
            />
            {eyebrow}
          </p>
        </Reveal>
      )}

      <Reveal delay={60}>
        <h2
          className={cn(
            'mt-3 text-balance text-3xl font-extrabold sm:text-4xl',
            dark ? 'text-white' : 'text-navy-900',
          )}
        >
          {title}
        </h2>
      </Reveal>

      {description && (
        <Reveal delay={120}>
          <p
            className={cn(
              'mt-4 text-pretty leading-relaxed',
              dark ? 'text-navy-200' : 'text-text-secondary',
              align === 'center' && 'mx-auto max-w-xl',
            )}
          >
            {description}
          </p>
        </Reveal>
      )}
    </div>
  )
}
