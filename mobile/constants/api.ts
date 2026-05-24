const BASE = 'http://178.105.214.12/api/v1'

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ─── Habit types ────────────────────────────────────────────────────────────

export type ApiHabitLog = {
  id: number
  habit_id: number
  date: string // 'YYYY-MM-DD'
  status: 'done' | 'pending' | 'skipped'
}

export type ApiHabit = {
  id: number
  title: string
  color: string
  target_per_week: number
  duration_minutes: number
  category: string
  is_active: boolean
  logs: ApiHabitLog[]
}

export type ApiHabitCreate = {
  title: string
  color: string
  target_per_week: number
  duration_minutes: number
  category: string
}

// ─── Leisure types ───────────────────────────────────────────────────────────

export type ApiLeisure = {
  id: number
  title: string
  type: 'game' | 'anime' | 'book' | 'series'
  color: string
  status: 'playing' | 'pending' | 'done' | 'dropped'
  progress: number
  progress_label: string | null
  total_hours: number | null
  rating: number | null
  subtitle: string | null
}

export type ApiLeisureCreate = {
  title: string
  type: string
  color: string
  status: string
  progress: number
  subtitle?: string
}

// ─── Task types ──────────────────────────────────────────────────────────────

export type ApiTask = {
  id: number
  title: string
  color: string
  priority: 'high' | 'medium' | 'low'
  duration_minutes: number
  status: 'pending' | 'done' | 'deferred'
}

export type ApiTaskCreate = {
  title: string
  color: string
  priority: string
  duration_minutes: number
}

// ─── Settings types ──────────────────────────────────────────────────────────

export type ApiSettings = {
  id: number
  work_start: string
  work_end: string
  work_days: string
  sleep_start: string
  sleep_end: string
  onboarding_done: boolean
}

// ─── Plan types ───────────────────────────────────────────────────────────────

export type ApiGeneratedItem = {
  id: number
  kind: 'habit' | 'task' | 'leisure'
  title: string
  color: string
  duration_minutes: number
  start_time: string | null
  end_time: string | null
  during_work: boolean
}

export type ApiGeneratedPlan = {
  date: string
  free_minutes: number
  planned_minutes: number
  work_start: string
  work_end: string
  items: ApiGeneratedItem[]
}

// ─── API functions ───────────────────────────────────────────────────────────

export const api = {
  habits: {
    list: () => request<ApiHabit[]>('/habits'),
    create: (body: ApiHabitCreate) => request<ApiHabit>('/habits', { method: 'POST', body: JSON.stringify(body) }),
    log: (id: number, date: string, status: 'done' | 'pending' | 'skipped') =>
      request<ApiHabitLog>(`/habits/${id}/log`, {
        method: 'POST',
        body: JSON.stringify({ date, status }),
      }),
  },
  leisure: {
    list: () => request<ApiLeisure[]>('/leisure'),
    create: (body: ApiLeisureCreate) => request<ApiLeisure>('/leisure', { method: 'POST', body: JSON.stringify(body) }),
  },
  tasks: {
    list: () => request<ApiTask[]>('/tasks'),
    create: (body: ApiTaskCreate) => request<ApiTask>('/tasks', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: { status?: string; title?: string }) => request<ApiTask>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  },
  settings: {
    get: () => request<ApiSettings>('/settings'),
    update: (body: Partial<ApiSettings>) => request<ApiSettings>('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  },
  generate: {
    plan: () => request<ApiGeneratedPlan>('/generate'),
  },
}
