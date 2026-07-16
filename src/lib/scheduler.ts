import { addDays, fmt, parse } from './date'
import type { HolidayFn } from './holidays'
import { MEMBER_COUNT, type Settings, type WeekPlan } from './types'

const ALL = Array.from({ length: MEMBER_COUNT }, (_, i) => i)
const OFF_DAYS = [2, 3, 4, 5, 6] // 화~토
const HISTORY_SPAN = 8

// ---------- 작은 조합 유틸 ----------

function choose<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [head, ...rest] = arr
  return [...choose(rest, k - 1).map((c) => [head, ...c]), ...choose(rest, k)]
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr]
  return arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]))
}

function sameSet(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x))
}

function pairsOf(team: number[]): [number, number][] {
  const res: [number, number][] = []
  for (let i = 0; i < team.length; i++) for (let j = i + 1; j < team.length; j++) res.push([team[i], team[j]])
  return res
}

const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)

/** 그 주 2명이 같이 쉬는 날과 그 페어 */
export function doubleOffOf(offs: (number | null)[]): { day: number; pair: [number, number] } | null {
  const byDay = new Map<number, number[]>()
  offs.forEach((d, m) => {
    if (d != null) byDay.set(d, [...(byDay.get(d) ?? []), m])
  })
  for (const [day, members] of byDay) {
    if (members.length >= 2) return { day, pair: [members[0], members[1]] }
  }
  return null
}

export function nightDayOf(plan: WeekPlan, m: number): 1 | 3 | null {
  if (plan.nightMon.includes(m)) return 1
  if (plan.nightWed.includes(m)) return 3
  return null
}

// ---------- 주 단위 생성 ----------

interface WeekContext {
  dates: string[] // 월~토
  holidayWeek: boolean
  monActive: boolean
  wedActive: boolean
}

export function weekContext(mondayKey: string, isHoliday: HolidayFn, settings: Settings): WeekContext {
  const monday = parse(mondayKey)
  const dates = Array.from({ length: 6 }, (_, i) => fmt(addDays(monday, i)))
  const holidayWeek = dates.some(isHoliday)
  return {
    dates,
    holidayWeek,
    monActive: !isHoliday(dates[0]) || settings.nightOnHoliday,
    wedActive: !isHoliday(dates[2]) || settings.nightOnHoliday,
  }
}

/**
 * 한 주를 생성한다. 가능한 야간조 × 오프 조합을 전수 평가해
 * 최근 이력(history) 대비 가장 "덜 반복되는" 조합을 고른다.
 */
export function generateWeek(
  mondayKey: string,
  isHoliday: HolidayFn,
  settings: Settings,
  history: WeekPlan[],
  rand: () => number = Math.random,
): WeekPlan {
  const ctx = weekContext(mondayKey, isHoliday, settings)
  const [A, B] = settings.splitPair
  const others = ALL.filter((m) => m !== A && m !== B)
  const H = history.slice(-HISTORY_SPAN)
  const last = H[H.length - 1]

  // 야간조 후보
  const nightCands: { mon: number[]; wed: number[] }[] = []
  if (ctx.monActive && ctx.wedActive) {
    for (const [pm, pw] of [
      [A, B],
      [B, A],
    ]) {
      for (const s of choose(others, 2)) {
        nightCands.push({
          mon: [pm, ...s].sort((a, b) => a - b),
          wed: [pw, ...others.filter((x) => !s.includes(x))].sort((a, b) => a - b),
        })
      }
    }
  } else if (ctx.monActive || ctx.wedActive) {
    for (const s of choose(ALL, 3)) {
      if (s.includes(A) && s.includes(B)) continue
      nightCands.push(ctx.monActive ? { mon: s, wed: [] } : { mon: [], wed: s })
    }
  } else {
    nightCands.push({ mon: [], wed: [] })
  }

  // 오프 후보
  const offCands: (number | null)[][] = []
  if (ctx.holidayWeek) {
    offCands.push(Array(MEMBER_COUNT).fill(null))
  } else {
    for (const dbl of OFF_DAYS) {
      for (const pair of choose(ALL, 2)) {
        if (pair.includes(A) && pair.includes(B)) continue
        const rest = ALL.filter((m) => !pair.includes(m))
        const restDays = OFF_DAYS.filter((d) => d !== dbl)
        for (const perm of permutations(restDays)) {
          const offs: (number | null)[] = Array(MEMBER_COUNT).fill(null)
          pair.forEach((m) => (offs[m] = dbl))
          rest.forEach((m, i) => (offs[m] = perm[i]))
          offCands.push(offs)
        }
      }
    }
  }

  // 야간·오프 점수는 서로 독립이라 따로 매긴 뒤 조합한다
  const nightScored = nightCands.map((n) => ({ n, s: scoreNight(n, H, last, rand) }))
  const offScored = offCands.map((o) => ({ o, s: scoreOff(o, H, last, settings, rand) }))
  nightScored.sort((a, b) => a.s - b.s)
  offScored.sort((a, b) => a.s - b.s)

  let best: WeekPlan | null = null
  let bestScore = Infinity
  for (const { n, s: ns } of nightScored) {
    if (ns >= bestScore) break
    for (const { o, s: os } of offScored) {
      const total = ns + os
      if (total >= bestScore) break
      // 수요일 오프인 사람은 수요일 야간 불가 (경계 제약)
      if (!n.wed.every((m) => o[m] !== 3)) continue
      best = { offs: o, nightMon: n.mon, nightWed: n.wed }
      bestScore = total
    }
  }
  // 이론상 항상 존재하지만 방어적으로
  return best ?? { offs: offCands[0], nightMon: nightCands[0].mon, nightWed: nightCands[0].wed }
}

function scoreOff(
  offs: (number | null)[],
  H: WeekPlan[],
  last: WeekPlan | undefined,
  settings: Settings,
  rand: () => number,
): number {
  let s = rand() * 8
  const dbl = doubleOffOf(offs)
  if (dbl) {
    // "2명 쉬는 날은 가급적 화·수 제외" — 사실상 강한 제약으로 취급
    if (!settings.doubleOffWeekdays.includes(dbl.day)) s += 500
    H.forEach((w, idx) => {
      const age = H.length - idx // 1 = 지난주
      const wd = doubleOffOf(w.offs)
      if (!wd) return
      // 같은 페어가 또 같이 쉬는 것 방지
      if (pairKey(wd.pair[0], wd.pair[1]) === pairKey(dbl.pair[0], dbl.pair[1])) s += Math.ceil(70 / age)
      // 같은 사람이 연속으로 2인 오프에 끼는 것도 약하게 방지
      if (wd.pair.some((m) => dbl.pair.includes(m))) s += Math.ceil(18 / age)
    })
  }
  for (let m = 0; m < MEMBER_COUNT; m++) {
    const d = offs[m]
    if (d == null) continue
    // 지난주와 같은 요일 오프 방지 + 요일 분포 균형(토요일 오프 독점 방지)
    if (last && last.offs[m] === d) s += 35
    let cnt = 0
    for (const w of H) if (w.offs[m] === d) cnt++
    s += 9 * cnt
  }
  return s
}

function scoreNight(
  n: { mon: number[]; wed: number[] },
  H: WeekPlan[],
  last: WeekPlan | undefined,
  rand: () => number,
): number {
  let s = rand() * 8
  if (last) {
    // "월·수 번갈아가면서" — 지난주와 같은 요일 야간이면 감점
    for (const m of n.mon) if (last.nightMon.includes(m)) s += 22
    for (const m of n.wed) if (last.nightWed.includes(m)) s += 22
    // 지난주와 같은 3인조 그대로 유지 방지
    for (const team of [n.mon, n.wed]) {
      if (team.length !== 3) continue
      if (sameSet(team, last.nightMon) || sameSet(team, last.nightWed)) s += 70
    }
  }
  // 최근에 자주 같이 선 페어 감점 → 조 구성이 계속 섞이게
  const pairCnt = new Map<string, number>()
  for (const w of H) {
    for (const team of [w.nightMon, w.nightWed]) {
      for (const [a, b] of pairsOf(team)) {
        const k = pairKey(a, b)
        pairCnt.set(k, (pairCnt.get(k) ?? 0) + 1)
      }
    }
  }
  for (const team of [n.mon, n.wed]) {
    for (const [a, b] of pairsOf(team)) s += 7 * (pairCnt.get(pairKey(a, b)) ?? 0)
  }
  return s
}

// ---------- 월 단위 생성 ----------

/** weeks 맵에서 mondayKey 직전 최대 n주 이력을 시간순으로 모은다 */
export function collectHistory(weeks: Record<string, WeekPlan>, mondayKey: string, n = HISTORY_SPAN): WeekPlan[] {
  const res: WeekPlan[] = []
  let d = addDays(parse(mondayKey), -7)
  for (let i = 0; i < n; i++) {
    const k = fmt(d)
    if (!weeks[k]) break
    res.unshift(weeks[k])
    d = addDays(d, -7)
  }
  return res
}

/**
 * 그 달 달력에 보이는 모든 주를 생성한다.
 * 지난달에서 넘어온 첫 주(월요일이 그 달 이전)는 이미 있으면 유지한다.
 */
export function generateMonth(
  year: number,
  month: number,
  weeks: Record<string, WeekPlan>,
  isHoliday: HolidayFn,
  settings: Settings,
  mondayKeys: string[],
  rand: () => number = Math.random,
): Record<string, WeekPlan> {
  const monthStart = new Date(year, month, 1)
  const result = { ...weeks }
  for (const key of mondayKeys) {
    if (parse(key) < monthStart && result[key]) continue
    result[key] = generateWeek(key, isHoliday, settings, collectHistory(result, key), rand)
  }
  return result
}

// ---------- 검증 (직접 수정 시 경고) ----------

export function validateWeek(
  mondayKey: string,
  plan: WeekPlan,
  isHoliday: HolidayFn,
  settings: Settings,
): string[] {
  const issues: string[] = []
  const ctx = weekContext(mondayKey, isHoliday, settings)
  const [A, B] = settings.splitPair
  const name = (m: number) => settings.members[m]
  const dayKo = ['', '월', '화', '수', '목', '금', '토']

  if (ctx.holidayWeek) {
    plan.offs.forEach((d, m) => {
      if (d != null) issues.push(`공휴일 주에는 오프가 없어야 해요 (${name(m)})`)
    })
  } else {
    plan.offs.forEach((d, m) => {
      if (d == null) issues.push(`${name(m)} 오프가 없어요`)
      else if (d < 2 || d > 6) issues.push(`${name(m)} 오프가 화~토를 벗어났어요`)
    })
    if (plan.offs[A] != null && plan.offs[A] === plan.offs[B])
      issues.push(`${name(A)}·${name(B)}가 같은 날 오프예요`)
    const byDay = new Map<number, number[]>()
    plan.offs.forEach((d, m) => {
      if (d != null) byDay.set(d, [...(byDay.get(d) ?? []), m])
    })
    for (const [d, ms] of byDay) {
      if (ms.length > 2) issues.push(`${dayKo[d]}요일 오프가 ${ms.length}명이에요 (최대 2명)`)
      else if (ms.length === 2 && !settings.doubleOffWeekdays.includes(d))
        issues.push(`${dayKo[d]}요일에 2명이 쉬어요 (2인 오프 권장 요일 아님)`)
    }
  }

  for (const [active, team, dayLabel] of [
    [ctx.monActive, plan.nightMon, '월'],
    [ctx.wedActive, plan.nightWed, '수'],
  ] as const) {
    if (active && team.length !== 3) issues.push(`${dayLabel}요일 야간이 ${team.length}명이에요 (3명 필요)`)
    if (!active && team.length > 0) issues.push(`${dayLabel}요일은 야간이 없는 날인데 배정돼 있어요`)
    if (team.includes(A) && team.includes(B)) issues.push(`${name(A)}·${name(B)}가 같은 야간조예요`)
  }
  for (const m of plan.nightMon) {
    if (plan.nightWed.includes(m)) issues.push(`${name(m)}가 월·수 야간에 모두 배정됐어요`)
  }
  for (const m of plan.nightWed) {
    if (plan.offs[m] === 3) issues.push(`${name(m)}는 수요일 오프인데 수요일 야간이에요`)
  }
  if (ctx.monActive && ctx.wedActive && !ctx.holidayWeek) {
    const covered = new Set([...plan.nightMon, ...plan.nightWed])
    for (let m = 0; m < MEMBER_COUNT; m++) {
      if (!covered.has(m)) issues.push(`${name(m)}가 이번 주 야간에 배정되지 않았어요`)
    }
  }
  return issues
}

export function emptyWeek(): WeekPlan {
  return { offs: Array(MEMBER_COUNT).fill(null), nightMon: [], nightWed: [] }
}
