/** Escapes a value for a CSV cell: wraps in quotes when it contains a comma, quote, or newline. */
function csvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

/** Builds a CSV string from column headers and row objects, in header order. */
export function buildCsv<T extends Record<string, unknown>>(
  columns: { key: keyof T; label: string }[],
  rows: T[],
): string {
  const header = columns.map((c) => csvCell(c.label)).join(',')
  const lines = rows.map((row) => columns.map((c) => csvCell(row[c.key])).join(','))
  return [header, ...lines].join('\r\n')
}

/** Triggers a browser download of a CSV string. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
