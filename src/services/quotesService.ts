import { supabase } from '@/lib/supabase'
import type { Quote, QuoteStatus, CargoType, TablesInsert } from '@/types'
import { logActivity } from './activityService'

export interface QuoteListParams {
  page: number
  pageSize: number
  search?: string
  status?: QuoteStatus | 'all'
}

export interface QuoteListResult {
  rows: Quote[]
  count: number
}

export async function listQuotes(params: QuoteListParams): Promise<QuoteListResult> {
  const { page, pageSize, search, status } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('quotes')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status && status !== 'all') query = query.eq('status', status)

  if (search && search.trim()) {
    const term = search.trim().replace(/[%,]/g, '')
    query = query.or(
      [
        `full_name.ilike.%${term}%`,
        `email.ilike.%${term}%`,
        `origin.ilike.%${term}%`,
        `destination.ilike.%${term}%`,
      ].join(','),
    )
  }

  const { data, error, count } = await query
  if (error) throw error
  return { rows: (data as Quote[]) ?? [], count: count ?? 0 }
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  const { error } = await supabase.from('quotes').update({ status }).eq('id', id)
  if (error) throw error
  await logActivity('quote.status_changed', 'quote', id, { status })
}

export async function deleteQuote(id: string, email: string): Promise<void> {
  const { error } = await supabase.from('quotes').delete().eq('id', id)
  if (error) throw error
  await logActivity('quote.deleted', 'quote', id, { email })
}

export interface QuoteRequestInput {
  full_name: string
  email: string
  phone?: string | null
  origin: string
  destination: string
  cargo_type: CargoType
  weight?: number | null
  message?: string | null
}

/**
 * Public quote request (anon-insertable per RLS). We deliberately do NOT chain
 * `.select()` — the anon role has no SELECT policy on quotes, so asking for the
 * inserted row back would fail RLS. Insert-only keeps the request one-way.
 */
export async function submitQuote(input: QuoteRequestInput): Promise<void> {
  const payload: TablesInsert<'quotes'> = {
    full_name: input.full_name,
    email: input.email,
    phone: input.phone ?? null,
    origin: input.origin,
    destination: input.destination,
    cargo_type: input.cargo_type,
    weight: input.weight ?? null,
    message: input.message ?? null,
  }
  const { error } = await supabase.from('quotes').insert(payload)
  if (error) throw error
}
