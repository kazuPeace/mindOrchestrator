import { describe, expect, it } from 'vitest'
import { createDocument } from '../domain/mindmap'
import { buildDriveMetadata } from './google'

describe('Google Drive metadata', () => {
  it('adds the selected folder as the parent for new files', () => {
    const document = createDocument('保存先テスト')
    expect(buildDriveMetadata(document, 'folder-123')).toMatchObject({
      name: '保存先テスト.morch',
      parents: ['folder-123'],
      appProperties: { documentId: document.id },
    })
  })

  it('omits parents when the My Drive root is selected', () => {
    expect(buildDriveMetadata(createDocument())).not.toHaveProperty('parents')
  })
})
