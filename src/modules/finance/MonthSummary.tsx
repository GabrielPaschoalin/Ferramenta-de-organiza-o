import { formatMoney, formatMonthLabel } from '@/modules/finance/helpers'

type UpcomingInvoice = {
  accountId: string
  name: string
  month: string
  dueDate: string
  remaining: number
  status: 'open' | 'closed' | 'overdue' | 'paid'
}

export function MonthSummary({
  variant = 'cash',
  expenses,
  income,
  investments,
  result,
  available,
  availableLabel,
  cardDebt,
  cardSpend,
  showCardTotals,
  upcoming,
  breakdown,
  uncategorized,
}: {
  variant?: 'cash' | 'credit'
  expenses: number
  income: number
  investments: number
  result: number
  available: number
  availableLabel: string
  cardDebt: number
  cardSpend: number
  showCardTotals: boolean
  upcoming: UpcomingInvoice[]
  breakdown: { id: string; name: string; total: number }[]
  uncategorized: number
}) {
  const max = breakdown[0]?.total ?? 0
  const nextInvoices = upcoming.filter((item) => item.remaining > 0).slice(0, 4)

  return (
    <div className="space-y-4">
      {variant === 'credit' ? (
        <div className="space-y-1.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard
              label="Saldo"
              value={formatMoney(available)}
              tone={available >= 0 ? 'success' : 'danger'}
            />
            <SummaryCard label="Gastos do mês" value={formatMoney(expenses)} tone="danger" />
          </div>
          <p className="text-xs text-muted">
            O saldo começa em 0. Compra diminui, pagamento aumenta.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label={availableLabel}
              value={formatMoney(available)}
              tone={available >= 0 ? 'success' : 'danger'}
            />
            <SummaryCard label="Receitas" value={formatMoney(income)} tone="success" />
            <SummaryCard label="Gastos" value={formatMoney(expenses)} tone="danger" />
            <SummaryCard
              label="Resultado do mês"
              value={formatMoney(result)}
              tone={result >= 0 ? 'success' : 'danger'}
            />
          </div>
          <div>
            <SummaryCard
              label="Investimentos"
              value={formatMoney(investments)}
              tone="neutral"
            />
            <p className="mt-1.5 text-xs text-muted">Não entra no resultado do mês.</p>
          </div>
        </>
      )}

      {showCardTotals ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryCard label="Gastos no cartão" value={formatMoney(cardSpend)} tone="danger" />
          <SummaryCard
            label="Dívida dos cartões"
            value={formatMoney(cardDebt)}
            tone={cardDebt > 0 ? 'danger' : 'neutral'}
          />
        </div>
      ) : null}

      {variant !== 'credit' && nextInvoices.length > 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Próximas faturas</p>
          <ul className="mt-3 space-y-2">
            {nextInvoices.map((item) => (
              <li key={`${item.accountId}-${item.month}`} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink">
                  {item.name} · {formatMonthLabel(item.month)}
                </span>
                <span className={item.status === 'overdue' ? 'text-clay' : 'text-muted'}>
                  {formatMoney(item.remaining)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {uncategorized > 0 ? (
        <p className="text-sm text-muted">{uncategorized} lançamentos sem categoria neste mês.</p>
      ) : null}

      {breakdown.length > 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Por categoria</p>
          <ul className="mt-3 space-y-2.5">
            {breakdown.map((item) => (
              <li key={item.id || 'none'}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink">{item.name}</span>
                  <span className="text-muted">{formatMoney(item.total)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-paper">
                  <div
                    className="h-full rounded-full bg-forest"
                    style={{ width: `${max ? Math.max(8, (item.total / max) * 100) : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'success' | 'danger' | 'neutral'
}) {
  const color =
    tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-clay' : 'text-ink'
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={['mt-1 text-lg font-medium', color].join(' ')}>{value}</p>
    </div>
  )
}
