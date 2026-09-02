import { useEffect, useState } from 'react'
import { CloseIcon, PlusIcon, TrashIcon } from '@/components/icons'
import type { InvestmentInput } from '@/modules/finance/investments/api'
import { newLotId, todayISO } from '@/modules/finance/investments/helpers'
import type { Investment, InvestmentType, StockLot } from '@/modules/finance/investments/types'

function parseAmount(value: string) {
  const cleaned = value.replace(/\s/g, '').replace(',', '.')
  const amount = Number(cleaned)
  return Number.isFinite(amount) ? amount : null
}

type DraftLot = {
  key: string
  date: string
  quantity: string
  price: string
}

function lotsFromInvestment(item: Investment | null): DraftLot[] {
  if (!item?.lots.length) {
    return [{ key: newLotId(), date: todayISO(), quantity: '', price: '' }]
  }
  return item.lots.map((lot) => ({
    key: lot.id,
    date: lot.date,
    quantity: String(lot.quantity),
    price: String(lot.price).replace('.', ','),
  }))
}

export function InvestmentForm({
  item,
  onClose,
  onSave,
}: {
  item: Investment | null
  onClose: () => void
  onSave: (input: InvestmentInput) => Promise<void>
}) {
  const [type, setType] = useState<InvestmentType>(item?.type ?? 'stock')
  const [name, setName] = useState(item?.name ?? '')
  const [ticker, setTicker] = useState(item?.ticker ?? '')
  const [lots, setLots] = useState<DraftLot[]>(() => lotsFromInvestment(item))
  const [invested, setInvested] = useState(
    item?.investedAmount != null ? String(item.investedAmount).replace('.', ',') : '',
  )
  const [current, setCurrent] = useState(
    item?.currentAmount != null ? String(item.currentAmount).replace('.', ',') : '',
  )
  const [purchasedAt, setPurchasedAt] = useState(item?.purchasedAt ?? todayISO())
  const [maturityAt, setMaturityAt] = useState(item?.maturityAt ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setType(item?.type ?? 'stock')
    setName(item?.name ?? '')
    setTicker(item?.ticker ?? '')
    setLots(lotsFromInvestment(item))
    setInvested(
      item?.investedAmount != null ? String(item.investedAmount).replace('.', ',') : '',
    )
    setCurrent(
      item?.currentAmount != null ? String(item.currentAmount).replace('.', ',') : '',
    )
    setPurchasedAt(item?.purchasedAt ?? todayISO())
    setMaturityAt(item?.maturityAt ?? '')
  }, [item?.id])

  async function handleSave() {
    setError(null)
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Informe um nome.')
      return
    }

    let input: InvestmentInput

    if (type === 'stock') {
      const symbol = ticker.trim().toUpperCase()
      if (!symbol) {
        setError('Informe o ticker (ex.: PETR4).')
        return
      }
      const parsedLots: StockLot[] = []
      for (const lot of lots) {
        const quantity = parseAmount(lot.quantity)
        const price = parseAmount(lot.price)
        if (!lot.date || quantity == null || quantity <= 0 || price == null || price <= 0) {
          setError('Preencha data, quantidade e preço de cada compra.')
          return
        }
        parsedLots.push({
          id: lot.key,
          date: lot.date,
          quantity,
          price,
        })
      }
      input = {
        type,
        name: trimmedName || symbol,
        ticker: symbol,
        lots: parsedLots,
        investedAmount: null,
        currentAmount: null,
        purchasedAt: null,
        maturityAt: null,
      }
    } else {
      const investedAmount = parseAmount(invested)
      const currentAmount = parseAmount(current)
      if (investedAmount == null || investedAmount < 0 || currentAmount == null || currentAmount < 0) {
        setError('Informe valor investido e valor atual.')
        return
      }
      input = {
        type,
        name: trimmedName,
        ticker: null,
        lots: [],
        investedAmount,
        currentAmount,
        purchasedAt: purchasedAt || null,
        maturityAt: type === 'tesouro' && maturityAt ? maturityAt : null,
      }
    }

    setSaving(true)
    try {
      await onSave(input)
      onClose()
    } catch {
      setError('Não foi possível salvar.')
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
            {item ? 'Editar investimento' : 'Novo investimento'}
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
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Tipo</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'stock', label: 'Ação' },
                  { id: 'caixa', label: 'Caixinha' },
                  { id: 'tesouro', label: 'Tesouro' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={Boolean(item)}
                  onClick={() => setType(option.id)}
                  className={[
                    'rounded-full px-3 py-1.5 text-sm',
                    type === option.id ? 'bg-forest text-paper' : 'bg-paper text-muted',
                    item ? 'opacity-70' : '',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
              Nome
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={type === 'stock' ? 'Petrobras' : 'Caixinha reserva'}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
            />
          </label>

          {type === 'stock' ? (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                  Ticker
                </span>
                <input
                  value={ticker}
                  onChange={(event) => setTicker(event.target.value.toUpperCase())}
                  placeholder="PETR4"
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
                />
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Compras</p>
                  <button
                    type="button"
                    onClick={() =>
                      setLots((current) => [
                        ...current,
                        { key: newLotId(), date: todayISO(), quantity: '', price: '' },
                      ])
                    }
                    className="inline-flex items-center gap-1 text-sm text-forest"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Compra
                  </button>
                </div>
                <ul className="space-y-3">
                  {lots.map((lot, index) => (
                    <li key={lot.key} className="rounded-xl border border-line p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs text-muted">Compra {index + 1}</span>
                        {lots.length > 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setLots((current) => current.filter((item) => item.key !== lot.key))
                            }
                            className="text-muted hover:text-clay"
                            aria-label="Remover compra"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                      <div className="grid gap-2">
                        <input
                          type="date"
                          value={lot.date}
                          onChange={(event) =>
                            setLots((current) =>
                              current.map((row) =>
                                row.key === lot.key ? { ...row, date: event.target.value } : row,
                              ),
                            )
                          }
                          className="rounded-lg border border-line bg-paper px-2 py-2 text-sm outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            inputMode="decimal"
                            value={lot.quantity}
                            onChange={(event) =>
                              setLots((current) =>
                                current.map((row) =>
                                  row.key === lot.key
                                    ? { ...row, quantity: event.target.value }
                                    : row,
                                ),
                              )
                            }
                            placeholder="Qtd"
                            className="rounded-lg border border-line bg-paper px-2 py-2 text-sm outline-none"
                          />
                          <input
                            inputMode="decimal"
                            value={lot.price}
                            onChange={(event) =>
                              setLots((current) =>
                                current.map((row) =>
                                  row.key === lot.key ? { ...row, price: event.target.value } : row,
                                ),
                              )
                            }
                            placeholder="Preço"
                            className="rounded-lg border border-line bg-paper px-2 py-2 text-sm outline-none"
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                  Valor investido
                </span>
                <input
                  inputMode="decimal"
                  value={invested}
                  onChange={(event) => setInvested(event.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                  Valor atual
                </span>
                <input
                  inputMode="decimal"
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                  Data
                </span>
                <input
                  type="date"
                  value={purchasedAt}
                  onChange={(event) => setPurchasedAt(event.target.value)}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
                />
              </label>
              {type === 'tesouro' ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted">
                    Vencimento (opcional)
                  </span>
                  <input
                    type="date"
                    value={maturityAt}
                    onChange={(event) => setMaturityAt(event.target.value)}
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-forest"
                  />
                </label>
              ) : null}
            </>
          )}

          {error ? (
            <p className="rounded-xl border border-clay/20 bg-clay/5 px-3 py-2 text-sm text-clay">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="h-11 w-full rounded-xl bg-forest text-sm font-medium text-paper disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </aside>
    </div>
  )
}
