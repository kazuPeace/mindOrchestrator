import { beforeEach, describe, expect, it } from 'vitest'
import { createDocument } from '../domain/mindmap'
import { useEditorStore } from './editorStore'

describe('editor history', () => {
  beforeEach(() => {
    const document = createDocument()
    useEditorStore
      .getState()
      .setDocument({ document, lastLocalSaveAt: '', dirty: true })
  })
  it('undoes and redoes map operations', () => {
    const root = useEditorStore.getState().record.document.nodes[0].id
    useEditorStore.getState().addChild(root)
    expect(useEditorStore.getState().record.document.nodes).toHaveLength(2)
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().record.document.nodes).toHaveLength(1)
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().record.document.nodes).toHaveLength(2)
  })
})
