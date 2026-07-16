export const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']

export function fmt(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** 해당 날짜가 속한 주의 월요일 */
export function mondayOf(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7))
  return r
}

/** 그 달을 표시하는 달력 그리드(월요일 시작)의 모든 월요일 키 */
export function mondaysOfMonthGrid(year: number, month: number): string[] {
  const last = new Date(year, month + 1, 0)
  const res: string[] = []
  for (let d = mondayOf(new Date(year, month, 1)); d <= last; d = addDays(d, 7)) {
    res.push(fmt(d))
  }
  return res
}

export function label(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_KO[d.getDay()]})`
}
