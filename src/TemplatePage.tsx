import { useState } from 'react'
import { cloneHabits, defaultPair, newHabitId, slotLabel, sortHabits } from './catalog'
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
  const list = kind === 'work' ? work : rest
  const setList = kind === 'work' ? setWork : setRest

  function patch(id: string, next: Partial<Habit>) {
    setList(list.map((item) => (item.id === id ? { ...item, ...next } : item)))
    setSaved(false)
  }

  function remove(id: string) {
    setList(list.filter((item) => item.id !== id))
    setSaved(false)
  }

  function move(id: string, dir: -1 | 1) {
    const index = list.findIndex((item) => item.id === id)
    const target = index + dir
    if (index < 0 || target < 0 || target >= list.length) return
    const next = [...list]
    const [row] = next.splice(index, 1)
    next.splice(target, 0, row)
    setList(next)
    setSaved(false)
  }

  function add(slot: Slot) {
    const item: Habit = {
      id: newHabitId(),
      title: '新事项',
      layer: 'body',
      slot,
      kind: 'check',
    }
    setList([...list, item])
    setSaved(false)
  }

  function save() {
    const cleanedWork = cleanList(work)
    const cleanedRest = cleanList(rest)
    if (cleanedWork.length === 0 || cleanedRest.length === 0) return
    saveTemplates(cleanedWork, cleanedRest)
    setWork(cloneHabits(cleanedWork))
    setRest(cloneHabits(cleanedRest))
    setSaved(true)
  }

  function restore() {
    const defaults = defaultPair()
    setWork(defaults.work)
    setRest(defaults.rest)
    setSaved(false)
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
                    maxLength={24}
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
                    <label className="tpl-water">
                      <input
                        type="checkbox"
                        checked={item.kind === 'water'}
                        onChange={(e) => patch(item.id, { kind: e.target.checked ? 'water' : 'check' })}
                      />
                      记杯数
                    </label>
                  </div>
                  <input
                    className="tpl-hint"
                    value={(item.steps ?? []).map((step) => step.label).join('、')}
                    onChange={(e) => patch(item.id, { steps: parseSteps(item.id, e.target.value) })}
                    placeholder="细节步骤，用顿号分开"
                    maxLength={40}
                  />
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
      <p className="card-note">恢复默认后也要按保存，才会从今天起生效。</p>
    </div>
  )
}

function parseSteps(habitId: string, raw: string): Habit['steps'] {
  const labels = raw
    .split(/[、,，]/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (labels.length === 0) return undefined
  return labels.map((label, i) => ({ id: `${habitId}-s${i}`, label }))
}

function cleanList(list: Habit[]): Habit[] {
  return sortHabits(
    list
      .map((item) => ({
        ...item,
        title: item.title.trim(),
        hint: item.hint?.trim() || undefined,
        steps: item.steps && item.steps.length > 0 ? item.steps : undefined,
      }))
      .filter((item) => item.title.length > 0),
  )
}
