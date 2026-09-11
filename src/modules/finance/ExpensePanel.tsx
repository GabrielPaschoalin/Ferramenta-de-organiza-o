import { useEffect, useState } from 'react'
import { CloseIcon, TrashIcon } from '@/components/icons'
import { CategorySelect } from '@/modules/finance/CategorySelect'
import {
  institutionToBank,
  isCreditAccount,
  methodFromAccount,
  signedAmount,
  todayISO,
  visibleAccounts,
} from '@/modules/finance/helpers'
import type {
  CategoryGroup,
  ExpenseCategory,
  ExpenseKind,
  ExpenseTransaction,
  FinanceAccount,
} from '@/modules/finance/types'

type Draft = {
  date: string
  description: string
  amount: string
  kind: Exclude<ExpenseKind, 'ignored'>
  categoryId: string | null
  accountId: string
  destAccountId: string
  installments: string
  installmentCurrent: string
  scheduleRemaining: boolean
  invoiceMonth: string
}

function draftFromTransaction(
  transaction: ExpenseTransaction | null,
  accounts: FinanceAccount[],
): Draft {
  const first = visibleAccounts(accounts)[0]
  if (!transaction) {
    return {
      date: todayISO(),
      description: '',
      amount: '',
      kind: 'expense',
      categoryId: null,
      accountId: first?.id ?? '',
      destAccountId: '',
      installments: '1',
      installmentCurrent: '1',
      scheduleRemaining: false,
      invoiceMonth: todayISO().slice(0, 7),
    }
  }

  return {
    date: transaction.date,
    description: transaction.description,
    amount: String(Math.abs(transaction.amount)).replace('.', ','),
    kind:
      transaction.kind === 'income' ||
      transaction.kind === 'transfer' ||
      transaction.kind === 'investment' ||
      transaction.kind === 'adjustment'
        ? transaction.kind
        : 'expense',
    categoryId: transaction.categoryId,
    accountId: transaction.accountId || first?.id || '',
    destAccountId: transaction.destAccountId ?? '',
    installments: transaction.installmentTotal ? String(transaction.installmentTotal) : '1',
    installmentCurrent: transaction.installmentCurrent ? String(transaction.installmentCurrent) : '1',
    scheduleRemaining: Boolean(
      transaction.installmentCurrent &&
        transaction.installmentTotal &&
        transaction.installmentCurrent < transaction.installmentTotal,
    ),
    invoiceMonth: transaction.invoiceMonth || transaction.date.slice(0, 7),
  }
}

function parseDraftAmount(value: string) {
  const cleaned = value.replace(/\s/g, '').replace(',', '.')
  const amount = Number(cleaned)
  return Number.isFinite(amount) ? amount : null
}

export function ExpensePanel({
  transaction,
  categories,
  accounts,
  allAccounts,
  onClose,
  onSave,
  onCreateCategory,
  onDelete,
}: {
  transaction: ExpenseTransaction | null
  categories: ExpenseCategory[]
  accounts: FinanceAccount[]
  allAccounts?: FinanceAccount[]
  onClose: () => void
  onCreateCategory: (name: string, kind: CategoryGroup) => Promise<string | undefined>
  onSave: (input: {
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
    installmentCurrent: number
    scheduleRemaining: boolean
    invoiceMonth: string | null
  }) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFromTransaction(transaction, accounts))
  const [saving, setSaving] = useState(false)
  const account = accounts.find((item) => item.id === draft.accountId) ?? null
  const credit = isCreditAccount(account)
  const originAccounts = visibleAccounts(accounts)
  const destOptions = visibleAccounts(allAccounts ?? accounts).filter((item) => item.id !== draft.accountId)

  useEffect(() => {
    setDraft(draftFromTransaction(transaction, accounts))
  }, [transaction?.id, accounts])

  async function handleSave() {
    const description = draft.description.trim()
    const amount = parseDraftAmount(draft.amount)
    if (!description || amount === null || amount <= 0 || !draft.accountId || saving) return
    if (draft.kind === 'transfer' && !draft.destAccountId) return
    setSaving(true)
    try {
      const resolved = account ?? originAccounts[0]
      await onSave({
        date: draft.date,
        description,
        amount:
          draft.kind === 'transfer' || draft.kind === 'adjustment'
            ? amount
            : signedAmount(draft.kind, amount),
        kind: draft.kind,
        categoryId: draft.kind === 'transfer' || draft.kind === 'investment' ? null : draft.categoryId,
        accountId: draft.accountId,
        destAccountId: draft.kind === 'transfer' ? draft.destAccountId || null : null,
        bank: resolved ? institutionToBank(resolved.institution) : 'nubank',
        method: resolved ? methodFromAccount(resolved) : 'debit',
        installments: credit ? Math.max(1, Number(draft.installments) || 1) : 1,
        installmentCurrent: credit ? Math.max(1, Number(draft.installmentCurrent) || 1) : 1,
        scheduleRemaining: credit && Boolean(transaction) && draft.scheduleRemaining,
        invoiceMonth: credit ? draft.invoiceMonth : null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-ink/25" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="font-serif text-xl text-ink">
            {transaction ? 'Lançamento' : 'Novo lançamento'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-paper hover:text-ink"
            aria-label="Fechar"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Descrição
            </span>
            <input
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Data
            </span>
            <input
              type="date"
              value={draft.date}
              onChange={(event) => {
                const date = event.target.value
                setDraft((current) => ({
                  ...current,
                  date,
                  invoiceMonth: date.slice(0, 7),
                }))
              }}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Valor
            </span>
            <input
              inputMode="decimal"
              value={draft.amount}
              onChange={(event) =>
                setDraft((current) => ({ ...current, amount: event.target.value }))
              }
              placeholder="0,00"
              className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            />
          </label>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Tipo</p>
            <div className="flex flex-wrap gap-2">
              {(
                (originAccounts.length > 0 && originAccounts.every(isCreditAccount)
                  ? ([{ id: 'expense', label: 'Gasto' }] as const)
                  : ([
                      { id: 'expense', label: 'Gasto' },
                      { id: 'income', label: 'Receita' },
                      { id: 'transfer', label: 'Transferência' },
                      { id: 'investment', label: 'Investimento' },
                    ] as const))
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      kind: item.id,
                      categoryId:
                        current.categoryId &&
                        categories.find((category) => category.id === current.categoryId)?.kind ===
                          item.id
                          ? current.categoryId
                          : null,
                    }))
                  }
                  className={[
                    'rounded-full px-3 py-1.5 text-sm',
                    draft.kind === item.id ? 'bg-forest text-paper' : 'bg-paper text-muted',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              {draft.kind === 'transfer' ? 'Conta de origem' : 'Conta'}
            </span>
            <select
              value={draft.accountId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, accountId: event.target.value }))
              }
              className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            >
              {originAccounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          {draft.kind === 'transfer' ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                Conta de destino
              </span>
              <select
                value={draft.destAccountId}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, destAccountId: event.target.value }))
                }
                className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
              >
                <option value="">Selecione</option>
                {destOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : draft.kind === 'investment' ? (
            <p className="text-sm text-muted">
              Sai da conta e não entra no resultado do mês (receita menos gastos).
            </p>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                Categoria
              </span>
              <CategorySelect
                categories={categories}
                value={draft.categoryId ?? ''}
                group={draft.kind === 'income' ? 'income' : 'expense'}
                onChange={(categoryId) =>
                  setDraft((current) => ({ ...current, categoryId: categoryId || null }))
                }
                onCreate={onCreateCategory}
              />
            </label>
          )}

          {credit && draft.kind === 'expense' && !transaction ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                Parcelas
              </span>
              <input
                inputMode="numeric"
                value={draft.installments}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, installments: event.target.value }))
                }
                className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
              />
            </label>
          ) : null}

          {credit && draft.kind === 'expense' && transaction ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                    Parcela atual
                  </span>
                  <input
                    inputMode="numeric"
                    value={draft.installmentCurrent}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, installmentCurrent: event.target.value }))
                    }
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                    Total
                  </span>
                  <input
                    inputMode="numeric"
                    value={draft.installments}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, installments: event.target.value }))
                    }
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
                  />
                </label>
              </div>
              {Number(draft.installmentCurrent) > 0 &&
              Number(draft.installments) > Number(draft.installmentCurrent) ? (
                <label className="inline-flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={draft.scheduleRemaining}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, scheduleRemaining: event.target.checked }))
                    }
                  />
                  Agendar {Number(draft.installments) - Number(draft.installmentCurrent)} parcelas futuras
                </label>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-3 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !draft.description.trim() || !draft.amount || !draft.accountId}
            className="h-11 w-full rounded-xl bg-forest text-sm font-medium text-paper disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          {onDelete ? (
            <button
              type="button"
              onClick={() => void onDelete()}
              className="inline-flex items-center gap-2 text-sm text-clay hover:underline"
            >
              <TrashIcon className="h-4 w-4" />
              Apagar lançamento
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
