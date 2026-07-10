import type { MindMapDocument } from './types'

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function parseDocument(value: unknown): MindMapDocument {
  if (!isObject(value))
    throw new Error('ファイルの内容がJSONオブジェクトではありません。')
  if (value.schemaVersion !== 1)
    throw new Error(
      `対応していないschemaVersionです: ${String(value.schemaVersion)}`,
    )
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string'
  )
    throw new Error('ドキュメントの必須項目が不足しています。')
  if (
    !isObject(value.viewport) ||
    typeof value.viewport.x !== 'number' ||
    typeof value.viewport.y !== 'number' ||
    typeof value.viewport.zoom !== 'number'
  )
    throw new Error('viewportが不正です。')
  if (
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges) ||
    value.nodes.length === 0
  )
    throw new Error('nodesまたはedgesが不正です。')
  const ids = new Set<string>()
  for (const raw of value.nodes) {
    if (
      !isObject(raw) ||
      typeof raw.id !== 'string' ||
      typeof raw.text !== 'string' ||
      !isObject(raw.position) ||
      typeof raw.position.x !== 'number' ||
      typeof raw.position.y !== 'number' ||
      !(raw.parentId === null || typeof raw.parentId === 'string') ||
      typeof raw.createdAt !== 'string' ||
      typeof raw.updatedAt !== 'string'
    )
      throw new Error('ノードの形式が不正です。')
    if (ids.has(raw.id)) throw new Error('ノードIDが重複しています。')
    ids.add(raw.id)
  }
  for (const raw of value.nodes as unknown as Array<{
    id: string
    parentId: string | null
  }>)
    if (raw.parentId && !ids.has(raw.parentId))
      throw new Error('存在しない親ノードが指定されています。')
  return value as unknown as MindMapDocument
}

export function safeFileName(title: string): string {
  const withoutControls = [...title]
    .map((character) => (character.charCodeAt(0) < 32 ? '_' : character))
    .join('')
  const base =
    withoutControls
      .trim()
      .replace(/\.morch$/i, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\.+$/g, '')
      .slice(0, 100) || '無題のマップ'
  return `${base}.morch`
}
