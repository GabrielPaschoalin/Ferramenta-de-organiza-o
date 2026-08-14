import { bankLabel, methodLabel } from '@/modules/finance/catalog'
import { categoryName, formatDate, formatMoney } from '@/modules/finance/helpers'
import type { ExpenseCategory, ExpenseTransaction } from '@/modules/finance/types'

export function ExpenseRow({
  transaction,
  categories,
  selected,
  onToggleSelect,
  onOpen,
}: {
  transaction: ExpenseTransaction
  categories: ExpenseCategory[]
  selected: boolean
  onToggleSelect: () => void
  onOpen: () => void
}) {
  const expense = transaction.kind === 'expense'

  return (
    <li>
      <div className="flex items-start gap-2 rounded-2xl border border-line bg-surface px-3 py-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={`Selecionar ${transaction.description}`}
        />
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{transaction.description}</p>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
              <span>{formatDate(transaction.date)}</span>
              <span>{categoryName(categories, transaction.categoryId)}</span>
              <span>
                {bankLabel(transaction.bank)} · {methodLabel(transaction.method)}
              </span>
              <span>{expense ? 'Gasto' : 'Receita'}</span>
            </p>
          </div>
          <p className={['shrink-0 text-sm font-medium', expense ? 'text-clay' : 'text-success'].join(' ')}>
            {expense ? '-' : '+'}
            {formatMoney(Math.abs(transaction.amount))}
          </p>
        </button>
      </div>
    </li>
  )
}
