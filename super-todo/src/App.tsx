import { useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import type {
  CompletionHistory,
  Filter,
  PomodoroMode,
  PomodoroState,
  Priority,
  SortKey,
  Subtask,
  Theme,
  Todo,
  ViewMode,
} from './types'
import './App.css'

const STORAGE_KEY = 'todo-app:v3'
const THEME_KEY = 'todo-app:theme'

const WORK_MIN = 25
const BREAK_MIN = 5

type PersistState = {
  todos: Todo[]
  history: CompletionHistory
}

function loadState(): PersistState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { todos: [], history: {} }
    const parsed = JSON.parse(raw) as Partial<PersistState>
    const todos = (parsed.todos ?? []).map((t) => ({
      ...t,
      pinned: t.pinned ?? false,
      focusSeconds: t.focusSeconds ?? 0,
    })) as Todo[]
    return { todos, history: parsed.history ?? {} }
  } catch {
    // Attempt migration from v2
    try {
      const raw2 = localStorage.getItem('todo-app:v2')
      if (raw2) {
        const parsed = JSON.parse(raw2)
        const todos = (parsed.todos ?? []).map((t: Todo) => ({
          ...t,
          pinned: t.pinned ?? false,
          focusSeconds: t.focusSeconds ?? 0,
        }))
        return { todos, history: {} }
      }
    } catch {}
    return { todos: [], history: {} }
  }
}

function loadTheme(): Theme {
  const v = localStorage.getItem(THEME_KEY) as Theme | null
  return v ?? 'system'
}

const priorityRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

function isOverdue(t: Todo): boolean {
  if (!t.dueDate || t.done) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(t.dueDate) < today
}

function formatDate(d: string | null): string {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fireConfetti() {
  const colors = ['#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#60a5fa']
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.7 },
    colors,
    scalar: 0.9,
    ticks: 180,
  })
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.75 },
      colors,
    })
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.75 },
      colors,
    })
  }, 150)
}

function computeStreak(history: CompletionHistory): number {
  let streak = 0
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  // if today has no completion yet, start counting from yesterday
  if (!history[dateKey(d)]) d.setDate(d.getDate() - 1)
  while (history[dateKey(d)]) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function App() {
  const initial = loadState()
  const [todos, setTodos] = useState<Todo[]>(initial.todos)
  const [history, setHistory] = useState<CompletionHistory>(initial.history)

  const [input, setInput] = useState('')
  const [inputPriority, setInputPriority] = useState<Priority>('medium')
  const [inputDue, setInputDue] = useState('')
  const [inputTags, setInputTags] = useState('')

  const [filter, setFilter] = useState<Filter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('created')
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [view, setView] = useState<ViewMode>('list')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<Todo[][]>([])
  const [dockExpanded, setDockExpanded] = useState(false)

  const [pomo, setPomo] = useState<PomodoroState>({
    taskId: null,
    mode: 'work',
    endsAt: 0,
    running: false,
    remaining: WORK_MIN * 60,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ todos, history }))
  }, [todos, history])

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  // Pomodoro tick
  useEffect(() => {
    if (!pomo.running) return
    const id = setInterval(() => {
      setPomo((p) => {
        if (!p.running) return p
        const rem = Math.max(0, Math.round((p.endsAt - Date.now()) / 1000))
        if (rem === 0) {
          // session finished
          if (p.mode === 'work' && p.taskId) {
            setTodos((ts) =>
              ts.map((t) =>
                t.id === p.taskId
                  ? { ...t, focusSeconds: t.focusSeconds + WORK_MIN * 60 }
                  : t,
              ),
            )
          }
          const nextMode: PomodoroMode = p.mode === 'work' ? 'break' : 'work'
          const nextDur = (nextMode === 'work' ? WORK_MIN : BREAK_MIN) * 60
          try {
            new Audio(
              'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==',
            ).play().catch(() => {})
          } catch {}
          return {
            ...p,
            mode: nextMode,
            remaining: nextDur,
            endsAt: Date.now() + nextDur * 1000,
            running: false,
          }
        }
        return { ...p, remaining: rem }
      })
    }, 500)
    return () => clearInterval(id)
  }, [pomo.running])

  const pushUndo = (snapshot: Todo[]) => setUndoStack((s) => [...s.slice(-19), snapshot])

  const mutate = (next: Todo[]) => {
    pushUndo(todos)
    setTodos(next)
  }

  const undo = () => {
    setUndoStack((s) => {
      if (s.length === 0) return s
      const last = s[s.length - 1]
      setTodos(last)
      return s.slice(0, -1)
    })
  }

  const addTodo = () => {
    const text = input.trim()
    if (!text) return
    const tags = inputTags.split(',').map((t) => t.trim()).filter(Boolean)
    const todo: Todo = {
      id: crypto.randomUUID(),
      text,
      notes: '',
      done: false,
      pinned: false,
      priority: inputPriority,
      dueDate: inputDue || null,
      tags,
      subtasks: [],
      focusSeconds: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
    }
    mutate([todo, ...todos])
    setInput('')
    setInputDue('')
    setInputTags('')
    setInputPriority('medium')
  }

  const updateTodo = (id: string, patch: Partial<Todo>) => {
    mutate(todos.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const toggle = (id: string) => {
    const target = todos.find((t) => t.id === id)
    if (!target) return
    const willBeDone = !target.done
    if (willBeDone) {
      fireConfetti()
      const key = todayKey()
      setHistory((h) => ({ ...h, [key]: (h[key] ?? 0) + 1 }))
    }
    mutate(
      todos.map((t) =>
        t.id === id
          ? {
              ...t,
              done: willBeDone,
              completedAt: willBeDone ? new Date().toISOString() : null,
            }
          : t,
      ),
    )
  }

  const togglePin = (id: string) => {
    mutate(todos.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)))
  }

  const remove = (id: string) => {
    if (pomo.taskId === id) stopPomo()
    mutate(todos.filter((t) => t.id !== id))
  }

  const toggleAll = () => {
    const allDone = todos.length > 0 && todos.every((t) => t.done)
    mutate(
      todos.map((t) => ({
        ...t,
        done: !allDone,
        completedAt: !allDone ? new Date().toISOString() : null,
      })),
    )
  }

  const clearCompleted = () => mutate(todos.filter((t) => !t.done))
  const clearAll = () => {
    if (todos.length === 0) return
    if (!confirm('本当に全て削除しますか？')) return
    mutate([])
  }

  const addSubtask = (todoId: string, text: string) => {
    const sub: Subtask = { id: crypto.randomUUID(), text, done: false }
    updateTodo(todoId, {
      subtasks: [...(todos.find((t) => t.id === todoId)?.subtasks ?? []), sub],
    })
  }

  const toggleSubtask = (todoId: string, subId: string) => {
    const todo = todos.find((t) => t.id === todoId)
    if (!todo) return
    updateTodo(todoId, {
      subtasks: todo.subtasks.map((s) =>
        s.id === subId ? { ...s, done: !s.done } : s,
      ),
    })
  }

  const removeSubtask = (todoId: string, subId: string) => {
    const todo = todos.find((t) => t.id === todoId)
    if (!todo) return
    updateTodo(todoId, { subtasks: todo.subtasks.filter((s) => s.id !== subId) })
  }

  // Pomodoro controls
  const startPomo = (taskId: string) => {
    const duration = WORK_MIN * 60
    setPomo({
      taskId,
      mode: 'work',
      endsAt: Date.now() + duration * 1000,
      running: true,
      remaining: duration,
    })
  }

  const pausePomo = () => setPomo((p) => ({ ...p, running: false }))
  const resumePomo = () =>
    setPomo((p) => ({
      ...p,
      running: true,
      endsAt: Date.now() + p.remaining * 1000,
    }))

  const stopPomo = () =>
    setPomo({
      taskId: null,
      mode: 'work',
      endsAt: 0,
      running: false,
      remaining: WORK_MIN * 60,
    })

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ todos, history }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `todos-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Partial<PersistState>
      if (!Array.isArray(parsed.todos)) throw new Error('invalid')
      mutate(parsed.todos)
      if (parsed.history) setHistory(parsed.history)
    } catch {
      alert('インポートに失敗しました')
    }
  }

  const allTags = useMemo(() => {
    const s = new Set<string>()
    todos.forEach((t) => t.tags.forEach((tag) => s.add(tag)))
    return [...s].sort()
  }, [todos])

  const visibleTodos = useMemo(() => {
    let list = todos
    if (filter === 'active') list = list.filter((t) => !t.done)
    else if (filter === 'completed') list = list.filter((t) => t.done)
    else if (filter === 'overdue') list = list.filter(isOverdue)

    if (tagFilter) list = list.filter((t) => t.tags.includes(tagFilter))
    if (selectedDate) list = list.filter((t) => t.dueDate === selectedDate)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          t.text.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
    }

    const sorted = [...list].sort((a, b) => {
      // Pinned first, always
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      switch (sortKey) {
        case 'due': {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return a.dueDate.localeCompare(b.dueDate)
        }
        case 'priority':
          return priorityRank[a.priority] - priorityRank[b.priority]
        case 'alpha':
          return a.text.localeCompare(b.text)
        case 'created':
        default:
          return b.createdAt.localeCompare(a.createdAt)
      }
    })
    return sorted
  }, [todos, filter, sortKey, search, tagFilter, selectedDate])

  const stats = useMemo(() => {
    const total = todos.length
    const done = todos.filter((t) => t.done).length
    const overdue = todos.filter(isOverdue).length
    const progress = total === 0 ? 0 : Math.round((done / total) * 100)
    return { total, done, overdue, progress }
  }, [todos])

  const streak = useMemo(() => computeStreak(history), [history])

  const heatmap = useMemo(() => {
    const days: { key: string; count: number }[] = []
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    for (let i = 34; i >= 0; i--) {
      const day = new Date(d)
      day.setDate(d.getDate() - i)
      const k = dateKey(day)
      days.push({ key: k, count: history[k] ?? 0 })
    }
    return days
  }, [history])

  const activePomoTask = todos.find((t) => t.id === pomo.taskId) ?? null

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <div className="brand-mark" aria-hidden>✦</div>
          <div>
            <h1>Todo</h1>
            <p className="brand-sub">{stats.total} tasks</p>
          </div>
        </div>

        <section className="rail-card stats">
          <div className="progress">
            <div className="progress-bar" style={{ width: `${stats.progress}%` }} />
          </div>
          <div className="stats-text">
            <span>{stats.done}/{stats.total} · {stats.progress}%</span>
            {stats.overdue > 0 && (
              <span className="overdue-count">⚠ {stats.overdue}</span>
            )}
          </div>
        </section>

        <section className="rail-card streak">
          <div className="streak-head">
            <div className="streak-num">
              <span className="flame">🔥</span>
              <strong>{streak}</strong>
              <span className="streak-label">day streak</span>
            </div>
          </div>
          <div className="heatmap" aria-label="最近35日の達成">
            {heatmap.map((d) => (
              <div
                key={d.key}
                className="heat-cell"
                data-level={Math.min(4, d.count)}
                title={`${d.key}: ${d.count}件`}
              />
            ))}
          </div>
        </section>

        <nav className="rail-section">
          <div className="rail-label">View</div>
          <div className="view-toggle">
            <button
              className={view === 'list' ? 'active' : ''}
              onClick={() => setView('list')}
            >
              ☰ リスト
            </button>
            <button
              className={view === 'calendar' ? 'active' : ''}
              onClick={() => setView('calendar')}
            >
              📅 カレンダー
            </button>
            <button
              className={view === 'stats' ? 'active' : ''}
              onClick={() => setView('stats')}
            >
              📊 統計
            </button>
          </div>
        </nav>

        <nav className="rail-section">
          <div className="rail-label">Filter</div>
          <div className="vfilter">
            {(['all', 'active', 'completed', 'overdue'] as Filter[]).map((f) => (
              <button
                key={f}
                className={filter === f ? 'active' : ''}
                onClick={() => setFilter(f)}
              >
                <span className="vdot" data-kind={f} />
                {f === 'all' && '全て'}
                {f === 'active' && '未完了'}
                {f === 'completed' && '完了'}
                {f === 'overdue' && '期限切れ'}
              </button>
            ))}
          </div>
        </nav>

        {allTags.length > 0 && (
          <nav className="rail-section">
            <div className="rail-label">カテゴリー</div>
            <div className="tag-filter">
              <button
                className={tagFilter === null ? 'active' : ''}
                onClick={() => setTagFilter(null)}
              >
                #すべて
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className={tagFilter === tag ? 'active' : ''}
                  onClick={() => setTagFilter(tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </nav>
        )}

        <div className="rail-spacer" />

        <div className="rail-io">
          <button onClick={undo} disabled={undoStack.length === 0} title="元に戻す">↶</button>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
            title="テーマ"
          >
            <option value="system">🖥</option>
            <option value="light">☀</option>
            <option value="dark">🌙</option>
          </select>
          <button onClick={exportJson} title="エクスポート">⬇</button>
          <button onClick={() => fileInputRef.current?.click()} title="インポート">⬆</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importJson(f)
              e.target.value = ''
            }}
          />
        </div>
      </aside>

      <main className="main">
        {view === 'list' && (
          <>
            <div className="main-head">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 検索..."
                className="search"
              />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="created">新しい順</option>
                <option value="due">期限順</option>
                <option value="priority">優先度順</option>
                <option value="alpha">名前順</option>
              </select>
            </div>

            {selectedDate && (
              <div className="filter-chip">
                📅 {selectedDate} で絞り込み中
                <button onClick={() => setSelectedDate(null)}>✕</button>
              </div>
            )}

            <ul className="list">
              {visibleTodos.length === 0 && (
                <li className="empty">該当するタスクはありません</li>
              )}
              {visibleTodos.map((t) => (
                <TodoItem
                  key={t.id}
                  todo={t}
                  expanded={expandedId === t.id}
                  isPomoActive={pomo.taskId === t.id}
                  onExpand={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  onToggle={() => toggle(t.id)}
                  onRemove={() => remove(t.id)}
                  onPin={() => togglePin(t.id)}
                  onStartPomo={() => startPomo(t.id)}
                  onUpdate={(patch) => updateTodo(t.id, patch)}
                  onAddSubtask={(text) => addSubtask(t.id, text)}
                  onToggleSubtask={(sid) => toggleSubtask(t.id, sid)}
                  onRemoveSubtask={(sid) => removeSubtask(t.id, sid)}
                />
              ))}
            </ul>

            {todos.length > 0 && (
              <footer className="bulk">
                <button onClick={toggleAll}>全て切替</button>
                <button onClick={clearCompleted}>完了済み削除</button>
                <button onClick={clearAll} className="danger">全削除</button>
              </footer>
            )}
          </>
        )}

        {view === 'calendar' && (
          <CalendarView
            month={calendarMonth}
            setMonth={setCalendarMonth}
            todos={todos}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d)
              setView('list')
            }}
          />
        )}

        {view === 'stats' && (
          <StatsView todos={todos} history={history} streak={streak} />
        )}
      </main>

      {activePomoTask && (
        <aside className={`pomo-float ${pomo.mode}`} role="complementary">
          <div className="pomo-head">
            <span className="pomo-mode">
              {pomo.mode === 'work' ? '🎯 集中' : '☕ 休憩'}
            </span>
            <button className="pomo-x" onClick={stopPomo} title="停止">✕</button>
          </div>
          <PomoRing
            remaining={pomo.remaining}
            total={(pomo.mode === 'work' ? WORK_MIN : BREAK_MIN) * 60}
          />
          <div className="pomo-task" title={activePomoTask.text}>
            {activePomoTask.text}
          </div>
          <div className="pomo-actions">
            {pomo.running ? (
              <button onClick={pausePomo}>⏸ 一時停止</button>
            ) : (
              <button onClick={resumePomo}>▶ 再開</button>
            )}
          </div>
        </aside>
      )}

      <form
        className={`dock ${dockExpanded ? 'expanded' : ''}`}
        onSubmit={(e) => {
          e.preventDefault()
          addTodo()
          setDockExpanded(false)
        }}
      >
        <div className="dock-bar">
          <span className="dock-icon" aria-hidden>＋</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setDockExpanded(true)}
            onBlur={(e) => {
              const next = e.relatedTarget as HTMLElement | null
              if (!next || !e.currentTarget.closest('.dock')?.contains(next)) {
                if (!input.trim()) setDockExpanded(false)
              }
            }}
            placeholder="やることを追加..."
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                addTodo()
                setDockExpanded(false)
              }
              if (e.key === 'Escape') {
                ;(e.currentTarget as HTMLInputElement).blur()
                setDockExpanded(false)
              }
            }}
          />
          <button type="submit" className="dock-submit" disabled={!input.trim()}>
            追加
          </button>
        </div>
        {dockExpanded && (
          <div className="dock-meta">
            <select
              value={inputPriority}
              onChange={(e) => setInputPriority(e.target.value as Priority)}
            >
              <option value="high">🔴 高</option>
              <option value="medium">🟡 中</option>
              <option value="low">🟢 低</option>
            </select>
            <input
              type="date"
              value={inputDue}
              onChange={(e) => setInputDue(e.target.value)}
            />
            <input
              type="text"
              value={inputTags}
              onChange={(e) => setInputTags(e.target.value)}
              placeholder="カテゴリー (カンマ区切り)"
            />
          </div>
        )}
      </form>
    </div>
  )
}

/* ============ Pomodoro ring ============ */
function PomoRing({ remaining, total }: { remaining: number; total: number }) {
  const size = 120
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const progress = 1 - remaining / total
  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')
  return (
    <div className="pomo-ring">
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#pomo-grad)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s linear' }}
        />
        <defs>
          <linearGradient id="pomo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="pomo-time">
        {mm}:{ss}
      </div>
    </div>
  )
}

/* ============ Calendar ============ */
type CalendarProps = {
  month: Date
  setMonth: (d: Date) => void
  todos: Todo[]
  selectedDate: string | null
  onSelectDate: (d: string) => void
}

function CalendarView({ month, setMonth, todos, selectedDate, onSelectDate }: CalendarProps) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const startWeekday = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let i = 1; i <= daysInMonth; i++)
    cells.push(new Date(month.getFullYear(), month.getMonth(), i))
  while (cells.length % 7 !== 0) cells.push(null)

  const todoByDate = useMemo(() => {
    const m = new Map<string, Todo[]>()
    todos.forEach((t) => {
      if (!t.dueDate) return
      if (!m.has(t.dueDate)) m.set(t.dueDate, [])
      m.get(t.dueDate)!.push(t)
    })
    return m
  }, [todos])

  const todayK = todayKey()

  return (
    <div className="cal">
      <div className="cal-head">
        <button
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          ←
        </button>
        <h2>
          {month.getFullYear()}年 {month.getMonth() + 1}月
        </h2>
        <button
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          →
        </button>
        <button
          className="cal-today"
          onClick={() => {
            const d = new Date()
            setMonth(new Date(d.getFullYear(), d.getMonth(), 1))
          }}
        >
          今日
        </button>
      </div>
      <div className="cal-grid cal-weekdays">
        {['日', '月', '火', '水', '木', '金', '土'].map((w) => (
          <div key={w} className="cal-wd">{w}</div>
        ))}
      </div>
      <div className="cal-grid cal-body">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="cal-cell empty" />
          const k = dateKey(d)
          const items = todoByDate.get(k) ?? []
          const done = items.filter((t) => t.done).length
          return (
            <button
              key={i}
              className={`cal-cell ${k === todayK ? 'today' : ''} ${selectedDate === k ? 'selected' : ''}`}
              onClick={() => onSelectDate(k)}
            >
              <div className="cal-date">{d.getDate()}</div>
              {items.length > 0 && (
                <div className="cal-pills">
                  {items.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      className={`cal-pill priority-${t.priority} ${t.done ? 'done' : ''}`}
                      title={t.text}
                    >
                      {t.text}
                    </span>
                  ))}
                  {items.length > 3 && (
                    <span className="cal-more">+{items.length - 3}</span>
                  )}
                </div>
              )}
              {items.length > 0 && (
                <div className="cal-bar">
                  <div
                    className="cal-bar-done"
                    style={{
                      width: `${(done / items.length) * 100}%`,
                    }}
                  />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ============ Todo item ============ */
type TodoItemProps = {
  todo: Todo
  expanded: boolean
  isPomoActive: boolean
  onExpand: () => void
  onToggle: () => void
  onRemove: () => void
  onPin: () => void
  onStartPomo: () => void
  onUpdate: (patch: Partial<Todo>) => void
  onAddSubtask: (text: string) => void
  onToggleSubtask: (id: string) => void
  onRemoveSubtask: (id: string) => void
}

function TodoItem({
  todo,
  expanded,
  isPomoActive,
  onExpand,
  onToggle,
  onRemove,
  onPin,
  onStartPomo,
  onUpdate,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
}: TodoItemProps) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(todo.text)
  const [subInput, setSubInput] = useState('')

  const overdue = isOverdue(todo)
  const subDone = todo.subtasks.filter((s) => s.done).length

  const commitEdit = () => {
    const text = editText.trim()
    if (text && text !== todo.text) onUpdate({ text })
    else setEditText(todo.text)
    setEditing(false)
  }

  return (
    <li
      className={`item ${todo.done ? 'done' : ''} ${overdue ? 'overdue' : ''} priority-${todo.priority} ${todo.pinned ? 'pinned' : ''} ${isPomoActive ? 'pomo-active' : ''}`}
    >
      <div className="item-main">
        <input
          type="checkbox"
          checked={todo.done}
          onChange={onToggle}
          className="check"
        />
        <div className="item-body">
          {editing ? (
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') {
                  setEditText(todo.text)
                  setEditing(false)
                }
              }}
              autoFocus
              className="edit-input"
            />
          ) : (
            <span
              className="text"
              onDoubleClick={() => setEditing(true)}
              title="ダブルクリックで編集"
            >
              {todo.pinned && <span className="pin-mark" aria-hidden>★</span>}
              {todo.text}
            </span>
          )}
          <div className="meta">
            {todo.dueDate && (
              <span className={`due ${overdue ? 'overdue' : ''}`}>
                📅 {formatDate(todo.dueDate)}
              </span>
            )}
            {todo.tags.map((tag) => (
              <span key={tag} className="tag">#{tag}</span>
            ))}
            {todo.subtasks.length > 0 && (
              <span className="sub-count">
                ☑ {subDone}/{todo.subtasks.length}
              </span>
            )}
            {todo.focusSeconds > 0 && (
              <span className="focus-count">
                🎯 {Math.round(todo.focusSeconds / 60)}分
              </span>
            )}
          </div>
        </div>
        <div className="item-actions">
          <button
            onClick={onPin}
            className={`pin-btn ${todo.pinned ? 'active' : ''}`}
            title={todo.pinned ? 'ピン解除' : 'ピン留め'}
          >
            {todo.pinned ? '★' : '☆'}
          </button>
          <button
            onClick={onStartPomo}
            className="pomo-btn"
            title="ポモドーロ開始"
            disabled={todo.done}
            aria-label="ポモドーロ開始"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="2" rx="0.6" />
              <path d="M12 7a8 8 0 1 1-0.001 0z" />
              <path d="M12 12V8.5" />
              <path d="M12 12l3 2" />
              <path d="M18.5 5.5l1.5 1.5" />
            </svg>
          </button>
          <button onClick={onExpand} title="詳細">{expanded ? '▲' : '▼'}</button>
          <button onClick={onRemove} className="remove" title="削除">✕</button>
        </div>
      </div>

      {expanded && (
        <div className="item-detail">
          <label className="row">
            <span>優先度</span>
            <select
              value={todo.priority}
              onChange={(e) =>
                onUpdate({ priority: e.target.value as Priority })
              }
            >
              <option value="high">🔴 高</option>
              <option value="medium">🟡 中</option>
              <option value="low">🟢 低</option>
            </select>
          </label>
          <label className="row">
            <span>期限</span>
            <input
              type="date"
              value={todo.dueDate ?? ''}
              onChange={(e) => onUpdate({ dueDate: e.target.value || null })}
            />
          </label>
          <label className="row">
            <span>カテゴリー</span>
            <input
              type="text"
              value={todo.tags.join(', ')}
              onChange={(e) =>
                onUpdate({
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              placeholder="カテゴリー (カンマ区切り)"
            />
          </label>
          <label className="row col">
            <span>メモ</span>
            <textarea
              value={todo.notes}
              onChange={(e) => onUpdate({ notes: e.target.value })}
              placeholder="詳細メモ..."
              rows={3}
            />
          </label>

          <div className="subtasks">
            <div className="sub-header">サブタスク</div>
            <ul>
              {todo.subtasks.map((s) => (
                <li key={s.id} className={s.done ? 'done' : ''}>
                  <input
                    type="checkbox"
                    checked={s.done}
                    onChange={() => onToggleSubtask(s.id)}
                  />
                  <span>{s.text}</span>
                  <button onClick={() => onRemoveSubtask(s.id)}>✕</button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const v = subInput.trim()
                if (!v) return
                onAddSubtask(v)
                setSubInput('')
              }}
              className="sub-add"
            >
              <input
                type="text"
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                placeholder="サブタスクを追加"
              />
              <button type="submit">+</button>
            </form>
          </div>

          <div className="timestamps">
            作成: {new Date(todo.createdAt).toLocaleString()}
            {todo.completedAt && (
              <> ／ 完了: {new Date(todo.completedAt).toLocaleString()}</>
            )}
            {todo.focusSeconds > 0 && (
              <> ／ 集中: {Math.round(todo.focusSeconds / 60)}分</>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

/* ============ Stats ============ */
function computeLongestStreak(history: CompletionHistory): number {
  const keys = Object.keys(history).filter((k) => history[k] > 0).sort()
  if (keys.length === 0) return 0
  let longest = 1
  let cur = 1
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(keys[i - 1])
    const next = new Date(keys[i])
    const diff = Math.round((next.getTime() - prev.getTime()) / 86400000)
    if (diff === 1) {
      cur++
      longest = Math.max(longest, cur)
    } else {
      cur = 1
    }
  }
  return longest
}

type StatsProps = {
  todos: Todo[]
  history: CompletionHistory
  streak: number
}

function StatsView({ todos, history, streak }: StatsProps) {
  const totalDone = todos.filter((t) => t.done).length
  const totalActive = todos.filter((t) => !t.done).length
  const completionRate =
    todos.length === 0 ? 0 : Math.round((totalDone / todos.length) * 100)
  const focusMin = Math.round(
    todos.reduce((s, t) => s + t.focusSeconds, 0) / 60,
  )
  const longest = useMemo(() => computeLongestStreak(history), [history])

  // Last 30 days bar chart
  const last30 = useMemo(() => {
    const days: { key: string; count: number; label: string }[] = []
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    for (let i = 29; i >= 0; i--) {
      const day = new Date(d)
      day.setDate(d.getDate() - i)
      const k = dateKey(day)
      days.push({
        key: k,
        count: history[k] ?? 0,
        label: `${day.getMonth() + 1}/${day.getDate()}`,
      })
    }
    return days
  }, [history])
  const maxCount = Math.max(1, ...last30.map((d) => d.count))
  const total30 = last30.reduce((s, d) => s + d.count, 0)
  const avgPerDay = (total30 / 30).toFixed(1)

  // Tag breakdown (done only)
  const byTag = useMemo(() => {
    const m = new Map<string, number>()
    todos
      .filter((t) => t.done)
      .forEach((t) => t.tags.forEach((tag) => m.set(tag, (m.get(tag) ?? 0) + 1)))
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [todos])
  const maxTag = byTag.length > 0 ? byTag[0][1] : 1

  // Priority breakdown (all todos)
  const byPrio = useMemo(() => {
    const p: Record<Priority, number> = { high: 0, medium: 0, low: 0 }
    todos.forEach((t) => {
      p[t.priority]++
    })
    return p
  }, [todos])
  const prioTotal = byPrio.high + byPrio.medium + byPrio.low || 1

  return (
    <div className="stats-view">
      <div className="kpi-grid">
        <KpiCard label="完了" value={totalDone} sub={`残 ${totalActive}`} accent="accent" />
        <KpiCard label="達成率" value={`${completionRate}%`} sub={`${totalDone}/${todos.length}`} accent="success" />
        <KpiCard label="連続" value={streak} sub={`最長 ${longest}日`} accent="warn" icon="🔥" />
        <KpiCard label="集中" value={`${focusMin}分`} sub="ポモドーロ累計" accent="pink" icon="🎯" />
      </div>

      <section className="chart-card">
        <div className="chart-head">
          <h3>直近30日の達成</h3>
          <span className="chart-sub">
            合計 {total30} · 平均 {avgPerDay}/日
          </span>
        </div>
        <div className="bar-chart">
          {last30.map((d) => {
            const h = (d.count / maxCount) * 100
            return (
              <div key={d.key} className="bar-col" title={`${d.key}: ${d.count}件`}>
                <div
                  className="bar"
                  style={{
                    height: `${h}%`,
                    opacity: d.count === 0 ? 0.25 : 1,
                  }}
                />
              </div>
            )
          })}
        </div>
        <div className="bar-axis">
          <span>{last30[0].label}</span>
          <span>{last30[14].label}</span>
          <span>{last30[29].label}</span>
        </div>
      </section>

      <div className="two-col">
        <section className="chart-card">
          <div className="chart-head">
            <h3>優先度の内訳</h3>
            <span className="chart-sub">{prioTotal}件</span>
          </div>
          <div className="donut-wrap">
            <Donut byPrio={byPrio} total={prioTotal} />
            <div className="donut-legend">
              <LegendRow color="var(--high)" label="高" count={byPrio.high} total={prioTotal} />
              <LegendRow color="var(--med)" label="中" count={byPrio.medium} total={prioTotal} />
              <LegendRow color="var(--low)" label="低" count={byPrio.low} total={prioTotal} />
            </div>
          </div>
        </section>

        <section className="chart-card">
          <div className="chart-head">
            <h3>カテゴリー別の完了数</h3>
            <span className="chart-sub">Top {byTag.length}</span>
          </div>
          {byTag.length === 0 ? (
            <div className="chart-empty">カテゴリー付きの完了タスクがありません</div>
          ) : (
            <div className="hbar-list">
              {byTag.map(([tag, count]) => (
                <div key={tag} className="hbar-row">
                  <span className="hbar-label">#{tag}</span>
                  <div className="hbar-track">
                    <div
                      className="hbar-fill"
                      style={{ width: `${(count / maxTag) * 100}%` }}
                    />
                  </div>
                  <span className="hbar-val">{count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string
  value: string | number
  sub?: string
  accent: 'accent' | 'success' | 'warn' | 'pink'
  icon?: string
}) {
  return (
    <div className={`kpi kpi-${accent}`}>
      <div className="kpi-label">
        {icon && <span className="kpi-icon">{icon}</span>}
        {label}
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

function Donut({
  byPrio,
  total,
}: {
  byPrio: Record<Priority, number>
  total: number
}) {
  const size = 140
  const stroke = 18
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const segments: { color: string; value: number }[] = [
    { color: 'var(--high)', value: byPrio.high },
    { color: 'var(--med)', value: byPrio.medium },
    { color: 'var(--low)', value: byPrio.low },
  ]
  let offset = 0
  return (
    <div className="donut">
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
          fill="none"
        />
        {segments.map((s, i) => {
          const len = (s.value / total) * c
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={s.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dasharray 0.4s, stroke-dashoffset 0.4s' }}
            />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="donut-center">
        <div className="donut-total">{total}</div>
        <div className="donut-caption">タスク</div>
      </div>
    </div>
  )
}

function LegendRow({
  color,
  label,
  count,
  total,
}: {
  color: string
  label: string
  count: number
  total: number
}) {
  const pct = Math.round((count / total) * 100)
  return (
    <div className="legend-row">
      <span className="legend-dot" style={{ background: color }} />
      <span className="legend-label">{label}</span>
      <span className="legend-count">{count}</span>
      <span className="legend-pct">{pct}%</span>
    </div>
  )
}

export default App
