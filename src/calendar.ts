import type { DayKind, Slot } from './types'

export const SLOT_CYCLE: Slot[] = ['morning', 'day', 'evening']

/** 早晨 5:00，上班/白天 9:00，下班/晚上 19:00。凌晨到 5 点仍算晚上。 */
export function slotAt(date: Date = new Date()): Slot {
  const hour = date.getHours()
  if (hour >= 19 || hour < 5) return 'evening'
  if (hour >= 9) return 'day'
  return 'morning'
}

export function slotsFrom(current: Slot): Slot[] {
  const index = SLOT_CYCLE.indexOf(current)
  return [...SLOT_CYCLE.slice(index), ...SLOT_CYCLE.slice(0, index)]
}

const HOLIDAY_REST = rangeUnion([
  ['2026-01-01', '2026-01-03'],
  ['2026-02-15', '2026-02-23'],
  ['2026-04-04', '2026-04-06'],
  ['2026-05-01', '2026-05-05'],
  ['2026-06-19', '2026-06-21'],
  ['2026-09-25', '2026-09-27'],
  ['2026-10-01', '2026-10-07'],
])

const MAKEUP_WORK = new Set([
  '2026-01-04',
  '2026-02-14',
  '2026-02-28',
  '2026-05-09',
  '2026-09-20',
  '2026-10-10',
])

function rangeUnion(ranges: [string, string][]): Set<string> {
  const out = new Set<string>()
  for (const [start, end] of ranges) {
    for (const key of eachDateKey(parseKey(start), parseKey(end))) {
      out.add(key)
    }
  }
  return out
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function eachDateKey(from: Date, to: Date): string[] {
  const keys: string[] = []
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  while (cursor <= end) {
    keys.push(toDateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

export function dayKind(key: string): DayKind {
  if (HOLIDAY_REST.has(key)) return 'rest'
  if (MAKEUP_WORK.has(key)) return 'work'
  const weekday = parseKey(key).getDay()
  return weekday === 0 || weekday === 6 ? 'rest' : 'work'
}

export function formatZhDate(key: string): string {
  const date = parseKey(key)
  const week = '日一二三四五六'[date.getDay()]
  return `${date.getMonth() + 1}月${date.getDate()}日 周${week}`
}

export function startOfWeekMonday(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  return copy
}

export function weekKeys(anchor: Date): string[] {
  const monday = startOfWeekMonday(anchor)
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(monday, i)))
}

export function monthKeys(anchor: Date): string[] {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  return eachDateKey(start, end)
}

export function daysBetween(fromKey: string, toKey: string): number {
  const ms = parseKey(toKey).getTime() - parseKey(fromKey).getTime()
  return Math.round(ms / 86400000)
}

export function monthKey(dateKey: string): string {
  return dateKey.slice(0, 7)
}
