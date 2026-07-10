import { hasDriveConflict } from '../domain/conflict'
import { parseDocument, safeFileName } from '../domain/validation'
import type { DocumentRecord, MindMapDocument } from '../domain/types'

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
            error_callback: (error: unknown) => void
          }): { requestAccessToken(): void }
        }
      }
    }
  }
}
type TokenResponse = { access_token?: string; error?: string }
type DriveFile = { id: string; name: string; modifiedTime: string }

let accessToken: string | null = null
let scriptPromise: Promise<void> | null = null

function loadIdentityScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error('Google認証ライブラリを読み込めませんでした。'))
    document.head.append(script)
  })
  return scriptPromise
}

export async function authenticate(): Promise<string> {
  if (!navigator.onLine)
    throw new Error('オフラインです。ローカル保存は継続されます。')
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  if (!clientId) throw new Error('Google OAuth Client IDが設定されていません。')
  await loadIdentityScript()
  return new Promise((resolve, reject) => {
    const client = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response) =>
        response.access_token
          ? ((accessToken = response.access_token),
            resolve(response.access_token))
          : reject(new Error('Google認証が拒否されました。')),
      error_callback: () =>
        reject(new Error('Google認証がキャンセルされました。')),
    })
    if (!client) reject(new Error('Google認証を初期化できませんでした。'))
    else client.requestAccessToken()
  })
}

async function token() {
  return accessToken ?? authenticate()
}
async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${await token()}`, ...init?.headers },
  })
  if (response.status === 401) {
    accessToken = null
    throw new Error('Google Driveへの再接続が必要です。')
  }
  if (response.status === 403)
    throw new Error('Google Driveへのアクセス権限がありません。')
  if (response.status === 404)
    throw new Error('Google Driveのファイルが見つかりません。')
  if (response.status === 429)
    throw new Error(
      'Google Driveが混雑しています。しばらくして再試行してください。',
    )
  if (!response.ok)
    throw new Error(
      `Google Driveとの通信に失敗しました（${response.status}）。`,
    )
  return response
}

function multipart(document: MindMapDocument) {
  const boundary = `morc_${crypto.randomUUID()}`
  const metadata = {
    name: safeFileName(document.title),
    mimeType: 'application/json',
    appProperties: {
      mindOrchestrator: 'true',
      schemaVersion: '1',
      documentId: document.id,
    },
  }
  return {
    boundary,
    body: `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(document, null, 2)}\r\n--${boundary}--`,
  }
}

export async function saveToDrive(
  record: DocumentRecord,
  asCopy = false,
): Promise<DriveFile> {
  if (record.driveFileId && !asCopy) {
    const metadata = await api(
      `https://www.googleapis.com/drive/v3/files/${record.driveFileId}?fields=id,name,modifiedTime`,
    )
    const remote = (await metadata.json()) as DriveFile
    if (hasDriveConflict(record, remote.modifiedTime))
      throw new Error('DRIVE_CONFLICT')
  }
  const { boundary, body } = multipart(record.document)
  const id = asCopy ? undefined : record.driveFileId
  const response = await api(
    `https://www.googleapis.com/upload/drive/v3/files${id ? `/${id}` : ''}?uploadType=multipart&fields=id,name,modifiedTime`,
    {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    },
  )
  return response.json() as Promise<DriveFile>
}

export async function listDriveFiles(): Promise<DriveFile[]> {
  const q = encodeURIComponent(
    "appProperties has { key='mindOrchestrator' and value='true' } and trashed=false",
  )
  const response = await api(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
  )
  return ((await response.json()) as { files: DriveFile[] }).files
}
export async function openDriveFile(
  id: string,
): Promise<{ document: MindMapDocument; file: DriveFile }> {
  const [content, metadata] = await Promise.all([
    api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`),
    api(
      `https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,modifiedTime`,
    ),
  ])
  return {
    document: parseDocument(await content.json()),
    file: (await metadata.json()) as DriveFile,
  }
}
