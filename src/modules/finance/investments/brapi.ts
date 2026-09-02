import type { QuotePoint, StockQuote } from '@/modules/finance/investments/types'

const BASE = 'https://brapi.dev/api'

function token() {
  return import.meta.env.VITE_BRAPI_TOKEN?.trim() || ''
}

export function isBrapiConfigured() {
  return Boolean(token())
}

function authQuery() {
  const value = token()
  return value ? `token=${encodeURIComponent(value)}` : ''
}

async function getJson<T>(path: string, query = ''): Promise<T> {
  const auth = authQuery()
  const joiner = path.includes('?') ? '&' : '?'
  const extras = [query, auth].filter(Boolean).join('&')
  const url = `${BASE}${path}${extras ? `${joiner}${extras}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Falha na cotação (${response.status}).`)
  }
  return response.json() as Promise<T>
}

type QuoteResult = {
  symbol?: string
  shortName?: string
  regularMarketPrice?: number
  regularMarketChangePercent?: number
  historicalDataPrice?: Array<{
    date?: number | string
    close?: number
  }>
}

type QuoteResponse = {
  results?: QuoteResult[]
}

function toISODate(value: number | string) {
  if (typeof value === 'number') {
    const date = new Date(value * (value < 1e12 ? 1000 : 1))
    return date.toISOString().slice(0, 10)
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const asNum = Number(value)
  if (Number.isFinite(asNum)) {
    const date = new Date(asNum * (asNum < 1e12 ? 1000 : 1))
    return date.toISOString().slice(0, 10)
  }
  return ''
}

export async function fetchQuote(ticker: string): Promise<StockQuote> {
  const symbol = ticker.trim().toUpperCase()
  const data = await getJson<QuoteResponse>(`/quote/${encodeURIComponent(symbol)}`)
  const item = data.results?.[0]
  const price = item?.regularMarketPrice
  if (price == null || !Number.isFinite(price)) {
    throw new Error(`Cotação não encontrada para ${symbol}.`)
  }
  return {
    symbol: item?.symbol ?? symbol,
    price,
    changePercent:
      typeof item?.regularMarketChangePercent === 'number'
        ? item.regularMarketChangePercent
        : null,
    shortName: item?.shortName ?? null,
  }
}

export async function fetchHistory(
  ticker: string,
  range: string,
): Promise<QuotePoint[]> {
  const symbol = ticker.trim().toUpperCase()
  const data = await getJson<QuoteResponse>(
    `/quote/${encodeURIComponent(symbol)}`,
    `range=${encodeURIComponent(range)}&interval=1d`,
  )
  const points = data.results?.[0]?.historicalDataPrice ?? []
  return points
    .map((point) => {
      const date = point.date != null ? toISODate(point.date) : ''
      const close = typeof point.close === 'number' ? point.close : null
      if (!date || close == null) return null
      return { date, close }
    })
    .filter((item): item is QuotePoint => Boolean(item))
    .sort((a, b) => a.date.localeCompare(b.date))
}

const quoteCache = new Map<string, { at: number; value: StockQuote }>()
const historyCache = new Map<string, { at: number; value: QuotePoint[] }>()
const TTL = 5 * 60 * 1000

export async function getQuoteCached(ticker: string) {
  const key = ticker.trim().toUpperCase()
  const hit = quoteCache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.value
  const value = await fetchQuote(key)
  quoteCache.set(key, { at: Date.now(), value })
  return value
}

export async function getHistoryCached(ticker: string, range: string) {
  const key = `${ticker.trim().toUpperCase()}|${range}`
  const hit = historyCache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.value
  const value = await fetchHistory(ticker, range)
  historyCache.set(key, { at: Date.now(), value })
  return value
}
