import { fingerprint } from '@/modules/finance/helpers'
import type { ParsedTransaction, StatementBalance } from '@/modules/finance/types'

function tagValue(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i'))
  return match ? match[1].trim() : ''
}

function parseOfxDate(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 8) return ''
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

function parseOfxAmount(value: string) {
  const cleaned = value.replace(/\s/g, '').replace(',', '.')
  const amount = Number(cleaned)
  return Number.isFinite(amount) ? amount : null
}

function parseBalance(text: string): StatementBalance | null {
  const blocks = text.match(/<(?:LEDGERBAL|AVAILBAL|BAL)>[\s\S]*?(?:<\/(?:LEDGERBAL|AVAILBAL|BAL)>|(?=<(?:LEDGERBAL|AVAILBAL|BAL|BANKTRANLIST|CREDITCARDMSGSRSV1)|$))/gi) ?? []
  for (const block of blocks) {
    const amount = parseOfxAmount(tagValue(block, 'BALAMT'))
    const date = parseOfxDate(tagValue(block, 'DTASOF'))
    if (amount !== null) {
      return { amount, date: date || new Date().toISOString().slice(0, 10) }
    }
  }

  const loose = text.match(/<BALAMT>([^<\r\n]+)/i)
  if (loose) {
    const amount = parseOfxAmount(loose[1])
    if (amount !== null) {
      const dateMatch = text.match(/<DTASOF>([^<\r\n]+)/i)
      return {
        amount,
        date: dateMatch ? parseOfxDate(dateMatch[1]) || new Date().toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      }
    }
  }
  return null
}

export function parseOfx(text: string): ParsedTransaction[] {
  return parseOfxStatement(text).transactions
}

export function parseOfxStatement(text: string): {
  transactions: ParsedTransaction[]
  balance: StatementBalance | null
} {
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?:<\/STMTTRN>|(?=<STMTTRN>)|$)/gi) ?? []

  const transactions = blocks.flatMap((block) => {
    const rawAmount = tagValue(block, 'TRNAMT')
    const amount = parseOfxAmount(rawAmount)
    const date = parseOfxDate(tagValue(block, 'DTPOSTED'))
    const description =
      tagValue(block, 'MEMO') ||
      tagValue(block, 'NAME') ||
      tagValue(block, 'PAYEE') ||
      'Lançamento'
    if (amount === null || !date) return []

    const type = tagValue(block, 'TRNTYPE').toUpperCase()
    const signed =
      amount > 0 && (type === 'DEBIT' || type === 'PAYMENT' || type === 'XFER')
        ? -amount
        : amount

    const fitid = tagValue(block, 'FITID')
    return [
      {
        date,
        amount: signed,
        description,
        externalId: fitid || fingerprint(date, signed, description),
        source: 'ofx' as const,
      },
    ]
  })

  return { transactions, balance: parseBalance(text) }
}
