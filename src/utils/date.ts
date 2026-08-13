function toValidDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | Date | null | undefined, fallback = 'Not available'): string {
  const date = toValidDate(value)
  if (!date) return fallback
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

export function formatDateTime(value: string | Date | null | undefined, fallback = 'Not available'): string {
  const date = toValidDate(value)
  if (!date) return fallback
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatTime(value: string | Date | null | undefined, fallback = '—'): string {
  const date = toValidDate(value)
  if (!date) return fallback
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date)
}
