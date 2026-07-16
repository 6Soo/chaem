import { useMemo, useState } from 'react'
import { doubleOffOf } from '../lib/scheduler'
import { MEMBER_COUNT, type Settings, type WeekPlan } from '../lib/types'

interface Props {
  monthMondays: string[]
  weeks: Record<string, WeekPlan>
  settings: Settings
}

interface MemberStat {
  nightMon: number
  nightWed: number
  offByDay: Record<number, number>
  doubleOff: number
}

function compute(keys: string[], weeks: Record<string, WeekPlan>): MemberStat[] {
  const stats: MemberStat[] = Array.from({ length: MEMBER_COUNT }, () => ({
    nightMon: 0,
    nightWed: 0,
    offByDay: { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    doubleOff: 0,
  }))
  for (const key of keys) {
    const plan = weeks[key]
    if (!plan) continue
    plan.nightMon.forEach((m) => stats[m].nightMon++)
    plan.nightWed.forEach((m) => stats[m].nightWed++)
    plan.offs.forEach((d, m) => {
      if (d != null) stats[m].offByDay[d]++
    })
    const dbl = doubleOffOf(plan.offs)
    if (dbl) dbl.pair.forEach((m) => stats[m].doubleOff++)
  }
  return stats
}

export function StatsView({ monthMondays, weeks, settings }: Props) {
  const [scope, setScope] = useState<'month' | 'all'>('month')
  const keys = useMemo(
    () => (scope === 'month' ? monthMondays : Object.keys(weeks).sort()),
    [scope, monthMondays, weeks],
  )
  const stats = useMemo(() => compute(keys, weeks), [keys, weeks])
  const hasData = keys.some((k) => weeks[k])

  return (
    <div className="card">
      <div className="segmented small">
        <button className={scope === 'month' ? 'active' : ''} onClick={() => setScope('month')}>
          이번 달
        </button>
        <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>
          전체 기간
        </button>
      </div>
      {!hasData ? (
        <div className="note">아직 데이터가 없어요. 근무표를 먼저 생성해주세요.</div>
      ) : (
        <>
          <div className="stats-table-wrap">
            <table className="stats-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingLeft: 6 }}>멤버</th>
                  <th>야간(월)</th>
                  <th>야간(수)</th>
                  <th>화</th>
                  <th>수</th>
                  <th>목</th>
                  <th>금</th>
                  <th className="hl">토</th>
                  <th>2인오프</th>
                </tr>
              </thead>
              <tbody>
                {settings.members.map((nm, m) => (
                  <tr key={m}>
                    <td>{nm}</td>
                    <td>{stats[m].nightMon}</td>
                    <td>{stats[m].nightWed}</td>
                    <td>{stats[m].offByDay[2]}</td>
                    <td>{stats[m].offByDay[3]}</td>
                    <td>{stats[m].offByDay[4]}</td>
                    <td>{stats[m].offByDay[5]}</td>
                    <td className="hl">{stats[m].offByDay[6]}</td>
                    <td>{stats[m].doubleOff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="stats-note">
            화~토는 요일별 오프 횟수예요. 야간·토요일 오프가 고르게 돌아가는지 확인해보세요.
          </p>
        </>
      )}
    </div>
  )
}
