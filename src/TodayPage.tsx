import { useEffect, useMemo, useState } from 'react'
import { addDays, dayKind, parseKey, SLOT_CYCLE, slotAt, slotsFrom, toDateKey } from './calendar'
import { isPeriodicDue, PERIODIC, slotLabel } from './catalog'
import { quoteFor } from './quotes'
import {
  addExtra,
  addQuote,
  extraDoneOn,
  extrasOn,
  habitsForDate,
  isHabitOn,
  removeExtra,
  scoresFor,
  toggleExtra,
  toggleHabit,
  togglePeriodic,
  useStore,
} from './store'
import { LAYER_LABEL, emptyDay, type Habit } from './types'

type Props = {
  dateKey: string
  todayKey: string
  onShift: (days: number) => void
  onToday: () => void
}

export function TodayPage({ dateKey, todayKey, onShift, onToday }: Props) {
  const store = useStore()
  const kind = dayKind(dateKey)
  const habits = useMemo(() => habitsForDate(dateKey, kind), [dateKey, kind, store.templates, store.templateLog])
  const record = store.days[dateKey]
  const scores = scoresFor(dateKey, record)
  const extras = extrasOn(dateKey, store.extras)
  const quote = quoteFor(dateKey, store.customQuotes)
  const [extraText, setExtraText] = useState('')
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteText, setQuoteText] = useState('')
  const isToday = dateKey === todayKey
  const now = useClock(isToday)
  const body = scores.layers.find((l) => l.layer === 'body')

  const slotOrder = isToday ? slotsFrom(slotAt(now)) : SLOT_CYCLE
  const slots = slotOrder.map((slot) => ({
    slot,
    label: slotLabel(kind, slot),
    items: habits.filter((h) => h.slot === slot),
  }))

  return (
    <div className="page">
      <p className="quote">{quote}</p>
      {quoteOpen ? (
        <form
          className="quote-add"
          onSubmit={(e) => {
            e.preventDefault()
            addQuote(quoteText)
            setQuoteText('')
            setQuoteOpen(false)
          }}
        >
          <input
            value={quoteText}
            onChange={(e) => setQuoteText(e.target.value)}
            placeholder="自己的一句"
            maxLength={80}
          />
          <button type="submit">加上</button>
        </form>
      ) : (
        <button type="button" className="quote-link" onClick={() => setQuoteOpen(true)}>
          收一句
        </button>
      )}

      <header className="date-head">
        <button type="button" className="icon-btn" onClick={() => onShift(-1)} aria-label="前一天">
          ‹
        </button>
        <div className="date-block">
          <p className="date-num">{parseKey(dateKey).getDate()}</p>
          <p className="date-meta">
            {parseKey(dateKey).getMonth() + 1}月 · 周{'日一二三四五六'[parseKey(dateKey).getDay()]} ·{' '}
            {kind === 'work' ? '工作日' : '休息日'}
          </p>
        </div>
        <button type="button" className="icon-btn" onClick={() => onShift(1)} aria-label="后一天">
          ›
        </button>
      </header>
      {!isToday ? (
        <button type="button" className="back-today" onClick={onToday}>
          回到今天
        </button>
      ) : null}
      {dateKey < todayKey ? (
        <p className="card-note">这天用的是当时的清单，改模版不会动它。</p>
      ) : null}

      {body ? (
        <section className="body-progress" aria-label="体态进度">
          <div className="body-progress-top">
            <strong>体态</strong>
            <span>
              {body.done}/{body.total}
            </span>
          </div>
          <div className="bar">
            <span style={{ width: `${body.total ? (body.done / body.total) * 100 : 0}%` }} />
          </div>
          <div className="sub-bars">
            {scores.layers
              .filter((l) => l.layer !== 'body' && l.total > 0)
              .map((l) => (
                <div key={l.layer} className="sub-bar">
                  <span>{LAYER_LABEL[l.layer]}</span>
                  <div className="bar thin">
                    <span style={{ width: `${l.total ? (l.done / l.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
          </div>
          <p className="weighted">完成 {Math.round(scores.ratio * 100)}%</p>
        </section>
      ) : null}

      {slots.map((group) => (
        <section key={group.slot} className="card">
          <h2>{group.label}</h2>
          <ul className="habit-list">
            {group.items.map((habit) => (
              <HabitRow key={habit.id} habit={habit} dateKey={dateKey} />
            ))}
          </ul>
        </section>
      ))}

      <section className="card extras">
        <div className="card-head">
          <h2>额外</h2>
          <span className="muted">
            {extras.filter((e) => extraDoneOn(e, dateKey)).length}/{extras.length}
          </span>
        </div>
        <p className="card-note">没勾的会留到后面。</p>
        <ul className="habit-list">
          {extras.map((item) => (
            <li key={item.id} className="habit">
              <div className="habit-row">
                <label className="habit-main">
                  <span className="habit-check">
                    <input
                      type="checkbox"
                      checked={extraDoneOn(item, dateKey)}
                      onChange={() => toggleExtra(item.id, dateKey)}
                    />
                  </span>
                  <span className="habit-copy">
                    <span className={`habit-title ${extraDoneOn(item, dateKey) ? 'done' : ''}`}>
                      {item.text}
                    </span>
                  </span>
                </label>
                <span className="habit-more">
                  <button type="button" className="text-btn" onClick={() => removeExtra(item.id)}>
                    删
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
        <form
          className="extra-add"
          onSubmit={(e) => {
            e.preventDefault()
            addExtra(dateKey, extraText)
            setExtraText('')
          }}
        >
          <input
            value={extraText}
            onChange={(e) => setExtraText(e.target.value)}
            placeholder="比如：剪指甲"
            maxLength={40}
          />
          <button type="submit">加上</button>
        </form>
      </section>

      {kind === 'rest' ? (
        <section className="card">
          <h2>这周可以做</h2>
          <p className="card-note">漏了不扣今天。</p>
          <ul className="habit-list">
            {PERIODIC.map((item) => {
              const due = isPeriodicDue(
                item.id,
                dateKey,
                store.lastHaircut,
                store.lastBrows,
                store.lastOutfitMonth,
              )
              const on = !!record?.periodic[item.id]
              return (
                <li key={item.id} className="habit">
                  <div className="habit-row habit-row-plain">
                    <label className="habit-main">
                      <span className="habit-check">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => togglePeriodic(dateKey, item.id)}
                        />
                      </span>
                      <span className="habit-copy">
                        <span className="habit-title">{item.title}</span>
                        <span className="habit-hint">{due ? item.dueLabel : item.waitLabel}</span>
                      </span>
                    </label>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function useClock(active: boolean) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!active) return
    const tick = () => setNow(new Date())
    tick()
    const id = window.setInterval(tick, 60_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [active])
  return now
}

function HabitRow({ habit, dateKey }: { habit: Habit; dateKey: string }) {
  const store = useStore()
  const record = store.days[dateKey]
  const on = isHabitOn(record ?? emptyDay(), habit.id, dateKey)

  return (
    <li className={`habit ${habit.layer === 'body' ? 'is-body' : ''}`}>
      <div className="habit-row habit-row-plain">
        <label className="habit-main">
          <span className="habit-check">
            <input type="checkbox" checked={on} onChange={() => toggleHabit(dateKey, habit.id)} />
          </span>
          <span className="habit-copy">
            <span className={`habit-title ${on ? 'done' : ''}`}>{habit.title}</span>
            {habit.hint ? <span className="habit-hint">{habit.hint}</span> : null}
          </span>
        </label>
      </div>
    </li>
  )
}

export function shiftDate(dateKey: string, days: number): string {
  return toDateKey(addDays(parseKey(dateKey), days))
}
