import type { DayKind, Habit, Layer } from './types'
import { LAYER_WEIGHT } from './types'
import { daysBetween, monthKey } from './calendar'

const WORK: Habit[] = [
  {
    id: 'am-water',
    title: '温水',
    layer: 'body',
    slot: 'morning',
    kind: 'check',
  },
  {
    id: 'am-stretch',
    title: '拉伸',
    layer: 'body',
    slot: 'morning',
    kind: 'check',
  },
  {
    id: 'am-sunscreen',
    title: '防晒',
    hint: '先护肤，脸手脖子都抹',
    layer: 'skin',
    slot: 'morning',
    kind: 'check',
    steps: [
      { id: 'am-sunscreen-clean', label: '洁面' },
      { id: 'am-sunscreen-moist', label: '保湿' },
      { id: 'am-sunscreen-face', label: '脸' },
      { id: 'am-sunscreen-hands', label: '手' },
      { id: 'am-sunscreen-neck', label: '脖子' },
    ],
  },
  {
    id: 'day-water',
    title: '喝水',
    hint: '六杯，早上一杯算进去',
    layer: 'body',
    slot: 'day',
    kind: 'water',
  },
  {
    id: 'day-desk',
    title: '工位运动',
    hint: '呼吸、拉伸、走一圈',
    layer: 'body',
    slot: 'day',
    kind: 'check',
    steps: [
      { id: 'day-desk-breath', label: '腹式呼吸' },
      { id: 'day-desk-stretch', label: '肩颈、腰' },
      { id: 'day-desk-walk', label: '走一圈' },
    ],
  },
  {
    id: 'day-snack',
    title: '不吃零食',
    layer: 'body',
    slot: 'day',
    kind: 'check',
  },
  {
    id: 'day-lunch',
    title: '带饭',
    hint: '不额外吃',
    layer: 'body',
    slot: 'day',
    kind: 'check',
  },
  {
    id: 'day-drink',
    title: '不喝奶茶',
    hint: '甜饮料也不喝',
    layer: 'body',
    slot: 'day',
    kind: 'check',
  },
  {
    id: 'day-stand',
    title: '起来走走',
    layer: 'body',
    slot: 'day',
    kind: 'check',
  },
  {
    id: 'day-posture',
    title: '坐姿',
    hint: '少低头',
    layer: 'body',
    slot: 'day',
    kind: 'check',
  },
  {
    id: 'day-spf',
    title: '补防晒',
    hint: '脸、手、脖子',
    layer: 'skin',
    slot: 'day',
    kind: 'check',
    steps: [
      { id: 'day-spf-face', label: '脸' },
      { id: 'day-spf-hands', label: '手' },
      { id: 'day-spf-neck', label: '脖子' },
    ],
  },
  {
    id: 'pm-move',
    title: '运动',
    hint: '散步或拉伸',
    layer: 'body',
    slot: 'evening',
    kind: 'check',
    steps: [
      { id: 'pm-move-walk', label: '散步' },
      { id: 'pm-move-stretch', label: '拉伸' },
    ],
  },
  {
    id: 'pm-dinner',
    title: '晚饭',
    hint: '别撑，不宵夜',
    layer: 'body',
    slot: 'evening',
    kind: 'check',
  },
  {
    id: 'pm-sleep',
    title: '早睡',
    hint: '十点半，放下手机',
    layer: 'body',
    slot: 'evening',
    kind: 'check',
  },
  {
    id: 'pm-skin',
    title: '护肤',
    hint: '洁面、护理、保湿',
    layer: 'skin',
    slot: 'evening',
    kind: 'check',
    steps: [
      { id: 'pm-skin-clean', label: '洁面' },
      { id: 'pm-skin-care', label: '护理' },
      { id: 'pm-skin-moist', label: '保湿' },
    ],
  },
  {
    id: 'pm-hair',
    title: '洗头',
    layer: 'hair',
    slot: 'evening',
    kind: 'check',
  },
]

const REST_TITLE: Partial<Record<string, string>> = {
  'day-desk': '活动',
  'pm-move': '运动',
}

const REST_HINT: Partial<Record<string, string>> = {
  'day-desk': '拉伸，少坐着',
  'day-spf': '户外也要补',
  'pm-move': '可以多练',
}

const LAYER_ORDER: Record<Layer, number> = {
  body: 0,
  skin: 1,
  hair: 2,
  other: 3,
}

const SLOT_ORDER: Record<Habit['slot'], number> = {
  morning: 0,
  day: 1,
  evening: 2,
}

export function cloneHabits(list: Habit[]): Habit[] {
  return JSON.parse(JSON.stringify(list)) as Habit[]
}

export function sortHabits(list: Habit[]): Habit[] {
  return [...list].sort((a, b) => {
    const slot = SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]
    if (slot !== 0) return slot
    return LAYER_ORDER[a.layer] - LAYER_ORDER[b.layer]
  })
}

/** 按时段排，同一时段内保持模版里的顺序。 */
export function orderBySlot(list: Habit[]): Habit[] {
  return [...list].sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot])
}

export function defaultWork(): Habit[] {
  return cloneHabits(WORK)
}

export function defaultRest(): Habit[] {
  return cloneHabits(
    WORK.map((habit) => ({
      ...habit,
      title: REST_TITLE[habit.id] ?? habit.title,
      hint: REST_HINT[habit.id] ?? habit.hint,
    })),
  )
}

export function defaultPair() {
  return { work: defaultWork(), rest: defaultRest() }
}

export function newHabitId(): string {
  return `h-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`
}

export function habitsFor(kind: DayKind): Habit[] {
  return sortHabits(kind === 'work' ? defaultWork() : defaultRest())
}

export function slotLabel(kind: DayKind, slot: Habit['slot']): string {
  if (slot === 'morning') return '早晨'
  if (slot === 'evening') return '晚上'
  return kind === 'work' ? '上班' : '白天'
}

export type PeriodicItem = {
  id: 'haircut' | 'brows' | 'outfit'
  title: string
  layer: Layer
  dueLabel: string
  waitLabel: string
}

export const PERIODIC: PeriodicItem[] = [
  {
    id: 'haircut',
    title: '理发',
    layer: 'hair',
    dueLabel: '可以去剪',
    waitLabel: '还早',
  },
  {
    id: 'brows',
    title: '修眉',
    layer: 'hair',
    dueLabel: '可以修',
    waitLabel: '还早',
  },
  {
    id: 'outfit',
    title: '穿搭',
    layer: 'other',
    dueLabel: '这个月可以去逛',
    waitLabel: '这个月记过了',
  },
]

export function isPeriodicDue(
  id: PeriodicItem['id'],
  today: string,
  lastHaircut: string | null,
  lastBrows: string | null,
  lastOutfitMonth: string | null,
): boolean {
  if (id === 'haircut') {
    if (!lastHaircut) return true
    return daysBetween(lastHaircut, today) >= 35
  }
  if (id === 'brows') {
    if (!lastBrows) return true
    return daysBetween(lastBrows, today) >= 21
  }
  return lastOutfitMonth !== monthKey(today)
}

export function layerWeight(layer: Layer): number {
  return LAYER_WEIGHT[layer]
}
