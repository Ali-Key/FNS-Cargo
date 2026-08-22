import { useEffect, useMemo, useState } from 'react'
import { Ban, CheckCircle2, Globe2, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  Alert,
  Badge,
  Button,
  DetailRow,
  MobileRowCard,
  RowActions,
  TableCell,
  TableCellPrimary,
  TableHeadCell,
  TableRow,
} from '@/components/ui'
import { ConfirmDialog, DataToolbar, FilterDropdown, ResponsiveDataList } from '@/components/dashboard'
import { useToast } from '@/context/ToastContext'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { invalidateCountries, useAllCountries } from '@/hooks/useCountries'
import {
  deleteCountry,
  getCountryUsage,
  setCountryActive,
  type CountryUsage,
} from '@/services/countriesService'
import type { Country } from '@/types'
import { countryFlagUrl } from '@/utils/country'
import { SettingsSection } from './SettingsSection'
import { CountryFormModal } from './CountryFormModal'

const PAGE_SIZE = 10

type StatusFilter = 'all' | 'active' | 'inactive'
type SortKey = 'order' | 'name' | 'recent'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'order', label: 'Display order' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'recent', label: 'Recently added' },
]

/** Flag chip, falling back to the ISO code when there is no artwork for it. */
function CountryFlag({ country }: { country: Country }) {
  const [broken, setBroken] = useState(false)
  const src = countryFlagUrl(country.code, 80)

  if (!src || broken) {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-deck-100 font-mono text-[10px] font-bold text-deck-600">
        {country.code.slice(0, 2).toUpperCase()}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setBroken(true)}
      className="h-7 w-7 shrink-0 rounded-full border border-deck-150 object-cover"
    />
  )
}

/**
 * Admin-only: the served-market list every country selector in the app reads.
 * Rendered by Settings behind `isAdmin`; the database enforces the same boundary
 * through the Admin-only insert/update/delete policies on `countries`.
 */
export function CountrySettings() {
  const toast = useToast()
  const { countries, loading, error, reload } = useAllCountries()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('order')
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Country | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [deleting, setDeleting] = useState<Country | null>(null)
  const [usage, setUsage] = useState<CountryUsage | null>(null)
  const [usageError, setUsageError] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const filtersActive = Boolean(debouncedSearch) || status !== 'all'

  const rows = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase()
    const filtered = countries.filter((c) => {
      if (status === 'active' && !c.is_active) return false
      if (status === 'inactive' && c.is_active) return false
      if (!term) return true
      return (
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term) ||
        c.hub_city.toLowerCase().includes(term) ||
        (c.lane ?? '').toLowerCase().includes(term)
      )
    })

    return [...filtered].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'recent') return b.created_at.localeCompare(a.created_at)
      return a.sort_order - b.sort_order || a.name.localeCompare(b.name)
    })
  }, [countries, debouncedSearch, status, sort])

  // A narrowed result set can leave the viewer on a page that no longer exists.
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  useEffect(() => {
    if (page > pageCount) setPage(1)
  }, [page, pageCount])
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const nextSortOrder = useMemo(
    () => countries.reduce((max, c) => Math.max(max, c.sort_order), 0) + 10,
    [countries],
  )

  /** Every consumer — shipment form, tracking form, public site — re-reads. */
  function refreshEverywhere() {
    invalidateCountries()
    reload()
  }

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(country: Country) {
    setEditing(country)
    setFormOpen(true)
  }

  async function toggleActive(country: Country) {
    // One status write at a time: a double-click on the row menu would
    // otherwise send two toggles and land on the value it started from.
    if (busyId) return
    setBusyId(country.id)
    try {
      await setCountryActive(country.id, !country.is_active)
      refreshEverywhere()
      toast.success(
        country.is_active ? 'Country deactivated' : 'Country activated',
        country.is_active
          ? `${country.name} is no longer offered on new shipments. Existing shipments are unchanged.`
          : `${country.name} can now be selected on new shipments.`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again in a moment.'
      toast.error(
        'Unable to change status',
        /row-level security|42501|permission denied/i.test(message)
          ? 'Only an admin can change the country list.'
          : message,
      )
    } finally {
      setBusyId(null)
    }
  }

  /**
   * The dialog opens straight away and fills in the consequence as it arrives:
   * `origin`, `destination` and `tracking_updates.country` hold the country
   * name rather than a foreign key, so nothing in the database would stop a
   * delete that leaves historical shipments naming a country that no longer
   * exists. Counting first is what makes the action safe.
   */
  function askDelete(country: Country) {
    setDeleting(country)
    setUsage(null)
    setUsageError(false)
    getCountryUsage(country.name)
      .then(setUsage)
      .catch(() => setUsageError(true))
  }

  function closeDelete() {
    setDeleting(null)
    setUsage(null)
    setUsageError(false)
  }

  /** Blocked deletes offer the safe alternative from the same button. */
  async function confirmDelete() {
    if (!deleting) return
    // The check failed, so the button is a retry: nothing is destroyed until we
    // know what the country is attached to.
    if (usageError) {
      setUsageError(false)
      getCountryUsage(deleting.name)
        .then(setUsage)
        .catch(() => setUsageError(true))
      return
    }
    if (usage === null) return
    const blocked = usage.total > 0

    setDeleteLoading(true)
    try {
      if (blocked) {
        if (deleting.is_active) await setCountryActive(deleting.id, false)
        refreshEverywhere()
        toast.success('Country deactivated', `${deleting.name} is no longer offered on new shipments.`)
      } else {
        await deleteCountry(deleting.id, deleting.name)
        refreshEverywhere()
        toast.success('Country deleted', `${deleting.name} has been removed from the list.`)
      }
      closeDelete()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again in a moment.'
      toast.error(
        'Unable to delete country',
        /row-level security|42501|permission denied/i.test(message)
          ? 'Only an admin can change the country list.'
          : message,
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  function actionItems(country: Country) {
    return [
      { label: 'Edit country', icon: <Pencil className="h-4 w-4" />, onClick: () => openEdit(country) },
      country.is_active
        ? { label: 'Deactivate', icon: <Ban className="h-4 w-4" />, onClick: () => void toggleActive(country) }
        : { label: 'Activate', icon: <CheckCircle2 className="h-4 w-4" />, onClick: () => void toggleActive(country) },
      { label: 'Delete country', icon: <Trash2 className="h-4 w-4" />, onClick: () => askDelete(country), danger: true },
    ]
  }

  const addButton = (
    <Button variant="deck" size="sm" icon={<Plus className="h-4 w-4" />} onClick={openAdd}>
      Add country
    </Button>
  )

  const loadFailed = Boolean(error) && countries.length === 0

  return (
    <SettingsSection
      title="Countries"
      description="The markets FSN Cargo serves. Active countries are the only ones offered on new shipments and shown on the public site."
      action={addButton}
    >
      {loadFailed && (
        <Alert
          variant="error"
          title="Unable to load countries"
          className="mb-4"
          action={
            <Button variant="secondary" size="sm" onClick={reload}>
              Try again
            </Button>
          }
        >
          Something went wrong fetching the country list. Please try again.
        </Alert>
      )}

      <ResponsiveDataList
        rows={pageRows}
        loading={loading}
        columnCount={5}
        skeletonRows={5}
        tableClassName="min-w-[720px]"
        toolbar={
          <DataToolbar
            embedded
            search={search}
            onSearchChange={setSearch}
            placeholder="Search country, code, or hub"
            filters={
              <>
                <FilterDropdown label="Status" options={STATUS_FILTERS} value={status} onChange={setStatus} />
                <FilterDropdown
                  label="Sort"
                  options={SORTS}
                  value={sort}
                  onChange={setSort}
                  allValue="order"
                />
              </>
            }
            summary={
              loading ? null : (
                <>
                  <span className="font-tabular font-semibold text-deck-800">{rows.length}</span>{' '}
                  {rows.length === 1 ? 'country' : 'countries'}
                </>
              )
            }
            filtersActive={filtersActive}
            onReset={() => {
              setSearch('')
              setStatus('all')
            }}
          />
        }
        tableHead={
          <TableRow>
            <TableHeadCell>Country</TableHeadCell>
            <TableHeadCell>Hub city</TableHeadCell>
            <TableHeadCell className="hidden lg:table-cell">Trade lane</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell className="text-right">
              <span className="sr-only">Actions</span>
            </TableHeadCell>
          </TableRow>
        }
        renderRow={(c) => (
          <TableRow key={c.id}>
            <TableCellPrimary>
              <div className="flex items-center gap-3">
                <CountryFlag country={c} />
                <div className="min-w-0">
                  <p className="truncate text-deck-900">{c.name}</p>
                  <p className="truncate font-mono text-[11px] font-normal uppercase text-deck-500">{c.code}</p>
                </div>
              </div>
            </TableCellPrimary>
            <TableCell className="text-deck-600">{c.hub_city}</TableCell>
            <TableCell className="hidden text-deck-500 lg:table-cell">{c.lane ?? '—'}</TableCell>
            <TableCell>
              <Badge variant={c.is_active ? 'success' : 'neutral'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end">
                <RowActions label={`Actions for ${c.name}`} items={actionItems(c)} />
              </div>
            </TableCell>
          </TableRow>
        )}
        renderMobileCard={(c) => (
          <MobileRowCard
            key={c.id}
            header={
              <div className="flex min-w-0 items-center gap-2.5">
                <CountryFlag country={c} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-deck-900">{c.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant={c.is_active ? 'success' : 'neutral'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                    <span className="font-mono text-[11px] uppercase text-deck-500">{c.code}</span>
                  </div>
                </div>
              </div>
            }
            actions={<RowActions label={`Actions for ${c.name}`} items={actionItems(c)} />}
          >
            <DetailRow label="Hub city" value={c.hub_city} />
            <DetailRow label="Trade lane" value={c.lane ?? '—'} />
            <DetailRow label="Display order" value={String(c.sort_order)} />
          </MobileRowCard>
        )}
        emptyIcon={<Globe2 className="h-5 w-5" />}
        emptyTitle={filtersActive ? 'No matching countries' : 'No countries found'}
        emptyDescription={
          filtersActive
            ? 'No country matches this search or filter. Clear them to see the full list.'
            : 'Add the markets FSN Cargo ships to and from. They become selectable on new shipments straight away.'
        }
        emptyAction={filtersActive ? undefined : addButton}
        pagination={{ page, pageCount, onPageChange: setPage, totalItems: rows.length, pageSize: PAGE_SIZE }}
      />

      <CountryFormModal
        open={formOpen}
        country={editing}
        nextSortOrder={nextSortOrder}
        onClose={() => setFormOpen(false)}
        onSaved={refreshEverywhere}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        loading={deleteLoading || (usage === null && !usageError)}
        variant={usage !== null && usage.total === 0 ? 'danger' : 'primary'}
        title={
          usageError
            ? 'Could not check this country'
            : usage !== null && usage.total > 0
              ? 'Deactivate this country instead?'
              : 'Delete this country?'
        }
        confirmLabel={
          usageError
            ? 'Try again'
            : usage !== null && usage.total > 0
              ? 'Deactivate instead'
              : 'Delete country'
        }
        description={
          <>
            {usage === null && !usageError && (
              <p>
                Checking whether <span className="font-semibold text-deck-900">{deleting?.name}</span> is used by
                existing records…
              </p>
            )}
            {usageError && (
              <p>
                We could not check whether <span className="font-semibold text-deck-900">{deleting?.name}</span> is
                still in use. Close this and try again rather than risk breaking shipment history.
              </p>
            )}
            {usage !== null && usage.total > 0 && (
              <p>
                <span className="font-semibold text-deck-900">{deleting?.name}</span> is named by{' '}
                <span className="font-semibold text-deck-900">{usage.shipments}</span>{' '}
                {usage.shipments === 1 ? 'shipment' : 'shipments'} and{' '}
                <span className="font-semibold text-deck-900">{usage.trackingEvents}</span>{' '}
                {usage.trackingEvents === 1 ? 'tracking event' : 'tracking events'}. Deleting it would leave that
                history pointing at a country that no longer exists, so it cannot be deleted. Deactivating removes it
                from new shipments and the public site while every existing record stays intact.
              </p>
            )}
            {usage !== null && usage.total === 0 && (
              <p>
                <span className="font-semibold text-deck-900">{deleting?.name}</span> is not used by any shipment or
                tracking event, so it can be removed permanently. This cannot be undone.
              </p>
            )}
          </>
        }
      />
    </SettingsSection>
  )
}
