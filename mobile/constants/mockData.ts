export type HabitFrequency = 'daily' | 'weekly'
export type HabitStatus = 'done' | 'pending' | 'skipped'

export interface Habit {
  id: string
  title: string
  color: string
  targetPerWeek: number
  durationMinutes: number
  category: 'health' | 'learning' | 'mindfulness' | 'productivity'
  weekDays: HabitStatus[] // Sun–Sat, today = index based on getDay()
  currentStreak: number
  totalDone: number
}

export const MOCK_HABITS: Habit[] = [
  {
    id: 'h1',
    title: 'Estudiar japonés',
    color: '#3D5AFE',
    targetPerWeek: 4,
    durationMinutes: 30,
    category: 'learning',
    weekDays: ['done', 'done', 'pending', 'skipped', 'done', 'pending', 'pending'],
    currentStreak: 3,
    totalDone: 47,
  },
  {
    id: 'h2',
    title: 'Caminar',
    color: '#00C896',
    targetPerWeek: 5,
    durationMinutes: 30,
    category: 'health',
    weekDays: ['done', 'done', 'done', 'done', 'pending', 'pending', 'pending'],
    currentStreak: 8,
    totalDone: 62,
  },
  {
    id: 'h3',
    title: 'Leer',
    color: '#FF7700',
    targetPerWeek: 7,
    durationMinutes: 20,
    category: 'mindfulness',
    weekDays: ['done', 'pending', 'done', 'done', 'done', 'pending', 'pending'],
    currentStreak: 2,
    totalDone: 31,
  },
  {
    id: 'h4',
    title: 'Meditación',
    color: '#8B2FC9',
    targetPerWeek: 3,
    durationMinutes: 10,
    category: 'mindfulness',
    weekDays: ['skipped', 'skipped', 'done', 'pending', 'pending', 'pending', 'pending'],
    currentStreak: 0,
    totalDone: 14,
  },
  {
    id: 'h5',
    title: 'Sin redes sociales antes de las 10am',
    color: '#FF4D30',
    targetPerWeek: 7,
    durationMinutes: 0,
    category: 'productivity',
    weekDays: ['done', 'done', 'done', 'done', 'done', 'pending', 'pending'],
    currentStreak: 12,
    totalDone: 38,
  },
]

export type MediaType = 'game' | 'anime' | 'book' | 'series'
export type MediaStatus = 'playing' | 'pending' | 'done' | 'dropped'

export interface MediaItem {
  id: string
  type: MediaType
  title: string
  subtitle: string
  color: string
  status: MediaStatus
  progress?: number   // 0–100
  progressLabel?: string
  totalHours?: number
  rating?: number     // 1–5
}

export const MOCK_MEDIA: MediaItem[] = [
  { id: 'm1', type: 'game',   title: 'Final Fantasy VII Remake', subtitle: 'RPG · PS5',              color: '#FF4D30', status: 'playing', progress: 35, progressLabel: 'Capítulo 3 · 12h',  totalHours: 12 },
  { id: 'm2', type: 'anime',  title: 'Frieren',                  subtitle: 'Fantasía · 28 eps',       color: '#3D5AFE', status: 'playing', progress: 60, progressLabel: 'Ep 17 de 28' },
  { id: 'm3', type: 'book',   title: 'The Pragmatic Programmer', subtitle: 'Técnico · 352 págs',      color: '#FF7700', status: 'playing', progress: 45, progressLabel: 'Pág 158 de 352' },
  { id: 'm4', type: 'game',   title: 'Hollow Knight',            subtitle: 'Metroidvania · PC',       color: '#8B2FC9', status: 'pending' },
  { id: 'm5', type: 'anime',  title: 'Dungeon Meshi',            subtitle: 'Comedia · 24 eps',        color: '#00C896', status: 'pending' },
  { id: 'm6', type: 'book',   title: 'Atomic Habits',            subtitle: 'No ficción · 320 págs',   color: '#FFD600', status: 'done',    rating: 5,    totalHours: 6 },
  { id: 'm7', type: 'game',   title: 'Celeste',                  subtitle: 'Plataformas · Switch',    color: '#FF4D30', status: 'done',    rating: 5,    totalHours: 14 },
  { id: 'm8', type: 'series', title: 'Severance',                subtitle: 'Thriller · S2',           color: '#3D5AFE', status: 'pending' },
]

export const MOCK_PLAN = {
  date: '2026-05-24',
  energyLevel: 'normal',
  userMode: 'normal',
  totalFreeMinutes: 330,
  availableCapacityMinutes: 248,
  plannedItems: [
    {
      id: '1',
      itemType: 'leisure' as const,
      title: 'Final Fantasy VII',
      icon: '🎮',
      color: '#E07B39',
      durationMinutes: 90,
      suggestedStart: '18:00',
      suggestedEnd: '19:30',
      subtitle: 'Capítulo 3 · 12h jugadas',
      isDone: false,
    },
    {
      id: '2',
      itemType: 'habit' as const,
      title: 'Estudiar japonés',
      icon: '🇯🇵',
      color: '#3B7DD8',
      durationMinutes: 30,
      suggestedStart: '19:45',
      suggestedEnd: '20:15',
      subtitle: '2 de 4 esta semana',
      isDone: false,
    },
    {
      id: '3',
      itemType: 'habit' as const,
      title: 'Caminar',
      icon: '🏃',
      color: '#4CAF7D',
      durationMinutes: 30,
      suggestedStart: '20:30',
      suggestedEnd: '21:00',
      subtitle: '3 de 5 esta semana',
      isDone: false,
    },
    {
      id: '4',
      itemType: 'task' as const,
      title: 'Revisar emails trabajo',
      icon: '💼',
      color: '#8A8880',
      durationMinutes: 15,
      isDone: true,
    },
  ],
  deferredItems: [
    {
      id: '5',
      itemType: 'anime' as const,
      title: 'Frieren',
      icon: '📺',
      color: '#3B7DD8',
      durationMinutes: 25,
    },
  ],
  planningNotes: [
    'Tienes 5h 30m libres. Planificando 4h 8m.',
    '1 item quedó fuera del plan de hoy.',
  ],
}
