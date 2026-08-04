import type { ReactNode } from 'react'
import { MoreVertical } from 'lucide-react'
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
  /** Accessible label for the trigger button, e.g. `Actions for FNS-00123`. */
  label?: string
}

/** Kebab-menu row actions for a table — replaces a row of separate icon buttons. */
export function RowActions({ items, align = 'right', label = 'Row actions' }: RowActionsProps) {
  return (
    <Dropdown
      align={align}
      items={items}
      trigger={
        <button
          type="button"
          className="rounded-control p-1.5 text-text-secondary hover:bg-steel-100 hover:text-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
          aria-label={label}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      }
    />
  )
}
