import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface WorkflowStep {
  label: string
  done: boolean
}

/**
 * Read-only progress rail for the counter workflow (weigh → waybill → invoice
 * → paid → signed → delivered). Purely informational — every step here maps to
 * an action that already exists elsewhere on the page, so this never offers a
 * second way to perform it.
 */
export function WorkflowStepper({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border border-gray-200 bg-white px-4 py-3">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1">
          {i > 0 && <span className="mx-1.5 h-px w-4 shrink-0 bg-steel-200 sm:w-6" aria-hidden="true" />}
          <span
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold',
              step.done ? 'text-status-delivered' : 'text-steel-400',
            )}
          >
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {step.label}
          </span>
        </div>
      ))}
    </div>
  )
}
