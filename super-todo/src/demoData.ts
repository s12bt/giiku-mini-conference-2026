import type { CompletionHistory, Priority, Todo } from './types'

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function uid(): string {
  return Math.random().toString(36).slice(2, 11)
}

export function generateDemoData(): { todos: Todo[]; history: CompletionHistory } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const iso = (d: Date) => d.toISOString()
  const ymd = (d: Date) => dateKey(d)

  const active: Todo[] = [
    {
      id: uid(),
      text: 'プログラミング演習のレポート',
      notes: '提出はオンライン。N=10 まで実装する。',
      done: false,
      pinned: true,
      priority: 'high',
      dueDate: ymd(shiftDays(today, 3)),
      tags: ['大学'],
      subtasks: [
        { id: uid(), text: 'コードを書く', done: true },
        { id: uid(), text: '考察を書く', done: false },
        { id: uid(), text: 'PDF にまとめて提出', done: false },
      ],
      focusSeconds: 25 * 60 * 2,
      createdAt: iso(shiftDays(today, -2)),
      completedAt: null,
    },
    {
      id: uid(),
      text: '線形代数の演習問題',
      notes: '',
      done: false,
      pinned: false,
      priority: 'medium',
      dueDate: ymd(today),
      tags: ['大学'],
      subtasks: [],
      focusSeconds: 0,
      createdAt: iso(shiftDays(today, -1)),
      completedAt: null,
    },
    {
      id: uid(),
      text: '英語のリーディング課題',
      notes: '提出忘れてた',
      done: false,
      pinned: false,
      priority: 'high',
      dueDate: ymd(shiftDays(today, -1)),
      tags: ['大学'],
      subtasks: [],
      focusSeconds: 0,
      createdAt: iso(shiftDays(today, -3)),
      completedAt: null,
    },
    {
      id: uid(),
      text: 'サークルの春合宿の企画書',
      notes: '',
      done: false,
      pinned: true,
      priority: 'medium',
      dueDate: ymd(shiftDays(today, 5)),
      tags: ['サークル'],
      subtasks: [
        { id: uid(), text: '行き先候補を 3 つ出す', done: true },
        { id: uid(), text: '予算を試算する', done: false },
        { id: uid(), text: '部員にアンケートを取る', done: false },
      ],
      focusSeconds: 25 * 60,
      createdAt: iso(shiftDays(today, -2)),
      completedAt: null,
    },
    {
      id: uid(),
      text: 'ミーティング議事録の整理',
      notes: '',
      done: false,
      pinned: false,
      priority: 'low',
      dueDate: null,
      tags: ['サークル'],
      subtasks: [],
      focusSeconds: 0,
      createdAt: iso(shiftDays(today, -3)),
      completedAt: null,
    },
    {
      id: uid(),
      text: '基本情報の過去問 1 セット',
      notes: 'まずは平成 31 年度から',
      done: false,
      pinned: false,
      priority: 'medium',
      dueDate: null,
      tags: ['資格'],
      subtasks: [],
      focusSeconds: 25 * 60 * 3,
      createdAt: iso(shiftDays(today, -4)),
      completedAt: null,
    },
    {
      id: uid(),
      text: '基本情報試験の申し込み',
      notes: '',
      done: false,
      pinned: false,
      priority: 'high',
      dueDate: ymd(shiftDays(today, 7)),
      tags: ['資格'],
      subtasks: [],
      focusSeconds: 0,
      createdAt: iso(shiftDays(today, -1)),
      completedAt: null,
    },
    {
      id: uid(),
      text: '部屋の片付け',
      notes: '',
      done: false,
      pinned: false,
      priority: 'low',
      dueDate: null,
      tags: ['生活'],
      subtasks: [],
      focusSeconds: 0,
      createdAt: iso(shiftDays(today, -7)),
      completedAt: null,
    },
    {
      id: uid(),
      text: 'バイトのシフト確認',
      notes: '',
      done: false,
      pinned: false,
      priority: 'medium',
      dueDate: ymd(shiftDays(today, 2)),
      tags: ['生活'],
      subtasks: [],
      focusSeconds: 0,
      createdAt: iso(shiftDays(today, -1)),
      completedAt: null,
    },
    {
      id: uid(),
      text: 'サークル合宿の出欠確認',
      notes: '',
      done: false,
      pinned: false,
      priority: 'medium',
      dueDate: ymd(shiftDays(today, 14)),
      tags: ['サークル'],
      subtasks: [],
      focusSeconds: 0,
      createdAt: iso(shiftDays(today, -1)),
      completedAt: null,
    },
    {
      id: uid(),
      text: '中間試験の勉強',
      notes: '',
      done: false,
      pinned: false,
      priority: 'high',
      dueDate: ymd(shiftDays(today, 21)),
      tags: ['大学'],
      subtasks: [
        { id: uid(), text: '数学', done: false },
        { id: uid(), text: '英語', done: false },
        { id: uid(), text: 'プログラミング', done: false },
      ],
      focusSeconds: 0,
      createdAt: iso(shiftDays(today, -3)),
      completedAt: null,
    },
    {
      id: uid(),
      text: '健康診断の予約',
      notes: '',
      done: false,
      pinned: false,
      priority: 'low',
      dueDate: ymd(shiftDays(today, -10)),
      tags: ['生活'],
      subtasks: [],
      focusSeconds: 0,
      createdAt: iso(shiftDays(today, -12)),
      completedAt: null,
    },
    {
      id: uid(),
      text: '英語の宿題',
      notes: '',
      done: false,
      pinned: false,
      priority: 'medium',
      dueDate: ymd(shiftDays(today, -5)),
      tags: ['大学'],
      subtasks: [],
      focusSeconds: 0,
      createdAt: iso(shiftDays(today, -7)),
      completedAt: null,
    },
    {
      id: uid(),
      text: '数学の演習 1',
      notes: '',
      done: false,
      pinned: false,
      priority: 'medium',
      dueDate: ymd(shiftDays(today, -3)),
      tags: ['大学'],
      subtasks: [],
      focusSeconds: 0,
      createdAt: iso(shiftDays(today, -5)),
      completedAt: null,
    },
  ]

  const completedItems: Array<{
    days: number
    text: string
    tags: string[]
    priority: Priority
  }> = [
    { days: -1, text: '図書館で本を借りる', tags: ['生活'], priority: 'low' },
    { days: -3, text: 'サークルのチラシ印刷', tags: ['サークル'], priority: 'low' },
    { days: -8, text: '過去問 1 セット(平成 30 年度)', tags: ['資格'], priority: 'medium' },
    { days: -10, text: '教科書を購入', tags: ['大学'], priority: 'low' },
    { days: -14, text: 'バイトの面接', tags: ['生活'], priority: 'high' },
    { days: -16, text: '履修登録', tags: ['大学'], priority: 'high' },
    { days: -19, text: 'サークルの会費を振り込み', tags: ['サークル'], priority: 'medium' },
    { days: -22, text: '住民票の異動届', tags: ['生活'], priority: 'medium' },
    { days: -24, text: '履修科目の追加申請', tags: ['大学'], priority: 'high' },
    { days: -28, text: 'サークルの新歓イベント参加', tags: ['サークル'], priority: 'medium' },
  ]

  const completed: Todo[] = completedItems.map((item) => {
    const completedAt = shiftDays(today, item.days)
    return {
      id: uid(),
      text: item.text,
      notes: '',
      done: true,
      pinned: false,
      priority: item.priority,
      dueDate: ymd(completedAt),
      tags: item.tags,
      subtasks: [],
      focusSeconds: 0,
      createdAt: iso(shiftDays(today, item.days - 1)),
      completedAt: iso(completedAt),
    }
  })

  const history: CompletionHistory = {}
  for (const item of completedItems) {
    const k = dateKey(shiftDays(today, item.days))
    history[k] = (history[k] ?? 0) + 1
  }

  return {
    todos: [...active, ...completed],
    history,
  }
}
