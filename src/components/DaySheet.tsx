import { WEEKDAY_KO, addDays, fmt, label, mondayOf, parse } from '../lib/date'
import type { HolidayFn } from '../lib/holidays'
import { validateWeek, weekContext } from '../lib/scheduler'
import type { Settings, WeekPlan } from '../lib/types'
import { Sheet } from './Sheet'

interface Props {
  date: string
  plan: WeekPlan | undefined
  settings: Settings
  isHoliday: HolidayFn
  holidayLabel: (date: string) => string | null
  onToggleHoliday: (date: string) => void
  onToggleOff: (date: string, member: number) => void
  onToggleNight: (date: string, member: number) => void
  onRegenWeek: (weekKey: string) => void
  onClose: () => void
}

export function DaySheet({
  date,
  plan,
  settings,
  isHoliday,
  holidayLabel,
  onToggleHoliday,
  onToggleOff,
  onToggleNight,
  onRegenWeek,
  onClose,
}: Props) {
  const d = parse(date)
  const wd = d.getDay()
  const weekKey = fmt(mondayOf(d))
  const ctx = weekContext(weekKey, isHoliday, settings)
  const holiday = isHoliday(date)
  const hName = holidayLabel(date)
  const issues = plan ? validateWeek(weekKey, plan, isHoliday, settings) : []
  const isNightDay = wd === 1 || wd === 3
  const nightActive = wd === 1 ? ctx.monActive : wd === 3 ? ctx.wedActive : false
  const nightTeam = plan ? (wd === 1 ? plan.nightMon : wd === 3 ? plan.nightWed : []) : []
  const weekRange = `${label(parse(weekKey))} ~ ${label(addDays(parse(weekKey), 5))} 주간`

  return (
    <Sheet onClose={onClose}>
      <h2>
        {d.getMonth() + 1}월 {d.getDate()}일 {WEEKDAY_KO[wd]}요일{' '}
        {holiday && <span className="badge red">{hName ?? '휴일'}</span>}
      </h2>
      <p className="sub">{weekRange}</p>

      {wd === 0 ? (
        <div className="note">일요일은 휴진이에요.</div>
      ) : (
        <>
          <div className="switch-row">
            <div>
              <div className="t">공휴일</div>
              <div className="d">공휴일이 낀 주는 오프가 없어요</div>
            </div>
            <button
              className={`switch${holiday ? ' on' : ''}`}
              onClick={() => onToggleHoliday(date)}
              aria-label="공휴일 토글"
            />
          </div>

          {isNightDay && (
            <div className="sheet-section">
              <div className="label">🌙 야간진료 (3명)</div>
              {nightActive ? (
                <div className="member-chips">
                  {settings.members.map((nm, m) => (
                    <button
                      key={m}
                      className={`member-chip${nightTeam.includes(m) ? ' on-night' : ''}`}
                      onClick={() => onToggleNight(date, m)}
                    >
                      {nm}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="note">공휴일이라 이 날은 야간진료가 없어요.</div>
              )}
            </div>
          )}

          {wd >= 2 && wd <= 6 && (
            <div className="sheet-section">
              <div className="label">🛌 이 날 오프</div>
              {ctx.holidayWeek ? (
                <div className="note">공휴일 주간이라 오프가 없어요. 공휴일이 쉬는 날이에요.</div>
              ) : (
                <div className="member-chips">
                  {settings.members.map((nm, m) => (
                    <button
                      key={m}
                      className={`member-chip${plan?.offs[m] === wd ? ' on-off' : ''}`}
                      onClick={() => onToggleOff(date, m)}
                    >
                      {nm}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {wd === 1 && (
            <div className="sheet-section">
              <div className="note">월요일은 전원 출근이라 오프가 없어요.</div>
            </div>
          )}

          {issues.length > 0 && (
            <div className="sheet-section">
              <div className="label">⚠️ 이번 주 규칙 점검</div>
              <div className="issues">
                <ul>
                  {issues.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="sheet-footer">
            <button className="btn btn-secondary" onClick={() => onRegenWeek(weekKey)}>
              이 주만 다시 뽑기
            </button>
            <button className="btn btn-primary" onClick={onClose}>
              확인
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
