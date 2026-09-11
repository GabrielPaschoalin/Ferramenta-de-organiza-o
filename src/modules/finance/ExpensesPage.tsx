import { useMemo, useState } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  UploadIcon,
} from '@/components/icons'
import { AccountModal } from '@/modules/finance/AccountModal'
import { AccountSelector } from '@/modules/finance/AccountSelector'
import {
  addExpenseCategory,
  addExpenseTransaction,
  addFinanceAccount,
  addInstallmentPurchase,
  scheduleRemainingInstallments,
  archiveFinanceAccount,
  deleteExpenseCategory,
  deleteExpenseTransaction,
  deleteExpenseTransactions,
  importExpenseTransactions,
  rememberCategoryRule,
  renameExpenseCategory,
  updateExpenseTransaction,
  updateFinanceAccount,
} from '@/modules/finance/api'
import { CategoryModal } from '@/modules/finance/CategoryModal'
import { CategorySelect } from '@/modules/finance/CategorySelect'
import { ExpensePanel } from '@/modules/finance/ExpensePanel'
import { ExpenseRow } from '@/modules/finance/ExpenseRow'
import { ImportModal } from '@/modules/finance/ImportModal'
import { MonthSummary } from '@/modules/finance/MonthSummary'
import {
  accountBalance,
  accountMonthFlow,
  cardDebt,
  cashAvailable,
  currentMonth,
  fingerprint,
  formatMonthLabel,
  expandScheduledInstallments,
  cardRunningBalance,
  invoiceDueDate,
  isCreditAccount,
  monthTotals,
  shiftMonth,
  totalsByCategory,
  transactionsInMonth,
  visibleAccounts,
} from '@/modules/finance/helpers'
import { useExpenses } from '@/modules/finance/useExpenses'
import type {
  CategoryFilter,
  CategoryGroup,
  ExpenseKind,
  ExpenseListFilters,
  ExpenseTransaction,
  FinanceAccount,
  ImportMode,
  ImportRow,
  KindFilter,
  TransactionInput,
} from '@/modules/finance/types'

function emptyTransactionInput(
  input: Omit<TransactionInput, 'source' | 'externalId' | 'merchant' | 'notes' | 'hidden' | 'installmentGroupId' | 'installmentCurrent' | 'installmentTotal' | 'invoiceMonth' | 'paymentDate'> & {
    paymentDate?: string
    invoiceMonth?: string | null
  },
): TransactionInput {
  return {
    date: input.date,
    paymentDate: input.paymentDate ?? input.date,
    description: input.description,
    amount: input.amount,
    categoryId: input.categoryId,
    kind: input.kind,
    source: 'manual',
    accountId: input.accountId,
    destAccountId: input.destAccountId,
    bank: input.bank,
    method: input.method,
    externalId: fingerprint(input.date, input.amount, input.description),
    merchant: null,
    notes: null,
    hidden: false,
    installmentGroupId: null,
    installmentCurrent: null,
    installmentTotal: null,
    invoiceMonth: input.invoiceMonth ?? null,
  }
}

export function ExpensesPage({ mode }: { mode: 'cashflow' | 'credit' }) {
  const { user, transactions, categories, rules, accounts, loading, error } = useExpenses()
  const [month, setMonth] = useState(currentMonth)
  const [filters, setFilters] = useState<ExpenseListFilters>({
    categoryId: 'all',
    accountId: 'all',
    kind: 'all',
  })
  const [importMode, setImportMode] = useState<ImportMode | null>(null)
  const [manageCategories, setManageCategories] = useState(false)
  const [manageAccounts, setManageAccounts] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const scopedAccounts = useMemo(
    () =>
      visibleAccounts(accounts).filter((item) =>
        mode === 'credit' ? isCreditAccount(item) : !isCreditAccount(item),
      ),
    [accounts, mode],
  )
  const scopedIds = useMemo(() => new Set(scopedAccounts.map((item) => item.id)), [scopedAccounts])
  const scopedTransactions = useMemo(
    () =>
      transactions.filter(
        (item) => scopedIds.has(item.accountId) || (item.destAccountId ? scopedIds.has(item.destAccountId) : false),
      ),
    [transactions, scopedIds],
  )

  const visible = useMemo(
    () => transactionsInMonth(scopedTransactions, month, filters),
    [scopedTransactions, month, filters],
  )
  const monthItems = useMemo(
    () =>
      transactionsInMonth(scopedTransactions, month, {
        categoryId: 'all',
        accountId: filters.accountId,
        kind: 'all',
      }),
    [scopedTransactions, month, filters.accountId],
  )
  const totals = useMemo(() => monthTotals(monthItems), [monthItems])
  const breakdown = useMemo(
    () => totalsByCategory(monthItems, categories),
    [monthItems, categories],
  )
  const selected = scopedTransactions.find((item) => item.id === selectedId) ?? null
  const selectedAccount = scopedAccounts.find((item) => item.id === filters.accountId) ?? null
  const available = useMemo(() => {
    if (mode === 'credit') {
      if (selectedAccount) return cardRunningBalance(selectedAccount, transactions)
      return scopedAccounts.reduce((sum, item) => sum + cardRunningBalance(item, transactions), 0)
    }
    if (selectedAccount) return accountBalance(selectedAccount, transactions)
    return cashAvailable(accounts, transactions)
  }, [accounts, mode, scopedAccounts, selectedAccount, transactions])
  const availableLabel = mode === 'credit' || selectedAccount ? 'Saldo' : 'Disponível agora'
  const accountCards = useMemo(
    () =>
      scopedAccounts.map((account) => {
        const flow = accountMonthFlow(account, transactions, month)
        return {
          account,
          balance: isCreditAccount(account)
            ? cardRunningBalance(account, transactions)
            : accountBalance(account, transactions),
          inflow: flow.inflow,
          outflow: flow.outflow,
          invoiceTotal: 0,
          debt: cardDebt(account, transactions),
        }
      }),
    [scopedAccounts, transactions, month],
  )
  const totalCardDebt = useMemo(
    () => accountCards.reduce((sum, item) => sum + item.debt, 0),
    [accountCards],
  )
  const uncategorized = monthItems.filter((item) => item.kind === 'expense' && !item.categoryId).length

  async function handleCreateCategory(name: string, kind: CategoryGroup) {
    if (!user) return
    return addExpenseCategory(user.uid, name, kind)
  }

  async function handleImport(rows: ImportRow[]) {
    if (!user) return
    const expanded = expandScheduledInstallments(rows, accounts, transactions)
    const payload = expanded.map((row) => ({
      date: row.date,
      paymentDate: row.paymentDate,
      description: row.description,
      amount: row.amount,
      categoryId: row.categoryId,
      kind: row.kind,
      source: row.source,
      accountId: row.accountId,
      destAccountId: row.destAccountId,
      bank: row.bank,
      method: row.method,
      externalId: row.externalId,
      merchant: null,
      notes: null,
      hidden: false,
      installmentGroupId:
        row.installmentCurrent && row.installmentTotal
          ? `inst-${row.externalId.replace(/:p\d+$/, '')}`
          : null,
      installmentCurrent: row.installmentCurrent,
      installmentTotal: row.installmentTotal,
      invoiceMonth: row.invoiceMonth,
    }))
    await importExpenseTransactions(user.uid, payload, rules)
  }

  async function handleCreate(input: {
    date: string
    description: string
    amount: number
    kind: Exclude<ExpenseKind, 'ignored'>
    categoryId: string | null
    accountId: string
    destAccountId: string | null
    bank: ExpenseTransaction['bank']
    method: ExpenseTransaction['method']
    installments: number
    installmentCurrent?: number
    scheduleRemaining?: boolean
    invoiceMonth?: string | null
  }) {
    if (!user) return
    const account = accounts.find((item) => item.id === input.accountId) ?? null
    const closingDay = account?.closingDay ?? 10
    const dueDay = account?.dueDay ?? 17
    const invoiceMonth = isCreditAccount(account)
      ? input.invoiceMonth || input.date.slice(0, 7)
      : null
    const paymentDate = isCreditAccount(account)
      ? invoiceDueDate(invoiceMonth || input.date.slice(0, 7), closingDay, dueDay)
      : input.date

    const base = emptyTransactionInput({
      ...input,
      paymentDate,
      invoiceMonth,
    })

    if (isCreditAccount(account) && input.kind === 'expense' && input.installments > 1) {
      const months = Array.from({ length: input.installments }, (_, index) =>
        shiftMonth(invoiceMonth || input.date.slice(0, 7), index),
      )
      const dates = months.map((item) => invoiceDueDate(item, closingDay, dueDay))
      await addInstallmentPurchase(user.uid, base, input.installments, months, dates)
    } else {
      await addExpenseTransaction(user.uid, base)
    }

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
    accountId: string
    destAccountId: string | null
    bank: ExpenseTransaction['bank']
    method: ExpenseTransaction['method']
    installments: number
    installmentCurrent?: number
    scheduleRemaining?: boolean
    invoiceMonth?: string | null
  }) {
    if (!user || !selected) return
    const account = accounts.find((item) => item.id === input.accountId) ?? null
    const closingDay = account?.closingDay ?? 10
    const dueDay = account?.dueDay ?? 17
    const invoiceMonth = isCreditAccount(account)
      ? input.invoiceMonth || selected.invoiceMonth || input.date.slice(0, 7)
      : null
    const paymentDate = isCreditAccount(account)
      ? invoiceDueDate(invoiceMonth || input.date.slice(0, 7), closingDay, dueDay)
      : input.date
    const installmentCurrent = input.installmentCurrent ?? selected.installmentCurrent
    const installmentTotal = input.installments > 1 ? input.installments : selected.installmentTotal
    await updateExpenseTransaction(user.uid, selected.id, {
      date: input.date,
      paymentDate,
      description: input.description,
      amount: input.amount,
      kind: input.kind,
      categoryId: input.categoryId,
      accountId: input.accountId,
      destAccountId: input.destAccountId,
      bank: input.bank,
      method: input.method,
      invoiceMonth,
      installmentCurrent,
      installmentTotal,
    })
    if (input.scheduleRemaining && installmentCurrent && installmentTotal) {
      await scheduleRemainingInstallments(
        user.uid,
        {
          ...selected,
          date: input.date,
          description: input.description,
          amount: input.amount,
          accountId: input.accountId,
          invoiceMonth,
          installmentCurrent,
          installmentTotal,
        },
        transactions,
        accounts,
      )
    }
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

  async function handleAccountSave(input: {
    id?: string
    name: string
    institution: FinanceAccount['institution']
    type: FinanceAccount['type']
    initialBalance: number
    brand: string | null
    lastFour: string | null
    limit: number | null
    closingDay: number | null
    dueDay: number | null
    paymentAccountId: string | null
  }) {
    if (!user) return
    const payload = {
      name: input.name,
      institution: input.institution,
      type: input.type,
      initialBalance: input.initialBalance,
      initialBalanceDate: '1970-01-01',
      archived: false,
      brand: input.brand,
      lastFour: input.lastFour,
      limit: input.limit,
      closingDay: input.closingDay,
      dueDay: input.dueDay,
      paymentAccountId: input.paymentAccountId,
    }
    if (!input.id) {
      await addFinanceAccount(user.uid, payload)
      return
    }
    await updateFinanceAccount(user.uid, input.id, payload)
  }

  return (
    <div>
      {scopedAccounts.length > 0 ? (
        <div className="mb-5">
          <AccountSelector
            accounts={accountCards}
            selectedAccountId={filters.accountId}
            available={available}
            allLabel={mode === 'credit' ? 'Todos' : 'Todas'}
            onSelect={(accountId) => setFilters((current) => ({ ...current, accountId }))}
          />
        </div>
      ) : null}

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
          {mode === 'cashflow' ? (
            <button
              type="button"
              onClick={() => setImportMode('statement')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3 py-2 text-sm font-medium text-paper"
            >
              <UploadIcon className="h-4 w-4" />
              Enviar extrato
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setImportMode('invoice')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3 py-2 text-sm font-medium text-paper"
            >
              <UploadIcon className="h-4 w-4" />
              Enviar fatura
            </button>
          )}
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
            onClick={() => setManageAccounts(true)}
            className="rounded-xl px-3 py-2 text-sm font-medium text-forest"
          >
            {mode === 'credit' ? 'Cartões' : 'Contas'}
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
          Não foi possível carregar os dados. Confira se o Firestore está criado e se as
          regras foram publicadas.
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-muted">Carregando...</p>
      ) : (
        <>
          <div className="mt-5">
            <MonthSummary
              variant={mode === 'credit' ? 'credit' : 'cash'}
              expenses={totals.expenses}
              income={totals.income}
              investments={totals.investments}
              result={totals.result}
              available={available}
              availableLabel={availableLabel}
              cardDebt={
                selectedAccount ? cardDebt(selectedAccount, transactions) : totalCardDebt
              }
              cardSpend={available}
              showCardTotals={false}
              upcoming={[]}
              breakdown={breakdown}
              uncategorized={uncategorized}
            />
          </div>

          <div className={mode === 'credit' ? 'mt-5' : 'mt-5 grid gap-3 sm:grid-cols-2'}>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                Categoria
              </span>
              <CategorySelect
                categories={categories}
                value={filters.categoryId}
                group={
                  mode === 'credit'
                    ? 'expense'
                    : filters.kind === 'income'
                      ? 'income'
                      : filters.kind === 'expense'
                        ? 'expense'
                        : 'all'
                }
                allowEmpty={false}
                extraOptions={[
                  { value: 'all', label: 'Todas' },
                  { value: 'none', label: 'Sem categoria' },
                ]}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
                onChange={(categoryId) =>
                  setFilters((current) => ({
                    ...current,
                    categoryId: categoryId as CategoryFilter,
                  }))
                }
                onCreate={async (name, kind) => {
                  if (!user) return
                  const id = await addExpenseCategory(user.uid, name, kind)
                  return id
                }}
              />
            </label>

            {mode === 'cashflow' ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                Tipo
              </span>
              <select
                value={filters.kind}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    kind: event.target.value as KindFilter,
                  }))
                }
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
              >
                <option value="all">Todos</option>
                <option value="expense">Gastos</option>
                <option value="income">Receitas</option>
                <option value="transfer">Transferências</option>
                <option value="investment">Investimentos</option>
              </select>
            </label>
            ) : null}
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
                  ? mode === 'credit'
                    ? 'Nada neste mês. Envie uma fatura ou adicione um lançamento.'
                    : 'Nada neste mês. Envie um extrato ou adicione um lançamento.'
                  : 'Nenhum lançamento neste filtro.'}
              </li>
            ) : (
              visible.map((item) => (
                <ExpenseRow
                  key={item.id}
                  transaction={item}
                  categories={categories}
                  accounts={accounts}
                  selected={selectedIds.includes(item.id)}
                  onToggleSelect={() => toggleSelected(item.id)}
                  onOpen={() => setSelectedId(item.id)}
                />
              ))
            )}
          </ul>
        </>
      )}

      {importMode && user ? (
        <ImportModal
          uid={user.uid}
          mode={importMode}
          month={month}
          categories={categories}
          rules={rules}
          transactions={transactions}
          accounts={scopedAccounts}
          allAccounts={accounts}
          onClose={() => setImportMode(null)}
          onImport={handleImport}
        />
      ) : null}

      {creating ? (
        <ExpensePanel
          transaction={null}
          categories={categories}
          accounts={scopedAccounts}
          allAccounts={accounts}
          onClose={() => setCreating(false)}
          onSave={handleCreate}
          onCreateCategory={handleCreateCategory}
        />
      ) : null}

      {selected ? (
        <ExpensePanel
          transaction={selected}
          categories={categories}
          accounts={scopedAccounts}
          allAccounts={accounts}
          onClose={() => setSelectedId(null)}
          onSave={handleUpdate}
          onCreateCategory={handleCreateCategory}
          onDelete={handleDelete}
        />
      ) : null}

      {manageCategories && user ? (
        <CategoryModal
          categories={categories}
          onClose={() => setManageCategories(false)}
          onAdd={async (name, kind) => {
            await addExpenseCategory(user.uid, name, kind)
          }}
          onRename={(id, name) => renameExpenseCategory(user.uid, id, name)}
          onDelete={(id) => deleteExpenseCategory(user.uid, id)}
        />
      ) : null}

      {manageAccounts && user ? (
        <AccountModal
          accounts={accounts}
          transactions={transactions}
          variant={mode === 'credit' ? 'credit' : 'cash'}
          onClose={() => setManageAccounts(false)}
          onSave={handleAccountSave}
          onArchive={(id) => archiveFinanceAccount(user.uid, id)}
        />
      ) : null}
    </div>
  )
}
