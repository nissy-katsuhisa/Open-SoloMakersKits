# AGENTS.md

## Project overview

- このプロジェクトは、`AgentOrchestration` から同期した公開用 skill bundle を置くリポジトリ
- 主要ユーザーは、この bundle を使ってアプリ分析、フィード画像生成、App Store / Google Play 用画像生成を行う AI エージェント
- 重要なユースケースは、`app info JSON` の生成、Instagram フィード投稿画像の生成、ストア用スクリーンショット生成
- 技術スタックは Markdown ベースの skill 定義、JSON 出力、画像生成 workflow、iOS simulator を含む運用前提

## Architecture

```text
OpenSoloMakersKits
├── README.md
├── THIRD_PARTY_NOTICES.md
└── skills/
    ├── app-product-summary/
    │   ├── SKILL.md
    │   └── references/
    ├── gen-feed-posts/
    │   ├── workflow.md
    │   ├── app-product-summary/
    │   └── instagram-feed-image-generation/
    └── gen-appstore-image/
        ├── README.md
        └── skills/
            └── gen-appstore-image/
                └── SKILL.md
```

## Development commands

- Install: `pnpm install`
- Dev: `pnpm dev`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
