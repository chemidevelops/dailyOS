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

// ─── Activities ───────────────────────────────────────────────────────────────

export type ApiActivityLog = {
  id: number
  activity_id: number
  item_id: number | null
  date: string
  status: string
}

export type ApiItem = {
  id: number
  activity_id: number
  title: string
  status: string
  sort_order: number
  created_at: string
}

export type ApiActivity = {
  id: number
  title: string
  color: string
  duration_minutes: number
  target_per_week: number
  is_active: boolean
  logs: ApiActivityLog[]
  items: ApiItem[]
}

// ─── Generated plan ───────────────────────────────────────────────────────────

export type ApiGeneratedItem = {
  id: number
  kind: string
  title: string
  activity_title: string | null
  item_id: number | null
  color: string
  duration_minutes: number
  start_time: string | null
  end_time: string | null
  next_item_title: string | null
}

export type ApiGeneratedPlan = {
  date: string
  free_minutes: number
  planned_minutes: number
  work_start: string
  work_end: string
  items: ApiGeneratedItem[]
  is_vacation: boolean
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type ApiTask = {
  id: number
  title: string
  status: string
  priority: string
  duration_minutes: number
  color: string
  created_at: string
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export type ApiSettings = {
  id: number
  work_start: string
  work_end: string
  work_days: string
  sleep_start: string
  onboarding_done: boolean
  plan_order: string | null
  vacation_dates: string | null
  max_fill_pct: number
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const api = {
  activities: {
    list:   () => request<ApiActivity[]>('/activities'),
    update: (id: number, body: Partial<ApiActivity>) =>
      request<ApiActivity>(`/activities/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/activities/${id}`, { method: 'DELETE' }),
    log: (id: number, date: string, status: string, itemId?: number) =>
      request<ApiActivityLog>(`/activities/${id}/log`, {
        method: 'POST',
        body: JSON.stringify({ date, status, item_id: itemId ?? null }),
      }),
  },
  items: {
    create: (activityId: number, title: string) =>
      request<ApiItem>(`/activities/${activityId}/items`, {
        method: 'POST',
        body: JSON.stringify({ activity_id: activityId, title }),
      }),
    update: (itemId: number, body: Partial<ApiItem>) =>
      request<ApiItem>(`/activities/items/${itemId}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (itemId: number) => request<void>(`/activities/items/${itemId}`, { method: 'DELETE' }),
    reorder: (activityId: number, order: number[]) =>
      request<void>(`/activities/${activityId}/items/reorder`, { method: 'PUT', body: JSON.stringify({ order }) }),
  },
  tasks: {
    list:   () => request<ApiTask[]>('/tasks'),
    create: (body: Partial<ApiTask>) =>
      request<ApiTask>('/tasks', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: Partial<ApiTask>) =>
      request<ApiTask>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
  },
  settings: {
    get:    () => request<ApiSettings>('/settings'),
    update: (body: Partial<ApiSettings>) =>
      request<ApiSettings>('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  },
  generate: {
    plan: (date?: string, energy?: string, fillPct?: number) => {
      const now = new Date()
      const localTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const params = new URLSearchParams({ now: localTime })
      if (date)    params.set('date', date)
      if (energy)  params.set('energy', energy)
      if (fillPct) params.set('fill_pct', String(fillPct))
      return request<ApiGeneratedPlan>(`/generate?${params}`)
    },
  },
}
