import { dayKind, monthKeys, parseKey } from './calendar'
import { LAYER_LABEL, type Layer } from './types'
import { habitsForDate, isHabitOn, scoresFor, useStore } from './store'

type Props = {
  dateKey: string
  todayKey: string
  onPick: (key: string) => void
}

export function MonthPage({ dateKey, todayKey, onPick }: Props) {
  const store = useStore()
  const date = parseKey(dateKey)
  const keys = monthKeys(date)
  const firstWeekday = parseKey(keys[0]).getDay()
  const lead = firstWeekday === 0 ? 6 : firstWeekday - 1
  const misses = missRanks(keys, store.days)

  return (
    <div className="page">
      <header className="plain-head">
        <h1>
          {date.getFullYear()}年{date.getMonth() + 1}月
        </h1>
        <p className="muted">颜色越深，完成越多</p>
      </header>

      <section className="card">
        <div className="cal-weekdays">
          {'一二三四五六日'.split('').map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="cal-grid">
          {Array.from({ length: lead }, (_, i) => (
            <span key={`e-${i}`} className="cal-empty" />
          ))}
          {keys.map((key) => {
            const { ratio } = scoresFor(key, store.days[key])
            const has = !!store.days[key]
            return (
              <button
                key={key}
                type="button"
                className={`cal-cell ${key === todayKey ? 'is-today' : ''} ${key === dateKey ? 'is-sel' : ''}`}
                onClick={() => onPick(key)}
                style={{
                  background:
                    has && ratio > 0
                      ? `rgba(47, 78, 62, ${0.12 + ratio * 0.55})`
                      : undefined,
                  color: has && ratio >= 0.55 ? '#f3eee6' : undefined,
                }}
              >
                {parseKey(key).getDate()}
              </button>
            )
          })}
        </div>
      </section>

      <section className="card">
        <h2>这个月容易漏的</h2>
        <p className="card-note">体态在前。额外事项不算。</p>
        {misses.length === 0 ? (
          <p className="muted">这个月还没有打卡记录。</p>
        ) : (
          <ol className="miss-list">
            {misses.map((row) => (
              <li key={row.id}>
                <span>
                  {row.title}
                  <em className="layer-tag">{LAYER_LABEL[row.layer]}</em>
                </span>
                <strong>漏了 {row.missed} 天</strong>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function missRanks(keys: string[], days: Record<string, import('./types').DayRecord>) {
  const tallies = new Map<string, { id: string; title: string; layer: Layer; missed: number; seen: number }>()
  for (const key of keys) {
    const rec = days[key]
    if (!rec) continue
    const habits = habitsForDate(key, dayKind(key))
    for (const habit of habits) {
      const row = tallies.get(habit.id) ?? {
        id: habit.id,
        title: habit.title,
        layer: habit.layer,
        missed: 0,
        seen: 0,
      }
      row.seen += 1
      if (!isHabitOn(rec, habit.id, key)) row.missed += 1
      tallies.set(habit.id, row)
    }
  }
  const order: Record<Layer, number> = { body: 0, skin: 1, hair: 2, other: 3 }
  return [...tallies.values()]
    .filter((r) => r.missed > 0)
    .sort((a, b) => {
      const layer = order[a.layer] - order[b.layer]
      if (layer !== 0) return layer
      return b.missed - a.missed
    })
    .slice(0, 8)
}
