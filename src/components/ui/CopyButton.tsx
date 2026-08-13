import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/utils/cn'

/** Small copy-to-clipboard affordance for primary identifiers (tracking #, invoice #). */
export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        })
      }}
      className={cn(
        'deck-focus shrink-0 rounded-chip p-1 text-deck-400 transition-colors hover:bg-deck-100 hover:text-signal-600',
        className,
      )}
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-status-delivered" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}
