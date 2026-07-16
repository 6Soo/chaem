/** 멤버는 0~5 인덱스로 다룬다. 이름은 Settings.members에 있다. */
export interface Settings {
  /** 6명, 순번 순서 */
  members: string[]
  /** 동시 오프·동일 야간조 금지 페어 (기본: 채미·예원) */
  splitPair: [number, number]
  /** 2명이 함께 쉬어도 되는 요일 (JS 요일값, 기본: 목=4, 금=5, 토=6) */
  doubleOffWeekdays: number[]
  /** 월/수가 공휴일이어도 야간진료를 하는지 (기본: 안 함) */
  nightOnHoliday: boolean
}

/**
 * 한 주(월~일)의 배정. weeks 맵의 키는 그 주 월요일의 'YYYY-MM-DD'.
 * offs[m]: 멤버 m의 오프 요일(JS 요일값 2~6 = 화~토), 없으면 null(공휴일 주).
 */
export interface WeekPlan {
  offs: (number | null)[]
  nightMon: number[]
  nightWed: number[]
}

export interface Store {
  version: 1
  settings: Settings
  weeks: Record<string, WeekPlan>
  /** 사용자가 직접 추가/해제한 공휴일 */
  holidayAdd: string[]
  holidayRemove: string[]
}

export const MEMBER_COUNT = 6

export const DEFAULT_SETTINGS: Settings = {
  members: ['채미', '예원', '영주', '연진', '수현', '연주'],
  splitPair: [0, 1],
  doubleOffWeekdays: [4, 5, 6],
  nightOnHoliday: false,
}
