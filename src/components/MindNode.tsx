import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FlowNodeData } from '../domain/flowAdapter'
import { useEditorStore } from '../stores/editorStore'

function NodeTextEditor({
  initialValue,
  seeded,
  onCommit,
  onCancel,
}: {
  initialValue: string
  seeded: boolean
  onCommit: (value: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(initialValue)
  const composing = useRef(false)
  const input = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    const element = input.current
    if (!element) return
    const focusEditor = () => {
      if (!input.current) return
      const editor = input.current
      editor.focus()
      if (seeded)
        editor.setSelectionRange(initialValue.length, initialValue.length)
      else editor.select()
    }
    focusEditor()
    const frame = requestAnimationFrame(focusEditor)
    return () => cancelAnimationFrame(frame)
  }, [initialValue, seeded])
  useEffect(() => {
    const focusEditor = () => {
      const editor = input.current
      if (!editor) return
      editor.focus()
      if (seeded)
        editor.setSelectionRange(initialValue.length, initialValue.length)
      else editor.select()
    }
    focusEditor()
    const timer = window.setTimeout(focusEditor, 0)
    return () => clearTimeout(timer)
  }, [initialValue, seeded])

  return (
    <input
      ref={input}
      autoFocus
      className="node-input nodrag"
      value={draft}
      aria-label="ノードのテキスト"
      onChange={(event) => setDraft(event.target.value)}
      onCompositionStart={() => {
        composing.current = true
      }}
      onCompositionEnd={() => {
        composing.current = false
      }}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => {
        if (
          event.key === 'Enter' &&
          !composing.current &&
          !event.nativeEvent.isComposing
        ) {
          event.preventDefault()
          onCommit(draft)
        }
        if (event.key === 'Escape') onCancel()
      }}
    />
  )
}

export function MindNode({
  id,
  data,
  selected,
}: NodeProps<Node<FlowNodeData>>) {
  const editingId = useEditorStore((state) => state.editingId)
  const editingSeed = useEditorStore((state) => state.editingSeed)
  const setEditing = useEditorStore((state) => state.setEditing)
  const updateText = useEditorStore((state) => state.updateText)
  const editing = editingId === id
  const commit = (value: string) => {
    updateText(id, value)
    setEditing(null)
  }
  return (
    <div
      className={`mind-node ${selected ? 'selected' : ''}`}
      onDoubleClick={() => setEditing(id)}
      onMouseEnter={(event) => {
        if (data.note)
          data.onNoteHover(
            data.note,
            event.currentTarget.getBoundingClientRect(),
          )
      }}
      onMouseLeave={() => data.onNoteHover(null, null)}
    >
      <Handle type="target" position={Position.Left} className="node-handle" />
      {editing ? (
        <NodeTextEditor
          initialValue={editingSeed ?? data.text}
          seeded={editingSeed !== null}
          onCommit={commit}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <span className="node-label">
          {data.text || <span className="empty-label">空のノード</span>}
        </span>
      )}
      {data.note && (
        <span className="node-note-indicator" aria-label="ノートあり">
          N
        </span>
      )}
      <button
        className="node-add nodrag"
        aria-label="子ノードを追加"
        title="子ノードを追加"
        onClick={(event) => {
          event.stopPropagation()
          data.onAdd(id)
        }}
      >
        ＋
      </button>
      <button
        className="node-menu nodrag"
        aria-label="ノードメニュー"
        onClick={(event) => {
          event.stopPropagation()
          const rect = event.currentTarget.getBoundingClientRect()
          data.onMenu(id, rect.left, rect.bottom)
        }}
      >
        •••
      </button>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  )
}
