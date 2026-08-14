import { useMemo, useRef, useState } from 'react'
import { CloseIcon } from '@/components/icons'
import { ensureDefaultCategories } from '@/modules/finance/api'
import { BANKS, PAYMENT_METHODS } from '@/modules/finance/catalog'
import {
  applyRules,
  formatDate,
  formatMoney,
  signedAmount,
} from '@/modules/finance/helpers'
import {
  applyCsvMapping,
  parseCsv,
  type CsvMapping,
  type CsvTable,
} from '@/modules/finance/parseCsv'
import { parseOfx } from '@/modules/finance/parseOfx'
import type {
  ExpenseBank,
  ExpenseCategory,
  ExpenseKind,
  ExpenseRule,
  ExpenseTransaction,
  ImportRow,
  ParsedTransaction,
  PaymentMethod,
} from '@/modules/finance/types'

function isOfxName(name: string) {
  return /\.(ofx|ofc|qfx)$/i.test(name) || name.toLowerCase().includes('.ofx')
}

export function ImportModal({
  uid,
  categories,
  rules,
  transactions,
  onClose,
  onImport,
}: {
  uid: string
  categories: ExpenseCategory[]
  rules: ExpenseRule[]
  transactions: ExpenseTransaction[]
  onClose: () => void
  onImport: (rows: ImportRow[]) => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [readyCategories, setReadyCategories] = useState(categories)
  const [bank, setBank] = useState<ExpenseBank>('nubank')
  const [method, setMethod] = useState<PaymentMethod>('debit')
  const [csvTable, setCsvTable] = useState<CsvTable | null>(null)
  const [mapping, setMapping] = useState<CsvMapping>({
    date: 0,
    description: 1,
    amount: 2,
  })
  const [saving, setSaving] = useState(false)

  const knownIds = useMemo(
    () => new Set(transactions.map((item) => item.externalId)),
    [transactions],
  )

  const selected = rows?.filter((item) => item.include && !item.duplicate) ?? []
  const duplicates = rows?.filter((item) => item.duplicate).length ?? 0

  async function loadParsed(parsed: ParsedTransaction[]) {
    if (parsed.length === 0) {
      setError('Não encontrei lançamentos neste arquivo.')
      setRows(null)
      return
    }
    const nextCategories = await ensureDefaultCategories(uid, categories)
    setReadyCategories(nextCategories)
    setError(null)
    setCsvTable(null)
    setRows(applyRules(parsed, rules, nextCategories, knownIds, bank, method))
  }

  async function handleFile(file: File) {
    setError(null)
    const text = await file.text()
    if (isOfxName(file.name) || /<STMTTRN>/i.test(text)) {
      await loadParsed(parseOfx(text))
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
        },
      )
      setRows(null)
      setError(null)
      return
    }

    setError('Não consegui ler este arquivo. Use OFX ou CSV com data, descrição e valor.')
    setRows(null)
    setCsvTable(null)
  }

  function applyMapping() {
    if (!csvTable) return
    void loadParsed(applyCsvMapping(csvTable, mapping))
  }

  function changeBank(next: ExpenseBank) {
    setBank(next)
    setRows((current) =>
      current ? current.map((item) => ({ ...item, bank: next })) : current,
    )
  }

  function changeMethod(next: PaymentMethod) {
    setMethod(next)
    setRows((current) =>
      current ? current.map((item) => ({ ...item, method: next })) : current,
    )
  }

  function patchRow(index: number, patch: Partial<ImportRow>) {
    setRows((current) =>
      current
        ? current.map((item, i) => (i === index ? { ...item, ...patch } : item))
        : current,
    )
  }

  async function handleSave() {
    if (!selected.length || saving) return
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
          <p className="font-serif text-xl text-ink">Enviar extrato</p>
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
              accept=".ofx,.ofc,.qfx,.csv,.txt"
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
              className="rounded-xl border border-dashed border-line bg-paper px-4 py-3 text-sm text-ink"
            >
              Escolher arquivo OFX ou CSV
            </button>
            <p className="mt-2 text-xs text-muted">
              O arquivo fica no seu aparelho. Só os lançamentos vão para a nuvem.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                  Banco
                </span>
                <select
                  value={bank}
                  onChange={(event) => changeBank(event.target.value as ExpenseBank)}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest"
                >
                  {BANKS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                  Crédito ou débito
                </span>
                <select
                  value={method}
                  onChange={(event) => changeMethod(event.target.value as PaymentMethod)}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest"
                >
                  {PAYMENT_METHODS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-clay/20 bg-clay/5 px-3 py-2 text-sm text-clay">
              {error}
            </p>
          ) : null}

          {csvTable && !rows ? (
            <div className="space-y-3 rounded-2xl border border-line p-4">
              <p className="text-sm text-ink">
                Não reconheci as colunas. Escolha data, descrição e valor.
              </p>
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
                onChange={(description) =>
                  setMapping((current) => ({ ...current, description }))
                }
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
                  {' · '}
                  {rows.filter((item) => item.categoryId).length} pré-categorizados
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setRows((current) =>
                      current
                        ? current.map((item) =>
                            item.duplicate ? item : { ...item, include: false },
                          )
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
                  <li
                    key={`${item.externalId}-${index}`}
                    className="rounded-xl border border-line px-3 py-2"
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={item.include && !item.duplicate}
                        disabled={item.duplicate}
                        onChange={(event) =>
                          patchRow(index, { include: event.target.checked })
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <input
                          value={item.description}
                          disabled={item.duplicate}
                          onChange={(event) =>
                            patchRow(index, { description: event.target.value })
                          }
                          className="w-full rounded-lg border border-line bg-paper px-2 py-1.5 text-sm text-ink outline-none focus:border-forest disabled:opacity-60"
                          aria-label="Nome da cobrança"
                        />
                        <p className="mt-0.5 text-xs text-muted">
                          {formatDate(item.date)} · {formatMoney(Math.abs(item.amount))}
                          {item.duplicate ? ' · já importado' : ''}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <select
                            value={item.kind}
                            disabled={item.duplicate}
                            onChange={(event) => {
                              const kind = event.target.value as ExpenseKind
                              patchRow(index, {
                                kind,
                                amount:
                                  kind === 'ignored'
                                    ? item.amount
                                    : signedAmount(kind, item.amount),
                              })
                            }}
                            className="rounded-lg border border-line bg-paper px-2 py-1 text-xs outline-none"
                          >
                            <option value="expense">Gasto</option>
                            <option value="income">Receita</option>
                            <option value="ignored">Ignorar</option>
                          </select>
                          <select
                            value={item.categoryId ?? ''}
                            disabled={item.duplicate}
                            onChange={(event) =>
                              patchRow(index, {
                                categoryId: event.target.value || null,
                              })
                            }
                            className="rounded-lg border border-line bg-paper px-2 py-1 text-xs outline-none"
                          >
                            <option value="">Sem categoria</option>
                            {readyCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
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
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
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
