import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

interface LogoProps {
  companyName?: string
  variant?: 'dark' | 'light'
  className?: string
}

export function Logo({ companyName = 'FNS Cargo', variant = 'dark', className }: LogoProps) {
  const [first, ...rest] = companyName.split(' ')
  return (
    <Link
      to="/"
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label={`${companyName} home`}
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 shadow-elevation-2">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none">
          <path
            d="M3 16.5 9 12l4 3 8-6.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="21" cy="8.5" r="1.6" fill="currentColor" />
        </svg>
      </span>
      <span
        className={cn(
          'font-display text-lg font-extrabold tracking-tight',
          variant === 'dark' ? 'text-navy-900' : 'text-white',
        )}
      >
        {first} <span className={variant === 'dark' ? 'text-navy-500' : 'text-steel-200'}>{rest.join(' ')}</span>
      </span>
    </Link>
  )
}
