export type NoteAnchor = {
  top: number
  left: number
  right: number
  bottom: number
}

export function NotePreview({
  note,
  anchor,
  pinned,
  onKeep,
  onLeave,
}: {
  note: string
  anchor: NoteAnchor
  pinned: boolean
  onKeep: () => void
  onLeave: () => void
}) {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const gap = 14
  const rightSpace = viewportWidth - anchor.right - gap - 12
  const leftSpace = anchor.left - gap - 12
  const placeRight = rightSpace >= leftSpace
  const availableWidth = Math.max(220, placeRight ? rightSpace : leftSpace)
  const width = Math.min(520, availableWidth, viewportWidth - 24)
  const left = placeRight
    ? anchor.right + gap
    : Math.max(12, anchor.left - gap - width)
  const maxHeight = Math.min(600, Math.max(180, viewportHeight * 0.7))
  const top = Math.min(
    Math.max(76, anchor.top),
    Math.max(76, viewportHeight - maxHeight - 12),
  )
  return (
    <div
      className={`note-preview-shell ${placeRight ? 'note-preview-shell-right' : 'note-preview-shell-left'}`}
      style={{
        left: placeRight ? left - gap : left,
        top: top - 12,
        width: width + gap,
        maxHeight: maxHeight + 24,
      }}
      onMouseEnter={onKeep}
      onMouseLeave={onLeave}
    >
      <aside
        className={`note-preview ${pinned ? 'pinned' : ''}`}
        style={{ width, maxHeight }}
        role="tooltip"
      >
        <span className="note-preview-kicker">
          NOTE {pinned && <span>· 選択中</span>}
        </span>
        <p>{note}</p>
      </aside>
    </div>
  )
}
