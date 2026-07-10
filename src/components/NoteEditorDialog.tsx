import { useRef, useState } from 'react'
import { Dialog } from './Dialog'

export function NoteEditorDialog({
  nodeText,
  initialNote,
  onSave,
  onClose,
}: {
  nodeText: string
  initialNote: string
  onSave: (note: string) => void
  onClose: () => void
}) {
  const [note, setNote] = useState(initialNote)
  const composing = useRef(false)
  return (
    <Dialog title="ノートを編集" onClose={onClose}>
      <form
        className="note-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSave(note)
        }}
      >
        <p className="note-node-label">{nodeText || '空のノード'}</p>
        <label htmlFor="node-note">ノート</label>
        <textarea
          id="node-note"
          value={note}
          autoFocus
          rows={8}
          placeholder="補足、背景、次に考えることなどを入力…"
          onChange={(event) => setNote(event.target.value)}
          onCompositionStart={() => {
            composing.current = true
          }}
          onCompositionEnd={() => {
            composing.current = false
          }}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              (event.metaKey || event.ctrlKey) &&
              !composing.current &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault()
              onSave(note)
            }
          }}
        />
        <p className="note-help">
          Ctrl/Cmd + Enterでも保存できます。空で保存するとノートを削除します。
        </p>
        <div className="dialog-actions note-actions">
          <button type="button" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className="primary-button">
            保存
          </button>
        </div>
      </form>
    </Dialog>
  )
}
