export type NoteAnchor = {
  top: number
  left: number
  right: number
  bottom: number
}

export function NotePreview({
  note,
  anchor,
}: {
  note: string
  anchor: NoteAnchor
}) {
  const width = Math.min(320, Math.max(240, window.innerWidth - 32))
  const gap = 14
  const fitsRight = anchor.right + gap + width <= window.innerWidth - 12
  const left = fitsRight
    ? anchor.right + gap
    : Math.max(12, anchor.left - gap - width)
  const top = Math.min(
    Math.max(76, anchor.top),
    Math.max(76, window.innerHeight - 250),
  )
  return (
    <aside
      className={`note-preview ${fitsRight ? 'note-preview-right' : 'note-preview-left'}`}
      style={{ left, top, width }}
      role="tooltip"
    >
      <span className="note-preview-kicker">NOTE</span>
      <p>{note}</p>
    </aside>
  )
}
