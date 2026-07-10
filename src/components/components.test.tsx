import { fireEvent, render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { describe, expect, it, vi } from 'vitest'
import { MindNode } from './MindNode'
import { Toolbar } from './Toolbar'
import { Dialog } from './Dialog'
import { DriveFolderDialog } from './DriveFolderDialog'
import { NoteEditorDialog } from './NoteEditorDialog'
import { NotePreview } from './NotePreview'
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
            onNoteShow: vi.fn(),
            onNoteHide: vi.fn(),
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
            onNoteShow: vi.fn(),
            onNoteHide: vi.fn(),
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
    expect(input).toHaveFocus()
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'か' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(screen.getByLabelText('ノードのテキスト')).toBeInTheDocument()
    fireEvent.compositionEnd(input)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(useEditorStore.getState().record.document.nodes[0].text).toBe('か')
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
  it('shows and changes the Drive destination folder', () => {
    const onChoose = vi.fn()
    const onUseRoot = vi.fn()
    render(
      <DriveFolderDialog
        folder={{ id: 'folder-1', name: '企画マップ' }}
        busy={false}
        onChoose={onChoose}
        onUseRoot={onUseRoot}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('企画マップ')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'フォルダを選択' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'マイドライブ直下に戻す' }),
    )
    expect(onChoose).toHaveBeenCalledOnce()
    expect(onUseRoot).toHaveBeenCalledOnce()
  })
  it('edits a multiline note and renders its hover preview', () => {
    const onSave = vi.fn()
    const onKeep = vi.fn()
    const onLeave = vi.fn()
    render(
      <>
        <NoteEditorDialog
          nodeText="調査"
          initialNote="既存ノート"
          onSave={onSave}
          onClose={vi.fn()}
        />
        <NotePreview
          note={'背景情報\n次のアクション'}
          anchor={{ top: 100, left: 100, right: 220, bottom: 150 }}
          pinned
          onKeep={onKeep}
          onLeave={onLeave}
        />
      </>,
    )
    const textarea = screen.getByLabelText('ノート')
    fireEvent.change(textarea, { target: { value: '更新したノート' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onSave).toHaveBeenCalledWith('更新したノート')
    expect(screen.getByRole('tooltip')).toHaveTextContent('次のアクション')
    expect(screen.getByRole('tooltip')).toHaveTextContent('選択中')
    fireEvent.mouseEnter(screen.getByRole('tooltip').parentElement!)
    fireEvent.mouseLeave(screen.getByRole('tooltip').parentElement!)
    expect(onKeep).toHaveBeenCalledOnce()
    expect(onLeave).toHaveBeenCalledOnce()
  })
})
