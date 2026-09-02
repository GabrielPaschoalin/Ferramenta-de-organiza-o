import type { Investment, StockLot } from '@/modules/finance/investments/types'

export function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatPercent(value: number) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2).replace('.', ',')}%`
}

export function formatDate(date: string) {
  const [year, month, day] = date.split('-')
  if (!year || !month || !day) return date
  return `${day}/${month}/${year}`
}

export function todayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function stockTotals(lots: StockLot[]) {
  const quantity = lots.reduce((sum, lot) => sum + lot.quantity, 0)
  const cost = lots.reduce((sum, lot) => sum + lot.quantity * lot.price, 0)
  const avgPrice = quantity > 0 ? cost / quantity : 0
  const firstDate = lots
    .map((lot) => lot.date)
    .filter(Boolean)
    .sort()[0] ?? null
  return { quantity, cost, avgPrice, firstDate }
}

export function positionValue(quantity: number, price: number) {
  return quantity * price
}

export function gainLoss(cost: number, value: number) {
  const amount = value - cost
  const percent = cost > 0 ? (amount / cost) * 100 : 0
  return { amount, percent }
}

export function cashGain(invested: number | null, current: number | null) {
  if (invested == null || current == null) return { amount: 0, percent: 0 }
  const amount = current - invested
  const percent = invested > 0 ? (amount / invested) * 100 : 0
  return { amount, percent }
}

export function investmentCurrentValue(
  item: Investment,
  stockPrice: number | null,
) {
  if (item.type === 'stock') {
    const { quantity } = stockTotals(item.lots)
    if (stockPrice == null) return null
    return positionValue(quantity, stockPrice)
  }
  return item.currentAmount
}

export function investmentCost(item: Investment) {
  if (item.type === 'stock') return stockTotals(item.lots).cost
  return item.investedAmount ?? 0
}

export function typeLabel(type: Investment['type']) {
  if (type === 'stock') return 'Ação'
  if (type === 'caixa') return 'Caixinha'
  return 'Tesouro'
}

export function newLotId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function monthsBetween(start: string, end: string) {
  const a = new Date(`${start}T12:00:00`)
  const b = new Date(`${end}T12:00:00`)
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

/** Escolhe range brapi cobrindo desde a compra (plano free ~3 meses). */
export function rangeForPurchase(firstDate: string | null) {
  if (!firstDate) return '1mo'
  const months = monthsBetween(firstDate, todayISO())
  if (months <= 1) return '1mo'
  if (months <= 3) return '3mo'
  if (months <= 6) return '6mo'
  if (months <= 12) return '1y'
  return 'max'
}
