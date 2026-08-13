import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/utils/cn'
import { FIELD_CONTROL, FIELD_ERROR, FieldShell } from './Field'

export interface ComboboxOption {
  value: string
  label: string
  /** Secondary line, e.g. an email or a role. */
  hint?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  label?: string
  error?: string
  hint?: string
  note?: string
  placeholder?: string
  id?: string
  disabled?: boolean
  /** Allow a typed value that is not in the list (free text with suggestions). */
  allowCustom?: boolean
  emptyMessage?: string
  className?: string
}

/**
 * Type-to-filter select. Used where a plain `<select>` gets unusable — customer
 * lists, cargo types, and the free-text fields (origin, warehouse, branch code)
 * that should suggest the values already in the database without locking the
 * operator out of a new one (`allowCustom`).
 */
export function Combobox({
  options,
  value,
  onChange,
  label,
  error,
  hint,
  note,
  placeholder,
  id,
  disabled,
  allowCustom,
  emptyMessage = 'No matches',
  className,
}: ComboboxProps) {
  const reactId = useId()
  const inputId = id ?? reactId
  const listId = `${inputId}-list`

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value])
  const display = open ? query : selected?.label ?? (allowCustom ? value : '')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!open || !term) return options
    return options.filter(
      (o) => o.label.toLowerCase().includes(term) || o.hint?.toLowerCase().includes(term),
    )
  }, [open, options, query])

  // Close on outside click; commit free text so a click-away never silently
  // discards what the operator typed.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (wrapperRef.current?.contains(e.target as Node)) return
      commit()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  })

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function commit() {
    if (allowCustom) {
      const typed = query.trim()
      const match = options.find((o) => o.label.toLowerCase() === typed.toLowerCase())
      onChange(match ? match.value : typed)
    }
    setOpen(false)
    setQuery('')
  }

  function pick(option: ComboboxOption) {
    onChange(option.value)
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setActive(0)
        return
      }
      setActive((i) => {
        if (filtered.length === 0) return 0
        const next = e.key === 'ArrowDown' ? i + 1 : i - 1
        return (next + filtered.length) % filtered.length
      })
      return
    }
    if (e.key === 'Enter') {
      if (!open) return
      e.preventDefault()
      const option = filtered[active]
      if (option) pick(option)
      else commit()
      return
    }
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <FieldShell id={inputId} label={label} error={error} hint={hint} note={note} className={className}>
      <div ref={wrapperRef} className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-deck-400">
          <Search className="h-4 w-4" aria-hidden="true" />
        </span>
        <input
          id={inputId}
          role="combobox"
          type="text"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          disabled={disabled}
          placeholder={placeholder}
          value={display}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            if (!open) setOpen(true)
          }}
          onFocus={() => {
            setQuery(allowCustom ? value : '')
            setOpen(true)
            setActive(0)
          }}
          onBlur={(e) => {
            // Keep the list alive while a click lands on one of its options.
            if (wrapperRef.current?.contains(e.relatedTarget as Node)) return
            commit()
          }}
          onKeyDown={handleKeyDown}
          className={cn(FIELD_CONTROL, 'h-10 pl-9 pr-9 text-sm', error && FIELD_ERROR)}
        />
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deck-400"
          aria-hidden="true"
        />

        {open && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-deck-sm border border-deck-150 bg-panel py-1 shadow-deck-pop"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-[13px] text-deck-500">
                {allowCustom && query.trim() ? `Use "${query.trim()}"` : emptyMessage}
              </li>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value
                return (
                  <li key={option.value || `__${index}`} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      data-active={index === active}
                      onMouseEnter={() => setActive(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(option)}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-deck-800',
                        index === active && 'bg-deck-50',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{option.label}</span>
                        {option.hint && <span className="block truncate text-[12px] text-deck-500">{option.hint}</span>}
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-signal-500" aria-hidden="true" />}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        )}
      </div>
    </FieldShell>
  )
}
