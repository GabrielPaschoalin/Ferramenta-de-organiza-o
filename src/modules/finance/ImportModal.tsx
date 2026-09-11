import { useMemo, useRef, useState } from 'react'
import { CloseIcon } from '@/components/icons'
import { addExpenseCategory, ensureDefaultCategories } from '@/modules/finance/api'
import { CategorySelect } from '@/modules/finance/CategorySelect'
import {
  applyRules,
  currentMonth,
  formatMoney,
  parseInstallment,
  signedAmount,
  visibleAccounts,
} from '@/modules/finance/helpers'
import {
  applyCsvMapping,
  parseCsv,
  type CsvMapping,
  type CsvTable,
} from '@/modules/finance/parseCsv'
import { parseOfxStatement } from '@/modules/finance/parseOfx'
import { parseInvoicePdf } from '@/modules/finance/parsePdf'
import type {
  ExpenseCategory,
  ExpenseKind,
  ExpenseRule,
  ExpenseTransaction,
  FinanceAccount,
  ImportMode,
  ImportRow,
  ParsedTransaction,
} from '@/modules/finance/types'

function isOfxName(name: string) {
  return /\.(ofx|ofc|qfx)$/i.test(name) || name.toLowerCase().includes('.ofx')
}

function isPdfName(name: string) {
  return /\.pdf$/i.test(name)
}

export function ImportModal({
  uid,
  mode,
  month,
  categories,
  rules,
  transactions,
  accounts,
  allAccounts,
  onClose,
  onImport,
}: {
  uid: string
  mode: ImportMode
  month: string
  categories: ExpenseCategory[]
  rules: ExpenseRule[]
  transactions: ExpenseTransaction[]
  accounts: FinanceAccount[]
  allAccounts?: FinanceAccount[]
  onClose: () => void
  onImport: (rows: ImportRow[]) => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const cashAccounts = visibleAccounts(accounts)
  const ruleAccounts = allAccounts ?? accounts
  const defaultAccount =
    cashAccounts.find((item) => (mode === 'invoice' ? item.type === 'credit' : item.type !== 'credit')) ??
    cashAccounts[0] ??
    null
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [readyCategories, setReadyCategories] = useState(categories)
  const [accountId, setAccountId] = useState(defaultAccount?.id ?? '')
  const [invoiceMonth, setInvoiceMonth] = useState(month || currentMonth())
  const [csvTable, setCsvTable] = useState<CsvTable | null>(null)
  const [mapping, setMapping] = useState<CsvMapping>({
    date: 0,
    description: 1,
    amount: 2,
    balance: null,
  })
  const [saving, setSaving] = useState(false)
  const [reading, setReading] = useState(false)

  const account = cashAccounts.find((item) => item.id === accountId) ?? defaultAccount

  const knownIds = useMemo(
    () => new Set(transactions.map((item) => item.externalId)),
    [transactions],
  )

  const selected = rows?.filter((item) => item.include && !item.duplicate) ?? []
  const duplicates = rows?.filter((item) => item.duplicate).length ?? 0
  const transfers = rows?.filter((item) => item.kind === 'transfer').length ?? 0
  const scheduled = selected.reduce((sum, item) => {
    if (!item.scheduleRemaining || !item.installmentCurrent || !item.installmentTotal) return sum
    if (item.installmentCurrent >= item.installmentTotal) return sum
    return sum + (item.installmentTotal - item.installmentCurrent)
  }, 0)

  const title = mode === 'invoice' ? 'Enviar fatura' : 'Enviar extrato'
  const accept =
    mode === 'invoice' ? '.pdf,.ofx,.ofc,.qfx,.csv,.txt' : '.ofx,.ofc,.qfx,.csv,.txt'
  const pickLabel =
    mode === 'invoice'
      ? 'Escolher PDF, OFX ou CSV da fatura'
      : 'Escolher arquivo OFX ou CSV'

  async function loadParsed(parsed: ParsedTransaction[]) {
    if (!account) {
      setError('Cadastre uma conta antes de importar.')
      return
    }
    if (parsed.length === 0) {
      setError('Não encontrei lançamentos neste arquivo.')
      setRows(null)
      return
    }
    const nextCategories = await ensureDefaultCategories(uid, categories)
    setReadyCategories(nextCategories)
    setError(null)
    setCsvTable(null)
    setRows(
      applyRules(parsed, rules, nextCategories, knownIds, account, ruleAccounts, mode, invoiceMonth, transactions),
    )
  }

  async function handleFile(file: File) {
    setError(null)
    setReading(true)
    try {
      if (isPdfName(file.name) || file.type === 'application/pdf') {
        if (mode !== 'invoice') {
          setError('PDF serve para fatura do cartão. Use o botão Enviar fatura.')
          return
        }
        await loadParsed(await parseInvoicePdf(file))
        return
      }

      const text = await file.text()
      if (isOfxName(file.name) || /<STMTTRN>/i.test(text)) {
        const parsed = parseOfxStatement(text)
        await loadParsed(parsed.transactions)
        return
      }

      const result = parseCsv(text)
      if (result.mapping && result.transactions.length > 0) {
        await loadParsed(result.transactions)
        return
      }

      if (result.table.headers.length >= 3) {
        setCsvTable(result.table)
        setMapping(
          result.mapping ?? {
            date: 0,
            description: 1,
            amount: Math.min(2, result.table.headers.length - 1),
            balance: null,
          },
        )
        setRows(null)
        setError(null)
        return
      }

      setError(
        mode === 'invoice'
          ? 'Não consegui ler este arquivo. Use PDF da fatura (Inter) ou OFX/CSV.'
          : 'Não consegui ler este arquivo. Use OFX ou CSV com data, descrição e valor.',
      )
      setRows(null)
      setCsvTable(null)
    } catch {
      setError('Falha ao ler o arquivo. Confira se o PDF não está protegido por senha.')
      setRows(null)
    } finally {
      setReading(false)
    }
  }

  function applyMapping() {
    if (!csvTable) return
    void loadParsed(applyCsvMapping(csvTable, mapping))
  }

  function changeAccount(nextId: string) {
    setAccountId(nextId)
    const next = cashAccounts.find((item) => item.id === nextId)
    if (!next || !rows) return
    setRows(
      applyRules(rows, rules, readyCategories, knownIds, next, ruleAccounts, mode, invoiceMonth, transactions),
    )
  }

  function changeInvoiceMonth(next: string) {
    setInvoiceMonth(next)
    if (!account || !rows) return
    setRows(applyRules(rows, rules, readyCategories, knownIds, account, ruleAccounts, mode, next, transactions))
  }

  function patchRow(index: number, patch: Partial<ImportRow>) {
    setRows((current) =>
      current ? current.map((item, i) => (i === index ? { ...item, ...patch } : item)) : current,
    )
  }

  async function handleSave() {
    if (!selected.length || saving || !account) return
    setSaving(true)
    try {
      await onImport(selected)
      onClose()
    } catch {
      setError('Não foi possível salvar os lançamentos.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/25 p-4 md:items-center" onClick={onClose}>
      <div
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-3xl bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="font-serif text-xl text-ink">{title}</p>
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
          <div>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleFile(file)
                event.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={reading}
              className="rounded-xl border border-dashed border-line bg-paper px-4 py-3 text-sm text-ink disabled:opacity-60"
            >
              {reading ? 'Lendo arquivo...' : pickLabel}
            </button>
            <p className="mt-2 text-xs text-muted">
              {mode === 'invoice'
                ? 'A lista usa a data da compra. Parcelas futuras podem ser agendadas.'
                : 'Pagamento de fatura vira transferência para o cartão, sem contar como gasto novo. Receitas também entram.'}
            </p>
            <div className={mode === 'invoice' ? 'mt-3 grid gap-3 sm:grid-cols-2' : 'mt-3'}>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Conta</span>
                <select
                  value={accountId}
                  onChange={(event) => changeAccount(event.target.value)}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest"
                >
                  {cashAccounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              {mode === 'invoice' ? (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                    Mês da fatura
                  </span>
                  <input
                    type="month"
                    value={invoiceMonth}
                    onChange={(event) => changeInvoiceMonth(event.target.value)}
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest"
                  />
                </label>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-clay/20 bg-clay/5 px-3 py-2 text-sm text-clay">{error}</p>
          ) : null}

          {csvTable && !rows ? (
            <div className="space-y-3 rounded-2xl border border-line p-4">
              <p className="text-sm text-ink">Não reconheci as colunas. Escolha data, descrição e valor.</p>
              <ColumnSelect
                label="Data"
                headers={csvTable.headers}
                value={mapping.date}
                onChange={(date) => setMapping((current) => ({ ...current, date }))}
              />
              <ColumnSelect
                label="Descrição"
                headers={csvTable.headers}
                value={mapping.description}
                onChange={(description) => setMapping((current) => ({ ...current, description }))}
              />
              <ColumnSelect
                label="Valor"
                headers={csvTable.headers}
                value={mapping.amount}
                onChange={(amount) => setMapping((current) => ({ ...current, amount }))}
              />
              <button
                type="button"
                onClick={applyMapping}
                className="rounded-xl bg-forest px-4 py-2 text-sm font-medium text-paper"
              >
                Continuar
              </button>
            </div>
          ) : null}

          {rows ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted">
                  {selected.length} novos
                  {duplicates ? ` · ${duplicates} já importados` : ''}
                  {transfers ? ` · ${transfers} transferências` : ''}
                  {scheduled ? ` · ${scheduled} parcelas futuras` : ''}
                  {' · '}
                  {rows.filter((item) => item.categoryId).length} pré-categorizados
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setRows((current) =>
                      current
                        ? current.map((item) => (item.duplicate ? item : { ...item, include: false }))
                        : current,
                    )
                  }
                  className="text-sm text-muted hover:text-ink"
                >
                  Desmarcar todos
                </button>
              </div>
              <ul className="space-y-2">
                {rows.map((item, index) => (
                  <li key={`${item.externalId}-${index}`} className="rounded-xl border border-line px-3 py-2">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={item.include && !item.duplicate}
                        disabled={item.duplicate}
                        onChange={(event) => patchRow(index, { include: event.target.checked })}
                      />
                      <div className="min-w-0 flex-1">
                        <input
                          value={item.description}
                          disabled={item.duplicate}
                          onChange={(event) => {
                            const description = event.target.value
                            const installment = parseInstallment(description)
                            patchRow(index, {
                              description,
                              installmentCurrent: installment?.current ?? item.installmentCurrent,
                              installmentTotal: installment?.total ?? item.installmentTotal,
                              scheduleRemaining: installment
                                ? installment.current < installment.total
                                : item.scheduleRemaining,
                            })
                          }}
                          className="w-full rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-forest disabled:opacity-60"
                          aria-label="Nome da cobrança"
                        />
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <input
                            type="date"
                            value={item.date}
                            disabled={item.duplicate}
                            onChange={(event) => patchRow(index, { date: event.target.value })}
                            className="rounded-lg border border-line bg-paper px-2 py-1 text-xs text-ink outline-none focus:border-forest disabled:opacity-60"
                            aria-label="Data do lançamento"
                          />
                          <p className="text-xs text-muted">
                            {formatMoney(Math.abs(item.amount))}
                            {item.duplicate ? ' · já importado' : ''}
                            {item.kind === 'transfer' ? ' · pagamento de fatura (transferência)' : ''}
                            {item.kind === 'investment' ? ' · investimento (fora do resultado)' : ''}
                          </p>
                        </div>
                        {mode === 'invoice' ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted">Parcela</span>
                            <input
                              inputMode="numeric"
                              value={item.installmentCurrent ?? ''}
                              disabled={item.duplicate}
                              onChange={(event) => {
                                const current = Number(event.target.value) || null
                                const total = item.installmentTotal
                                patchRow(index, {
                                  installmentCurrent: current,
                                  scheduleRemaining: Boolean(current && total && current < total),
                                })
                              }}
                              className="w-12 rounded-lg border border-line bg-paper px-2 py-1 text-xs outline-none focus:border-forest disabled:opacity-60"
                              aria-label="Parcela atual"
                            />
                            <span className="text-xs text-muted">de</span>
                            <input
                              inputMode="numeric"
                              value={item.installmentTotal ?? ''}
                              disabled={item.duplicate}
                              onChange={(event) => {
                                const total = Number(event.target.value) || null
                                const current = item.installmentCurrent
                                patchRow(index, {
                                  installmentTotal: total,
                                  scheduleRemaining: Boolean(current && total && current < total),
                                })
                              }}
                              className="w-12 rounded-lg border border-line bg-paper px-2 py-1 text-xs outline-none focus:border-forest disabled:opacity-60"
                              aria-label="Total de parcelas"
                            />
                            {item.installmentCurrent &&
                            item.installmentTotal &&
                            item.installmentCurrent < item.installmentTotal ? (
                              <label className="inline-flex items-center gap-1.5 text-xs text-ink">
                                <input
                                  type="checkbox"
                                  checked={item.scheduleRemaining}
                                  disabled={item.duplicate}
                                  onChange={(event) =>
                                    patchRow(index, { scheduleRemaining: event.target.checked })
                                  }
                                />
                                Agendar {item.installmentTotal - item.installmentCurrent} futuras
                              </label>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <select
                            value={item.kind}
                            disabled={item.duplicate}
                            onChange={(event) => {
                              const kind = event.target.value as ExpenseKind
                              const categoryKind = item.categoryId
                                ? readyCategories.find((category) => category.id === item.categoryId)?.kind
                                : null
                              patchRow(index, {
                                kind,
                                amount:
                                  kind === 'ignored' || kind === 'transfer' || kind === 'adjustment'
                                    ? item.amount
                                    : signedAmount(kind, item.amount),
                                include: kind === 'ignored' ? false : item.include,
                                categoryId:
                                  kind === 'income' || kind === 'expense'
                                    ? categoryKind === kind
                                      ? item.categoryId
                                      : null
                                    : null,
                              })
                            }}
                            className="rounded-lg border border-line bg-paper px-2 py-1 text-xs outline-none"
                          >
                            <option value="expense">Gasto</option>
                            {mode === 'statement' ? <option value="income">Receita</option> : null}
                            <option value="transfer">Transferência</option>
                            {mode === 'statement' ? <option value="investment">Investimento</option> : null}
                            <option value="ignored">Ignorar</option>
                          </select>
                          {item.kind === 'income' || item.kind === 'expense' ? (
                            <CategorySelect
                              categories={readyCategories}
                              value={item.categoryId ?? ''}
                              group={item.kind}
                              disabled={item.duplicate}
                              className="rounded-lg border border-line bg-paper px-2 py-1 text-xs outline-none"
                              onChange={(categoryId) =>
                                patchRow(index, { categoryId: categoryId || null })
                              }
                              onCreate={async (name, kind) => {
                                const id = await addExpenseCategory(uid, name, kind)
                                if (!id) return
                                setReadyCategories((current) =>
                                  [...current, { id, name, kind, createdAt: Date.now() }].sort((a, b) =>
                                    a.name.localeCompare(b.name, 'pt-BR'),
                                  ),
                                )
                                return id
                              }}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || selected.length === 0}
            className="h-11 w-full rounded-xl bg-forest text-sm font-medium text-paper disabled:opacity-50"
          >
            {saving ? 'Salvando...' : `Salvar ${selected.length} lançamentos`}
          </button>
        </div>
      </div>
    </div>
  )
}

function ColumnSelect({
  label,
  headers,
  value,
  onChange,
}: {
  label: string
  headers: string[]
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest"
      >
        {headers.map((header, index) => (
          <option key={`${header}-${index}`} value={index}>
            {header || `Coluna ${index + 1}`}
          </option>
        ))}
      </select>
    </label>
  )
}
