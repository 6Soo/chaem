import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarView } from './components/CalendarView'
import { ConfirmDialog } from './components/ConfirmDialog'
import { DaySheet } from './components/DaySheet'
import { ExportCard } from './components/ExportCard'
import { ChevronLeft, ChevronRight, GearIcon, KakaoIcon, SparkIcon } from './components/Icons'
import { SettingsSheet } from './components/SettingsSheet'
import { StatsView } from './components/StatsView'
import { fmt, mondayOf, mondaysOfMonthGrid, parse } from './lib/date'
import { shareOrDownloadImage } from './lib/exportImage'
import { KR_HOLIDAYS, holidayName, makeHolidayFn } from './lib/holidays'
import { collectHistory, emptyWeek, generateMonth, generateWeek, validateWeek } from './lib/scheduler'
import { clearStore, defaultStore, loadStore, saveStore } from './lib/storage'
import type { Settings, Store } from './lib/types'

type ConfirmState =
  | { kind: 'regen-month' }
  | { kind: 'reset' }
  | null

export default function App() {
  const [store, setStore] = useState<Store>(loadStore)
  useEffect(() => saveStore(store), [store])

  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [tab, setTab] = useState<'cal' | 'stats'>('cal')
  const [sheetDate, setSheetDate] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const isHoliday = useMemo(() => makeHolidayFn(store), [store.holidayAdd, store.holidayRemove])
  const hLabel = (date: string) => holidayName(date, store)
  const mondays = useMemo(() => mondaysOfMonthGrid(ym.y, ym.m), [ym])
  const monthHasPlan = mondays.some((k) => store.weeks[k])
  const isCurrentMonth = ym.y === now.getFullYear() && ym.m === now.getMonth()

  const issuesByWeek = useMemo(() => {
    const res: Record<string, number> = {}
    for (const k of mondays) {
      const plan = store.weeks[k]
      if (plan) res[k] = validateWeek(k, plan, isHoliday, store.settings).length
    }
    return res
  }, [mondays, store.weeks, store.settings, isHoliday])

  function showToast(msg: string) {
    clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  function moveMonth(delta: number) {
    setYm(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  function doGenerate() {
    setStore((s) => ({
      ...s,
      weeks: generateMonth(ym.y, ym.m, s.weeks, makeHolidayFn(s), s.settings, mondays),
    }))
    showToast(`${ym.m + 1}월 근무표를 만들었어요`)
  }

  function handleGenerate() {
    if (monthHasPlan) setConfirm({ kind: 'regen-month' })
    else doGenerate()
  }

  function regenWeek(weekKey: string) {
    setStore((s) => {
      const rest = { ...s.weeks }
      delete rest[weekKey]
      return {
        ...s,
        weeks: {
          ...rest,
          [weekKey]: generateWeek(weekKey, makeHolidayFn(s), s.settings, collectHistory(rest, weekKey)),
        },
      }
    })
    showToast('이 주를 다시 뽑았어요')
  }

  function toggleHoliday(date: string) {
    setStore((s) => {
      const effective = makeHolidayFn(s)(date)
      const add = s.holidayAdd.filter((d) => d !== date)
      const remove = s.holidayRemove.filter((d) => d !== date)
      if (effective) {
        if (date in KR_HOLIDAYS) remove.push(date)
      } else if (!(date in KR_HOLIDAYS)) {
        add.push(date)
      }
      return { ...s, holidayAdd: add, holidayRemove: remove }
    })
  }

  function toggleOff(date: string, member: number) {
    const d = parse(date)
    const wd = d.getDay()
    if (wd < 2 || wd > 6) return
    const weekKey = fmt(mondayOf(d))
    setStore((s) => {
      const plan = s.weeks[weekKey] ?? emptyWeek()
      const offs = [...plan.offs]
      offs[member] = offs[member] === wd ? null : wd
      return { ...s, weeks: { ...s.weeks, [weekKey]: { ...plan, offs } } }
    })
  }

  function toggleNight(date: string, member: number) {
    const d = parse(date)
    const wd = d.getDay()
    if (wd !== 1 && wd !== 3) return
    const field = wd === 1 ? 'nightMon' : 'nightWed'
    const weekKey = fmt(mondayOf(d))
    setStore((s) => {
      const plan = s.weeks[weekKey] ?? emptyWeek()
      const team = plan[field].includes(member)
        ? plan[field].filter((m) => m !== member)
        : [...plan[field], member].sort((a, b) => a - b)
      return { ...s, weeks: { ...s.weeks, [weekKey]: { ...plan, [field]: team } } }
    })
  }

  function saveSettings(next: Settings) {
    setStore((s) => ({ ...s, settings: next }))
    showToast('설정을 저장했어요')
  }

  async function handleShare() {
    if (!monthHasPlan) {
      showToast('먼저 근무표를 생성해주세요')
      return
    }
    setBusy(true)
    try {
      const filename = `근무표_${ym.y}-${String(ym.m + 1).padStart(2, '0')}.png`
      const result = await shareOrDownloadImage(filename, `${ym.y}년 ${ym.m + 1}월 근무표`)
      showToast(result === 'shared' ? '공유 시트를 열었어요' : '공유가 지원되지 않아 이미지를 저장했어요')
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      showToast('공유에 실패했어요')
    } finally {
      setBusy(false)
    }
  }

  const totalIssues = Object.values(issuesByWeek).reduce((a, b) => a + b, 0)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="donut">🍩</span> 챔 근무표
        </div>
        <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="설정">
          <GearIcon />
        </button>
      </header>

      <nav className="month-nav">
        <button className="icon-btn" onClick={() => moveMonth(-1)} aria-label="이전 달">
          <ChevronLeft />
        </button>
        <h1>
          {ym.y}년 {ym.m + 1}월
        </h1>
        <button className="icon-btn" onClick={() => moveMonth(1)} aria-label="다음 달">
          <ChevronRight />
        </button>
      </nav>
      {!isCurrentMonth && (
        <button className="today-btn" onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })}>
          이번 달로
        </button>
      )}

      <div className="segmented">
        <button className={tab === 'cal' ? 'active' : ''} onClick={() => setTab('cal')}>
          달력
        </button>
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>
          통계
        </button>
      </div>

      {tab === 'cal' && !monthHasPlan && (
        <div className="banner">✨ 아직 이번 달 근무표가 없어요. 아래 버튼으로 자동 생성해보세요.</div>
      )}
      {tab === 'cal' && totalIssues > 0 && (
        <div className="banner warn">
          ⚠️ 규칙에 어긋나는 부분이 {totalIssues}건 있어요. 주황 점이 있는 주를 눌러 확인해보세요.
        </div>
      )}

      {tab === 'cal' ? (
        <CalendarView
          ym={ym}
          mondays={mondays}
          weeks={store.weeks}
          isHoliday={isHoliday}
          holidayLabel={hLabel}
          settings={store.settings}
          issuesByWeek={issuesByWeek}
          onDayClick={setSheetDate}
        />
      ) : (
        <StatsView monthMondays={mondays} weeks={store.weeks} settings={store.settings} />
      )}

      <div className="bottom-bar">
        <div className="bottom-bar-inner">
          <button className="btn btn-primary" onClick={handleGenerate}>
            <SparkIcon /> {monthHasPlan ? '이번 달 다시 생성' : '이번 달 자동 생성'}
          </button>
          <button className="btn btn-square btn-kakao" onClick={handleShare} disabled={busy} aria-label="카카오톡 공유">
            <KakaoIcon />
          </button>
        </div>
      </div>

      {sheetDate && (
        <DaySheet
          date={sheetDate}
          plan={store.weeks[fmt(mondayOf(parse(sheetDate)))]}
          settings={store.settings}
          isHoliday={isHoliday}
          holidayLabel={hLabel}
          onToggleHoliday={toggleHoliday}
          onToggleOff={toggleOff}
          onToggleNight={toggleNight}
          onRegenWeek={regenWeek}
          onClose={() => setSheetDate(null)}
        />
      )}

      {showSettings && (
        <SettingsSheet
          settings={store.settings}
          onSave={saveSettings}
          onReset={() => setConfirm({ kind: 'reset' })}
          onClose={() => setShowSettings(false)}
        />
      )}

      {confirm?.kind === 'regen-month' && (
        <ConfirmDialog
          title="다시 생성할까요?"
          desc="이번 달 근무표를 새로 만들어요. 직접 수정한 내용은 사라져요."
          confirmLabel="다시 생성"
          onConfirm={() => {
            setConfirm(null)
            doGenerate()
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.kind === 'reset' && (
        <ConfirmDialog
          title="모든 데이터를 지울까요?"
          desc="근무표, 설정, 공휴일 수정 내역이 모두 사라져요."
          confirmLabel="초기화"
          danger
          onConfirm={() => {
            clearStore()
            setStore(defaultStore())
            setConfirm(null)
            setShowSettings(false)
            showToast('초기화했어요')
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      {monthHasPlan && (
        <ExportCard ym={ym} mondays={mondays} weeks={store.weeks} settings={store.settings} isHoliday={isHoliday} />
      )}
    </div>
  )
}
