import { useState, type FormEvent } from 'react'
import { Dialog } from './Dialog'

export function GoogleDriveSettings({
  initialClientId,
  connected,
  busy,
  onSave,
  onConnect,
  onRemove,
  onClose,
}: {
  initialClientId: string
  connected: boolean
  busy: boolean
  onSave: (clientId: string) => Promise<void>
  onConnect: () => Promise<void>
  onRemove: () => Promise<void>
  onClose: () => void
}) {
  const [clientId, setClientId] = useState(initialClientId)
  const [validation, setValidation] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = clientId.trim()
    if (!value.endsWith('.apps.googleusercontent.com')) {
      setValidation(
        'ウェブアプリケーション用のOAuth Client IDを入力してください。',
      )
      return
    }
    setValidation('')
    await onSave(value)
  }

  return (
    <Dialog title="Google Drive設定" onClose={onClose}>
      <form className="settings-form" onSubmit={submit}>
        <p>
          Google Cloudで作成した「ウェブ アプリケーション」のOAuth Client
          IDを入力します。Client Secretは入力しないでください。
        </p>
        <label htmlFor="google-client-id">OAuth Client ID</label>
        <input
          id="google-client-id"
          value={clientId}
          placeholder="123456789-example.apps.googleusercontent.com"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setClientId(event.target.value)}
        />
        {validation && <p className="field-error">{validation}</p>}
        <p className="settings-help">
          Authorized JavaScript originには <code>{location.origin}</code>{' '}
          を登録してください。設定値はこのブラウザのIndexedDBに保存されます。
        </p>
        <a
          href="https://console.cloud.google.com/apis/credentials"
          target="_blank"
          rel="noreferrer"
        >
          Google Cloudの認証情報を開く ↗
        </a>
        <div className="connection-state" role="status">
          <span className={connected ? 'status-dot connected' : 'status-dot'} />
          {connected ? 'Google Drive接続済み' : 'Google Drive未接続'}
        </div>
        <div className="dialog-actions settings-actions">
          {initialClientId && (
            <button type="button" className="danger" onClick={onRemove}>
              設定を削除
            </button>
          )}
          <span className="action-spacer" />
          <button type="submit" disabled={busy}>
            設定を保存
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={busy || !initialClientId}
            onClick={onConnect}
          >
            {busy ? '接続中…' : connected ? '再接続' : 'Googleへ接続'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
