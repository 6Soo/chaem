import { useState } from 'react'
import { MEMBER_COUNT, type Settings } from '../lib/types'
import { Sheet } from './Sheet'

interface Props {
  settings: Settings
  onSave: (next: Settings) => void
  onReset: () => void
  onClose: () => void
}

const OFF_DAY_OPTIONS = [
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
]

export function SettingsSheet({ settings, onSave, onReset, onClose }: Props) {
  const [members, setMembers] = useState([...settings.members])
  const [pairA, setPairA] = useState(settings.splitPair[0])
  const [pairB, setPairB] = useState(settings.splitPair[1])
  const [doubleDays, setDoubleDays] = useState([...settings.doubleOffWeekdays])
  const [nightOnHoliday, setNightOnHoliday] = useState(settings.nightOnHoliday)

  const valid =
    pairA !== pairB && doubleDays.length > 0 && members.every((n) => n.trim().length > 0)

  function toggleDay(d: number) {
    setDoubleDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))
  }

  function save() {
    if (!valid) return
    onSave({
      members: members.map((n) => n.trim()),
      splitPair: [pairA, pairB],
      doubleOffWeekdays: doubleDays,
      nightOnHoliday,
    })
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <h2>설정</h2>
      <p className="sub">변경 사항은 다음 생성부터 적용돼요.</p>

      <div className="sheet-section">
        <div className="label">멤버 (순번 순서)</div>
        <div className="member-grid">
          {members.map((nm, i) => (
            <div className="field" key={i}>
              <label>{i + 1}번</label>
              <input
                type="text"
                value={nm}
                maxLength={6}
                onChange={(e) =>
                  setMembers((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="sheet-section">
        <div className="label">따로 다녀야 하는 페어</div>
        <div className="pair-selects">
          <div className="field">
            <select value={pairA} onChange={(e) => setPairA(Number(e.target.value))}>
              {Array.from({ length: MEMBER_COUNT }, (_, i) => (
                <option key={i} value={i}>
                  {members[i] || `${i + 1}번`}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <select value={pairB} onChange={(e) => setPairB(Number(e.target.value))}>
              {Array.from({ length: MEMBER_COUNT }, (_, i) => (
                <option key={i} value={i}>
                  {members[i] || `${i + 1}번`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="stats-note">두 사람은 같은 날 오프·같은 야간조가 되지 않아요.</p>
      </div>

      <div className="sheet-section">
        <div className="label">2명이 같이 쉬어도 되는 요일</div>
        <div className="day-toggles">
          {OFF_DAY_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`day-toggle${doubleDays.includes(o.value) ? ' on' : ''}`}
              onClick={() => toggleDay(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sheet-section">
        <div className="switch-row">
          <div>
            <div className="t">공휴일에도 야간진료</div>
            <div className="d">월·수가 공휴일일 때 야간을 유지할지</div>
          </div>
          <button
            className={`switch${nightOnHoliday ? ' on' : ''}`}
            onClick={() => setNightOnHoliday((v) => !v)}
            aria-label="공휴일 야간 토글"
          />
        </div>
      </div>

      <div className="sheet-footer">
        <button className="btn btn-secondary" onClick={onClose}>
          취소
        </button>
        <button className="btn btn-primary" disabled={!valid} onClick={save}>
          저장
        </button>
      </div>
      <button className="btn-danger-text" onClick={onReset}>
        모든 데이터 초기화
      </button>
    </Sheet>
  )
}
