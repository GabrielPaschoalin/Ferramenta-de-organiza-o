import { accountLabel, categoryName, formatDate, formatMoney, kindLabel } from '@/modules/finance/helpers'
import type { ExpenseCategory, ExpenseTransaction, FinanceAccount } from '@/modules/finance/types'

export function ExpenseRow({
  transaction,
  categories,
  accounts,
  selected,
  onToggleSelect,
  onOpen,
}: {
  transaction: ExpenseTransaction
  categories: ExpenseCategory[]
  accounts: FinanceAccount[]
  selected: boolean
  onToggleSelect: () => void
  onOpen: () => void
}) {
  const expense = transaction.kind === 'expense'
  const income = transaction.kind === 'income'
  const investment = transaction.kind === 'investment'
  const installment =
    transaction.installmentCurrent && transaction.installmentTotal
      ? `${transaction.installmentCurrent}/${transaction.installmentTotal}`
      : null

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
              {investment ? null : <span>{categoryName(categories, transaction.categoryId)}</span>}
              <span>{accountLabel(accounts, transaction.accountId)}</span>
              {transaction.destAccountId ? (
                <span>para {accountLabel(accounts, transaction.destAccountId)}</span>
              ) : null}
              <span>{kindLabel(transaction.kind)}</span>
              {installment ? <span>Parcela {installment}</span> : null}
            </p>
          </div>
          <p
            className={[
              'shrink-0 text-sm font-medium',
              expense ? 'text-clay' : income ? 'text-success' : investment ? 'text-forest' : 'text-muted',
            ].join(' ')}
          >
            {expense || investment ? '-' : income ? '+' : ''}
            {formatMoney(Math.abs(transaction.amount))}
          </p>
        </button>
      </div>
    </li>
  )
}
