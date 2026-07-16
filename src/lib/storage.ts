import { DEFAULT_SETTINGS, MEMBER_COUNT, type Store } from './types'

const KEY = 'chaem.schedule.v1'

export function defaultStore(): Store {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS, members: [...DEFAULT_SETTINGS.members] },
    weeks: {},
    holidayAdd: [],
    holidayRemove: [],
  }
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultStore()
    const parsed = JSON.parse(raw) as Store
    if (parsed.version !== 1 || parsed.settings?.members?.length !== MEMBER_COUNT) return defaultStore()
    return { ...defaultStore(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } }
  } catch {
    return defaultStore()
  }
}

export function saveStore(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // 저장 실패(사파리 시크릿 등)는 조용히 무시 — 앱은 메모리로 계속 동작
  }
}

export function clearStore(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
