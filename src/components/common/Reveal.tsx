import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface RevealProps {
  children: ReactNode
  /** Element to render as (default: div). Use 'section', 'form', 'li', etc. to keep semantics. */
  as?: ElementType
  /** Stagger delay in ms, applied once the element enters the viewport. */
  delay?: number
  className?: string
  /** Extra props (e.g. onSubmit when rendered as a form) are forwarded to the element. */
  [key: string]: unknown
}

/**
 * Reveals its children with a subtle fade-and-rise the first time they scroll
 * into view. Motion itself lives in the `.reveal` / `.is-visible` utilities so
 * `prefers-reduced-motion` users skip the animation and see content immediately.
 */
export function Reveal({ children, as: Tag = 'div', delay = 0, className, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={cn('reveal', visible && 'is-visible', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  )
}
