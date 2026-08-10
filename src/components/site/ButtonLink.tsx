import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { buttonClasses, type ButtonSize, type ButtonVariant } from '@/components/ui/buttonStyles'

interface ButtonLinkProps {
  to: string
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  className?: string
}

/**
 * A call to action that navigates.
 *
 * It renders one `<a>` rather than a `<button>` wrapped in a `<Link>` — the
 * old pattern nested a control inside a link, which gives assistive technology
 * two overlapping targets for one thing and makes the keyboard tab stop
 * ambiguous. Styling comes from the same source as `Button`, so the two cannot
 * drift apart.
 */
export function ButtonLink({
  to,
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  className,
}: ButtonLinkProps) {
  const external = /^(https?:|mailto:|tel:)/.test(to)
  const content = (
    <>
      {icon && iconPosition === 'left' && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="inline-flex shrink-0">{icon}</span>}
    </>
  )
  const classes = buttonClasses(variant, size, className)

  if (external) {
    return (
      <a
        href={to}
        className={classes}
        {...(to.startsWith('http') ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      >
        {content}
      </a>
    )
  }

  return (
    <Link to={to} className={classes}>
      {content}
    </Link>
  )
}
