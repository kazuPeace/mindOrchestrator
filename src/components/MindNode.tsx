import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { useEffect, useRef, useState } from 'react'
import type { FlowNodeData } from '../domain/flowAdapter'
import { useEditorStore } from '../stores/editorStore'

export function MindNode({
  id,
  data,
  selected,
}: NodeProps<Node<FlowNodeData>>) {
  const editingId = useEditorStore((state) => state.editingId)
  const editingSeed = useEditorStore((state) => state.editingSeed)
  const setEditing = useEditorStore((state) => state.setEditing)
  const updateText = useEditorStore((state) => state.updateText)
  const [draft, setDraft] = useState(data.text)
  const composing = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const editing = editingId === id
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setDraft(editing && editingSeed !== null ? editingSeed : data.text),
    )
    return () => cancelAnimationFrame(frame)
  }, [data.text, editing, editingSeed])
  useEffect(() => {
    if (!editing) return
    if (editingSeed === null) input.current?.select()
    else {
      input.current?.focus()
      input.current?.setSelectionRange(editingSeed.length, editingSeed.length)
    }
  }, [editing, editingSeed])
  const commit = () => {
    updateText(id, draft)
    setEditing(null)
  }
  return (
    <div
      className={`mind-node ${selected ? 'selected' : ''}`}
      onDoubleClick={() => setEditing(id)}
    >
      <Handle type="target" position={Position.Left} className="node-handle" />
      {editing ? (
        <input
          ref={input}
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
          onBlur={commit}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !composing.current &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault()
              commit()
            }
            if (event.key === 'Escape') {
              setDraft(data.text)
              setEditing(null)
            }
          }}
        />
      ) : (
        <span className="node-label">
          {data.text || <span className="empty-label">空のノード</span>}
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
