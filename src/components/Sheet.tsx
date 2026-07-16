import { type ReactNode } from 'react'

interface Props {
  onClose: () => void
  children: ReactNode
}

/** 토스 스타일 바텀시트 */
export function Sheet({ onClose, children }: Props) {
  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        {children}
      </div>
    </div>
  )
}
