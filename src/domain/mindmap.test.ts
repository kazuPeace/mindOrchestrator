import { describe, expect, it, vi } from 'vitest'
import {
  addChild,
  addSibling,
  createDocument,
  deleteNode,
  reparentNode,
  updateNode,
  wouldCreateCycle,
} from './mindmap'
import { parseDocument, safeFileName } from './validation'
import { toFlowEdges, toFlowNodes } from './flowAdapter'
import { hasDriveConflict } from './conflict'

describe('mind map domain', () => {
  it('creates a new document with one root', () => {
    const doc = createDocument('考えごと')
    expect(doc.schemaVersion).toBe(1)
    expect(doc.nodes).toHaveLength(1)
    expect(doc.nodes[0].text).toBe('中心テーマ')
    expect(doc.nodes[0].parentId).toBeNull()
  })
  it('adds children and siblings with consistent edges', () => {
    const first = createDocument()
    const root = first.nodes[0].id
    const child = addChild(first, root)
    const sibling = addSibling(child.document, child.nodeId)
    expect(sibling.document.nodes).toHaveLength(3)
    expect(sibling.document.edges).toHaveLength(2)
    expect(
      sibling.document.nodes.find((n) => n.id === sibling.nodeId)?.parentId,
    ).toBe(root)
  })
  it('deletes a leaf', () => {
    const doc = createDocument()
    const child = addChild(doc, doc.nodes[0].id)
    expect(deleteNode(child.document, child.nodeId, 'node').nodes).toHaveLength(
      1,
    )
  })
  it('deletes descendants', () => {
    const doc = createDocument()
    const child = addChild(doc, doc.nodes[0].id)
    const grandchild = addChild(child.document, child.nodeId)
    expect(() =>
      deleteNode(grandchild.document, doc.nodes[0].id, 'branch'),
    ).toThrow('最後のルート')
    const secondRoot = {
      ...doc.nodes[0],
      id: crypto.randomUUID(),
      position: { x: -100, y: 100 },
    }
    expect(
      deleteNode(
        {
          ...grandchild.document,
          nodes: [...grandchild.document.nodes, secondRoot],
        },
        doc.nodes[0].id,
        'branch',
      ).nodes,
    ).toHaveLength(1)
  })
  it('rewires direct children when deleting only the parent', () => {
    const doc = createDocument()
    const child = addChild(doc, doc.nodes[0].id)
    const grandchild = addChild(child.document, child.nodeId)
    const result = deleteNode(grandchild.document, child.nodeId, 'node')
    expect(result.nodes.find((n) => n.id === grandchild.nodeId)?.parentId).toBe(
      doc.nodes[0].id,
    )
  })
  it('prevents cycles', () => {
    const doc = createDocument()
    const child = addChild(doc, doc.nodes[0].id)
    expect(
      wouldCreateCycle(child.document, doc.nodes[0].id, child.nodeId),
    ).toBe(true)
    expect(() =>
      reparentNode(child.document, doc.nodes[0].id, child.nodeId),
    ).toThrow('循環')
  })
  it('converts persistence data without persisting flow callbacks', () => {
    const doc = createDocument()
    const child = addChild(doc, doc.nodes[0].id).document
    const nodes = toFlowNodes(child, {
      onAdd: vi.fn(),
      onEdit: vi.fn(),
      onMenu: vi.fn(),
      onNoteShow: vi.fn(),
      onNoteHide: vi.fn(),
    })
    expect(nodes[0].data.text).toBe('中心テーマ')
    expect(toFlowEdges(child)[0].source).toBe(doc.nodes[0].id)
    expect(JSON.stringify(child)).not.toContain('onAdd')
  })
  it('validates schema versions and required data', () => {
    const doc = createDocument()
    expect(parseDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
    expect(() => parseDocument({ ...doc, schemaVersion: 2 })).toThrow(
      'schemaVersion',
    )
    expect(() => parseDocument({ ...doc, nodes: [] })).toThrow('nodes')
  })
  it('normalizes export filenames', () => {
    expect(safeFileName(' 計画/案.morch ')).toBe('計画_案.morch')
    expect(safeFileName('')).toBe('無題のマップ.morch')
  })
  it('updates node text immutably', () => {
    const doc = createDocument()
    const result = updateNode(doc, doc.nodes[0].id, { text: '' })
    expect(result.nodes[0].text).toBe('')
    expect(result).not.toBe(doc)
  })
  it('stores optional node notes in the persistence model', () => {
    const doc = createDocument()
    const result = updateNode(doc, doc.nodes[0].id, {
      note: '背景と次のアクション',
    })
    expect(result.nodes[0].note).toBe('背景と次のアクション')
    expect(parseDocument(JSON.parse(JSON.stringify(result)))).toEqual(result)
  })
  it('detects Drive conflicts only for dirty records changed remotely', () => {
    const document = createDocument()
    const record = {
      document,
      lastLocalSaveAt: '',
      dirty: true,
      driveModifiedTime: '2026-01-01T00:00:00Z',
    }
    expect(hasDriveConflict(record, '2026-01-02T00:00:00Z')).toBe(true)
    expect(
      hasDriveConflict({ ...record, dirty: false }, '2026-01-02T00:00:00Z'),
    ).toBe(false)
  })
})
