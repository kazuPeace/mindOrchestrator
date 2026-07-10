export type Point = { x: number; y: number }
export type MindMapNode = {
  id: string
  text: string
  note?: string
  position: Point
  parentId: string | null
  style?: { backgroundColor?: string; textColor?: string; borderColor?: string }
  createdAt: string
  updatedAt: string
}
export type MindMapEdge = { id: string; source: string; target: string }
export type MindMapDocument = {
  schemaVersion: 1
  id: string
  title: string
  createdAt: string
  updatedAt: string
  viewport: { x: number; y: number; zoom: number }
  nodes: MindMapNode[]
  edges: MindMapEdge[]
}
export type DeleteMode = 'node' | 'branch'

export type DocumentRecord = {
  document: MindMapDocument
  driveFileId?: string
  driveModifiedTime?: string
  lastLocalSaveAt: string
  lastDriveSaveAt?: string
  dirty: boolean
}
