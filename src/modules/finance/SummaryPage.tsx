import { useMemo, useState, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CloseIcon } from '@/components/icons'
import {
  accountLabel,
  categoryName,
  currentMonth,
  formatDate,
  formatMoney,
  formatMonthLabel,
  monthlyKindTotals,
  monthsInRange,
  shiftMonth,
  totalsByCategory,
  transactionsInMonth,
} from '@/modules/finance/helpers'
import { useExpenses } from '@/modules/finance/useExpenses'
import type { ExpenseCategory, ExpenseTransaction, FinanceAccount } from '@/modules/finance/types'

const INCOME_COLOR = '#22c55e'
const EXPENSE_COLOR = '#ef4444'
const PIE_COLORS = [
  '#2563eb',
  '#22c55e',
  '#ef4444',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#14b8a6',
  '#6366f1',
  '#e11d48',
  '#0ea5e9',
  '#a855f7',
  '#65a30d',
  '#dc2626',
  '#0891b2',
  '#7c3aed',
  '#ca8a04',
  '#334155',
  '#db2777',
  '#0d9488',
  '#4f46e5',
  '#b45309',
]

type CategorySlice = { id: string; name: string; total: number }

type CategoryFocus = {
  kind: 'expense' | 'income'
  categoryId: string
  name: string
  month: string
}

function monthRangeFromTransactions(dates: string[]) {
  const to = currentMonth()
  if (dates.length === 0) return { from: shiftMonth(to, -5), to }
  const first = [...dates].sort()[0]
  let from = first
  while (monthsInRange(from, to).length > 18) {
    from = shiftMonth(from, 1)
  }
  return { from, to }
}

export function SummaryPage() {
  const { transactions, categories, accounts, loading, error } = useExpenses()
  const [expenseMonth, setExpenseMonth] = useState(currentMonth)
  const [incomeMonth, setIncomeMonth] = useState(currentMonth)
  const [focus, setFocus] = useState<CategoryFocus | null>(null)

  const range = useMemo(() => {
    const dates = transactions
      .filter((item) => !item.hidden && (item.kind === 'income' || item.kind === 'expense'))
      .map((item) => item.date.slice(0, 7))
    return monthRangeFromTransactions(dates)
  }, [transactions])

  const incomeByMonth = useMemo(
    () => monthlyKindTotals(transactions, 'income', range.from, range.to),
    [transactions, range.from, range.to],
  )
  const expensesByMonth = useMemo(
    () => monthlyKindTotals(transactions, 'expense', range.from, range.to),
    [transactions, range.from, range.to],
  )
  const expensesByCategory = useMemo(
    () => totalsByCategory(transactionsInMonth(transactions, expenseMonth), categories, 'expense'),
    [transactions, categories, expenseMonth],
  )
  const incomeByCategory = useMemo(
    () => totalsByCategory(transactionsInMonth(transactions, incomeMonth), categories, 'income'),
    [transactions, categories, incomeMonth],
  )
  const focusedItems = useMemo(() => {
    if (!focus) return []
    return transactionsInMonth(transactions, focus.month, {
      categoryId: focus.categoryId || 'none',
      accountId: 'all',
      kind: focus.kind,
    })
  }, [focus, transactions])

  if (loading) {
    return <p className="text-sm text-muted">Carregando...</p>
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-clay/20 bg-clay/5 px-4 py-3 text-sm text-clay">
        Não foi possível carregar o resumo.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <ChartCard title="Recebimentos por mês" total={incomeByMonth.reduce((sum, item) => sum + item.total, 0)}>
        <MonthBarChart data={incomeByMonth} color={INCOME_COLOR} empty="Nenhuma receita neste período." />
      </ChartCard>

      <ChartCard title="Gastos por mês" total={expensesByMonth.reduce((sum, item) => sum + item.total, 0)}>
        <MonthBarChart data={expensesByMonth} color={EXPENSE_COLOR} empty="Nenhum gasto neste período." />
      </ChartCard>

      <ChartCard
        title="Gastos por categoria"
        total={expensesByCategory.reduce((sum, item) => sum + item.total, 0)}
        month={expenseMonth}
        onMonthChange={setExpenseMonth}
      >
        <CategoryPieChart
          data={expensesByCategory}
          empty={`Nenhum gasto em ${formatMonthLabel(expenseMonth)}.`}
          onSlice={(slice) =>
            setFocus({
              kind: 'expense',
              categoryId: slice.id,
              name: slice.name,
              month: expenseMonth,
            })
          }
        />
      </ChartCard>

      <ChartCard
        title="Recebimentos por categoria"
        total={incomeByCategory.reduce((sum, item) => sum + item.total, 0)}
        month={incomeMonth}
        onMonthChange={setIncomeMonth}
      >
        <CategoryPieChart
          data={incomeByCategory}
          empty={`Nenhuma receita em ${formatMonthLabel(incomeMonth)}.`}
          onSlice={(slice) =>
            setFocus({
              kind: 'income',
              categoryId: slice.id,
              name: slice.name,
              month: incomeMonth,
            })
          }
        />
      </ChartCard>

      {focus ? (
        <CategoryItemsModal
          focus={focus}
          items={focusedItems}
          categories={categories}
          accounts={accounts}
          onClose={() => setFocus(null)}
        />
      ) : null}
    </div>
  )
}

function ChartCard({
  title,
  total,
  month,
  onMonthChange,
  children,
}: {
  title: string
  total: number
  month?: string
  onMonthChange?: (month: string) => void
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-ink">{title}</h2>
          <p className="mt-1 text-lg font-medium text-ink">{formatMoney(total)}</p>
        </div>
        {month && onMonthChange ? (
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
              Mês
            </span>
            <input
              type="month"
              value={month}
              onChange={(event) => onMonthChange(event.target.value)}
              className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-forest"
            />
          </label>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function MonthBarChart({
  data,
  color,
  empty,
}: {
  data: { month: string; label: string; total: number }[]
  color: string
  empty: string
}) {
  if (data.every((item) => item.total === 0)) {
    return <p className="py-8 text-center text-sm text-muted">{empty}</p>
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} minTickGap={8} />
          <YAxis
            tickFormatter={axisMoney}
            tick={{ fontSize: 11, fill: '#64748b' }}
            width={48}
          />
          <Tooltip
            formatter={(value: number) => [formatMoney(value), 'Total']}
            labelFormatter={(_, payload) => {
              const month = payload?.[0]?.payload?.month as string | undefined
              return month ? formatMonthLabel(month) : ''
            }}
            contentStyle={tooltipStyle}
          />
          <Bar dataKey="total" fill={color} radius={[6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function CategoryPieChart({
  data,
  empty,
  onSlice,
}: {
  data: CategorySlice[]
  empty: string
  onSlice: (slice: CategorySlice) => void
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">{empty}</p>
  }

  return (
    <div className="space-y-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={100}
              paddingAngle={1}
              onClick={(_, index) => {
                const slice = data[index]
                if (slice) onSlice(slice)
              }}
              style={{ cursor: 'pointer' }}
            >
              {data.map((item, index) => (
                <Cell key={item.id || `none-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [formatMoney(value), name]}
              contentStyle={tooltipStyle}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-2">
        {data.map((item, index) => (
          <li key={item.id || `none-${index}`}>
            <button
              type="button"
              onClick={() => onSlice(item)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-ink"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
              />
              <span>{item.name}</span>
              <span className="text-muted">{formatMoney(item.total)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CategoryItemsModal({
  focus,
  items,
  categories,
  accounts,
  onClose,
}: {
  focus: CategoryFocus
  items: ExpenseTransaction[]
  categories: ExpenseCategory[]
  accounts: FinanceAccount[]
  onClose: () => void
}) {
  const title = focus.kind === 'expense' ? 'Gastos' : 'Receitas'
  const total = items.reduce((sum, item) => sum + Math.abs(item.amount), 0)

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/25 p-4 md:items-center" onClick={onClose}>
      <div
        className="flex max-h-[90dvh] w-full max-w-xl flex-col rounded-3xl bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="font-serif text-xl text-ink">
              {title} em {focus.name}
            </p>
            <p className="mt-1 text-sm text-muted">
              {formatMonthLabel(focus.month)} · {formatMoney(total)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-paper hover:text-ink"
            aria-label="Fechar"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <ul className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted">Nenhum lançamento nesta categoria.</li>
          ) : (
            items.map((item) => (
              <CategoryItemRow
                key={item.id}
                transaction={item}
                categories={categories}
                accounts={accounts}
              />
            ))
          )}
        </ul>
      </div>
    </div>
  )
}

function CategoryItemRow({
  transaction,
  categories,
  accounts,
}: {
  transaction: ExpenseTransaction
  categories: ExpenseCategory[]
  accounts: FinanceAccount[]
}) {
  const expense = transaction.kind === 'expense'
  return (
    <li className="flex items-start justify-between gap-3 rounded-2xl border border-line px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{transaction.description}</p>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span>{formatDate(transaction.date)}</span>
          <span>{categoryName(categories, transaction.categoryId)}</span>
          <span>{accountLabel(accounts, transaction.accountId)}</span>
        </p>
      </div>
      <p className={['shrink-0 text-sm font-medium', expense ? 'text-clay' : 'text-success'].join(' ')}>
        {expense ? '-' : '+'}
        {formatMoney(Math.abs(transaction.amount))}
      </p>
    </li>
  )
}

function axisMoney(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
  return String(Math.round(value))
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  fontSize: 12,
}
