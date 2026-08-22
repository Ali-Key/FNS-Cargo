import { useState } from 'react'
import { Building2, Globe2, UserCog, UserRound } from 'lucide-react'
import { PageHeader, PillGroup, type PillOption } from '@/components/dashboard'
import { CompanySettings, CountrySettings, ProfileSettings, TeamAccounts } from '@/components/settings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'

type Band = 'account' | 'team' | 'company' | 'countries'

/**
 * The console's single account-management destination. One band is shown at a
 * time: stacking them made the page ragged, because a full-bleed team table and
 * a narrow settings form do not share a content width. Every dashboard user
 * gets their own account; the admin bands are gated here for convenience and by
 * RLS / admin-gated RPCs in the database, which is the real boundary.
 */
export default function Settings() {
  useDocumentTitle('Settings | FSN Cargo')
  const { isAdmin } = useAuth()
  const [band, setBand] = useState<Band>('account')

  const bands: PillOption<Band>[] = [
    { value: 'account', label: 'Account', icon: UserRound },
    ...(isAdmin
      ? ([
          { value: 'team', label: 'Team', icon: UserCog },
          { value: 'company', label: 'Company', icon: Building2 },
          { value: 'countries', label: 'Countries', icon: Globe2 },
        ] as PillOption<Band>[])
      : []),
  ]

  // Falls back if the role changes underneath a selected admin band.
  const active = bands.some((b) => b.value === band) ? band : 'account'

  return (
    <div>
      {/* No page description: each band carries its own, and stacking the two
          put three sizes of grey text above the first field. The band switch
          rides in the header's action slot because it selects what the page is
          showing — on its own rule below, it read as a second header. */}
      <PageHeader
        title="Settings"
        crumbs={[{ label: 'Control' }, { label: 'Settings' }]}
        actions={
          bands.length > 1 ? (
            <PillGroup label="Settings section" options={bands} value={active} onChange={setBand} />
          ) : undefined
        }
      />

      {active === 'account' && <ProfileSettings />}
      {active === 'team' && isAdmin && <TeamAccounts />}
      {active === 'company' && isAdmin && <CompanySettings />}
      {active === 'countries' && isAdmin && <CountrySettings />}
    </div>
  )
}
