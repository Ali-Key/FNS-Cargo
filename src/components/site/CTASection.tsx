import type { ReactNode } from 'react'
import { Section } from './Section'
import { Reveal } from './Reveal'

interface CTASectionProps {
  title: string
  description?: string
  children: ReactNode
}

/**
 * The closing block on a public page.
 *
 * Flat navy with the same quiet dot grid every other dark band uses. It was
 * previously a three-stop gradient with a blurred blob floating over it, which
 * matched nothing else on the site and is the single clearest tell of a
 * generated layout.
 */
export function CTASection({ title, description, children }: CTASectionProps) {
  return (
    <Section tone="navy" size="md" patterned>
      <Reveal className="flex flex-col items-center gap-5 text-center">
        <h2 className="max-w-xl text-balance text-3xl font-extrabold text-white sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="max-w-lg text-pretty leading-relaxed text-navy-200">{description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center justify-center gap-3">{children}</div>
      </Reveal>
    </Section>
  )
}
