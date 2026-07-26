import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui'

interface DataToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  placeholder?: string
  children?: ReactNode
}

export function DataToolbar({ search, onSearchChange, placeholder = 'Search…', children }: DataToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="sm:max-w-xs sm:flex-1">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          icon={<Search className="h-4 w-4" />}
          aria-label={placeholder}
        />
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
