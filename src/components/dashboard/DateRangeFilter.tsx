import { Input } from '@/components/ui'

interface DateRangeFilterProps {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
}

/** A compact from/to date pair for scoping an export — deliberately not wired into page-level filters. */
export function DateRangeFilter({ from, to, onFromChange, onToChange }: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="date"
        aria-label="From date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        className="h-9 w-[9.5rem] px-2.5 text-xs"
      />
      <span className="text-xs text-steel-400">to</span>
      <Input
        type="date"
        aria-label="To date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        className="h-9 w-[9.5rem] px-2.5 text-xs"
      />
    </div>
  )
}
