import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { fingerprint } from '@/modules/finance/helpers'
import { parseAmountCell } from '@/modules/finance/parseCsv'
import type { ParsedTransaction } from '@/modules/finance/types'

GlobalWorkerOptions.workerSrc = pdfWorker

type PdfTextItem = {
  str?: string
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

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, ' ').trim()
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
  const brFull = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/)
  if (brFull) {
    const year = brFull[3].length === 2 ? `20${brFull[3]}` : brFull[3]
    return {
      date: toISO(brFull[1], brFull[2], year),
      rest: raw.slice(brFull[0].length).trim(),
    }
  }

  const brShort = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})\b/)
  if (brShort) {
    return {
      date: toISO(brShort[1], brShort[2], fallbackYear),
      rest: raw.slice(brShort[0].length).trim(),
    }
  }

  const named = raw.match(/^(\d{1,2})\s+([A-Za-zçÇãÃéÉ.]+)\b/)
  if (named) {
    const key = named[2]
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\./g, '')
    const month = MONTHS[key]
    if (month) {
      return {
        date: toISO(named[1], month, fallbackYear),
        rest: raw.slice(named[0].length).trim(),
      }
    }
  }

  return null
}

function shouldSkip(description: string) {
  const hay = description
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return [
    'pagamento efetuado',
    'pagamento de fatura',
    'pagamento recebido',
    'total desta fatura',
    'total da fatura',
    'saldo anterior',
    'saldo atual',
    'limite',
    'vencimento',
    'pagina ',
    'banco inter',
    'inter pag',
    'iof de',
    'encargo',
    'juros de mora',
    'multa',
    'valor total',
  ].some((item) => hay.includes(item))
}

function parseAmountFromEnd(line: string) {
  const match = line.match(/(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2})\s*$/)
  if (!match) return null
  const amount = parseAmountCell(match[1])
  if (amount == null) return null
  const description = line.slice(0, match.index).trim()
  return { description, amount }
}

function parseTransactionsFromText(text: string): ParsedTransaction[] {
  const year = guessYear(text)
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeSpaces(line))
    .filter(Boolean)

  const results: ParsedTransaction[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    const dated = parseLineDate(line, year)
    if (!dated) continue
    const parsed = parseAmountFromEnd(dated.rest)
    if (!parsed || !parsed.description) continue
    if (shouldSkip(parsed.description) || shouldSkip(line)) continue

    // Compras da fatura entram como gasto (negativo)
    const amount = parsed.amount > 0 ? -Math.abs(parsed.amount) : parsed.amount
    if (amount === 0) continue

    const description = parsed.description
    const externalId = fingerprint(dated.date, amount, description)
    if (seen.has(externalId)) continue
    seen.add(externalId)

    results.push({
      date: dated.date,
      amount,
      description,
      externalId,
      source: 'pdf',
    })
  }

  return results.sort((a, b) => a.date.localeCompare(b.date))
}

async function extractPdfText(file: File) {
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocument({ data }).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const rows = new Map<number, string[]>()

    for (const item of content.items as PdfTextItem[]) {
      if (!item.str?.trim()) continue
      const y = Math.round(item.transform[5])
      const list = rows.get(y) ?? []
      list.push(item.str)
      rows.set(y, list)
    }

    const pageText = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => parts.join(' '))
      .join('\n')

    pages.push(pageText)
  }

  return pages.join('\n')
}

export async function parseInvoicePdf(file: File): Promise<ParsedTransaction[]> {
  const text = await extractPdfText(file)
  return parseTransactionsFromText(text)
}
