import { create } from 'zustand'
import {
  addChild,
  addSibling,
  createDocument,
  deleteNode,
  updateNode,
} from '../domain/mindmap'
import type {
  DeleteMode,
  DocumentRecord,
  MindMapDocument,
  Point,
} from '../domain/types'

type Snapshot = MindMapDocument
type EditorState = {
  record: DocumentRecord
  selectedId: string | null
  editingId: string | null
  editingSeed: string | null
  past: Snapshot[]
  future: Snapshot[]
  localStatus: 'saving' | 'saved' | 'error'
  error: string | null
  setDocument: (record: DocumentRecord) => void
  newDocument: () => void
  setSelected: (id: string | null) => void
  setEditing: (id: string | null, seed?: string) => void
  addChild: (parentId: string) => string
  addSibling: (nodeId: string) => string
  updateText: (id: string, text: string) => void
  updateNote: (id: string, note: string) => void
  updatePosition: (id: string, point: Point, recordHistory?: boolean) => void
  deleteNode: (id: string, mode: DeleteMode) => void
  updateTitle: (title: string) => void
  updateViewport: (viewport: MindMapDocument['viewport']) => void
  undo: () => void
  redo: () => void
  markLocalSaving: () => void
  markLocalSaved: (at: string) => void
  markDriveSaved: (fileId: string, modifiedTime: string) => void
  setError: (error: string | null) => void
}

const recordFor = (document: MindMapDocument): DocumentRecord => ({
  document,
  lastLocalSaveAt: '',
  dirty: true,
})
const initialRecord = recordFor(createDocument())
const mutated = (
  state: EditorState,
  document: MindMapDocument,
  history = true,
) => ({
  record: { ...state.record, document, dirty: true },
  past: history
    ? [...state.past.slice(-99), state.record.document]
    : state.past,
  future: history ? [] : state.future,
})

export const useEditorStore = create<EditorState>((set, get) => ({
  record: initialRecord,
  selectedId: initialRecord.document.nodes[0].id,
  editingId: null,
  editingSeed: null,
  past: [],
  future: [],
  localStatus: 'saved',
  error: null,
  setDocument: (record) =>
    set({
      record,
      selectedId: record.document.nodes[0]?.id ?? null,
      editingId: null,
      editingSeed: null,
      past: [],
      future: [],
      error: null,
    }),
  newDocument: () => {
    const record = recordFor(createDocument())
    set({
      record,
      selectedId: record.document.nodes[0].id,
      editingId: null,
      editingSeed: null,
      past: [],
      future: [],
    })
  },
  setSelected: (selectedId) => set({ selectedId }),
  setEditing: (editingId, seed) =>
    set({
      editingId,
      editingSeed: editingId && seed !== undefined ? seed : null,
    }),
  addChild: (parentId) => {
    const state = get()
    const result = addChild(state.record.document, parentId)
    set({
      ...mutated(state, result.document),
      selectedId: result.nodeId,
      editingId: result.nodeId,
      editingSeed: null,
    })
    return result.nodeId
  },
  addSibling: (nodeId) => {
    const state = get()
    const result = addSibling(state.record.document, nodeId)
    set({
      ...mutated(state, result.document),
      selectedId: result.nodeId,
      editingId: result.nodeId,
      editingSeed: null,
    })
    return result.nodeId
  },
  updateText: (id, text) =>
    set((state) => ({
      ...mutated(state, updateNode(state.record.document, id, { text })),
    })),
  updateNote: (id, note) =>
    set((state) => ({
      ...mutated(
        state,
        updateNode(state.record.document, id, {
          note: note.trim() ? note : undefined,
        }),
      ),
    })),
  updatePosition: (id, point, recordHistory = true) =>
    set((state) => ({
      ...mutated(
        state,
        updateNode(state.record.document, id, { position: point }),
        recordHistory,
      ),
    })),
  deleteNode: (id, mode) =>
    set((state) => ({
      ...mutated(state, deleteNode(state.record.document, id, mode)),
      selectedId: null,
      editingId: null,
      editingSeed: null,
    })),
  updateTitle: (title) =>
    set((state) => ({
      ...mutated(state, {
        ...state.record.document,
        title,
        updatedAt: new Date().toISOString(),
      }),
    })),
  updateViewport: (viewport) =>
    set((state) => ({
      record: {
        ...state.record,
        document: { ...state.record.document, viewport },
        dirty: true,
      },
    })),
  undo: () =>
    set((state) => {
      const previous = state.past.at(-1)
      return previous
        ? {
            record: { ...state.record, document: previous, dirty: true },
            past: state.past.slice(0, -1),
            future: [state.record.document, ...state.future],
            selectedId: null,
            editingId: null,
            editingSeed: null,
          }
        : state
    }),
  redo: () =>
    set((state) => {
      const next = state.future[0]
      return next
        ? {
            record: { ...state.record, document: next, dirty: true },
            past: [...state.past, state.record.document],
            future: state.future.slice(1),
            selectedId: null,
            editingId: null,
            editingSeed: null,
          }
        : state
    }),
  markLocalSaving: () => set({ localStatus: 'saving' }),
  markLocalSaved: (at) =>
    set((state) => ({
      record: { ...state.record, lastLocalSaveAt: at },
      localStatus: 'saved',
    })),
  markDriveSaved: (fileId, modifiedTime) =>
    set((state) => ({
      record: {
        ...state.record,
        driveFileId: fileId,
        driveModifiedTime: modifiedTime,
        lastDriveSaveAt: new Date().toISOString(),
        dirty: false,
      },
    })),
  setError: (error) =>
    set({ error, localStatus: error ? 'error' : get().localStatus }),
}))
