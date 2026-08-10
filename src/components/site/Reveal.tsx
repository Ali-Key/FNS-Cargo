import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from 'react'
import { cn } from '@/utils/cn'

interface RevealProps {
  children: ReactNode
  /** Element to render as. Use 'section', 'form', 'li' etc. to keep semantics. */
  as?: ElementType
  /** Stagger delay in ms, applied once the element enters the viewport. */
  delay?: number
  className?: string
  [key: string]: unknown
}

/**
 * Reveals its children with a fade-and-rise the first time they scroll into
 * view. The motion lives in the `.reveal` / `.is-visible` utilities, so
 * `prefers-reduced-motion` users see the content already settled rather than a
 * faster animation.
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
      // `threshold` rather than a negative rootMargin: a negative margin never
      // fires for a section taller than the viewport, which strands the content
      // at opacity 0. If a section renders blank, check this first.
      { threshold: 0.12 },
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

const StaggerContext = createContext<number>(0)

interface RevealGroupProps {
  children: ReactNode
  /** Milliseconds between each child. */
  stagger?: number
  as?: ElementType
  className?: string
}

/**
 * Staggers its `RevealItem` children.
 *
 * A grid of six cards revealed at once reads as a flash; revealed one after
 * another it reads as deliberate. The group holds the step, the items count
 * themselves — so reordering the grid does not mean renumbering delays by hand.
 */
export function RevealGroup({
  children,
  stagger = 70,
  as: Tag = 'div',
  className,
}: RevealGroupProps) {
  return (
    <StaggerContext.Provider value={stagger}>
      <Tag className={className}>{children}</Tag>
    </StaggerContext.Provider>
  )
}

interface RevealItemProps {
  children: ReactNode
  /** Position in the group; multiplied by the group's stagger. */
  index?: number
  as?: ElementType
  className?: string
}

export function RevealItem({ children, index = 0, as = 'div', className }: RevealItemProps) {
  const stagger = useContext(StaggerContext)
  return (
    <Reveal as={as} delay={index * stagger} className={className}>
      {children}
    </Reveal>
  )
}
