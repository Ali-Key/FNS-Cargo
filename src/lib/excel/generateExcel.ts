import ExcelJS from 'exceljs'

export interface ExcelSheet {
  name: string
  columns: { header: string; key: string; width?: number }[]
  // Intentionally `unknown[]`, not `Record<string, unknown>[]` — plain data interfaces
  // (e.g. RevenuePoint) have no index signature and TS rejects assigning them to an
  // indexed-object array type even though every column key exists on the row.
  rows: unknown[]
}

/** Builds a formatted .xlsx workbook (one or more sheets) and triggers a browser download. */
export async function downloadWorkbook(sheets: ExcelSheet[], filename: string): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'FNS Cargo'
  workbook.created = new Date()

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name)
    ws.columns = sheet.columns
    ws.addRows(sheet.rows as Record<string, unknown>[])
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B3B7A' } }
    ws.views = [{ state: 'frozen', ySplit: 1 }]
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
