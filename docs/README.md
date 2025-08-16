# Kiro OSS Map - ドキュメント

このディレクトリには、Kiro OSS Mapプロジェクトの全ドキュメントが含まれています。

> 💡 **プロジェクト概要・使用方法は [プロジェクトルートのREADME](../README.md) をご確認ください**

## 📋 ドキュメント一覧

### 設計・仕様書
- **[requirements.md](./requirements.md)** - プロジェクト要件定義書
- **[specifications.md](./specifications.md)** - 技術仕様書
- **[design.md](./design.md)** - UI/UXデザイン仕様書
- **[logicalarchitecture.md](./logicalarchitecture.md)** - 論理アーキテクチャ設計書

### 開発・運用
- **[tasks.md](./tasks.md)** - タスクリスト・進捗管理
- **[構築手順書.md](./構築手順書.md)** - 環境構築・デプロイ手順
- **[CHANGELOG.md](./CHANGELOG.md)** - 変更履歴・リリースノート

### テスト・品質管理
- **[testscenario.md](./testscenario.md)** - テストシナリオ定義書
- **[testresult.md](./testresult.md)** - テスト実行結果レポート

## 📖 ドキュメント読み順

### 新規参加者向け
1. [requirements.md](./requirements.md) - プロジェクト概要を理解
2. [specifications.md](./specifications.md) - 技術仕様を確認
3. [構築手順書.md](./構築手順書.md) - 開発環境を構築
4. [design.md](./design.md) - UI/UX設計を理解

### 開発者向け
1. [logicalarchitecture.md](./logicalarchitecture.md) - システム構造を理解
2. [tasks.md](./tasks.md) - 現在のタスク状況を確認
3. [testscenario.md](./testscenario.md) - テスト方法を確認

### 運用・保守担当者向け
1. [構築手順書.md](./構築手順書.md) - デプロイ手順を確認
2. [testresult.md](./testresult.md) - 品質状況を確認
3. [CHANGELOG.md](./CHANGELOG.md) - 変更履歴を確認

## 🔄 ドキュメント更新ルール

- **要件変更時**: requirements.md → specifications.md → design.md の順で更新
- **機能追加時**: tasks.md → logicalarchitecture.md → testscenario.md の順で更新
- **リリース時**: testresult.md → CHANGELOG.md を更新

## 📝 ドキュメント形式

- **Markdown形式** (.md) で統一
- **日本語** で記述（技術用語は英語併記）
- **バージョン管理** - 各ドキュメントにバージョン情報を記載
- **更新日時** - 最終更新日を明記

---

**ドキュメント管理**: Kiro OSS Map開発チーム  
**最終更新**: 2025年8月16日  
**バージョン**: 1.1