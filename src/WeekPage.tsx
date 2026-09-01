import { dayKind, parseKey, weekKeys } from './calendar'
import { LAYER_LABEL } from './types'
import { scoresFor, streakFrom, useStore } from './store'

type Props = {
  dateKey: string
  todayKey: string
  onPick: (key: string) => void
}

export function WeekPage({ dateKey, todayKey, onPick }: Props) {
  const store = useStore()
  const keys = weekKeys(parseKey(dateKey))
  const days = keys.map((key) => ({
    key,
    kind: dayKind(key),
    scores: scoresFor(key, store.days[key]),
  }))
  const bodyAvg = average(days.map((d) => layerRatio(d.scores, 'body')))
  const skinAvg = average(days.map((d) => layerRatio(d.scores, 'skin')))
  const hairAvg = average(days.map((d) => layerRatio(d.scores, 'hair')))
  const streak = streakFrom(todayKey, store.days)

  return (
    <div className="page">
      <header className="plain-head">
        <h1>本周</h1>
        <p className="muted">连续 {streak} 天完成超过七成</p>
      </header>

      <section className="card body-progress">
        <div className="body-progress-top">
          <strong>体态</strong>
          <span>{Math.round(bodyAvg * 100)}%</span>
        </div>
        <div className="bar">
          <span style={{ width: `${bodyAvg * 100}%` }} />
        </div>
        <div className="sub-bars">
          <div className="sub-bar">
            <span>{LAYER_LABEL.skin}</span>
            <div className="bar thin">
              <span style={{ width: `${skinAvg * 100}%` }} />
            </div>
          </div>
          <div className="sub-bar">
            <span>{LAYER_LABEL.hair}</span>
            <div className="bar thin">
              <span style={{ width: `${hairAvg * 100}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>七天</h2>
        <ul className="week-days">
          {days.map((day) => {
            const label = '一二三四五六日'[parseKey(day.key).getDay() === 0 ? 6 : parseKey(day.key).getDay() - 1]
            const body = day.scores.layers.find((l) => l.layer === 'body')
            return (
              <li key={day.key}>
                <button
                  type="button"
                  className={`week-day ${day.key === todayKey ? 'is-today' : ''} ${day.key === dateKey ? 'is-sel' : ''}`}
                  onClick={() => onPick(day.key)}
                >
                  <span className="wd-name">{label}</span>
                  <span className="wd-date">{parseKey(day.key).getDate()}</span>
                  <span className="wd-kind">{day.kind === 'work' ? '班' : '休'}</span>
                  <div className="bar thin">
                    <span style={{ width: `${(body?.total ? body.done / body.total : 0) * 100}%` }} />
                  </div>
                  <em>{Math.round(day.scores.ratio * 100)}%</em>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="card-note">上面是体态，下面数字是当天完成。</p>
      </section>
    </div>
  )
}

function layerRatio(
  scores: ReturnType<typeof scoresFor>,
  layer: 'body' | 'skin' | 'hair',
): number {
  const row = scores.layers.find((l) => l.layer === layer)
  if (!row || row.total === 0) return 0
  return row.done / row.total
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}
