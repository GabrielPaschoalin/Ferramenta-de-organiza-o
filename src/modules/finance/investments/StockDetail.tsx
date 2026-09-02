import { useEffect, useMemo, useState } from 'react'
import { CloseIcon, TrashIcon } from '@/components/icons'
import { getHistoryCached, getQuoteCached, isBrapiConfigured } from '@/modules/finance/investments/brapi'
import { InvestmentChart, type ChartPoint } from '@/modules/finance/investments/InvestmentChart'
import {
  formatDate,
  formatMoney,
  formatPercent,
  gainLoss,
  positionValue,
  rangeForPurchase,
  stockTotals,
} from '@/modules/finance/investments/helpers'
import type { Investment, StockQuote } from '@/modules/finance/investments/types'

export function StockDetail({
  item,
  onClose,
  onEdit,
  onDelete,
}: {
  item: Investment
  onClose: () => void
  onEdit: () => void
  onDelete: () => Promise<void>
}) {
  const totals = stockTotals(item.lots)
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [monthSeries, setMonthSeries] = useState<ChartPoint[]>([])
  const [sinceSeries, setSinceSeries] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!item.ticker) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        if (!isBrapiConfigured()) {
          throw new Error('Configure VITE_BRAPI_TOKEN no arquivo .env (chave em brapi.dev).')
        }
        const ticker = item.ticker!
        const [nextQuote, monthHistory, sinceHistory] = await Promise.all([
          getQuoteCached(ticker),
          getHistoryCached(ticker, '1mo'),
          getHistoryCached(ticker, rangeForPurchase(totals.firstDate)),
        ])
        if (cancelled) return

        setQuote(nextQuote)
        setMonthSeries(
          monthHistory.map((point) => ({
            date: point.date,
            value: positionValue(totals.quantity, point.close),
          })),
        )

        const since = sinceHistory
          .filter((point) => !totals.firstDate || point.date >= totals.firstDate)
          .map((point) => ({
            date: point.date,
            value: positionValue(totals.quantity, point.close),
            cost: totals.cost,
          }))
        setSinceSeries(since)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Não foi possível carregar cotações.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [item.id, item.ticker, totals.quantity, totals.cost, totals.firstDate])

  const live = useMemo(() => {
    if (!quote) return null
    const value = positionValue(totals.quantity, quote.price)
    return { value, ...gainLoss(totals.cost, value) }
  }, [quote, totals.cost, totals.quantity])

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-ink/25" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="font-serif text-xl text-ink">{item.ticker}</p>
            <p className="text-sm text-muted">{item.name}</p>
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

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Quantidade" value={String(totals.quantity)} />
            <Stat label="Preço médio" value={formatMoney(totals.avgPrice)} />
            <Stat label="Custo" value={formatMoney(totals.cost)} />
            <Stat
              label="Valor atual"
              value={live ? formatMoney(live.value) : '—'}
              tone={live ? (live.amount >= 0 ? 'up' : 'down') : undefined}
            />
          </div>

          {live ? (
            <p className={['text-sm font-medium', live.amount >= 0 ? 'text-success' : 'text-clay'].join(' ')}>
              {formatMoney(live.amount)} ({formatPercent(live.percent)})
              {quote?.changePercent != null
                ? ` · dia ${formatPercent(quote.changePercent)}`
                : ''}
            </p>
          ) : null}

          {totals.firstDate ? (
            <p className="text-xs text-muted">Desde {formatDate(totals.firstDate)}</p>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-clay/20 bg-clay/5 px-3 py-2 text-sm text-clay">
              {error}
            </p>
          ) : null}

          {loading ? <p className="text-sm text-muted">Carregando gráficos...</p> : null}

          {!loading && !error ? (
            <>
              <section>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  Último mês
                </p>
                <InvestmentChart data={monthSeries} />
              </section>
              <section>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  Desde a compra
                </p>
                <InvestmentChart data={sinceSeries} showCost />
              </section>
            </>
          ) : null}

          {item.lots.length > 0 ? (
            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                Compras
              </p>
              <ul className="space-y-2">
                {item.lots
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((lot) => (
                    <li
                      key={lot.id}
                      className="flex justify-between rounded-xl border border-line px-3 py-2 text-sm"
                    >
                      <span className="text-muted">{formatDate(lot.date)}</span>
                      <span className="text-ink">
                        {lot.quantity} × {formatMoney(lot.price)}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="space-y-3 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onEdit}
            className="h-11 w-full rounded-xl bg-forest text-sm font-medium text-paper"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => void onDelete()}
            className="inline-flex items-center gap-2 text-sm text-clay hover:underline"
          >
            <TrashIcon className="h-4 w-4" />
            Apagar investimento
          </button>
        </div>
      </aside>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'up' | 'down'
}) {
  return (
    <div className="rounded-xl border border-line bg-paper px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p
        className={[
          'mt-1 text-sm font-medium',
          tone === 'up' ? 'text-success' : tone === 'down' ? 'text-clay' : 'text-ink',
        ].join(' ')}
      >
        {value}
      </p>
    </div>
  )
}
