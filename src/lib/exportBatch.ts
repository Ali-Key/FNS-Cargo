// PostgREST caps every response at `max_rows` (1000, see supabase/config.toml `[api]`),
// regardless of `.range()` width — a query for "all matching rows" silently truncates
// past that point. Export queries must page in bounded batches and concatenate.
const BATCH_SIZE = 1000

/** Pages `fetchPage` in `max_rows`-sized batches until a short page signals the end. */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ rows: T[]; count: number }>,
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  for (;;) {
    const to = from + BATCH_SIZE - 1
    const { rows } = await fetchPage(from, to)
    all.push(...rows)
    if (rows.length < BATCH_SIZE) break
    from += BATCH_SIZE
  }
  return all
}
