import { cn } from '@/utils/cn'

interface SectionHeadingProps {
  /** Small uppercase label above the title. */
  eyebrow?: string
  title: string
  description?: string
  /** Centre the block (default) or align it left for asymmetric layouts. */
  align?: 'center' | 'left'
  /** Render on a dark band. */
  tone?: 'light' | 'dark'
  className?: string
}

/**
 * The single section header used across the public site so eyebrow, title, and
 * description keep one type scale and rhythm everywhere.
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
    <div
      className={cn(
        align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl',
        className,
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            'text-sm font-bold uppercase tracking-[0.14em]',
            dark ? 'text-accent-400' : 'text-accent-600',
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          'mt-3 text-balance text-3xl font-extrabold sm:text-4xl',
          dark ? 'text-white' : 'text-navy-900',
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            'mt-4 text-pretty leading-relaxed',
            dark ? 'text-steel-300' : 'text-steel-500',
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}
