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

// ─── Activity ────────────────────────────────────────────────────────────────

export type ApiItem = {
  id: number
  activity_id: number
  title: string
  status: 'active' | 'pending' | 'done' | 'dropped'
  progress: number
  progress_label: string | null
  notes: string | null
  rating: number | null
}

export type ApiActivityLog = {
  id: number
  activity_id: number
  item_id: number | null
  date: string
  status: string
}

export type ApiActivity = {
  id: number
  title: string
  color: string
  target_per_week: number
  duration_minutes: number
  is_active: boolean
  logs: ApiActivityLog[]
  items: ApiItem[]
}

export type ApiActivityCreate = {
  title: string
  color: string
  target_per_week: number
  duration_minutes: number
}

export type ApiItemCreate = {
  activity_id: number
  title: string
  status?: string
}

export type ApiItemUpdate = {
  title?: string
  status?: string
  progress?: number
  progress_label?: string
  notes?: string
  rating?: number
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export type ApiTask = {
  id: number
  title: string
  color: string
  priority: 'high' | 'medium' | 'low'
  duration_minutes: number
  status: 'pending' | 'done' | 'deferred'
  activity_id: number | null
}

export type ApiTaskCreate = {
  title: string
  color: string
  priority: string
  duration_minutes: number
  activity_id?: number | null
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export type ApiSettings = {
  id: number
  work_start: string
  work_end: string
  work_days: string
  sleep_start: string
  sleep_end: string
  onboarding_done: boolean
}

// ─── Generated Plan ───────────────────────────────────────────────────────────

export type ApiGeneratedItem = {
  id: number
  kind: 'activity' | 'task'
  title: string
  activity_title: string | null
  item_id: number | null
  color: string
  duration_minutes: number
  start_time: string | null
  end_time: string | null
}

export type ApiGeneratedPlan = {
  date: string
  free_minutes: number
  planned_minutes: number
  work_start: string
  work_end: string
  items: ApiGeneratedItem[]
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const api = {
  activities: {
    list:   () => request<ApiActivity[]>('/activities'),
    create: (body: ApiActivityCreate) => request<ApiActivity>('/activities', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: Partial<ApiActivityCreate & { is_active: boolean }>) =>
      request<ApiActivity>(`/activities/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    log: (id: number, date: string, status: string, item_id?: number | null) =>
      request<ApiActivityLog>(`/activities/${id}/log`, {
        method: 'POST',
        body: JSON.stringify({ date, status, item_id }),
      }),
  },
  items: {
    create: (activity_id: number, body: ApiItemCreate) =>
      request<ApiItem>(`/activities/${activity_id}/items`, { method: 'POST', body: JSON.stringify(body) }),
    update: (item_id: number, body: ApiItemUpdate) =>
      request<ApiItem>(`/activities/items/${item_id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (item_id: number) =>
      request<void>(`/activities/items/${item_id}`, { method: 'DELETE' }),
  },
  tasks: {
    list:   () => request<ApiTask[]>('/tasks'),
    create: (body: ApiTaskCreate) => request<ApiTask>('/tasks', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: { status?: string }) =>
      request<ApiTask>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  },
  settings: {
    get:    () => request<ApiSettings>('/settings'),
    update: (body: Partial<ApiSettings>) =>
      request<ApiSettings>('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  },
  generate: {
    plan: (date?: string) => request<ApiGeneratedPlan>(date ? `/generate?date=${date}` : '/generate'),
  },
}
