import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { PlusIcon } from '@/components/icons'
import {
  addInvestment,
  deleteInvestment,
  updateInvestment,
  type InvestmentInput,
} from '@/modules/finance/investments/api'
import { getQuoteCached, isBrapiConfigured } from '@/modules/finance/investments/brapi'
import {
  cashGain,
  formatDate,
  formatMoney,
  formatPercent,
  gainLoss,
  investmentCost,
  investmentCurrentValue,
  positionValue,
  stockTotals,
  typeLabel,
} from '@/modules/finance/investments/helpers'
import { InvestmentForm } from '@/modules/finance/investments/InvestmentForm'
import { StockDetail } from '@/modules/finance/investments/StockDetail'
import { useInvestments } from '@/modules/finance/investments/useInvestments'
import type { Investment, StockQuote } from '@/modules/finance/investments/types'

export function InvestmentsPage() {
  const { user, items, loading, error } = useInvestments()
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({})
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [detail, setDetail] = useState<Investment | null>(null)

  const tickers = useMemo(
    () =>
      [...new Set(items.filter((item) => item.type === 'stock' && item.ticker).map((item) => item.ticker!))],
    [items],
  )

  useEffect(() => {
    if (tickers.length === 0) {
      setQuotes({})
      setQuoteError(null)
      return
    }
    if (!isBrapiConfigured()) {
      setQuoteError('Configure VITE_BRAPI_TOKEN no .env (chave gratuita em brapi.dev).')
      return
    }

    let cancelled = false
    async function load() {
      const next: Record<string, StockQuote> = {}
      const errors: string[] = []
      for (const ticker of tickers) {
        try {
          next[ticker] = await getQuoteCached(ticker)
        } catch (err) {
          errors.push(err instanceof Error ? err.message : ticker)
        }
      }
      if (cancelled) return
      setQuotes(next)
      setQuoteError(errors.length ? errors[0] : null)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [tickers])

  const totals = useMemo(() => {
    let total = 0
    let cost = 0
    for (const item of items) {
      const price = item.ticker ? quotes[item.ticker]?.price ?? null : null
      const value = investmentCurrentValue(item, price)
      if (value != null) total += value
      cost += investmentCost(item)
    }
    return { total, cost, ...gainLoss(cost, total) }
  }, [items, quotes])

  async function handleSave(input: InvestmentInput) {
    if (!user) return
    if (editing) {
      await updateInvestment(user.uid, editing.id, input)
      setEditing(null)
      if (detail?.id === editing.id) {
        setDetail({ ...editing, ...input, updatedAt: Date.now() })
      }
      return
    }
    await addInvestment(user.uid, input)
  }

  async function handleDelete(item: Investment) {
    if (!user) return
    const ok = window.confirm(`Apagar "${item.name}"?`)
    if (!ok) return
    await deleteInvestment(user.uid, item.id)
    setDetail(null)
    setEditing(null)
  }

  const stocks = items.filter((item) => item.type === 'stock')
  const caixas = items.filter((item) => item.type === 'caixa')
  const tesouros = items.filter((item) => item.type === 'tesouro')

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Patrimônio investido</p>
          <p className="text-2xl font-medium text-ink">{formatMoney(totals.total)}</p>
          {totals.cost > 0 ? (
            <p
              className={[
                'mt-1 text-sm',
                totals.amount >= 0 ? 'text-success' : 'text-clay',
              ].join(' ')}
            >
              {formatMoney(totals.amount)} ({formatPercent(totals.percent)}) vs custo
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setCreating(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3 py-2 text-sm font-medium text-paper"
        >
          <PlusIcon className="h-4 w-4" />
          Adicionar
        </button>
      </div>

      {error ? (
        <p className="mt-5 rounded-2xl border border-clay/20 bg-clay/5 px-4 py-3 text-sm text-clay">
          Não foi possível carregar os investimentos.
        </p>
      ) : null}

      {quoteError ? (
        <p className="mt-4 rounded-2xl border border-alert/30 bg-alert/5 px-4 py-3 text-sm text-ink">
          {quoteError}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-muted">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-muted">
          Nada por aqui. Adicione uma ação, caixinha ou título do Tesouro.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <Section title="Ações" empty={stocks.length === 0}>
            {stocks.map((item) => {
              const quote = item.ticker ? quotes[item.ticker] : undefined
              const totalsStock = stockTotals(item.lots)
              const value = quote ? positionValue(totalsStock.quantity, quote.price) : null
              const gl = value != null ? gainLoss(totalsStock.cost, value) : null
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDetail(item)}
                  className="flex w-full items-start justify-between gap-3 rounded-2xl border border-line bg-surface px-3 py-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {item.ticker} · {item.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {totalsStock.quantity} un. · médio {formatMoney(totalsStock.avgPrice)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-ink">
                      {value != null ? formatMoney(value) : '—'}
                    </p>
                    {gl ? (
                      <p className={['text-xs', gl.amount >= 0 ? 'text-success' : 'text-clay'].join(' ')}>
                        {formatPercent(gl.percent)}
                      </p>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </Section>

          <Section title="Caixinha" empty={caixas.length === 0}>
            {caixas.map((item) => (
              <CashCard
                key={item.id}
                item={item}
                onOpen={() => {
                  setEditing(item)
                  setCreating(true)
                }}
              />
            ))}
          </Section>

          <Section title="Tesouro Direto" empty={tesouros.length === 0}>
            {tesouros.map((item) => (
              <CashCard
                key={item.id}
                item={item}
                onOpen={() => {
                  setEditing(item)
                  setCreating(true)
                }}
              />
            ))}
          </Section>
        </div>
      )}

      {creating || editing ? (
        <InvestmentForm
          item={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSave={handleSave}
        />
      ) : null}

      {detail ? (
        <StockDetail
          item={detail}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditing(detail)
            setCreating(true)
            setDetail(null)
          }}
          onDelete={() => handleDelete(detail)}
        />
      ) : null}
    </div>
  )
}

function Section({
  title,
  empty,
  children,
}: {
  title: string
  empty: boolean
  children: ReactNode
}) {
  if (empty) return null
  return (
    <section>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function CashCard({ item, onOpen }: { item: Investment; onOpen: () => void }) {
  const gl = cashGain(item.investedAmount, item.currentAmount)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start justify-between gap-3 rounded-2xl border border-line bg-surface px-3 py-3 text-left"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{item.name}</p>
        <p className="mt-1 text-xs text-muted">
          {typeLabel(item.type)}
          {item.purchasedAt ? ` · desde ${formatDate(item.purchasedAt)}` : ''}
          {item.maturityAt ? ` · venc. ${formatDate(item.maturityAt)}` : ''}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-ink">
          {item.currentAmount != null ? formatMoney(item.currentAmount) : '—'}
        </p>
        <p className={['text-xs', gl.amount >= 0 ? 'text-success' : 'text-clay'].join(' ')}>
          {formatPercent(gl.percent)}
        </p>
      </div>
    </button>
  )
}
