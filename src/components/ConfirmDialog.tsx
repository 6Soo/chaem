interface Props {
  title: string
  desc: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, desc, confirmLabel, danger, onConfirm, onCancel }: Props) {
  return (
    <div
      className="dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="dialog" role="alertdialog" aria-modal="true">
        <h3>{title}</h3>
        <p>{desc}</p>
        <div className="row">
          <button className="btn btn-secondary" onClick={onCancel}>
            취소
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} style={{ flex: 1 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
