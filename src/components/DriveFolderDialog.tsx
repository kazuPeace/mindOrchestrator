import { Dialog } from './Dialog'
import type { DriveFolder } from '../infrastructure/googlePicker'

export function DriveFolderDialog({
  folder,
  busy,
  onChoose,
  onUseRoot,
  onClose,
}: {
  folder: DriveFolder | null
  busy: boolean
  onChoose: () => void
  onUseRoot: () => void
  onClose: () => void
}) {
  return (
    <Dialog title="Drive保存先" onClose={onClose}>
      <div className="folder-settings">
        <p className="folder-label">現在の保存先</p>
        <p className="folder-current">
          <span aria-hidden="true">▱</span>
          <strong>{folder?.name ?? 'マイドライブ直下'}</strong>
        </p>
        <p className="folder-help">
          選択したフォルダは、新規Drive保存と「Driveへ別名で保存」に適用されます。すでに保存済みのファイルは元の場所で更新されます。
        </p>
        <div className="dialog-actions folder-actions">
          {folder && (
            <button type="button" onClick={onUseRoot} disabled={busy}>
              マイドライブ直下に戻す
            </button>
          )}
          <button
            type="button"
            className="primary-button"
            onClick={onChoose}
            disabled={busy}
          >
            {busy ? 'Pickerを開いています…' : 'フォルダを選択'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
