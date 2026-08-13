import { useCallback, useMemo, useState } from "react";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  FileText,
  Mail,
  Phone,
  ReceiptText,
  Trash2,
} from "lucide-react";

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
} from "@/components/ui";

import {
  PageHeader,
  DataToolbar,
  ConfirmDialog,
  FilterDropdown,
  ResponsiveDataList,
} from "@/components/dashboard";

import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCachedResource } from "@/hooks/useCachedResource";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

import {
  listQuotes,
  updateQuoteStatus,
  deleteQuote,
} from "@/services/quotesService";

import {
  QUOTE_STATUSES,
  type Quote,
  type QuoteStatus,
} from "@/types";

import { formatDate } from "@/utils/date";

const PAGE_SIZE = 10;

const STATUS_VARIANT: Record<
  QuoteStatus,
  "warning" | "info" | "success" | "neutral"
> = {
  Pending: "warning",
  Reviewed: "info",
  Quoted: "success",
  Closed: "neutral",
};

const STATUS_OPTIONS = [
  {
    value: "all" as QuoteStatus | "all",
    label: "All statuses",
  },
  ...QUOTE_STATUSES.map((s) => ({
    value: s as QuoteStatus | "all",
    label: s,
  })),
];

export default function Quotes() {
  useDocumentTitle("Quote Requests | FSN Cargo");

  const toast = useToast();
  const { isAdmin } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<QuoteStatus | "all">("all");

  const debouncedSearch = useDebouncedValue(search);

  const [deleting, setDeleting] = useState<Quote | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Reset to page one during render rather than in an effect, so the fetch
  // below never runs once for the old page and again for the reset one.
  const filterSignature = `${debouncedSearch}|${status}`;
  const [lastFilters, setLastFilters] = useState(filterSignature);
  if (lastFilters !== filterSignature) {
    setLastFilters(filterSignature);
    setPage(1);
  }

  const quotesKey = useMemo(
    () =>
      `quotes:${JSON.stringify({ page, search: debouncedSearch, status })}`,
    [page, debouncedSearch, status],
  );

  const fetchQuotes = useCallback(
    () =>
      listQuotes({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        status,
      }),
    [page, debouncedSearch, status],
  );

  const {
    data,
    loading,
    error,
    reload: load,
    mutate,
  } = useCachedResource(quotesKey, fetchQuotes);

  /** Optimistic row edit that also lands in the cache, not just on screen. */
  const setRows = (update: (rows: Quote[]) => Quote[]) =>
    mutate((view) => ({ ...view, rows: update(view.rows) }));

  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const loadError = Boolean(error);
  // Skeleton rows only when there is genuinely nothing to show yet.
  const showSkeleton = loading && rows.length === 0;

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const filtersActive = !!search || status !== "all";

  async function changeStatus(
    quote: Quote,
    next: QuoteStatus,
  ) {
    const previous = quote.status;

    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === quote.id
          ? { ...row, status: next }
          : row,
      ),
    );

    try {
      await updateQuoteStatus(quote.id, next);

      toast.success(
        "Status updated",
        `${quote.full_name}'s request is now ${next}.`,
      );
    } catch {
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === quote.id
            ? { ...row, status: previous }
            : row,
        ),
      );

      toast.error(
        "Unable to update status",
        "Please try again in a moment.",
      );
    }
  }

  async function confirmDelete() {
    if (!deleting) return;

    setDeleteLoading(true);

    try {
      await deleteQuote(deleting.id, deleting.email);

      toast.success(
        "Request removed",
        `${deleting.full_name}'s request has been deleted.`,
      );

      setDeleting(null);

      if (rows.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        load();
      }
    } catch {
      toast.error(
        "Unable to remove request",
        "Please try again in a moment.",
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  /**
   * Row actions, shared by the desktop table and the mobile card. A quote's
   * actions are three mutually exclusive status transitions plus delete, so a
   * menu keeps the column a fixed width instead of one that changes per row.
   */
  function quoteActionItems(q: Quote) {
    const statusIcons: Record<QuoteStatus, React.ReactNode> = {
      Pending: (
        <FileText
          className="h-4 w-4"
          aria-hidden="true"
        />
      ),
      Reviewed: (
        <CheckCircle2
          className="h-4 w-4"
          aria-hidden="true"
        />
      ),
      Quoted: (
        <ReceiptText
          className="h-4 w-4"
          aria-hidden="true"
        />
      ),
      Closed: (
        <Archive
          className="h-4 w-4"
          aria-hidden="true"
        />
      ),
    };

    return [
      ...QUOTE_STATUSES
        .filter((s) => s !== q.status)
        .map((s) => ({
          label: `Mark as ${s}`,
          icon: statusIcons[s],
          onClick: () => changeStatus(q, s),
        })),

      ...(isAdmin
        ? [
            {
              label: "Delete request",
              icon: (
                <Trash2
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              ),
              onClick: () => setDeleting(q),
              danger: true,
            },
          ]
        : []),
    ];
  }

  return (
    <div>
      <PageHeader
        title="Quote Requests"
        description="Enquiries submitted through the FSN Cargo public contact form, newest first."
        crumbs={[
          { label: "Commercial" },
          { label: "Quote Requests" },
        ]}
      />

      {loadError && rows.length === 0 && (
        <Alert
          variant="error"
          title="Could not load quote requests"
          className="mb-4"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={load}
            >
              Retry
            </Button>
          }
        >
          Something went wrong fetching the request list.
        </Alert>
      )}

      <ResponsiveDataList
        rows={rows}
        loading={showSkeleton}
        columnCount={6}
        tableClassName="min-w-[760px] lg:min-w-[960px]"
        toolbar={
          <DataToolbar
            embedded
            search={search}
            onSearchChange={setSearch}
            placeholder="Search name, email, origin, or destination"
            filtersActive={filtersActive}
            onReset={() => {
              setSearch("");
              setStatus("all");
            }}
            summary={
              showSkeleton ? null : (
                <>
                  <span className="font-tabular font-semibold text-deck-800">
                    {count}
                  </span>{" "}
                  {count === 1 ? "request" : "requests"}
                </>
              )
            }
            filters={
              <FilterDropdown
                label="Status"
                options={STATUS_OPTIONS}
                value={status}
                onChange={setStatus}
              />
            }
          />
        }
        tableHead={
          <TableRow>
            {/* Left-aligned to match the cells beneath them; centred labels over
                left-aligned data broke every column's reading edge. */}
            <TableHeadCell>Contact</TableHeadCell>

            <TableHeadCell>Route</TableHeadCell>

            <TableHeadCell>Cargo</TableHeadCell>

            <TableHeadCell>Status</TableHeadCell>

            <TableHeadCell>Received</TableHeadCell>

            <TableHeadCell className="w-[76px] text-center">
              Actions
            </TableHeadCell>
          </TableRow>
        }
        renderRow={(q) => (
          <TableRow key={q.id}>
            {/* CONTACT */}
            <TableCellPrimary className="max-w-[240px]">
              <p className="truncate text-deck-900">
                {q.full_name}
              </p>

              <span className="mt-0.5 flex items-center gap-1.5 text-[12px] font-normal text-deck-500">
                <Mail
                  className="h-3.5 w-3.5 shrink-0 text-deck-400"
                  aria-hidden="true"
                />

                <a
                  href={`mailto:${q.email}`}
                  className="deck-focus truncate rounded-chip hover:text-signal-600"
                >
                  {q.email}
                </a>
              </span>

              {q.phone && (
                <span className="mt-0.5 flex items-center gap-1.5 text-[12px] font-normal text-deck-500">
                  <Phone
                    className="h-3.5 w-3.5 shrink-0 text-deck-400"
                    aria-hidden="true"
                  />

                  {q.phone}
                </span>
              )}
            </TableCellPrimary>

            {/* ROUTE */}
            <TableCell className="max-w-[260px] whitespace-normal">
              <span className="flex items-center gap-1.5 font-medium text-deck-800">
                {q.origin}

                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 text-deck-300"
                  aria-hidden="true"
                />

                {q.destination}
              </span>

              {q.message && (
                <p
                  className="mt-1 line-clamp-2 text-[12px] text-deck-500"
                  title={q.message}
                >
                  {q.message}
                </p>
              )}
            </TableCell>

            {/* CARGO */}
            <TableCell className="text-deck-600">
              {q.cargo_type}

              {q.weight != null && (
                <span className="font-tabular block text-[11px] text-deck-400">
                  {q.weight} kg
                </span>
              )}
            </TableCell>

            {/* STATUS */}
            <TableCell>
              <Badge variant={STATUS_VARIANT[q.status]}>
                {q.status}
              </Badge>
            </TableCell>

            {/* RECEIVED */}
            <TableCell className="font-tabular text-deck-500">
              {formatDate(q.created_at)}
            </TableCell>

            {/* ACTIONS */}
            <TableCell className="w-[76px] px-3">
              <div className="flex items-center justify-end">
                <RowActions
                  label={`Actions for ${q.full_name}`}
                  items={quoteActionItems(q)}
                />
              </div>
            </TableCell>
          </TableRow>
        )}
        renderMobileCard={(q) => (
          <MobileRowCard
            key={q.id}
            header={
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-deck-900">
                  {q.full_name}
                </p>

                <p className="mt-1 truncate text-[12px] text-deck-500">
                  {q.origin}{" "}
                  <span className="text-deck-300">
                    →
                  </span>{" "}
                  {q.destination}
                </p>

                <Badge
                  variant={STATUS_VARIANT[q.status]}
                  className="mt-2"
                >
                  {q.status}
                </Badge>
              </div>
            }
            actions={
              <RowActions
                label={`Actions for ${q.full_name}`}
                items={quoteActionItems(q)}
              />
            }
          >
            <DetailRow
              label="Email"
              value={q.email}
            />

            {q.phone && (
              <DetailRow
                label="Phone"
                value={q.phone}
              />
            )}

            <DetailRow
              label="Cargo"
              value={q.cargo_type}
            />

            {q.weight != null && (
              <DetailRow
                label="Weight"
                value={`${q.weight} kg`}
                mono
              />
            )}

            <DetailRow
              label="Received"
              value={formatDate(q.created_at)}
            />

            {q.message && (
              <DetailRow
                label="Message"
                value={q.message}
                stacked
              />
            )}
          </MobileRowCard>
        )}
        emptyIcon={
          <FileText className="h-5 w-5" />
        }
        emptyTitle={
          filtersActive
            ? "No matching requests"
            : "No quote requests yet"
        }
        emptyDescription={
          filtersActive
            ? "Nothing matches this search and status combination."
            : "Enquiries submitted through the public contact form land here automatically."
        }
        pagination={{
          page,
          pageCount,
          onPageChange: setPage,
          totalItems: count,
          pageSize: PAGE_SIZE,
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Remove this quote request?"
        confirmLabel="Remove request"
        description={
          <>
            This permanently deletes the request from{" "}
            <span className="font-semibold text-deck-900">
              {deleting?.full_name}
            </span>
            . It cannot be recovered.
          </>
        }
      />
    </div>
  );
}