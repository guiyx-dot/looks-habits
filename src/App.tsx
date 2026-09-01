import { useMemo, useState } from 'react'
import { toDateKey } from './calendar'
import { MonthPage } from './MonthPage'
import { shiftDate, TodayPage } from './TodayPage'
import { TemplatePage } from './TemplatePage'
import { WeekPage } from './WeekPage'
import type { Tab } from './types'

export function App() {
  const todayKey = useMemo(() => toDateKey(new Date()), [])
  const [dateKey, setDateKey] = useState(todayKey)
  const [tab, setTab] = useState<Tab>('today')

  return (
    <div className="shell">
      <main className="main">
        {tab === 'today' ? (
          <TodayPage
            dateKey={dateKey}
            todayKey={todayKey}
            onShift={(days) => setDateKey((k) => shiftDate(k, days))}
            onToday={() => setDateKey(todayKey)}
          />
        ) : null}
        {tab === 'week' ? (
          <WeekPage dateKey={dateKey} todayKey={todayKey} onPick={(key) => { setDateKey(key); setTab('today') }} />
        ) : null}
        {tab === 'month' ? (
          <MonthPage dateKey={dateKey} todayKey={todayKey} onPick={(key) => { setDateKey(key); setTab('today') }} />
        ) : null}
        {tab === 'template' ? <TemplatePage /> : null}
      </main>
      <nav className="tabs">
        <button type="button" className={tab === 'today' ? 'on' : ''} onClick={() => setTab('today')}>
          今日
        </button>
        <button type="button" className={tab === 'week' ? 'on' : ''} onClick={() => setTab('week')}>
          本周
        </button>
        <button type="button" className={tab === 'month' ? 'on' : ''} onClick={() => setTab('month')}>
          本月
        </button>
        <button type="button" className={tab === 'template' ? 'on' : ''} onClick={() => setTab('template')}>
          模版
        </button>
      </nav>
    </div>
  )
}
