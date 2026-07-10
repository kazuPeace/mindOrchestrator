import type { ReactNode } from 'react'

const Button = ({
  children,
  ...props
}: { children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className="toolbar-button" {...props}>
    {children}
  </button>
)

export function Toolbar({
  title,
  onTitle,
  saveLabel,
  offline,
  undoDisabled,
  redoDisabled,
  onUndo,
  onRedo,
  onDriveSave,
  onDriveSettings,
  onFileMenu,
  onViewMenu,
  onTheme,
}: {
  title: string
  onTitle: (value: string) => void
  saveLabel: string
  offline: boolean
  undoDisabled: boolean
  redoDisabled: boolean
  onUndo: () => void
  onRedo: () => void
  onDriveSave: () => void
  onDriveSettings: () => void
  onFileMenu: () => void
  onViewMenu: () => void
  onTheme: () => void
}) {
  return (
    <header className="toolbar">
      <button className="brand" aria-label="Mind Orchestrator">
        <span className="brand-mark">M</span>
        <span className="brand-name">Mind Orchestrator</span>
      </button>
      <input
        className="title-input"
        value={title}
        aria-label="マップ名"
        onChange={(event) => onTitle(event.target.value)}
      />
      <span className={`save-status ${offline ? 'offline' : ''}`} role="status">
        {offline ? 'オフライン · ローカル保存' : saveLabel}
      </span>
      <div className="toolbar-actions">
        <Button onClick={onUndo} disabled={undoDisabled} aria-label="元に戻す">
          ↶
        </Button>
        <Button onClick={onRedo} disabled={redoDisabled} aria-label="やり直す">
          ↷
        </Button>
        <Button onClick={onDriveSave}>Driveに保存</Button>
        <Button onClick={onDriveSettings} aria-label="Google Drive設定">
          Drive設定
        </Button>
        <Button onClick={onFileMenu}>ファイル</Button>
        <Button onClick={onViewMenu}>表示</Button>
        <Button onClick={onTheme} aria-label="テーマ切替">
          ◐
        </Button>
      </div>
    </header>
  )
}
