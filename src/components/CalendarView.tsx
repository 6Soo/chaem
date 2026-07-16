import { addDays, fmt, parse } from '../lib/date'
import type { HolidayFn } from '../lib/holidays'
import type { Settings, WeekPlan } from '../lib/types'

interface Props {
  ym: { y: number; m: number }
  mondays: string[]
  weeks: Record<string, WeekPlan>
  isHoliday: HolidayFn
  holidayLabel: (date: string) => string | null
  settings: Settings
  issuesByWeek: Record<string, number>
  onDayClick: (date: string) => void
}

const HEAD = ['월', '화', '수', '목', '금', '토', '일']

export function CalendarView({
  ym,
  mondays,
  weeks,
  isHoliday,
  holidayLabel,
  settings,
  issuesByWeek,
  onDayClick,
}: Props) {
  const todayKey = fmt(new Date())
  const name = (m: number) => settings.members[m]

  return (
    <div className="card calendar" id="calendar-card">
      <div className="cal-head">
        {HEAD.map((d) => (
          <span key={d} className={d === '토' ? 'sat' : d === '일' ? 'sun' : ''}>
            {d}
          </span>
        ))}
      </div>
      {mondays.map((weekKey) => {
        const monday = parse(weekKey)
        const plan = weeks[weekKey]
        return (
          <div className="cal-row" key={weekKey}>
            {Array.from({ length: 7 }, (_, i) => {
              const date = addDays(monday, i)
              const dateKey = fmt(date)
              const wd = date.getDay()
              const holiday = isHoliday(dateKey)
              const hName = holiday ? holidayLabel(dateKey) : null
              const night = plan && wd === 1 ? plan.nightMon : plan && wd === 3 ? plan.nightWed : []
              const offs = plan ? plan.offs.flatMap((d, m) => (d === wd ? [m] : [])) : []
              const classes = [
                'cal-cell',
                date.getMonth() !== ym.m ? 'dim' : '',
                wd === 0 ? 'sun' : wd === 6 ? 'sat' : '',
                holiday ? 'holiday' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button key={dateKey} className={classes} onClick={() => onDayClick(dateKey)}>
                  {i === 0 && (issuesByWeek[weekKey] ?? 0) > 0 && <span className="warn-dot" />}
                  <span className="cal-date">
                    <span className={`num${dateKey === todayKey ? ' today' : ''}`}>{date.getDate()}</span>
                  </span>
                  {hName && <span className="holiday-name">{hName}</span>}
                  {night.length > 0 && (
                    <span className="chip-night">
                      <span className="moon">🌙</span> {night.map(name).join('·')}
                    </span>
                  )}
                  {offs.map((m) => (
                    <span className="chip-off" key={m}>
                      {name(m)}
                    </span>
                  ))}
                </button>
              )
            })}
          </div>
        )
      })}
      <div className="legend">
        <span className="l-night">
          <i />
          야간진료
        </span>
        <span className="l-off">
          <i />
          오프
        </span>
        <span className="l-holiday">
          <i />
          공휴일
        </span>
      </div>
    </div>
  )
}
