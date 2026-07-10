import type {
  DeleteMode,
  MindMapDocument,
  MindMapEdge,
  MindMapNode,
} from './types'

const now = () => new Date().toISOString()
const uid = () => crypto.randomUUID()
const edgeFor = (parentId: string, childId: string): MindMapEdge => ({
  id: `e-${parentId}-${childId}`,
  source: parentId,
  target: childId,
})

export function createDocument(title = '無題のマップ'): MindMapDocument {
  const time = now()
  const root: MindMapNode = {
    id: uid(),
    text: '中心テーマ',
    position: { x: 320, y: 220 },
    parentId: null,
    createdAt: time,
    updatedAt: time,
  }
  return {
    schemaVersion: 1,
    id: uid(),
    title,
    createdAt: time,
    updatedAt: time,
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes: [root],
    edges: [],
  }
}

function withUpdated(
  doc: MindMapDocument,
  nodes: MindMapNode[],
): MindMapDocument {
  const ids = new Set(nodes.map((node) => node.id))
  return {
    ...doc,
    nodes,
    edges: nodes.flatMap((node) =>
      node.parentId && ids.has(node.parentId)
        ? [edgeFor(node.parentId, node.id)]
        : [],
    ),
    updatedAt: now(),
  }
}

export function addChild(
  doc: MindMapDocument,
  parentId: string,
): { document: MindMapDocument; nodeId: string } {
  const parent = doc.nodes.find((node) => node.id === parentId)
  if (!parent) throw new Error('親ノードが見つかりません。')
  const siblings = doc.nodes.filter((node) => node.parentId === parentId).length
  const time = now()
  const node: MindMapNode = {
    id: uid(),
    text: '新しいアイデア',
    position: {
      x: parent.position.x + 250,
      y: parent.position.y + siblings * 92 - siblings * 18,
    },
    parentId,
    createdAt: time,
    updatedAt: time,
  }
  return { document: withUpdated(doc, [...doc.nodes, node]), nodeId: node.id }
}

export function addSibling(doc: MindMapDocument, nodeId: string) {
  const node = doc.nodes.find((item) => item.id === nodeId)
  if (!node) throw new Error('ノードが見つかりません。')
  return addChild(doc, node.parentId ?? node.id)
}

export function updateNode(
  doc: MindMapDocument,
  nodeId: string,
  patch: Partial<Pick<MindMapNode, 'text' | 'note' | 'position' | 'style'>>,
): MindMapDocument {
  return withUpdated(
    doc,
    doc.nodes.map((node) =>
      node.id === nodeId ? { ...node, ...patch, updatedAt: now() } : node,
    ),
  )
}

export function wouldCreateCycle(
  doc: MindMapDocument,
  nodeId: string,
  nextParentId: string,
): boolean {
  let cursor: string | null = nextParentId
  while (cursor) {
    if (cursor === nodeId) return true
    cursor = doc.nodes.find((node) => node.id === cursor)?.parentId ?? null
  }
  return false
}

export function reparentNode(
  doc: MindMapDocument,
  nodeId: string,
  nextParentId: string,
): MindMapDocument {
  if (wouldCreateCycle(doc, nodeId, nextParentId))
    throw new Error('循環する親子関係は作成できません。')
  return withUpdated(
    doc,
    doc.nodes.map((node) =>
      node.id === nodeId
        ? { ...node, parentId: nextParentId, updatedAt: now() }
        : node,
    ),
  )
}

function descendantsOf(doc: MindMapDocument, nodeId: string): Set<string> {
  const result = new Set<string>()
  const visit = (id: string) =>
    doc.nodes
      .filter((node) => node.parentId === id)
      .forEach((child) => {
        result.add(child.id)
        visit(child.id)
      })
  visit(nodeId)
  return result
}

export function deleteNode(
  doc: MindMapDocument,
  nodeId: string,
  mode: DeleteMode,
): MindMapDocument {
  const target = doc.nodes.find((node) => node.id === nodeId)
  if (!target) return doc
  if (
    target.parentId === null &&
    doc.nodes.filter((node) => node.parentId === null).length === 1
  )
    throw new Error('最後のルートノードは削除できません。')
  const removed =
    mode === 'branch'
      ? descendantsOf(doc, nodeId).add(nodeId)
      : new Set([nodeId])
  const nodes = doc.nodes
    .filter((node) => !removed.has(node.id))
    .map((node) =>
      node.parentId === nodeId
        ? { ...node, parentId: target.parentId, updatedAt: now() }
        : node,
    )
  return withUpdated(doc, nodes)
}

export function hasChildren(doc: MindMapDocument, nodeId: string) {
  return doc.nodes.some((node) => node.parentId === nodeId)
}
