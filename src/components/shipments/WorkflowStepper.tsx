import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface WorkflowStep {
  label: string
  done: boolean
}

/**
 * Read-only progress rail for the counter workflow (weigh → waybill → invoice
 * → paid → signed → delivered). Purely informational — every step maps to an
 * action that already exists elsewhere on the page, so this never offers a
 * second way to perform it.
 *
 * Drawn as a continuous track with a filled leading edge rather than a row of
 * ticks: the shape itself says "how far along", before any label is read.
 */
export function WorkflowStepper({ steps, className }: { steps: WorkflowStep[]; className?: string }) {
  const doneCount = steps.filter((s) => s.done).length
  const pct = steps.length > 1 ? Math.round(((doneCount - 1) / (steps.length - 1)) * 100) : 0

  return (
    <div className={cn('rounded-deck bg-panel px-5 py-4 shadow-deck', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-deck-500">Counter workflow</p>
        <p className="font-tabular text-[11px] font-semibold text-deck-500">
          {doneCount} of {steps.length} complete
        </p>
      </div>

      <div className="relative mt-4">
        {/* Track sits behind the markers and is clipped to the row of centres. */}
        <div
          className="absolute left-0 right-0 top-[11px] h-0.5 rounded-full bg-deck-100"
          style={{ left: `${50 / steps.length}%`, right: `${50 / steps.length}%` }}
          aria-hidden="true"
        />
        <div
          className="absolute top-[11px] h-0.5 rounded-full bg-signal-500 transition-[width] duration-500 ease-out-premium"
          style={{ left: `${50 / steps.length}%`, width: `${Math.max(0, pct) * (1 - 1 / steps.length)}%` }}
          aria-hidden="true"
        />

        <ol className="relative flex">
          {steps.map((step) => (
            <li key={step.label} className="flex flex-1 flex-col items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors',
                  step.done
                    ? 'bg-signal-500 text-white ring-4 ring-signal-500/15'
                    : 'bg-panel text-deck-300 ring-1 ring-inset ring-deck-200',
                )}
              >
                {step.done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-deck-300" />}
              </span>
              <span
                className={cn(
                  'text-center text-[11px] font-semibold leading-tight',
                  step.done ? 'text-deck-900' : 'text-deck-400',
                )}
              >
                {step.label}
                <span className="sr-only">{step.done ? ' — complete' : ' — pending'}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
