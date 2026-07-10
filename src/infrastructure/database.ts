import { openDB, type DBSchema } from 'idb'
import type { DocumentRecord } from '../domain/types'

interface MindDb extends DBSchema {
  documents: {
    key: string
    value: DocumentRecord
    indexes: { 'by-updated': string }
  }
  settings: { key: string; value: string }
}

const db = () =>
  openDB<MindDb>('mind-orchestrator', 1, {
    upgrade(database) {
      const docs = database.createObjectStore('documents', {
        keyPath: 'document.id',
      })
      docs.createIndex('by-updated', 'document.updatedAt')
      database.createObjectStore('settings')
    },
  })

export async function saveRecord(record: DocumentRecord) {
  return (await db()).put('documents', record)
}
export async function loadRecord(id: string) {
  return (await db()).get('documents', id)
}
export async function loadLastRecord() {
  const database = await db()
  const id = await database.get('settings', 'lastDocumentId')
  return id ? database.get('documents', id) : undefined
}
export async function listRecords() {
  const values = await (await db()).getAllFromIndex('documents', 'by-updated')
  return values.reverse()
}
export async function setLastDocument(id: string) {
  return (await db()).put('settings', id, 'lastDocumentId')
}
export async function deleteSetting(key: string) {
  return (await db()).delete('settings', key)
}
export async function getSetting(key: string) {
  return (await db()).get('settings', key)
}
export async function setSetting(key: string, value: string) {
  return (await db()).put('settings', value, key)
}
