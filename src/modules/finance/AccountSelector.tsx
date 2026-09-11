import { BankLogo } from '@/modules/finance/BankLogo'
import { formatMoney } from '@/modules/finance/helpers'
import type { FinanceAccount } from '@/modules/finance/types'

type AccountOption = {
  account: FinanceAccount
  balance: number
  invoiceTotal: number
  debt: number
}

export function AccountSelector({
  accounts,
  selectedAccountId,
  available,
  allLabel = 'Todas',
  onSelect,
}: {
  accounts: AccountOption[]
  selectedAccountId: string
  available: number
  allLabel?: string
  onSelect: (accountId: string) => void
}) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2 px-1">
        <AccountChip
          active={selectedAccountId === 'all'}
          institution="all"
          name={allLabel}
          value={formatMoney(available)}
          onClick={() => onSelect('all')}
        />
        {accounts.map((item) => (
          <AccountChip
            key={item.account.id}
            active={selectedAccountId === item.account.id}
            institution={item.account.institution}
            name={item.account.name}
            value={formatMoney(item.balance)}
            onClick={() => onSelect(item.account.id)}
          />
        ))}
      </div>
    </div>
  )
}

function AccountChip({
  active,
  institution,
  name,
  value,
  onClick,
}: {
  active: boolean
  institution: FinanceAccount['institution'] | 'all'
  name: string
  value: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition-colors',
        active ? 'border-forest bg-forest/5' : 'border-line bg-surface hover:border-forest/40',
      ].join(' ')}
    >
      <BankLogo institution={institution} className="h-8 w-8 shrink-0" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{name}</span>
        <span className="block text-xs text-muted">{value}</span>
      </span>
    </button>
  )
}
