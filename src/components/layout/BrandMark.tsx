import { cn } from '@/utils/cn'
import { FSN_MARK } from '@/utils/brand'

interface BrandMarkProps {
  /** Hide the wordmark and render only the glyph — used by the collapsed rail. */
  compact?: boolean
  /** 'rail' sits on the dark deck surface, 'light' on white. */
  tone?: 'rail' | 'light'
  className?: string
}

/**
 * FSN Cargo console identity. Renders the same original brand mark the public
 * site uses (`FSN_MARK`) so the console and the marketing site are one brand.
 */
export function BrandMark({ compact, tone = 'rail', className }: BrandMarkProps) {
  const onRail = tone === 'rail'
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <img src={FSN_MARK} alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
      </span>
      {!compact && (
        <span className={cn('flex flex-col leading-none', onRail ? 'text-white' : 'text-deck-900')}>
          <span className="font-display text-[15px] font-extrabold tracking-tight">
            FSN <span className={onRail ? 'text-signal-300' : 'text-signal-600'}>Cargo</span>
          </span>
          <span className={cn('mt-1 text-[10px] font-semibold uppercase tracking-[0.16em]', onRail ? 'text-deck-400' : 'text-deck-500')}>
            Operations
          </span>
        </span>
      )}
    </span>
  )
}
