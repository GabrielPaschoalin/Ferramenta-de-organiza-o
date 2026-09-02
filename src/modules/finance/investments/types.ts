export type InvestmentType = 'stock' | 'caixa' | 'tesouro'

export type StockLot = {
  id: string
  date: string
  quantity: number
  price: number
}

export type Investment = {
  id: string
  type: InvestmentType
  name: string
  createdAt: number
  updatedAt: number
  /** Ações */
  ticker: string | null
  lots: StockLot[]
  /** Caixinha / Tesouro */
  investedAmount: number | null
  currentAmount: number | null
  purchasedAt: string | null
  maturityAt: string | null
}

export type QuotePoint = {
  date: string
  close: number
}

export type StockQuote = {
  symbol: string
  price: number
  changePercent: number | null
  shortName: string | null
}
