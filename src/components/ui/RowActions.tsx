import type { ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Dropdown } from './Dropdown'

interface RowAction {
  label: string
  icon?: ReactNode
  onClick: () => void
  danger?: boolean
}

interface RowActionsProps {
  items: RowAction[]
  align?: 'left' | 'right'
  /** Accessible label for the trigger, e.g. `Actions for FSN-CN-000123`. */
  label?: string
  /** Section label inside the menu. Defaults to the record named in `label`. */
  title?: string
}

/** Kebab-menu row actions for a table row or mobile card. The trigger carries a
 *  hairline box so it reads as a control at rest — a bare glyph in a dense
 *  manifest looks like decoration — and stays latched while its menu is open. */
export function RowActions({ items, align = 'right', label = 'Row actions', title }: RowActionsProps) {
  return (
    <Dropdown
      align={align}
      items={items}
      title={title ?? (label.startsWith('Actions for ') ? label.slice('Actions for '.length) : undefined)}
      trigger={
        <button
          type="button"
          className="deck-focus inline-flex h-8 w-8 items-center justify-center rounded-deck-sm border border-deck-150 bg-transparent text-deck-500 transition-colors hover:border-deck-300 hover:bg-panel hover:text-deck-900 aria-expanded:border-deck-900 aria-expanded:bg-deck-900 aria-expanded:text-white"
          aria-label={label}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      }
    />
  )
}
