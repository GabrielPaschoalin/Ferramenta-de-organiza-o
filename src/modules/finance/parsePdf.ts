import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { fingerprint } from '@/modules/finance/helpers'
import { parseAmountCell } from '@/modules/finance/parseCsv'
import type { ParsedTransaction } from '@/modules/finance/types'

GlobalWorkerOptions.workerSrc = pdfWorker

type PdfTextItem = {
  str?: string
  width?: number
  transform: number[]
}

const MONTHS: Record<string, string> = {
  jan: '01',
  janeiro: '01',
  fev: '02',
  fevereiro: '02',
  mar: '03',
  marco: '03',
  abr: '04',
  abril: '04',
  mai: '05',
  maio: '05',
  jun: '06',
  junho: '06',
  jul: '07',
  julho: '07',
  ago: '08',
  agosto: '08',
  set: '09',
  setembro: '09',
  out: '10',
  outubro: '10',
  nov: '11',
  novembro: '11',
  dez: '12',
  dezembro: '12',
}

const MONTH_NAMES = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join('|')

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function monthKey(raw: string) {
  const key = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
  return MONTHS[key] ?? null
}

function toISO(day: string, month: string, year: string) {
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function guessYear(text: string) {
  const match = text.match(/\b(20\d{2})\b/g)
  if (!match?.length) return String(new Date().getFullYear())
  return match[match.length - 1]
}

function parseLineDate(raw: string, fallbackYear: string) {
  const namedLong = raw.match(
    new RegExp(`^(\\d{1,2})\\s+de\\s+(${MONTH_NAMES})\\.?\\s+(?:de\\s+)?(\\d{4})\\b`, 'i'),
  )
  if (namedLong) {
    const month = monthKey(namedLong[2])
    if (month) {
      return {
        date: toISO(namedLong[1], month, namedLong[3]),
        rest: raw.slice(namedLong[0].length).trim(),
      }
    }
  }

  const namedYear = raw.match(
    new RegExp(`^(\\d{1,2})\\s+(${MONTH_NAMES})\\.?\\s+(\\d{4})\\b`, 'i'),
  )
  if (namedYear) {
    const month = monthKey(namedYear[2])
    if (month) {
      return {
        date: toISO(namedYear[1], month, namedYear[3]),
        rest: raw.slice(namedYear[0].length).trim(),
      }
    }
  }

  const brFull = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/)
  if (brFull) {
    const year = brFull[3].length === 2 ? `20${brFull[3]}` : brFull[3]
    return {
      date: toISO(brFull[1], brFull[2], year),
      rest: raw.slice(brFull[0].length).trim(),
    }
  }

  const brShort = raw.match(/^(\d{1,2})[/\-.](\d{1,2})\b/)
  if (brShort) {
    return {
      date: toISO(brShort[1], brShort[2], fallbackYear),
      rest: raw.slice(brShort[0].length).trim(),
    }
  }

  const named = raw.match(/^(\d{1,2})\s+([A-Za-zçÇãÃéÉ.]+)\b/)
  if (named) {
    const month = monthKey(named[2])
    if (month) {
      return {
        date: toISO(named[1], month, fallbackYear),
        rest: raw.slice(named[0].length).trim(),
      }
    }
  }

  return null
}

function compactText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function shouldSkip(description: string) {
  const hay = description
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const compact = compactText(description)
  if (compact.includes('pagamentoonline') || compact.includes('pagamentoefetuado')) return true
  if (compact.includes('pagamentorecebido') || compact.includes('pagamentodefatura')) return true
  return [
    'pagamento efetuado',
    'pagamento de fatura',
    'pagamento recebido',
    'pagamento on line',
    'total desta fatura',
    'total da fatura',
    'total cartao',
    'saldo anterior',
    'saldo atual',
    'saldo total',
    'proxima fatura',
    'data de vencimento',
    'pagina ',
    'banco inter',
    'inter pag',
    'iof de',
    'encargo',
    'juros de mora',
    'multa',
    'valor total',
    'limite de credito',
  ].some((item) => hay.includes(item))
}

function parseAmountFromEnd(line: string) {
  const match = line.match(/([+-]\s*)?(?:R\$\s*)?(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})\s*$/i)
  if (!match || match.index == null) return null
  const amount = parseAmountCell(match[0])
  if (amount == null) return null
  const credit = /^\s*\+/.test(match[0])
  let description = line.slice(0, match.index).trim()
  description = description.replace(/(?:\s+-)?\s*$/g, '').replace(/[\s+|]+$/g, '').trim()
  return { description, amount, credit }
}

function pushUnique(results: ParsedTransaction[], item: ParsedTransaction, seen: Set<string>) {
  if (seen.has(item.externalId)) return
  seen.add(item.externalId)
  results.push(item)
}

function rowToTransaction(
  date: string,
  description: string,
  amount: number,
  credit: boolean,
): ParsedTransaction | null {
  const cleaned = normalizeSpaces(description)
  if (!cleaned || shouldSkip(cleaned)) return null
  if (credit) return null

  const signed = amount > 0 ? -Math.abs(amount) : amount
  if (signed === 0) return null

  return {
    date,
    amount: signed,
    description: cleaned,
    externalId: fingerprint(date, signed, cleaned),
    source: 'pdf',
  }
}

function parseInterTable(text: string): ParsedTransaction[] {
  const results: ParsedTransaction[] = []
  const seen = new Set<string>()
  const re = new RegExp(
    `(\\d{1,2})\\s+de\\s+(${MONTH_NAMES})\\.?\\s+(\\d{4})\\s+(.+?)\\s+([+\\-]?\\s*R\\$\\s*\\d{1,3}(?:\\.\\d{3})*,\\d{2}|[+\\-]?\\s*R\\$\\s*\\d+,\\d{2})`,
    'gi',
  )

  for (const match of text.matchAll(re)) {
    const month = monthKey(match[2])
    if (!month) continue
    const parsed = parseAmountFromEnd(match[5])
    if (!parsed) continue
    const item = rowToTransaction(
      toISO(match[1], month, match[3]),
      match[4],
      parsed.amount,
      parsed.credit || /^\s*\+/.test(match[5]),
    )
    if (item) pushUnique(results, item, seen)
  }

  return results
}

export function parseInvoicePdfText(text: string): ParsedTransaction[] {
  const year = guessYear(text)
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeSpaces(line))
    .filter(Boolean)

  const results = parseInterTable(text)
  const seen = new Set(results.map((item) => item.externalId))

  for (const line of lines) {
    const dated = parseLineDate(line, year)
    if (!dated) continue
    const parsed = parseAmountFromEnd(dated.rest)
    if (!parsed || !parsed.description) continue
    if (shouldSkip(parsed.description) || shouldSkip(line)) continue
    const item = rowToTransaction(dated.date, parsed.description, parsed.amount, parsed.credit)
    if (item) pushUnique(results, item, seen)
  }

  return results.sort((a, b) => a.date.localeCompare(b.date))
}

function joinRow(items: { str: string; x: number; width: number }[]) {
  const sorted = [...items].sort((a, b) => a.x - b.x)
  let line = ''
  let lastEnd = -Infinity
  for (const item of sorted) {
    if (line && item.x - lastEnd > 1.5) line += ' '
    line += item.str
    lastEnd = item.x + item.width
  }
  return normalizeSpaces(line)
}

async function extractPdfText(file: File) {
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocument({ data }).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const rows = new Map<number, { str: string; x: number; width: number }[]>()

    for (const item of content.items as PdfTextItem[]) {
      if (!item.str?.trim()) continue
      const y = Math.round(item.transform[5])
      const list = rows.get(y) ?? []
      list.push({
        str: item.str,
        x: item.transform[4],
        width: item.width ?? item.str.length,
      })
      rows.set(y, list)
    }

    const pageText = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => joinRow(parts))
      .join('\n')

    pages.push(pageText)
  }

  return pages.join('\n')
}

export async function parseInvoicePdf(file: File): Promise<ParsedTransaction[]> {
  const text = await extractPdfText(file)
  return parseInvoicePdfText(text)
}
