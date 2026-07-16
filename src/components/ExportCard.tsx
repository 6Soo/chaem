import { addDays, label, parse } from '../lib/date'
import type { HolidayFn } from '../lib/holidays'
import { weekContext } from '../lib/scheduler'
import type { Settings, WeekPlan } from '../lib/types'

interface Props {
  ym: { y: number; m: number }
  mondays: string[]
  weeks: Record<string, WeekPlan>
  settings: Settings
  isHoliday: HolidayFn
}

const DAY_KO = ['', '월', '화', '수', '목', '금', '토']

/** 이미지 저장용 오프스크린 레이아웃 (1000px 고정) */
export function ExportCard({ ym, mondays, weeks, settings, isHoliday }: Props) {
  const name = (m: number) => settings.members[m]
  return (
    <div className="export-stage">
      <div className="export-root" id="export-root">
        <div className="ex-head">
          <h1>
            🍩 {ym.y}년 {ym.m + 1}월 근무표
          </h1>
          <span>야간진료 월·수 3명 / 주 1회 오프</span>
        </div>
        {mondays.map((key) => {
          const plan = weeks[key]
          if (!plan) return null
          const monday = parse(key)
          const ctx = weekContext(key, isHoliday, settings)
          const byDay = new Map<number, string[]>()
          plan.offs.forEach((d, m) => {
            if (d != null) byDay.set(d, [...(byDay.get(d) ?? []), name(m)])
          })
          return (
            <div className="ex-week" key={key}>
              <div className="ex-range">
                {label(monday)} ~ {label(addDays(monday, 5))}
                {ctx.holidayWeek && <span className="hol">🎌 공휴일 주간 · 오프 없음</span>}
              </div>
              <div className="ex-row">
                <span className="k">🌙 야간 (월)</span>
                <span className="v">
                  {ctx.monActive ? (
                    <span className="ex-pill night">{plan.nightMon.map(name).join(' · ')}</span>
                  ) : (
                    <span className="ex-pill none">공휴일 · 야간 없음</span>
                  )}
                </span>
              </div>
              <div className="ex-row">
                <span className="k">🌙 야간 (수)</span>
                <span className="v">
                  {ctx.wedActive ? (
                    <span className="ex-pill night">{plan.nightWed.map(name).join(' · ')}</span>
                  ) : (
                    <span className="ex-pill none">공휴일 · 야간 없음</span>
                  )}
                </span>
              </div>
              {!ctx.holidayWeek && (
                <div className="ex-row">
                  <span className="k">🛌 오프</span>
                  <span className="v">
                    {[2, 3, 4, 5, 6]
                      .filter((d) => byDay.has(d))
                      .map((d) => (
                        <span className="ex-pill off" key={d}>
                          {DAY_KO[d]} {byDay.get(d)!.join('·')}
                        </span>
                      ))}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
