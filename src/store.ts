import { useSyncExternalStore } from 'react'
import { dayKind, monthKey, toDateKey } from './calendar'
import { cloneHabits, defaultPair, layerWeight, orderBySlot } from './catalog'
import {
  emptyDay,
  WATER_TARGET,
  type DayKind,
  type DayRecord,
  type Extra,
  type Habit,
  type Layer,
  type StoreState,
  type TemplatePair,
} from './types'

const KEY = 'looks-habits.v1'
const LOG_ORIGIN = '1970-01-01'

function load(): StoreState {
  const defaults = defaultPair()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fresh()
    const parsed = JSON.parse(raw) as StoreState
    if (parsed.version !== 1) return fresh()
    const templates = parsed.templates ?? defaults
    const templateLog =
      parsed.templateLog && parsed.templateLog.length > 0
        ? parsed.templateLog
        : [{ from: LOG_ORIGIN, work: cloneHabits(templates.work), rest: cloneHabits(templates.rest) }]
    return {
      version: 1,
      days: parsed.days ?? {},
      extras: parsed.extras ?? [],
      lastHaircut: parsed.lastHaircut ?? null,
      lastBrows: parsed.lastBrows ?? null,
      lastOutfitMonth: parsed.lastOutfitMonth ?? null,
      customQuotes: parsed.customQuotes ?? [],
      templates,
      templateLog,
    }
  } catch {
    return fresh()
  }
}

function fresh(): StoreState {
  const defaults = defaultPair()
  return {
    version: 1,
    days: {},
    extras: [],
    lastHaircut: null,
    lastBrows: null,
    lastOutfitMonth: null,
    customQuotes: [],
    templates: defaults,
    templateLog: [
      { from: LOG_ORIGIN, work: cloneHabits(defaults.work), rest: cloneHabits(defaults.rest) },
    ],
  }
}

let state = load()
const listeners = new Set<() => void>()

function emit() {
  let ok = true
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    ok = false
  }
  listeners.forEach((fn) => fn())
  return ok
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function snapshot() {
  return state
}

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

export function pairForDate(dateKey: string): TemplatePair {
  const today = toDateKey(new Date())
  if (dateKey >= today) {
    return {
      work: cloneHabits(state.templates.work),
      rest: cloneHabits(state.templates.rest),
    }
  }
  const sorted = [...state.templateLog].sort((a, b) => a.from.localeCompare(b.from))
  let found = defaultPair()
  for (const version of sorted) {
    if (version.from <= dateKey) {
      found = { work: version.work, rest: version.rest }
    }
  }
  return { work: cloneHabits(found.work), rest: cloneHabits(found.rest) }
}

export function habitsForDate(dateKey: string, kind: DayKind = dayKind(dateKey)): Habit[] {
  const pair = pairForDate(dateKey)
  return orderBySlot(kind === 'work' ? pair.work : pair.rest)
}

function habitOnDate(dateKey: string, habitId: string): Habit | undefined {
  return habitsForDate(dateKey).find((item) => item.id === habitId)
}

export function saveTemplates(work: Habit[], rest: Habit[]): boolean {
  const today = toDateKey(new Date())
  const next: TemplatePair = {
    work: orderBySlot(cloneHabits(work)),
    rest: orderBySlot(cloneHabits(rest)),
  }
  const log = [...state.templateLog]
  const last = log[log.length - 1]
  if (last && last.from === today) {
    log[log.length - 1] = { from: today, work: cloneHabits(next.work), rest: cloneHabits(next.rest) }
  } else {
    log.push({ from: today, work: cloneHabits(next.work), rest: cloneHabits(next.rest) })
  }
  state = { ...state, templates: next, templateLog: log }
  return emit()
}

function dayOf(key: string): DayRecord {
  return state.days[key] ?? emptyDay()
}

function writeDay(key: string, next: DayRecord) {
  state = {
    ...state,
    days: { ...state.days, [key]: next },
  }
  emit()
}

export function isHabitOn(record: DayRecord, habitId: string, dateKey?: string): boolean {
  const habit = dateKey ? habitOnDate(dateKey, habitId) : undefined
  if (habit?.kind === 'water' || habitId === 'day-water') {
    return record.cups >= WATER_TARGET || !!record.checks[habitId]
  }
  return !!record.checks[habitId]
}

export function toggleHabit(dateKey: string, habitId: string) {
  const record = { ...dayOf(dateKey) }
  record.checks = { ...record.checks }
  const habit = habitOnDate(dateKey, habitId)
  const on = isHabitOn(record, habitId, dateKey)
  const isWater = habit?.kind === 'water' || habitId === 'day-water'

  if (isWater) {
    if (on) {
      record.checks[habitId] = false
      if (record.cups >= WATER_TARGET) record.cups = WATER_TARGET - 1
    } else {
      record.checks[habitId] = true
      if (record.cups < WATER_TARGET) record.cups = WATER_TARGET
    }
    writeDay(dateKey, record)
    return
  }

  if (habitId === 'am-water') {
    if (on) {
      record.checks['am-water'] = false
      if (record.warmLinked) {
        record.cups = Math.max(0, record.cups - 1)
        record.warmLinked = false
      }
    } else {
      record.checks['am-water'] = true
      if (!record.warmLinked) {
        record.cups += 1
        record.warmLinked = true
      }
    }
    if (record.cups >= WATER_TARGET) {
      const water = habitsForDate(dateKey).find((item) => item.kind === 'water')
      if (water) record.checks[water.id] = true
      record.checks['day-water'] = true
    }
    writeDay(dateKey, record)
    return
  }

  record.checks[habitId] = !on
  writeDay(dateKey, record)
}

export function setCups(dateKey: string, cups: number) {
  const record = { ...dayOf(dateKey) }
  record.cups = Math.max(0, Math.min(12, cups))
  record.checks = { ...record.checks }
  const water = habitsForDate(dateKey).find((item) => item.kind === 'water')
  const waterId = water?.id ?? 'day-water'
  if (record.cups >= WATER_TARGET) record.checks[waterId] = true
  else record.checks[waterId] = false
  writeDay(dateKey, record)
}

export function toggleStep(dateKey: string, stepId: string) {
  const record = { ...dayOf(dateKey) }
  record.steps = { ...record.steps, [stepId]: !record.steps[stepId] }
  writeDay(dateKey, record)
}

export function togglePeriodic(dateKey: string, id: 'haircut' | 'brows' | 'outfit') {
  const record = { ...dayOf(dateKey) }
  const nextOn = !record.periodic[id]
  record.periodic = { ...record.periodic, [id]: nextOn }

  if (id === 'haircut') {
    state = { ...state, lastHaircut: nextOn ? dateKey : null }
  } else if (id === 'brows') {
    state = { ...state, lastBrows: nextOn ? dateKey : null }
  } else {
    state = { ...state, lastOutfitMonth: nextOn ? monthKey(dateKey) : null }
  }
  writeDay(dateKey, record)
}

export function extrasOn(dateKey: string, extras: Extra[]): Extra[] {
  return extras.filter((item) => {
    if (item.createdOn > dateKey) return false
    if (item.doneOn && item.doneOn < dateKey) return false
    return true
  })
}

export function extraDoneOn(item: Extra, dateKey: string): boolean {
  return item.doneOn === dateKey
}

export function addExtra(dateKey: string, text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  const item: Extra = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text: trimmed,
    createdOn: dateKey,
    doneOn: null,
  }
  state = { ...state, extras: [...state.extras, item] }
  emit()
}

export function toggleExtra(id: string, dateKey: string) {
  state = {
    ...state,
    extras: state.extras.map((item) => {
      if (item.id !== id) return item
      if (item.doneOn === dateKey) return { ...item, doneOn: null }
      return { ...item, doneOn: dateKey }
    }),
  }
  emit()
}

export function removeExtra(id: string) {
  state = { ...state, extras: state.extras.filter((item) => item.id !== id) }
  emit()
}

export function addQuote(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  state = { ...state, customQuotes: [...state.customQuotes, trimmed] }
  emit()
}

export type LayerScore = {
  layer: Layer
  done: number
  total: number
  weightDone: number
  weightTotal: number
}

export function scoresFor(dateKey: string, record: DayRecord | undefined): {
  layers: LayerScore[]
  weightDone: number
  weightTotal: number
  ratio: number
} {
  const habits = habitsForDate(dateKey)
  const rec = record ?? emptyDay()
  const layers: Layer[] = ['body', 'skin', 'hair', 'other']
  const layerScores = layers.map((layer) => {
    const items = habits.filter((h) => h.layer === layer)
    const done = items.filter((h) => isHabitOn(rec, h.id, dateKey)).length
    const weightTotal = items.reduce((sum, h) => sum + layerWeight(h.layer), 0)
    const weightDone = items.reduce(
      (sum, h) => sum + (isHabitOn(rec, h.id, dateKey) ? layerWeight(h.layer) : 0),
      0,
    )
    return {
      layer,
      done,
      total: items.length,
      weightDone,
      weightTotal,
    }
  })
  const weightDone = layerScores.reduce((s, l) => s + l.weightDone, 0)
  const weightTotal = layerScores.reduce((s, l) => s + l.weightTotal, 0)
  return {
    layers: layerScores,
    weightDone,
    weightTotal,
    ratio: weightTotal === 0 ? 0 : weightDone / weightTotal,
  }
}

function prevKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return toDateKey(new Date(y, m - 1, d - 1))
}

export function streakFrom(todayKey: string, days: Record<string, DayRecord>): number {
  let cursor = todayKey
  if (scoresFor(cursor, days[cursor]).ratio < 0.7) cursor = prevKey(cursor)
  let count = 0
  for (let i = 0; i < 366; i++) {
    if (scoresFor(cursor, days[cursor]).ratio < 0.7) break
    count += 1
    cursor = prevKey(cursor)
  }
  return count
}
