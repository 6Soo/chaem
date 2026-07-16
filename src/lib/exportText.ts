import { addDays, label, parse } from './date'
import type { HolidayFn } from './holidays'
import { weekContext } from './scheduler'
import type { Settings, WeekPlan } from './types'

const DAY_KO = ['', '월', '화', '수', '목', '금', '토']

/** 카톡 공유용 월간 근무표 텍스트 */
export function monthText(
  year: number,
  month: number,
  mondayKeys: string[],
  weeks: Record<string, WeekPlan>,
  settings: Settings,
  isHoliday: HolidayFn,
): string {
  const name = (m: number) => settings.members[m]
  const lines: string[] = [`🗓 ${year}년 ${month + 1}월 근무표`, '']

  for (const key of mondayKeys) {
    const plan = weeks[key]
    if (!plan) continue
    const monday = parse(key)
    const ctx = weekContext(key, isHoliday, settings)
    lines.push(`[${label(monday)} ~ ${label(addDays(monday, 5))}]`)
    lines.push(`🌙 월 야간: ${ctx.monActive ? plan.nightMon.map(name).join('·') || '-' : '없음(공휴일)'}`)
    lines.push(`🌙 수 야간: ${ctx.wedActive ? plan.nightWed.map(name).join('·') || '-' : '없음(공휴일)'}`)
    if (ctx.holidayWeek) {
      lines.push('🎌 공휴일 주간 → 오프 없음')
    } else {
      const byDay = new Map<number, string[]>()
      plan.offs.forEach((d, m) => {
        if (d != null) byDay.set(d, [...(byDay.get(d) ?? []), name(m)])
      })
      const parts = [2, 3, 4, 5, 6]
        .filter((d) => byDay.has(d))
        .map((d) => `${DAY_KO[d]} ${byDay.get(d)!.join('·')}`)
      lines.push(`🛌 오프: ${parts.join(' / ') || '-'}`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}
