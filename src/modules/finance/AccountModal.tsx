import { useMemo, useState } from 'react'
import { CloseIcon } from '@/components/icons'
import { BankLogo } from '@/modules/finance/BankLogo'
import { ACCOUNT_TYPES, INSTITUTIONS } from '@/modules/finance/catalog'
import { accountBalance, formatMoney, transactionsForAccount } from '@/modules/finance/helpers'
import type {
  AccountInstitution,
  AccountType,
  ExpenseTransaction,
  FinanceAccount,
} from '@/modules/finance/types'

type Draft = {
  name: string
  institution: AccountInstitution
  type: AccountType
  balance: string
  brand: string
  lastFour: string
  limit: string
  closingDay: string
  dueDay: string
  paymentAccountId: string
}

function emptyDraft(type: AccountType = 'checking'): Draft {
  return {
    name: '',
    institution: 'nubank',
    type,
    balance: '',
    brand: '',
    lastFour: '',
    limit: '',
    closingDay: '10',
    dueDay: '17',
    paymentAccountId: '',
  }
}

function draftFromAccount(account: FinanceAccount): Draft {
  return {
    name: account.name,
    institution: account.institution,
    type: account.type,
    balance: String(
      account.type === 'credit' ? Math.abs(account.initialBalance) : account.initialBalance,
    ).replace('.', ','),
    brand: account.brand ?? '',
    lastFour: account.lastFour ?? '',
    limit: account.limit != null ? String(account.limit).replace('.', ',') : '',
    closingDay: account.closingDay != null ? String(account.closingDay) : '10',
    dueDay: account.dueDay != null ? String(account.dueDay) : '17',
    paymentAccountId: account.paymentAccountId ?? '',
  }
}

function parseMoney(value: string) {
  const cleaned = value.replace(/\s/g, '').replace(',', '.')
  const amount = Number(cleaned)
  return Number.isFinite(amount) ? amount : 0
}

export function AccountModal({
  accounts,
  transactions,
  variant = 'all',
  onClose,
  onSave,
  onArchive,
}: {
  accounts: FinanceAccount[]
  transactions: ExpenseTransaction[]
  variant?: 'all' | 'cash' | 'credit'
  onClose: () => void
  onSave: (input: {
    id?: string
    name: string
    institution: AccountInstitution
    type: AccountType
    initialBalance: number
    brand: string | null
    lastFour: string | null
    limit: number | null
    closingDay: number | null
    dueDay: number | null
    paymentAccountId: string | null
  }) => Promise<void>
  onArchive: (id: string) => Promise<void>
}) {
  const visible = useMemo(
    () =>
      accounts.filter((item) => {
        if (item.archived) return false
        if (variant === 'credit') return item.type === 'credit'
        if (variant === 'cash') return item.type !== 'credit'
        return true
      }),
    [accounts, variant],
  )
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)
  const selected = visible.find((item) => item.id === selectedId) ?? null
  const historyCount = selected ? transactionsForAccount(transactions, selected.id).length : 0
  const paymentAccounts = accounts.filter((item) => !item.archived && item.type !== 'credit')
  const typeOptions =
    variant === 'credit'
      ? ACCOUNT_TYPES.filter((item) => item.id === 'credit')
      : variant === 'cash'
        ? ACCOUNT_TYPES.filter((item) => item.id !== 'credit')
        : ACCOUNT_TYPES
  const listTitle = variant === 'credit' ? 'Cartões' : 'Contas'
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [saving, setSaving] = useState(false)

  function openNew() {
    setSelectedId('new')
    setDraft(emptyDraft(variant === 'credit' ? 'credit' : 'checking'))
  }

  function openAccount(account: FinanceAccount) {
    setSelectedId(account.id)
    setDraft(draftFromAccount(account))
  }

  async function handleSave() {
    if (!draft.name.trim() || saving) return
    setSaving(true)
    try {
      await onSave({
        id: selected?.id,
        name: draft.name.trim(),
        institution: draft.institution,
        type: draft.type,
        initialBalance:
          draft.type === 'credit' ? -Math.abs(parseMoney(draft.balance)) : parseMoney(draft.balance),
        brand: draft.brand.trim() || null,
        lastFour: draft.lastFour.trim() || null,
        limit: draft.limit ? parseMoney(draft.limit) : null,
        closingDay: draft.type === 'credit' ? Number(draft.closingDay) || 10 : null,
        dueDay: draft.type === 'credit' ? Number(draft.dueDay) || 17 : null,
        paymentAccountId: draft.paymentAccountId || null,
      })
      setSelectedId(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/25 p-4 md:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-3xl bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="font-serif text-xl text-ink">
            {selectedId
              ? selected
                ? variant === 'credit'
                  ? 'Editar cartão'
                  : 'Editar conta'
                : variant === 'credit'
                  ? 'Novo cartão'
                  : 'Nova conta'
              : listTitle}
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

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {!selectedId ? (
            <>
              <ul className="space-y-2">
                {visible.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openAccount(item)}
                      className="flex w-full items-center justify-between rounded-xl border border-line px-3 py-2 text-left"
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <BankLogo institution={item.institution} className="h-7 w-7" />
                        <span className="text-sm text-ink">{item.name}</span>
                      </span>
                      <span className="text-sm text-muted">
                        {formatMoney(
                          item.type === 'credit'
                            ? Math.max(0, -accountBalance(item, transactions))
                            : accountBalance(item, transactions),
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={openNew}
                className="rounded-xl bg-forest px-4 py-2 text-sm font-medium text-paper"
              >
                {variant === 'credit' ? 'Novo cartão' : 'Nova conta'}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Nome</span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                    Instituição
                  </span>
                  <select
                    value={draft.institution}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        institution: event.target.value as AccountInstitution,
                      }))
                    }
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
                  >
                    {INSTITUTIONS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Tipo</span>
                  <select
                    value={draft.type}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, type: event.target.value as AccountType }))
                    }
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
                  >
                    {typeOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                  {draft.type === 'credit' ? 'Dívida inicial' : 'Saldo inicial'}
                </span>
                <input
                  inputMode="decimal"
                  value={draft.balance}
                  onChange={(event) => setDraft((current) => ({ ...current, balance: event.target.value }))}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
                />
                <p className="mt-1 text-xs text-muted">
                  Ponto de partida. O saldo atual é este valor mais o que entrar e sair no extrato.
                </p>
              </label>
              {selected ? (
                <div className="rounded-xl border border-line bg-paper px-3 py-2.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {selected.type === 'credit' ? 'Dívida calculada' : 'Saldo calculado'}
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink">
                    {formatMoney(
                      selected.type === 'credit'
                        ? Math.max(0, -accountBalance(selected, transactions))
                        : accountBalance(selected, transactions),
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {historyCount} lançamento{historyCount === 1 ? '' : 's'} no histórico desta conta.
                  </p>
                </div>
              ) : null}
              {draft.type === 'credit' ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                        Fechamento
                      </span>
                      <input
                        inputMode="numeric"
                        value={draft.closingDay}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, closingDay: event.target.value }))
                        }
                        className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                        Vencimento
                      </span>
                      <input
                        inputMode="numeric"
                        value={draft.dueDay}
                        onChange={(event) => setDraft((current) => ({ ...current, dueDay: event.target.value }))}
                        className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Limite</span>
                    <input
                      inputMode="decimal"
                      value={draft.limit}
                      onChange={(event) => setDraft((current) => ({ ...current, limit: event.target.value }))}
                      className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                      Conta de pagamento
                    </span>
                    <select
                      value={draft.paymentAccountId}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, paymentAccountId: event.target.value }))
                      }
                      className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
                    >
                      <option value="">Nenhuma</option>
                      {paymentAccounts
                        .filter((item) => item.id !== selected?.id)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </>
              ) : null}
            </div>
          )}
        </div>

        {selectedId ? (
          <div className="space-y-3 border-t border-line px-5 py-4">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !draft.name.trim()}
              className="h-11 w-full rounded-xl bg-forest text-sm font-medium text-paper disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            {selected ? (
              <button
                type="button"
                onClick={() => {
                  const ok = window.confirm(`Arquivar "${selected.name}"? O histórico permanece.`)
                  if (ok) void onArchive(selected.id).then(() => setSelectedId(null))
                }}
                className="text-sm text-clay hover:underline"
              >
                Arquivar conta
              </button>
            ) : null}
            <button type="button" onClick={() => setSelectedId(null)} className="text-sm text-muted hover:text-ink">
              Voltar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
