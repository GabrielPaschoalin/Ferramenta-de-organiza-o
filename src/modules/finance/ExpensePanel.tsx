import { useEffect, useState } from 'react'
import { CloseIcon, TrashIcon } from '@/components/icons'
import { BANKS, PAYMENT_METHODS } from '@/modules/finance/catalog'
import { signedAmount, todayISO } from '@/modules/finance/helpers'
import type {
  ExpenseBank,
  ExpenseCategory,
  ExpenseKind,
  ExpenseTransaction,
  PaymentMethod,
} from '@/modules/finance/types'

type Draft = {
  date: string
  description: string
  amount: string
  kind: Exclude<ExpenseKind, 'ignored'>
  categoryId: string | null
  bank: ExpenseBank
  method: PaymentMethod
}

function draftFromTransaction(transaction: ExpenseTransaction | null): Draft {
  if (!transaction) {
    return {
      date: todayISO(),
      description: '',
      amount: '',
      kind: 'expense',
      categoryId: null,
      bank: 'nubank',
      method: 'debit',
    }
  }

  return {
    date: transaction.date,
    description: transaction.description,
    amount: String(Math.abs(transaction.amount)).replace('.', ','),
    kind: transaction.kind === 'income' ? 'income' : 'expense',
    categoryId: transaction.categoryId,
    bank: transaction.bank,
    method: transaction.method,
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
  onClose,
  onSave,
  onDelete,
}: {
  transaction: ExpenseTransaction | null
  categories: ExpenseCategory[]
  onClose: () => void
  onSave: (input: {
    date: string
    description: string
    amount: number
    kind: Exclude<ExpenseKind, 'ignored'>
    categoryId: string | null
    bank: ExpenseBank
    method: PaymentMethod
  }) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFromTransaction(transaction))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(draftFromTransaction(transaction))
  }, [transaction?.id])

  async function handleSave() {
    const description = draft.description.trim()
    const amount = parseDraftAmount(draft.amount)
    if (!description || amount === null || amount <= 0 || saving) return
    setSaving(true)
    try {
      await onSave({
        date: draft.date,
        description,
        amount: signedAmount(draft.kind, amount),
        kind: draft.kind,
        categoryId: draft.categoryId,
        bank: draft.bank,
        method: draft.method,
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
              onChange={(event) =>
                setDraft((current) => ({ ...current, date: event.target.value }))
              }
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
              {([
                { id: 'expense', label: 'Gasto' },
                { id: 'income', label: 'Receita' },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, kind: item.id }))}
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

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                Banco
              </span>
              <select
                value={draft.bank}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    bank: event.target.value as ExpenseBank,
                  }))
                }
                className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
              >
                {BANKS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                Crédito ou débito
              </span>
              <select
                value={draft.method}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    method: event.target.value as PaymentMethod,
                  }))
                }
                className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
              >
                {PAYMENT_METHODS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Categoria
            </span>
            <select
              value={draft.categoryId ?? ''}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  categoryId: event.target.value || null,
                }))
              }
              className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-forest"
            >
              <option value="">Sem categoria</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-3 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !draft.description.trim() || !draft.amount}
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
