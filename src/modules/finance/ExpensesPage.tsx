import { useMemo, useState } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  UploadIcon,
} from '@/components/icons'
import {
  addExpenseCategory,
  addExpenseTransaction,
  deleteExpenseCategory,
  deleteExpenseTransaction,
  deleteExpenseTransactions,
  importExpenseTransactions,
  rememberCategoryRule,
  renameExpenseCategory,
  updateExpenseTransaction,
} from '@/modules/finance/api'
import { CategoryModal } from '@/modules/finance/CategoryModal'
import { ExpensePanel } from '@/modules/finance/ExpensePanel'
import { ExpenseRow } from '@/modules/finance/ExpenseRow'
import { ImportModal } from '@/modules/finance/ImportModal'
import { MonthSummary } from '@/modules/finance/MonthSummary'
import {
  currentMonth,
  fingerprint,
  formatMonthLabel,
  monthTotals,
  shiftMonth,
  totalsByCategory,
  transactionsInMonth,
} from '@/modules/finance/helpers'
import { useExpenses } from '@/modules/finance/useExpenses'
import type {
  ExpenseBank,
  ExpenseKind,
  ExpenseTransaction,
  ImportRow,
  PaymentMethod,
} from '@/modules/finance/types'

export function ExpensesPage() {
  const { user, transactions, categories, rules, loading, error } = useExpenses()
  const [month, setMonth] = useState(currentMonth)
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'none' | string>('all')
  const [importOpen, setImportOpen] = useState(false)
  const [manageCategories, setManageCategories] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const visible = useMemo(
    () => transactionsInMonth(transactions, month, categoryFilter),
    [transactions, month, categoryFilter],
  )
  const monthItems = useMemo(
    () => transactionsInMonth(transactions, month, 'all'),
    [transactions, month],
  )
  const totals = useMemo(() => monthTotals(monthItems), [monthItems])
  const breakdown = useMemo(
    () => totalsByCategory(monthItems, categories),
    [monthItems, categories],
  )
  const selected = transactions.find((item) => item.id === selectedId) ?? null

  async function handleImport(rows: ImportRow[]) {
    if (!user) return
    await importExpenseTransactions(
      user.uid,
      rows.map((row) => ({
        date: row.date,
        amount: row.amount,
        description: row.description,
        categoryId: row.categoryId,
        kind: row.kind === 'ignored' ? 'ignored' : row.kind,
        source: row.source,
        bank: row.bank,
        method: row.method,
        externalId: row.externalId,
      })),
      rules,
    )
  }

  async function handleCreate(input: {
    date: string
    description: string
    amount: number
    kind: Exclude<ExpenseKind, 'ignored'>
    categoryId: string | null
    bank: ExpenseBank
    method: PaymentMethod
  }) {
    if (!user) return
    await addExpenseTransaction(user.uid, {
      ...input,
      source: 'manual',
      externalId: fingerprint(input.date, input.amount, input.description),
    })
    if (input.categoryId) {
      await rememberCategoryRule(user.uid, input.description, input.categoryId, rules)
    }
  }

  async function handleUpdate(input: {
    date: string
    description: string
    amount: number
    kind: Exclude<ExpenseKind, 'ignored'>
    categoryId: string | null
    bank: ExpenseBank
    method: PaymentMethod
  }) {
    if (!user || !selected) return
    const patch: Partial<Omit<ExpenseTransaction, 'id'>> = { ...input }
    await updateExpenseTransaction(user.uid, selected.id, patch)
    if (input.categoryId) {
      await rememberCategoryRule(user.uid, input.description, input.categoryId, rules)
    }
  }

  async function handleDelete() {
    if (!user || !selected) return
    await deleteExpenseTransaction(user.uid, selected.id)
    setSelectedId(null)
    setSelectedIds((current) => current.filter((id) => id !== selected.id))
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function toggleAllVisible() {
    const visibleIds = visible.map((item) => item.id)
    const allSelected = visibleIds.every((id) => selectedIds.includes(id))
    setSelectedIds(allSelected ? [] : visibleIds)
  }

  async function handleBulkDelete() {
    if (!user || selectedIds.length === 0) return
    const ok = window.confirm(`Apagar ${selectedIds.length} lançamentos?`)
    if (!ok) return
    await deleteExpenseTransactions(user.uid, selectedIds)
    setSelectedIds([])
    if (selectedId && selectedIds.includes(selectedId)) setSelectedId(null)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth((value) => shiftMonth(value, -1))}
            className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink"
            aria-label="Mês anterior"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <p className="min-w-40 text-center text-sm font-medium text-ink">
            {formatMonthLabel(month)}
          </p>
          <button
            type="button"
            onClick={() => setMonth((value) => shiftMonth(value, 1))}
            className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink"
            aria-label="Próximo mês"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3 py-2 text-sm font-medium text-paper"
          >
            <UploadIcon className="h-4 w-4" />
            Enviar extrato
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-ink"
          >
            <PlusIcon className="h-4 w-4" />
            Novo
          </button>
          <button
            type="button"
            onClick={() => setManageCategories(true)}
            className="rounded-xl px-3 py-2 text-sm font-medium text-forest"
          >
            Categorias
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-5 rounded-2xl border border-clay/20 bg-clay/5 px-4 py-3 text-sm text-clay">
          Não foi possível carregar os gastos. Confira se o Firestore está criado e se as
          regras foram publicadas.
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-muted">Carregando...</p>
      ) : (
        <>
          <div className="mt-5">
            <MonthSummary
              expenses={totals.expenses}
              income={totals.income}
              balance={totals.balance}
              breakdown={breakdown}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <FilterChip
              active={categoryFilter === 'all'}
              onClick={() => setCategoryFilter('all')}
            >
              Todas
            </FilterChip>
            <FilterChip
              active={categoryFilter === 'none'}
              onClick={() => setCategoryFilter('none')}
            >
              Sem categoria
            </FilterChip>
            {categories.map((item) => (
              <FilterChip
                key={item.id}
                active={categoryFilter === item.id}
                onClick={() => setCategoryFilter(item.id)}
              >
                {item.name}
              </FilterChip>
            ))}
          </div>

          {visible.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={visible.every((item) => selectedIds.includes(item.id))}
                  onChange={toggleAllVisible}
                />
                Selecionar todos
              </label>
              {selectedIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleBulkDelete()}
                  className="text-sm font-medium text-clay hover:underline"
                >
                  Apagar {selectedIds.length} selecionados
                </button>
              ) : null}
            </div>
          ) : null}

          <ul className="mt-3 space-y-2">
            {visible.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-muted">
                {monthItems.length === 0
                  ? 'Nada neste mês. Envie um extrato OFX ou CSV, ou adicione um lançamento.'
                  : 'Nenhum lançamento neste filtro.'}
              </li>
            ) : (
              visible.map((item) => (
                <ExpenseRow
                  key={item.id}
                  transaction={item}
                  categories={categories}
                  selected={selectedIds.includes(item.id)}
                  onToggleSelect={() => toggleSelected(item.id)}
                  onOpen={() => setSelectedId(item.id)}
                />
              ))
            )}
          </ul>
        </>
      )}

      {importOpen && user ? (
        <ImportModal
          uid={user.uid}
          categories={categories}
          rules={rules}
          transactions={transactions}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />
      ) : null}

      {creating ? (
        <ExpensePanel
          transaction={null}
          categories={categories}
          onClose={() => setCreating(false)}
          onSave={handleCreate}
        />
      ) : null}

      {selected ? (
        <ExpensePanel
          transaction={selected}
          categories={categories}
          onClose={() => setSelectedId(null)}
          onSave={handleUpdate}
          onDelete={handleDelete}
        />
      ) : null}

      {manageCategories && user ? (
        <CategoryModal
          categories={categories}
          onClose={() => setManageCategories(false)}
          onAdd={async (name) => {
            await addExpenseCategory(user.uid, name)
          }}
          onRename={(id, name) => renameExpenseCategory(user.uid, id, name)}
          onDelete={(id) => deleteExpenseCategory(user.uid, id)}
        />
      ) : null}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        active ? 'bg-forest text-paper' : 'bg-surface text-muted hover:text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
