import { describe, expect, it } from 'vitest'
import { addDays, fmt, parse } from './date'
import type { HolidayFn } from './holidays'
import { doubleOffOf, generateWeek, nightDayOf, validateWeek } from './scheduler'
import { DEFAULT_SETTINGS, type WeekPlan } from './types'

/** 결정적 테스트용 시드 난수 (mulberry32) */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const noHoliday: HolidayFn = () => false
const S = DEFAULT_SETTINGS
const [A, B] = S.splitPair

function generateRun(weeksCount: number, isHoliday: HolidayFn, seed = 42): { keys: string[]; plans: WeekPlan[] } {
  const rand = seeded(seed)
  const start = parse('2026-07-06') // 월요일
  const keys: string[] = []
  const plans: WeekPlan[] = []
  for (let i = 0; i < weeksCount; i++) {
    const key = fmt(addDays(start, i * 7))
    keys.push(key)
    plans.push(generateWeek(key, isHoliday, S, plans.slice(), rand))
  }
  return { keys, plans }
}

describe('generateWeek 기본 규칙', () => {
  const { keys, plans } = generateRun(12, noHoliday)

  it('모든 주가 검증을 통과한다', () => {
    plans.forEach((plan, i) => {
      expect(validateWeek(keys[i], plan, noHoliday, S)).toEqual([])
    })
  })

  it('전원이 화~토 중 하루씩 오프를 갖고, 하루 최대 2명', () => {
    for (const plan of plans) {
      plan.offs.forEach((d) => {
        expect(d).not.toBeNull()
        expect(d! >= 2 && d! <= 6).toBe(true)
      })
      const counts = new Map<number, number>()
      plan.offs.forEach((d) => counts.set(d!, (counts.get(d!) ?? 0) + 1))
      for (const c of counts.values()) expect(c).toBeLessThanOrEqual(2)
    }
  })

  it('2인 오프는 목·금·토에만 나온다', () => {
    for (const plan of plans) {
      const dbl = doubleOffOf(plan.offs)
      if (dbl) expect([4, 5, 6]).toContain(dbl.day)
    }
  })

  it('분리 페어는 같은 날 오프·같은 야간조 금지', () => {
    for (const plan of plans) {
      expect(plan.offs[A]).not.toBe(plan.offs[B])
      expect(plan.nightMon.includes(A) && plan.nightMon.includes(B)).toBe(false)
      expect(plan.nightWed.includes(A) && plan.nightWed.includes(B)).toBe(false)
    }
  })

  it('야간은 월·수 3명씩, 전원 커버, 수요일 오프자는 수요일 야간 제외', () => {
    for (const plan of plans) {
      expect(plan.nightMon).toHaveLength(3)
      expect(plan.nightWed).toHaveLength(3)
      expect(new Set([...plan.nightMon, ...plan.nightWed]).size).toBe(6)
      for (const m of plan.nightWed) expect(plan.offs[m]).not.toBe(3)
    }
  })
})

describe('로테이션 품질', () => {
  const { plans } = generateRun(8, noHoliday)

  it('8주 동안 전원이 월·수 야간을 모두 경험한다', () => {
    for (let m = 0; m < 6; m++) {
      const days = plans.map((p) => nightDayOf(p, m))
      expect(days).toContain(1)
      expect(days).toContain(3)
    }
  })

  it('같은 3인조가 지난주 그대로 반복되지 않는다', () => {
    for (let i = 1; i < plans.length; i++) {
      const prev = [plans[i - 1].nightMon, plans[i - 1].nightWed]
      for (const team of [plans[i].nightMon, plans[i].nightWed]) {
        for (const p of prev) {
          expect([...team].sort().join()).not.toBe([...p].sort().join())
        }
      }
    }
  })

  it('2인 오프 페어가 연속으로 반복되지 않는다', () => {
    let prevPair = ''
    for (const plan of plans) {
      const dbl = doubleOffOf(plan.offs)
      const key = dbl ? [...dbl.pair].sort().join('-') : ''
      if (prevPair) expect(key).not.toBe(prevPair)
      prevPair = key
    }
  })

  it('오프 요일이 지난주와 연속 반복되지 않는다', () => {
    for (let i = 1; i < plans.length; i++) {
      for (let m = 0; m < 6; m++) {
        expect(plans[i].offs[m]).not.toBe(plans[i - 1].offs[m])
      }
    }
  })
})

describe('공휴일 규칙', () => {
  it('공휴일이 낀 주는 오프가 없다', () => {
    const holiday: HolidayFn = (d) => d === '2026-07-10' // 금요일 공휴일
    const rand = seeded(7)
    const plan = generateWeek('2026-07-06', holiday, S, [], rand)
    expect(plan.offs.every((d) => d == null)).toBe(true)
    expect(plan.nightMon).toHaveLength(3)
    expect(plan.nightWed).toHaveLength(3)
  })

  it('월요일이 공휴일이면 그날 야간이 없고 수요일 야간만 3명 (기본 설정)', () => {
    const holiday: HolidayFn = (d) => d === '2026-07-06'
    const rand = seeded(7)
    const plan = generateWeek('2026-07-06', holiday, S, [], rand)
    expect(plan.nightMon).toHaveLength(0)
    expect(plan.nightWed).toHaveLength(3)
    expect(plan.nightWed.includes(A) && plan.nightWed.includes(B)).toBe(false)
    expect(validateWeek('2026-07-06', plan, holiday, S)).toEqual([])
  })

  it('nightOnHoliday 설정이 켜지면 공휴일에도 야간 3명', () => {
    const holiday: HolidayFn = (d) => d === '2026-07-06'
    const rand = seeded(7)
    const plan = generateWeek('2026-07-06', holiday, { ...S, nightOnHoliday: true }, [], rand)
    expect(plan.nightMon).toHaveLength(3)
    expect(plan.nightWed).toHaveLength(3)
  })
})
