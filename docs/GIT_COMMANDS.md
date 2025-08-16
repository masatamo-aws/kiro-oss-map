# Git コマンド実行手順

## Gitがインストールされている場合の手順

### 1. リポジトリ初期化
```bash
cd kiro-oss-map
git init
```

### 2. リモートリポジトリ追加
```bash
git remote add origin https://github.com/masatamo-aws/kiro-oss-map.git
```

### 3. 全ファイル追加
```bash
git add .
```

### 4. 初回コミット
```bash
git commit -m "Initial commit: Kiro OSS Map v1.0.0

Complete implementation of open-source map web application:

Features:
- Interactive map with MapLibre GL JS
- Search functionality with Nominatim API integration
- Route planning with OSRM API integration
- Location services with geolocation
- Image integration with Wikipedia/Unsplash APIs
- PWA support with Service Worker
- Responsive design for mobile/tablet/desktop
- Dark/light theme support
- Version display in application header

Technical Stack:
- Frontend: Vanilla JavaScript + Web Components
- Backend: Node.js + Express.js
- Build Tool: Vite
- Containerization: Docker + Docker Compose
- Architecture: Event-driven + Service-oriented

Documentation:
- Complete technical specifications
- System design documentation
- Requirements and task completion records
- Logical architecture diagrams
- Comprehensive README with setup instructions

Version: v1.0.0
Implementation Date: 2025-08-13
Status: Production Ready"
```

### 5. ブランチ設定とプッシュ
```bash
git branch -M main
git push -u origin main
```

## Gitがインストールされていない場合

### GitHub Web UI を使用してアップロード

1. https://github.com/masatamo-aws/kiro-oss-map にアクセス
2. "Upload files" をクリック
3. 以下のファイル・フォルダをドラッグ&ドロップ:
   - 全ての .md ファイル
   - package.json, package-lock.json
   - vite.config.js, tailwind.config.js, postcss.config.js
   - .gitignore, .eslintrc.cjs, .prettierrc
   - .env.example
   - Dockerfile, docker-compose.yml
   - src/ フォルダ全体
   - server/ フォルダ全体
   - assets/ フォルダ全体
   - tests/ フォルダ全体

4. コミットメッセージに上記の詳細メッセージを入力
5. "Commit changes" をクリック

### 注意事項
- node_modules/ フォルダは除外する
- .env ファイルは除外する（.env.example のみ含める）
- dist/ フォルダは除外する