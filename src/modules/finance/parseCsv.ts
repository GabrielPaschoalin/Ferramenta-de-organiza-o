import { fingerprint } from '@/modules/finance/helpers'
import type { ParsedTransaction } from '@/modules/finance/types'

export type CsvTable = {
  headers: string[]
  rows: string[][]
}

export type CsvMapping = {
  date: number
  description: number
  amount: number
}

function detectDelimiter(text: string) {
  const first = text.split(/\r?\n/).find((line) => line.trim()) ?? ''
  const commas = (first.match(/,/g) ?? []).length
  const semis = (first.match(/;/g) ?? []).length
  return semis > commas ? ';' : ','
}

function splitLine(line: string, delimiter: string) {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (char === delimiter && !quoted) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

export function readCsvTable(text: string): CsvTable {
  const delimiter = detectDelimiter(text)
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = splitLine(lines[0], delimiter)
  const rows = lines.slice(1).map((line) => splitLine(line, delimiter))
  return { headers, rows }
}

function scoreHeader(name: string, kind: keyof CsvMapping) {
  const value = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (kind === 'date') {
    if (/(data|date|dtposted|dt)/.test(value)) return 2
  }
  if (kind === 'description') {
    if (/(historico|descricao|memo|lancamento|titulo|estabelecimento|nome)/.test(value)) {
      return 2
    }
  }
  if (kind === 'amount') {
    if (/(valor|amount|value|quantia)/.test(value)) return 2
  }
  return 0
}

export function guessCsvMapping(headers: string[]): CsvMapping | null {
  const date = headers.findIndex((item) => scoreHeader(item, 'date') > 0)
  const description = headers.findIndex((item) => scoreHeader(item, 'description') > 0)
  const amount = headers.findIndex((item) => scoreHeader(item, 'amount') > 0)
  if (date < 0 || description < 0 || amount < 0) return null
  if (new Set([date, description, amount]).size !== 3) return null
  return { date, description, amount }
}

export function parseDateCell(value: string) {
  const trimmed = value.trim()
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const br = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (br) {
    return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`
  }

  const compact = trimmed.replace(/\D/g, '')
  if (compact.length >= 8) {
    return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
  }
  return ''
}

export function parseAmountCell(value: string) {
  let cleaned = value.replace(/r\$/gi, '').replace(/\s/g, '')
  if (!cleaned) return null
  const negative = cleaned.startsWith('-') || cleaned.startsWith('(')
  cleaned = cleaned.replace(/[()]/g, '').replace(/^[+-]/, '')

  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.')
  }

  const amount = Number(cleaned)
  if (!Number.isFinite(amount)) return null
  return negative ? -Math.abs(amount) : amount
}

export function applyCsvMapping(
  table: CsvTable,
  mapping: CsvMapping,
): ParsedTransaction[] {
  return table.rows.flatMap((row) => {
    const date = parseDateCell(row[mapping.date] ?? '')
    const amount = parseAmountCell(row[mapping.amount] ?? '')
    const description = (row[mapping.description] ?? '').trim() || 'Lançamento'
    if (!date || amount === null) return []
    return [
      {
        date,
        amount,
        description,
        externalId: fingerprint(date, amount, description),
        source: 'csv' as const,
      },
    ]
  })
}

export function parseCsv(text: string) {
  const table = readCsvTable(text)
  const mapping = guessCsvMapping(table.headers)
  if (!mapping) return { table, mapping: null, transactions: [] as ParsedTransaction[] }
  return { table, mapping, transactions: applyCsvMapping(table, mapping) }
}
