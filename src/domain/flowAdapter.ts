import type { Edge, Node } from '@xyflow/react'
import type { MindMapDocument } from './types'

export type FlowNodeData = {
  text: string
  onAdd: (id: string) => void
  onEdit: (id: string) => void
  onMenu: (id: string, x: number, y: number) => void
}

export function toFlowNodes(
  doc: MindMapDocument,
  actions: Omit<FlowNodeData, 'text'>,
): Node<FlowNodeData>[] {
  return doc.nodes.map((node) => ({
    id: node.id,
    type: 'mindNode',
    position: node.position,
    data: { text: node.text, ...actions },
    selected: false,
  }))
}
export function toFlowEdges(doc: MindMapDocument): Edge[] {
  return doc.edges.map((edge) => ({
    ...edge,
    type: 'default',
    style: { strokeWidth: 2 },
  }))
}
