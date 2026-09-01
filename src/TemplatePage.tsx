import { useRef, useState } from 'react'
import { cloneHabits, defaultPair, newHabitId, slotLabel } from './catalog'
import { saveTemplates, useStore } from './store'
import { LAYER_LABEL, type DayKind, type Habit, type Layer, type Slot } from './types'

const SLOTS: Slot[] = ['morning', 'day', 'evening']
const LAYERS: Layer[] = ['body', 'skin', 'hair', 'other']

export function TemplatePage() {
  const store = useStore()
  const [kind, setKind] = useState<DayKind>('work')
  const [work, setWork] = useState(() => cloneHabits(store.templates.work))
  const [rest, setRest] = useState(() => cloneHabits(store.templates.rest))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const workRef = useRef(work)
  const restRef = useRef(rest)
  workRef.current = work
  restRef.current = rest
  const list = kind === 'work' ? work : rest

  function patch(id: string, next: Partial<Habit>) {
    const apply = (items: Habit[]) => items.map((item) => (item.id === id ? { ...item, ...next } : item))
    if (kind === 'work') setWork(apply)
    else setRest(apply)
    setSaved(false)
    setError('')
  }

  function remove(id: string) {
    if (kind === 'work') setWork((items) => items.filter((item) => item.id !== id))
    else setRest((items) => items.filter((item) => item.id !== id))
    setSaved(false)
    setError('')
  }

  function move(id: string, dir: -1 | 1) {
    const apply = (items: Habit[]) => {
      const slot = items.find((item) => item.id === id)?.slot
      if (!slot) return items
      const inSlot = items.filter((item) => item.slot === slot)
      const index = inSlot.findIndex((item) => item.id === id)
      const target = index + dir
      if (index < 0 || target < 0 || target >= inSlot.length) return items
      const nextSlot = [...inSlot]
      const [row] = nextSlot.splice(index, 1)
      nextSlot.splice(target, 0, row)
      let cursor = 0
      return items.map((item) => (item.slot === slot ? nextSlot[cursor++] : item))
    }
    if (kind === 'work') setWork(apply)
    else setRest(apply)
    setSaved(false)
    setError('')
  }

  function add(slot: Slot) {
    const item: Habit = {
      id: newHabitId(),
      title: '新事项',
      layer: 'body',
      slot,
      kind: 'check',
    }
    if (kind === 'work') setWork((items) => [...items, item])
    else setRest((items) => [...items, item])
    setSaved(false)
    setError('')
  }

  function save() {
    const cleanedWork = cleanList(workRef.current)
    const cleanedRest = cleanList(restRef.current)
    if (cleanedWork.length === 0 || cleanedRest.length === 0) {
      setError('工作日和休息日都至少留一项，才能保存。')
      setSaved(false)
      return
    }
    const ok = saveTemplates(cleanedWork, cleanedRest)
    setWork(cloneHabits(cleanedWork))
    setRest(cloneHabits(cleanedRest))
    if (!ok) {
      setError('这次没能写进手机存储，换个浏览器再试，或先别清缓存。')
      setSaved(false)
      return
    }
    setError('')
    setSaved(true)
  }

  function restore() {
    if (!window.confirm('恢复成默认清单？还没保存的修改会丢掉。')) return
    const defaults = defaultPair()
    setWork(defaults.work)
    setRest(defaults.rest)
    setSaved(false)
    setError('')
  }

  return (
    <div className="page">
      <header className="plain-head">
        <h1>模版</h1>
        <p className="muted">改动从今天起生效。以前的日子仍是当时那份清单。</p>
      </header>

      <div className="kind-switch">
        <button type="button" className={kind === 'work' ? 'on' : ''} onClick={() => setKind('work')}>
          工作日
        </button>
        <button type="button" className={kind === 'rest' ? 'on' : ''} onClick={() => setKind('rest')}>
          休息日
        </button>
      </div>

      {SLOTS.map((slot) => {
        const items = list.filter((item) => item.slot === slot)
        return (
          <section key={slot} className="card">
            <h2>{slotLabel(kind, slot)}</h2>
            <ul className="tpl-list">
              {items.map((item) => (
                <li key={item.id} className="tpl-item">
                  <input
                    className="tpl-title"
                    value={item.title}
                    onChange={(e) => patch(item.id, { title: e.target.value })}
                    placeholder="事项名"
                    maxLength={12}
                  />
                  <input
                    className="tpl-hint"
                    value={item.hint ?? ''}
                    onChange={(e) => patch(item.id, { hint: e.target.value || undefined })}
                    placeholder="小字说明，可空"
                    maxLength={36}
                  />
                  <div className="tpl-meta">
                    <select
                      value={item.layer}
                      onChange={(e) => patch(item.id, { layer: e.target.value as Layer })}
                    >
                      {LAYERS.map((layer) => (
                        <option key={layer} value={layer}>
                          {LAYER_LABEL[layer]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={item.slot}
                      onChange={(e) => patch(item.id, { slot: e.target.value as Slot })}
                    >
                      {SLOTS.map((s) => (
                        <option key={s} value={s}>
                          {slotLabel(kind, s)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="tpl-actions">
                    <button type="button" className="text-btn" onClick={() => move(item.id, -1)}>
                      上移
                    </button>
                    <button type="button" className="text-btn" onClick={() => move(item.id, 1)}>
                      下移
                    </button>
                    <button type="button" className="text-btn" onClick={() => remove(item.id)}>
                      删除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" className="text-btn tpl-add" onClick={() => add(slot)}>
              加一项
            </button>
          </section>
        )
      })}

      <div className="tpl-save">
        <button type="button" className="text-btn" onClick={restore}>
          恢复默认
        </button>
        <button type="button" className="save-btn" onClick={save}>
          {saved ? '已保存' : '保存'}
        </button>
      </div>
      {error ? <p className="card-note">{error}</p> : null}
      <p className="card-note">看到「已保存」才算记下。恢复默认要再按一次保存，才会从今天起生效。</p>
    </div>
  )
}

function cleanList(list: Habit[]): Habit[] {
  return list
    .map((item) => ({
      ...item,
      title: item.title.trim(),
      hint: item.hint?.trim() || undefined,
      steps: undefined,
    }))
    .filter((item) => item.title.length > 0)
}
