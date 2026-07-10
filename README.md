# Mind Orchestrator

Mind Orchestrator は、PC・タブレットで考えを自由に配置するマインドマップPWAです。ノードの親子関係と自由配置に集中し、IndexedDBへ自動保存します。Google Drive連携を設定していない環境でも、ローカル編集・ファイル入出力・オフライン利用ができます。

## 主な機能

- `Tab`で子、`Enter`で兄弟ノードを作成（ルートでは子を作成）
- ダブルクリック・`F2`・文字入力から編集開始、日本語IME対応
- マウス／タッチの移動、パン、ホイール／ピンチズーム、全体表示
- 子をつなぎ替える削除、または子孫を含む削除
- ノード追加・削除・移動・テキスト編集のUndo／Redo
- IndexedDBへの500msデバウンス自動保存と直前マップの復元
- `.morch` JSONファイルの入出力
- Google Identity Servicesと`drive.file`によるDrive保存・更新・一覧読込・競合検知
- PWAインストール、静的アセットのキャッシュ、オフライン編集、更新通知
- OS設定連動のライト／ダークテーマと手動切替

## 技術構成

React 19、TypeScript、Vite、`@xyflow/react`、Zustand、IndexedDB（`idb`）、`vite-plugin-pwa`、Vitest、React Testing Library、ESLint、Prettierを使用します。バックエンドはありません。Drive APIはブラウザから直接呼び出します。

主な責務は次のように分割しています。

```text
src/
  app/                 アプリ統合、キャンバス操作
  components/          ノード、ツールバー、ダイアログ
  domain/              データ型、編集ロジック、検証、Flow変換、競合判定
  infrastructure/      IndexedDB、Google Identity/Drive API
  stores/              Zustand状態とUndo/Redo履歴
  test/                テスト環境
```

React Flow内部形式を保存形式には使いません。`src/domain/flowAdapter.ts`が独自形式との変換境界です。

## ローカル開発

Node.js 20以降を推奨します。

```bash
npm install
cp .env.example .env
npm run dev
```

Google連携を使わない場合、`.env`の値は空のままで構いません。品質確認は以下です。

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

ビルド成果物は`dist/`です。`npm run preview`で本番ビルドを確認できます。本番のベースパスは`/morc/`に設定されています。

## PWAの確認

Service Workerは本番ビルドで有効になります。`npm run build && npm run preview`後、ブラウザのApplication画面でManifestとService Workerを確認してください。一度オンラインで開いた後、開発者ツールをOfflineにして再読み込みし、既存マップの編集と自動保存を確認します。localhost以外ではHTTPSが必要です。

## Google Cloud設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成または選択します。
2. 「APIとサービス」からGoogle Drive APIを有効化します。
3. Pickerを将来利用する場合はGoogle Picker APIも有効化します。現MVPの読込UIはPicker設定に依存しないDrive API一覧方式です。
4. OAuth同意画面を設定し、アプリ名、サポートメール、対象ユーザーを登録します。テスト公開中は利用者をテストユーザーへ追加します。
5. OAuthクライアントIDで「ウェブ アプリケーション」を作成します。クライアントシークレットは使用しません。
6. Authorized JavaScript originsに開発用`http://localhost:5173`と本番用`https://pearth.wpx.jp`を追加します。originには`/morc/`を含めません。
7. リポジトリ直下に`.env.local`（開発用）または`.env.production.local`（本番ビルド用）を作成し、Client IDを設定します。

```dotenv
VITE_GOOGLE_CLIENT_ID=123456789-example.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=
VITE_GOOGLE_APP_ID=
```

現MVPの一覧方式ではClient IDだけが必須です。設定値をUIやIndexedDBへ保存せず、Viteのビルド時環境変数から読み込みます。API KeyとApp IDはPicker対応拡張用に予約しています。OAuth scopeは、アプリが作成したファイルとユーザーが明示的に許可したファイルだけを扱う`https://www.googleapis.com/auth/drive.file`です。Drive全体を読むスコープは要求しません。

本番用設定ファイルは次の場所です。このファイルは`.gitignore`対象であり、GitHubには追加されません。

```text
/Users/kazuma/Documents/development/individuals/mindOrchestrator/.env.production.local
```

```dotenv
VITE_GOOGLE_CLIENT_ID=作成したOAuthクライアントID
VITE_GOOGLE_API_KEY=
VITE_GOOGLE_APP_ID=
```

本番公開では、OAuth同意画面の公開ステータス、ドメイン所有権、プライバシーポリシー、アプリ情報を確認してください。利用者や公開範囲によってGoogleのOAuth検証が必要になる場合があります。審査要件は変更されるため、公開時点のGoogle公式資料を確認してください。

アクセストークンはメモリだけに保持し、localStorage、IndexedDB、ファイルへ保存しません。OAuth Client Secretはフロントエンドでは使用しません。`.env.local`、`.env.production.local`などの環境設定ファイルをリポジトリへコミットしないでください。

## デプロイ

一般的な静的ホスティングでは`npm run build`後の`dist/`をHTTPS配信します。このリポジトリでは次のコマンドで`/home/pearth/pearth.wpx.jp/public_html/morc/`へ同期します。

```bash
./scripts/deploy.sh
```

デプロイスクリプトは`.env.production.local`のClient IDを確認してから本番ビルドを作成し、成果物を同期します。

スクリプトはローカル環境にあるSSH鍵を参照します。秘密鍵はリポジトリに含みません。公開URLは`https://pearth.wpx.jp/morc/`です。

## `.morch`データ形式

UTF-8の可読JSONで、MIME Typeは`application/vnd.mindorchestrator.map+json`です。Driveでは互換性のため`application/json`として保存し、拡張子は`.morch`を維持します。

```json
{
  "schemaVersion": 1,
  "id": "uuid",
  "title": "無題のマップ",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601",
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "nodes": [],
  "edges": []
}
```

読込時はschemaVersion、必須フィールド、座標、親IDをランタイム検証します。ノード文字列をHTMLとして挿入しません。

## 現在の制限事項

- リアルタイム共同編集、自動マージ、自動レイアウト、画像添付はありません。
- Drive競合は自動マージせず、Drive版、ローカル維持、別名保存から選びます。
- Google Pickerの専用ファイル選択画面は未使用で、`appProperties`によるDrive一覧を採用しています。
- Drive新規ファイルの`parents`を指定していないため、保存先はマイドライブ直下です。任意フォルダ選択は未実装です。
- OAuthアクセストークンは再読み込み後に再認証が必要です。期限切れ時もローカル内容は維持されます。
- iOSなど一部環境ではPWAインストール導線やストレージ管理がブラウザ仕様に依存します。
