import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface PageHeroProps {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
  /** Optional band below the copy — a search field, a row of facts. */
  children?: ReactNode
}

/**
 * The navy band every inner public page opens with.
 *
 * Deliberately shorter than a marketing hero: this is the top of a page
 * someone navigated to on purpose, so it states where they are and gets out of
 * the way. One quiet grid gives the dark band depth without the blurred glow
 * blobs that read as generic.
 */
export function PageHero({ eyebrow, title, description, align = 'left', children }: PageHeroProps) {
  const centered = align === 'center'
  return (
    <section className="relative overflow-hidden bg-navy-900 py-14 text-white sm:py-16">
      <div aria-hidden className="absolute inset-0 bg-grid-pattern bg-[size:48px_48px] opacity-10" />
      <div className={cn('container-page relative animate-fade-up', centered && 'text-center')}>
        {eyebrow && (
          <p
            className={cn(
              'inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.14em] text-accent-400',
            )}
          >
            <span aria-hidden className="h-px w-6 bg-accent-400" />
            {eyebrow}
          </p>
        )}
        <h1
          className={cn(
            'mt-3 max-w-2xl text-balance text-3xl font-extrabold text-white sm:text-4xl',
            centered && 'mx-auto',
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              'mt-4 max-w-xl text-pretty leading-relaxed text-navy-200',
              centered && 'mx-auto',
            )}
          >
            {description}
          </p>
        )}
        {children && <div className={cn('mt-8', centered && 'flex justify-center')}>{children}</div>}
      </div>
    </section>
  )
}
