import { fireEvent, render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { describe, expect, it, vi } from 'vitest'
import { MindNode } from './MindNode'
import { Toolbar } from './Toolbar'
import { Dialog } from './Dialog'
import { createDocument } from '../domain/mindmap'
import { useEditorStore } from '../stores/editorStore'

describe('editor components', () => {
  it('starts and commits node editing', () => {
    const document = createDocument()
    const id = document.nodes[0].id
    useEditorStore
      .getState()
      .setDocument({ document, lastLocalSaveAt: '', dirty: true })
    render(
      <ReactFlowProvider>
        <MindNode
          id={id}
          type="mindNode"
          data={{
            text: '中心テーマ',
            onAdd: vi.fn(),
            onEdit: vi.fn(),
            onMenu: vi.fn(),
          }}
          selected={false}
          selectable
          draggable
          deletable
          zIndex={0}
          isConnectable={false}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />
      </ReactFlowProvider>,
    )
    fireEvent.doubleClick(screen.getByText('中心テーマ'))
    const input = screen.getByLabelText('ノードのテキスト')
    fireEvent.change(input, { target: { value: '更新したテーマ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(useEditorStore.getState().record.document.nodes[0].text).toBe(
      '更新したテーマ',
    )
  })
  it('does not commit Enter during IME composition', () => {
    const document = createDocument()
    const id = document.nodes[0].id
    useEditorStore
      .getState()
      .setDocument({ document, lastLocalSaveAt: '', dirty: true })
    useEditorStore.getState().setEditing(id)
    render(
      <ReactFlowProvider>
        <MindNode
          id={id}
          type="mindNode"
          data={{
            text: '中心テーマ',
            onAdd: vi.fn(),
            onEdit: vi.fn(),
            onMenu: vi.fn(),
          }}
          selected
          selectable
          draggable
          deletable
          zIndex={0}
          isConnectable={false}
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
        />
      </ReactFlowProvider>,
    )
    const input = screen.getByLabelText('ノードのテキスト')
    fireEvent.compositionStart(input)
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(screen.getByLabelText('ノードのテキスト')).toBeInTheDocument()
  })
  it('shows save and offline status', () => {
    const props = {
      title: '地図',
      onTitle: vi.fn(),
      saveLabel: 'ローカル保存済み',
      offline: false,
      undoDisabled: true,
      redoDisabled: true,
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onDriveSave: vi.fn(),
      onFileMenu: vi.fn(),
      onViewMenu: vi.fn(),
      onTheme: vi.fn(),
    }
    const { rerender } = render(<Toolbar {...props} />)
    expect(screen.getByRole('status')).toHaveTextContent('ローカル保存済み')
    rerender(<Toolbar {...props} offline />)
    expect(screen.getByRole('status')).toHaveTextContent('オフライン')
    const parentClick = vi.fn()
    const { unmount } = render(
      <div onClick={parentClick}>
        <Toolbar {...props} />
      </div>,
    )
    fireEvent.click(screen.getAllByRole('button', { name: 'ファイル' }).at(-1)!)
    expect(props.onFileMenu).toHaveBeenCalled()
    expect(parentClick).not.toHaveBeenCalled()
    unmount()
  })
  it('renders an accessible deletion dialog', () => {
    render(
      <Dialog title="子ノードを含むノードの削除" onClose={vi.fn()}>
        <button>すべて削除</button>
      </Dialog>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'すべて削除' }),
    ).toBeInTheDocument()
  })
})
