import { formatMoney } from '@/modules/finance/helpers'

export function MonthSummary({
  expenses,
  income,
  balance,
  breakdown,
}: {
  expenses: number
  income: number
  balance: number
  breakdown: { id: string; name: string; total: number }[]
}) {
  const max = breakdown[0]?.total ?? 0

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Gastos" value={formatMoney(expenses)} tone="danger" />
        <SummaryCard label="Receitas" value={formatMoney(income)} tone="success" />
        <SummaryCard label="Saldo" value={formatMoney(balance)} tone={balance >= 0 ? 'success' : 'danger'} />
      </div>

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
  tone: 'success' | 'danger'
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={['mt-1 text-lg font-medium', tone === 'success' ? 'text-success' : 'text-clay'].join(' ')}>
        {value}
      </p>
    </div>
  )
}
