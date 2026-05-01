export type Priority = 'low' | 'medium' | 'high'

export type Subtask = {
  id: string
  text: string
  done: boolean
}

export type Todo = {
  id: string
  text: string
  notes: string
  done: boolean
  pinned: boolean
  priority: Priority
  dueDate: string | null
  tags: string[]
  subtasks: Subtask[]
  focusSeconds: number
  createdAt: string
  completedAt: string | null
}

export type Filter = 'all' | 'active' | 'completed' | 'overdue'
export type SortKey = 'created' | 'due' | 'priority' | 'alpha'
export type Theme = 'light' | 'dark' | 'system'
export type ViewMode = 'list' | 'calendar' | 'stats'

export type PomodoroMode = 'work' | 'break'

export type PomodoroState = {
  taskId: string | null
  mode: PomodoroMode
  endsAt: number
  running: boolean
  remaining: number
}

export type CompletionHistory = Record<string, number>
