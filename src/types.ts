export type Layer = 'body' | 'skin' | 'hair' | 'other'
export type Slot = 'morning' | 'day' | 'evening'
export type DayKind = 'work' | 'rest'
export type Tab = 'today' | 'week' | 'month' | 'template'

export const LAYER_WEIGHT: Record<Layer, number> = {
  body: 4,
  skin: 3,
  hair: 2,
  other: 1,
}

export const LAYER_LABEL: Record<Layer, string> = {
  body: '体态',
  skin: '护肤',
  hair: '头发',
  other: '其他',
}

export const WATER_TARGET = 6

export type Step = {
  id: string
  label: string
}

export type Habit = {
  id: string
  title: string
  hint?: string
  layer: Layer
  slot: Slot
  kind: 'check' | 'water'
  steps?: Step[]
}

export type Extra = {
  id: string
  text: string
  createdOn: string
  doneOn: string | null
}

export type DayRecord = {
  checks: Record<string, boolean>
  steps: Record<string, boolean>
  cups: number
  warmLinked: boolean
  periodic: Record<string, boolean>
}

export type TemplatePair = {
  work: Habit[]
  rest: Habit[]
}

export type TemplateVersion = {
  from: string
  work: Habit[]
  rest: Habit[]
}

export type StoreState = {
  version: 1
  days: Record<string, DayRecord>
  extras: Extra[]
  lastHaircut: string | null
  lastBrows: string | null
  lastOutfitMonth: string | null
  customQuotes: string[]
  templates: TemplatePair
  templateLog: TemplateVersion[]
}

export function emptyDay(): DayRecord {
  return {
    checks: {},
    steps: {},
    cups: 0,
    warmLinked: false,
    periodic: {},
  }
}
