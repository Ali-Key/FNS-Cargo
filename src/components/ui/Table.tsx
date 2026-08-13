import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="deck-scroll w-full overflow-x-auto">
      <table className={cn('w-full min-w-[720px] border-collapse text-left text-sm', className)} {...props} />
    </div>
  )
}

/** Opaque on purpose: the head is `sticky` inside `ResponsiveDataList`, so a
 *  translucent fill would let scrolled rows bleed through the column labels.
 *  It sticks to the wrapper above — not the viewport — because `overflow-x-auto`
 *  computes `overflow-y` to `auto`, which makes that div the containing block.
 *  Hence `top-0` there: any other offset paints the header down onto row one. */
export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-deck-100 bg-deck-50', className)} {...props} />
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-deck-100 bg-panel', className)} {...props} />
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors hover:bg-deck-50/70', className)} {...props} />
}

export function TableHeadCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-deck-500',
        className,
      )}
      {...props}
    />
  )
}

/** 48px rows: dense enough for a full manifest on one screen, tall enough for
 *  a badge plus a secondary line without clipping. */
export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('whitespace-nowrap px-4 py-3 text-[13px] text-deck-800', className)} {...props} />
}

/** The identifying cell of a row — tracking number, invoice number, name. */
export function TableCellPrimary({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('whitespace-nowrap px-4 py-3 text-[13px] font-semibold text-deck-900', className)} {...props} />
}
