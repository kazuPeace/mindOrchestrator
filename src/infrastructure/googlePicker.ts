import { authenticate } from './google'

export type DriveFolder = { id: string; name: string }

let pickerPromise: Promise<void> | null = null

type PickerGoogle = {
  picker: {
    DocsView: typeof google.picker.DocsView
    PickerBuilder: typeof google.picker.PickerBuilder
    ViewId: typeof google.picker.ViewId
    Action: typeof google.picker.Action
  }
}
type PickerLoader = {
  load: (
    library: string,
    config: {
      callback: () => void
      onerror: () => void
      timeout: number
      ontimeout: () => void
    },
  ) => void
}

function loadPicker() {
  const pickerGoogle = (window as unknown as { google?: PickerGoogle }).google
  if (pickerGoogle?.picker) return Promise.resolve()
  if (pickerPromise) return pickerPromise
  pickerPromise = new Promise((resolve, reject) => {
    const loadLibrary = () => {
      const loader = (window as unknown as { gapi?: PickerLoader }).gapi
      if (!loader) {
        reject(new Error('Google Pickerライブラリを初期化できませんでした。'))
        return
      }
      loader.load('picker', {
        callback: resolve,
        onerror: () =>
          reject(new Error('Google Pickerを読み込めませんでした。')),
        timeout: 10_000,
        ontimeout: () =>
          reject(new Error('Google Pickerの読み込みがタイムアウトしました。')),
      })
    }
    const script = document.createElement('script')
    script.src = 'https://apis.google.com/js/api.js'
    script.async = true
    script.onload = loadLibrary
    script.onerror = () =>
      reject(new Error('Google Pickerスクリプトを読み込めませんでした。'))
    document.head.append(script)
  })
  return pickerPromise
}

export async function selectDriveFolder(): Promise<DriveFolder | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || ''
  const appId = import.meta.env.VITE_GOOGLE_APP_ID || ''
  if (!apiKey) throw new Error('Google Picker用API Keyが設定されていません。')
  if (!appId)
    throw new Error(
      'Google Picker用App ID（Cloudプロジェクト番号）が設定されていません。',
    )
  const oauthToken = await authenticate()
  await loadPicker()
  const pickerGoogle = (window as unknown as { google?: PickerGoogle }).google
  if (!pickerGoogle?.picker)
    throw new Error('Google Pickerを初期化できませんでした。')

  return new Promise((resolve, reject) => {
    try {
      const view = new pickerGoogle.picker.DocsView(
        pickerGoogle.picker.ViewId.FOLDERS,
      )
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
      const picker = new pickerGoogle.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(oauthToken)
        .setDeveloperKey(apiKey)
        .setAppId(appId)
        .setOrigin(location.origin)
        .setLocale('ja')
        .setTitle('Mind Orchestratorの保存先を選択')
        .setCallback((data) => {
          if (data.action === pickerGoogle.picker.Action.PICKED) {
            const folder = data.docs?.[0]
            if (!folder?.id) {
              reject(new Error('選択したフォルダ情報を取得できませんでした。'))
              return
            }
            resolve({ id: folder.id, name: folder.name || '選択したフォルダ' })
          } else if (data.action === pickerGoogle.picker.Action.CANCEL) {
            resolve(null)
          }
        })
        .build()
      picker.setVisible(true)
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error('Google Pickerを表示できませんでした。'),
      )
    }
  })
}
