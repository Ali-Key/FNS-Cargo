import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button, Dropdown } from '@/components/dash'
import { useToast } from '@/context/ToastContext'

export interface ExportMenuItem {
  label: string
  onClick: () => Promise<void>
}

interface ExportMenuProps {
  items: ExportMenuItem[]
  label?: string
}

/** Dropdown of export actions. Each item runs independently and toasts on failure. */
export function ExportMenu({ items, label = 'Export' }: ExportMenuProps) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function run(item: ExportMenuItem) {
    setBusy(true)
    try {
      await item.onClick()
    } catch (err) {
      toast.error('Export failed', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dropdown
      align="right"
      trigger={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={<Download className="h-4 w-4" />}
          loading={busy}
        >
          {label}
        </Button>
      }
      items={items.map((item) => ({ label: item.label, onClick: () => void run(item) }))}
    />
  )
}
