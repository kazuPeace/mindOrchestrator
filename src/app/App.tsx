import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useReactFlow,
  type NodeMouseHandler,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Dialog } from '../components/Dialog'
import { MindNode } from '../components/MindNode'
import { Toolbar } from '../components/Toolbar'
import { hasChildren } from '../domain/mindmap'
import { toFlowEdges, toFlowNodes } from '../domain/flowAdapter'
import { parseDocument, safeFileName } from '../domain/validation'
import {
  deleteSetting,
  listRecords,
  loadLastRecord,
  saveRecord,
  setLastDocument,
} from '../infrastructure/database'
import {
  listDriveFiles,
  openDriveFile,
  saveToDrive,
} from '../infrastructure/google'
import { useEditorStore } from '../stores/editorStore'
import type { DocumentRecord } from '../domain/types'

type Menu = {
  type: 'file' | 'view' | 'node'
  x: number
  y: number
  nodeId?: string
} | null
type DriveFile = { id: string; name: string; modifiedTime: string }
const nodeTypes = { mindNode: MindNode }

export function App() {
  const store = useEditorStore()
  const currentDocument = store.record.document
  const driveFileId = store.record.driveFileId
  const dirty = store.record.dirty
  const markLocalSaving = store.markLocalSaving
  const markLocalSaved = store.markLocalSaved
  const setStoreError = store.setError
  const flow = useReactFlow()
  const [ready, setReady] = useState(false)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  )
  const [menu, setMenu] = useState<Menu>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [recent, setRecent] = useState<DocumentRecord[]>([])
  const [driveFiles, setDriveFiles] = useState<DriveFile[] | null>(null)
  const [driveBusy, setDriveBusy] = useState(false)
  const [driveState, setDriveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  const [conflict, setConflict] = useState(false)
  const dragStart = useRef<{ id: string; x: number; y: number } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => {
    deleteSetting('googleClientId').catch((error) =>
      console.error('以前のGoogle設定を削除できませんでした。', error),
    )
  }, [])
  useEffect(() => {
    loadLastRecord()
      .then((record) => {
        if (record) store.setDocument(record)
      })
      .catch((error) =>
        store.setError(
          error instanceof Error
            ? `ローカルデータを読み込めません: ${error.message}`
            : 'ローカルデータを読み込めません。',
        ),
      )
      .finally(() => setReady(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const online = () => setOffline(false)
    const offlineHandler = () => setOffline(true)
    addEventListener('online', online)
    addEventListener('offline', offlineHandler)
    return () => {
      removeEventListener('online', online)
      removeEventListener('offline', offlineHandler)
    }
  }, [])
  useEffect(() => {
    if (!ready) return
    markLocalSaving()
    const timer = window.setTimeout(async () => {
      try {
        const time = new Date().toISOString()
        const nextRecord = {
          ...useEditorStore.getState().record,
          lastLocalSaveAt: time,
        }
        await saveRecord(nextRecord)
        await setLastDocument(nextRecord.document.id)
        markLocalSaved(time)
      } catch (error) {
        console.error(error)
        setStoreError(
          'ローカル保存に失敗しました。ブラウザの保存容量と設定を確認してください。',
        )
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [
    currentDocument,
    driveFileId,
    dirty,
    ready,
    markLocalSaving,
    markLocalSaved,
    setStoreError,
  ])

  const actions = useMemo(
    () => ({
      onAdd: (id: string) => store.addChild(id),
      onEdit: (id: string) => store.setEditing(id),
      onMenu: (id: string, x: number, y: number) =>
        setMenu({ type: 'node', nodeId: id, x, y }),
    }),
    [store],
  )
  const nodes = useMemo(
    () =>
      toFlowNodes(store.record.document, actions).map((node) => ({
        ...node,
        selected: node.id === store.selectedId,
      })),
    [store.record.document, store.selectedId, actions],
  )
  const edges = useMemo(
    () => toFlowEdges(store.record.document),
    [store.record.document],
  )

  const requestDelete = useCallback(
    (id: string) => {
      if (hasChildren(store.record.document, id)) setDeleteTarget(id)
      else {
        try {
          store.deleteNode(id, 'node')
        } catch (error) {
          store.setError(
            error instanceof Error ? error.message : '削除できませんでした。',
          )
        }
      }
    },
    [store],
  )
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, [contenteditable=true], dialog'))
        return
      const mod = event.metaKey || event.ctrlKey
      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) store.redo()
        else store.undo()
        return
      }
      if (!store.selectedId) return
      if (event.key === 'Tab') {
        event.preventDefault()
        store.addChild(store.selectedId)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        store.addSibling(store.selectedId)
      } else if (event.key === 'F2') {
        event.preventDefault()
        store.setEditing(store.selectedId)
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        requestDelete(store.selectedId)
      } else if (event.key.length === 1 && !mod && !event.altKey) {
        event.preventDefault()
        store.setEditing(store.selectedId, event.key)
      }
    }
    addEventListener('keydown', handler)
    return () => removeEventListener('keydown', handler)
  }, [store, requestDelete])

  const saveDrive = async (asCopy = false) => {
    if (driveBusy) return
    setDriveBusy(true)
    setDriveState('saving')
    store.setError(null)
    try {
      const file = await saveToDrive(store.record, asCopy)
      store.markDriveSaved(file.id, file.modifiedTime)
      setDriveState('saved')
      setConflict(false)
    } catch (error) {
      console.error(error)
      if (error instanceof Error && error.message === 'DRIVE_CONFLICT')
        setConflict(true)
      else
        store.setError(
          error instanceof Error ? error.message : 'Drive保存に失敗しました。',
        )
      setDriveState('error')
    } finally {
      setDriveBusy(false)
    }
  }
  const showDriveFiles = async () => {
    setDriveBusy(true)
    store.setError(null)
    try {
      setDriveFiles(await listDriveFiles())
    } catch (error) {
      console.error(error)
      store.setError(
        error instanceof Error
          ? error.message
          : 'Drive一覧を取得できませんでした。',
      )
    } finally {
      setDriveBusy(false)
    }
  }
  const loadDrive = async (id: string) => {
    try {
      const result = await openDriveFile(id)
      store.setDocument({
        document: result.document,
        driveFileId: result.file.id,
        driveModifiedTime: result.file.modifiedTime,
        lastLocalSaveAt: '',
        lastDriveSaveAt: new Date().toISOString(),
        dirty: false,
      })
      setConflict(false)
      setDriveFiles(null)
    } catch (error) {
      console.error(error)
      store.setError(
        error instanceof Error
          ? error.message
          : 'Driveファイルを開けませんでした。',
      )
    }
  }
  const exportFile = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(store.record.document, null, 2)], {
        type: 'application/vnd.mindorchestrator.map+json',
      }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = safeFileName(store.record.document.title)
    link.click()
    URL.revokeObjectURL(url)
  }
  const importFile = async (file?: File) => {
    if (!file) return
    try {
      store.setDocument({
        document: parseDocument(JSON.parse(await file.text())),
        lastLocalSaveAt: '',
        dirty: true,
      })
    } catch (error) {
      store.setError(
        error instanceof Error
          ? `ファイルを開けません: ${error.message}`
          : 'ファイルを開けません。',
      )
    }
  }
  const openRecent = async () => {
    setRecent(await listRecords())
    setMenu(null)
  }
  const centerSelected = () => {
    const node = nodes.find((item) => item.id === store.selectedId)
    if (node)
      flow.setCenter(node.position.x + 90, node.position.y + 30, {
        zoom: Math.max(flow.getZoom(), 1),
        duration: 400,
      })
  }
  const saveLabel =
    driveState === 'saving'
      ? 'Drive保存中'
      : store.localStatus === 'saving'
        ? 'ローカル保存中'
        : store.record.dirty
          ? 'ローカル保存済み · Drive未同期'
          : 'Drive保存済み'

  const onNodeClick: NodeMouseHandler = (_, node) => store.setSelected(node.id)
  if (!ready)
    return (
      <main className="loading">
        <span className="brand-mark">M</span>
        <p>マップを準備しています…</p>
      </main>
    )
  return (
    <main className="app-shell" onClick={() => setMenu(null)}>
      <Toolbar
        title={store.record.document.title}
        onTitle={store.updateTitle}
        saveLabel={saveLabel}
        offline={offline}
        undoDisabled={!store.past.length}
        redoDisabled={!store.future.length}
        onUndo={store.undo}
        onRedo={store.redo}
        onDriveSave={() => saveDrive()}
        onFileMenu={() => setMenu({ type: 'file', x: innerWidth - 330, y: 60 })}
        onViewMenu={() => setMenu({ type: 'view', x: innerWidth - 240, y: 60 })}
        onTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      />
      <section className="canvas" aria-label="マインドマップキャンバス">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => store.setSelected(null)}
          onNodeDoubleClick={(_, node) => store.setEditing(node.id)}
          onNodeDragStart={(_, node) => {
            dragStart.current = {
              id: node.id,
              x: node.position.x,
              y: node.position.y,
            }
          }}
          onNodeDragStop={(_, node) => {
            const start = dragStart.current
            if (
              start &&
              (start.x !== node.position.x || start.y !== node.position.y)
            )
              store.updatePosition(node.id, node.position, true)
            dragStart.current = null
          }}
          onMoveEnd={(_, viewport) => store.updateViewport(viewport)}
          defaultViewport={store.record.document.viewport}
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.25}
          maxZoom={2.5}
          panOnScroll
          zoomOnPinch
          zoomOnScroll
          selectionOnDrag={false}
          deleteKeyCode={null}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} />
          <Controls position="bottom-right" showInteractive={false} />
        </ReactFlow>
        {store.selectedId && (
          <button className="floating-center" onClick={centerSelected}>
            選択ノードを中央へ
          </button>
        )}
      </section>
      <input
        ref={fileInput}
        type="file"
        accept=".morch,.json,application/json"
        hidden
        onChange={(event) => importFile(event.target.files?.[0])}
      />
      {menu && (
        <div
          className="popover"
          style={{ left: Math.max(12, menu.x), top: menu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {menu.type === 'file' && (
            <>
              <button
                onClick={() => {
                  store.newDocument()
                  setMenu(null)
                }}
              >
                新規作成
              </button>
              <button onClick={() => fileInput.current?.click()}>
                ローカルファイルを開く
              </button>
              <button onClick={openRecent}>最近のマップ</button>
              <button onClick={exportFile}>JSONを書き出す</button>
              <hr />
              <button onClick={showDriveFiles} disabled={driveBusy}>
                Driveから開く
              </button>
              <button onClick={() => saveDrive()}>Driveに保存</button>
              <button onClick={() => saveDrive(true)}>Driveへ別名で保存</button>
            </>
          )}
          {menu.type === 'view' && (
            <>
              <button
                onClick={() => flow.fitView({ padding: 0.25, duration: 400 })}
              >
                全体表示
              </button>
              <button onClick={centerSelected} disabled={!store.selectedId}>
                選択ノードへ移動
              </button>
              <button onClick={() => flow.zoomIn({ duration: 200 })}>
                ズームイン
              </button>
              <button onClick={() => flow.zoomOut({ duration: 200 })}>
                ズームアウト
              </button>
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                テーマ切替
              </button>
            </>
          )}
          {menu.type === 'node' && (
            <>
              <button onClick={() => store.addChild(menu.nodeId!)}>
                子ノードを追加
              </button>
              <button onClick={() => store.setEditing(menu.nodeId!)}>
                テキストを編集
              </button>
              <button
                className="danger"
                onClick={() => requestDelete(menu.nodeId!)}
              >
                削除
              </button>
            </>
          )}
        </div>
      )}
      {deleteTarget && (
        <Dialog
          title="子ノードを含むノードの削除"
          onClose={() => setDeleteTarget(null)}
        >
          <p>このノードには子ノードがあります。削除方法を選んでください。</p>
          <div className="dialog-actions vertical">
            <button
              onClick={() => {
                store.deleteNode(deleteTarget, 'node')
                setDeleteTarget(null)
              }}
            >
              このノードだけ削除し、子を親へつなぎ替える
            </button>
            <button
              className="danger"
              onClick={() => {
                store.deleteNode(deleteTarget, 'branch')
                setDeleteTarget(null)
              }}
            >
              このノードとすべての子孫を削除
            </button>
            <button onClick={() => setDeleteTarget(null)}>キャンセル</button>
          </div>
        </Dialog>
      )}
      {recent.length > 0 && (
        <Dialog title="最近のマップ" onClose={() => setRecent([])}>
          <div className="file-list">
            {recent.map((item) => (
              <button
                key={item.document.id}
                onClick={() => {
                  store.setDocument(item)
                  setRecent([])
                }}
              >
                <strong>{item.document.title}</strong>
                <small>
                  {new Date(item.document.updatedAt).toLocaleString('ja-JP')}
                </small>
              </button>
            ))}
          </div>
        </Dialog>
      )}
      {driveFiles && (
        <Dialog title="Driveから開く" onClose={() => setDriveFiles(null)}>
          <div className="file-list">
            {driveFiles.length ? (
              driveFiles.map((file) => (
                <button key={file.id} onClick={() => loadDrive(file.id)}>
                  <strong>{file.name}</strong>
                  <small>
                    {new Date(file.modifiedTime).toLocaleString('ja-JP')}
                  </small>
                </button>
              ))
            ) : (
              <p>このアプリで利用できるファイルはありません。</p>
            )}
          </div>
        </Dialog>
      )}
      {conflict && (
        <Dialog title="Drive版との競合" onClose={() => setConflict(false)}>
          <p>
            ローカル版とDrive版の両方が変更されています。上書きせず、操作を選んでください。
          </p>
          <div className="dialog-actions vertical">
            <button
              onClick={() =>
                store.record.driveFileId && loadDrive(store.record.driveFileId)
              }
            >
              Drive版を開く
            </button>
            <button onClick={() => setConflict(false)}>ローカル版を維持</button>
            <button onClick={() => saveDrive(true)}>
              ローカル版を別名で保存
            </button>
            <button onClick={() => setConflict(false)}>キャンセル</button>
          </div>
        </Dialog>
      )}
      {store.error && (
        <div className="toast error" role="alert">
          <span>{store.error}</span>
          <button onClick={() => store.setError(null)}>×</button>
        </div>
      )}
      {needRefresh && (
        <div className="toast">
          <span>新しいバージョンを利用できます。</span>
          <button onClick={() => updateServiceWorker(true)}>更新</button>
          <button onClick={() => setNeedRefresh(false)}>後で</button>
        </div>
      )}
    </main>
  )
}
