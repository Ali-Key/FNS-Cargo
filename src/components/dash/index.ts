// The dashboard's design system.
//
// Dashboard code imports from here and never from '@/components/ui' directly.
// The eight shared atoms are re-exported below rather than duplicated, so this
// module is the single seam: when the dashboard needs a Button that differs
// from the public site's, it gets its own file here and the re-export drops —
// no consumer changes, and the public site cannot be affected either way.

// Dashboard-only primitives.
export * from './Table'
export * from './Modal'
export * from './Dropdown'
export * from './Pagination'
export * from './EmptyState'
export * from './SectionCard'
export * from './DetailRow'
export * from './Avatar'
export * from './RowActions'
export * from './CopyButton'
export * from './MobileRowCard'
export * from './FieldGroup'
export * from './Badges'
export * from './PageHeader'
export * from './StatTile'
export * from './ConfirmDialog'
export * from './DataToolbar'

// Shared atoms, re-exported so the dashboard has one import path.
export { Button } from '@/components/ui/Button'
export { Input } from '@/components/ui/Input'
export { Textarea } from '@/components/ui/Textarea'
export { Select } from '@/components/ui/Select'
export { Badge, StatusBadge } from '@/components/ui/Badge'
export { Alert } from '@/components/ui/Alert'
export { Spinner } from '@/components/ui/Spinner'
export * from '@/components/ui/Skeleton'
