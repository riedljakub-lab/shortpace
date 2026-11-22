// Reading messy CSV exports. Everything here runs in the browser; the file never leaves the device.
import Papa from 'papaparse'
import {
  COLUMN_SYNONYMS,
  IMPORT_FIELDS,
  RUN_ACTIVITY_WORDS,
  type ImportField,
} from '../config/importRules'
import { parseDuration } from '../domain/pace'

export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
}

/** Parses CSV text. Auto-detects "," or ";" and ignores a byte-order mark and blank lines. */
export function parseCsvText(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
  })
  return { headers: result.meta.fields ?? [], rows: result.data }
}

/** "Distance (km)" → "distancekm": lower-case, no spaces or punctuation (keeps letters like č). */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim()
}

/** Best guess of which CSV column holds each field. Missing fields are left out. */
export function guessMapping(headers: string[]): Partial<Record<ImportField, string>> {
  const mapping: Partial<Record<ImportField, string>> = {}
  const used = new Set<string>()
  for (const field of IMPORT_FIELDS) {
    const wanted = COLUMN_SYNONYMS[field].map(normalizeHeader)
    // Exact synonym first (so "Time" wins over "Best Lap Time"), in synonym order.
    const match = wanted
      .map((w) => headers.find((h) => !used.has(h) && normalizeHeader(h) === w))
      .find(Boolean)
    if (match) {
      mapping[field] = match
      used.add(match)
    }
  }
  return mapping
}

const EMPTY = new Set(['', '--', '-', 'n/a', 'na', 'null'])

/**
 * "10.02" → 10.02, "10,02" → 10.02 (decimal comma), "1,234.5" → 1234.5, "--" → null.
 * A lone comma followed by exactly 3 digits ("1,234") is read as a thousands separator.
 */
export function parseNumberLoose(raw: string | undefined): number | null {
  const text = (raw ?? '').trim().replace(/\s/g, '')
  if (EMPTY.has(text.toLowerCase())) return null
  let normalized = text
  if (text.includes(',') && text.includes('.')) {
    // Whichever comes last is the decimal separator.
    normalized =
      text.lastIndexOf(',') > text.lastIndexOf('.')
        ? text.replace(/\./g, '').replace(',', '.')
        : text.replace(/,/g, '')
  } else if (text.includes(',')) {
    normalized = /^\d{1,3}(,\d{3})+$/.test(text) ? text.replace(/,/g, '') : text.replace(',', '.')
  }
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null
  return Number(normalized)
}

/** "00:52:31", "52:31", "1:02:03.4" → seconds (rounded). Null if unreadable. */
export function parseDurationLoose(raw: string | undefined): number | null {
  const text = (raw ?? '').trim()
  if (EMPTY.has(text.toLowerCase())) return null
  const match = text.match(/^(\d+(?::\d{1,2}){1,2})(?:[.,](\d+))?$/)
  if (!match?.[1]) return null
  const fraction = match[2] ? Number(`0.${match[2]}`) : 0
  // Pad "1:2:3" style parts to two digits so the strict parser accepts them.
  const parts = match[1].split(':')
  const padded = parts.map((p, i) => (i === 0 ? p : p.padStart(2, '0'))).join(':')
  const base = parseDuration(padded)
  return base === null ? null : Math.round(base + fraction)
}

/**
 * Dates as Garmin and spreadsheets write them → "YYYY-MM-DD".
 * "2026-03-17 08:15:42", "2026-03-17", "17.03.2026 8:15" (Czech), "03/17/2026" (US; day first if > 12).
 */
export function parseDateLoose(raw: string | undefined): string | null {
  const text = (raw ?? '').trim()
  const valid = (y: number, m: number, d: number) => {
    const date = new Date(Date.UTC(y, m - 1, d))
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
      ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      : null
  }
  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]))
  m = text.match(/^(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})/)
  if (m) return valid(Number(m[3]), Number(m[2]), Number(m[1]))
  m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    return a > 12 ? valid(Number(m[3]), b, a) : valid(Number(m[3]), a, b)
  }
  return null
}

/** "Running", "Treadmill Running", "Trail Running", "Běh" → true. "Cycling" → false. */
export function isRunActivity(type: string | undefined): boolean {
  const text = (type ?? '').toLowerCase()
  return RUN_ACTIVITY_WORDS.some((w) => text.includes(w))
}
