import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { FSN_MARK } from '@/utils/brand'

interface LogoProps {
  companyName?: string
  variant?: 'dark' | 'light'
  className?: string
}

export function Logo({ companyName = 'FSN Cargo', variant = 'dark', className }: LogoProps) {
  const [first, ...rest] = companyName.split(' ')
  return (
    <Link
      to="/"
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label={`${companyName} home`}
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
        <img src={FSN_MARK} alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
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
