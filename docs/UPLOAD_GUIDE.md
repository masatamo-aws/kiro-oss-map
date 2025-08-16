# GitHub アップロード手順

## 1. GitHubリポジトリの準備

1. https://github.com/masatamo-aws/kiro-oss-map.git にアクセス
2. リポジトリが存在しない場合は新規作成

## 2. アップロードするファイル・フォルダ

### ルートディレクトリのファイル
- README.md ✅
- CHANGELOG.md ✅
- package.json ✅
- package-lock.json ✅
- vite.config.js ✅
- tailwind.config.js ✅
- postcss.config.js ✅
- .gitignore ✅
- .eslintrc.cjs ✅
- .prettierrc ✅
- .env.example ✅
- Dockerfile ✅
- docker-compose.yml ✅

### ドキュメントファイル
- requirements.md ✅
- specifications.md ✅
- design.md ✅
- tasks.md ✅
- logicalarchitecture.md ✅

### ソースコードディレクトリ
- src/ フォルダ全体 ✅
  - index.html
  - main.js
  - components/
  - services/
  - utils/
  - styles/

### サーバーコード
- server/ フォルダ全体 ✅
  - index.js
  - routes/
  - services/

### アセット
- assets/ フォルダ全体 ✅
  - image/
    - Standard Map.png
    - Satelite Map.png

### テスト
- tests/ フォルダ全体 ✅

## 3. 除外するファイル・フォルダ

- node_modules/ (除外)
- .env (除外 - 機密情報)
- dist/ (除外 - ビルド成果物)
- logs/ (除外 - ログファイル)

## 4. アップロード方法

### 方法1: GitHub Web UI使用
1. GitHubリポジトリページで "Upload files" をクリック
2. 上記のファイル・フォルダをドラッグ&ドロップ
3. コミットメッセージ: "Initial commit: Kiro OSS Map v1.0.0"

### 方法2: Git CLI使用（Gitインストール後）
```bash
cd kiro-oss-map
git init
git add .
git commit -m "Initial commit: Kiro OSS Map v1.0.0"
git branch -M main
git remote add origin https://github.com/masatamo-aws/kiro-oss-map.git
git push -u origin main
```

## 5. 確認事項

アップロード後、以下を確認：
- README.mdのスクリーンショットが正しく表示される
- プロジェクト構造が正しく反映される
- 全てのドキュメントファイルが含まれている
- .gitignoreが適用されnode_modulesが除外されている

## 6. スクリーンショットURL

README.mdで使用しているスクリーンショットURL：
- https://raw.githubusercontent.com/masatamo-aws/kiro-oss-map/main/assets/image/Standard%20Map.png
- https://raw.githubusercontent.com/masatamo-aws/kiro-oss-map/main/assets/image/Satelite%20Map.png

これらのURLは、assets/image/フォルダがアップロードされた後に有効になります。