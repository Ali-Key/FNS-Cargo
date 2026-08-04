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
 * Contact). Consolidates the eyebrow → title → description rhythm so every page
 * opens consistently. A single low-opacity grid gives quiet depth on the dark
 * band without the ambient blur "glow" that reads as generic.
 */
export function PageHero({ eyebrow, title, description, align = 'left' }: PageHeroProps) {
  const centered = align === 'center'
  return (
    <section className="relative overflow-hidden bg-navy-950 py-16 text-white sm:py-20">
      <div aria-hidden className="absolute inset-0 bg-grid-pattern bg-[size:48px_48px] opacity-10" />
      <div className={cn('container-page relative animate-fade-up', centered && 'text-center')}>
        <p className="text-sm font-bold uppercase tracking-wider text-primary-400">{eyebrow}</p>
        <h1
          className={cn(
            'mt-3 max-w-2xl text-balance text-4xl font-extrabold text-white sm:text-5xl',
            centered && 'mx-auto',
          )}
        >
          {title}
        </h1>
        {description && (
          <p className={cn('mt-4 max-w-xl text-pretty text-gray-300', centered && 'mx-auto')}>{description}</p>
        )}
      </div>
    </section>
  )
}
