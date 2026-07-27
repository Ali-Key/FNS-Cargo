import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface PageHeroProps {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
}

/**
 * Shared navy hero band for the inner public pages (Services, Tracking, About,
 * Contact). Consolidates the eyebrow → title → description rhythm and the
 * decorative depth (grid, accent glow) so every page opens consistently.
 */
export function PageHero({ eyebrow, title, description, align = 'left' }: PageHeroProps) {
  const centered = align === 'center'
  return (
    <section className="relative overflow-hidden bg-navy-950 py-16 text-white sm:py-20">
      <div aria-hidden className="absolute inset-0 bg-grid-pattern bg-[size:48px_48px] opacity-20" />
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-navy-500/25 blur-3xl" />
      <div className={cn('container-page relative animate-fade-up', centered && 'text-center')}>
        <p className="text-sm font-bold uppercase tracking-wider text-accent-400">{eyebrow}</p>
        <h1
          className={cn(
            'mt-3 max-w-2xl text-balance text-4xl font-extrabold text-white sm:text-5xl',
            centered && 'mx-auto',
          )}
        >
          {title}
        </h1>
        {description && (
          <p className={cn('mt-4 max-w-xl text-pretty text-steel-300', centered && 'mx-auto')}>{description}</p>
        )}
      </div>
    </section>
  )
}
