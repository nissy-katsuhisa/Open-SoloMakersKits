# AGENTS.md

## Project overview
これは個人開発者向けのOSSです。AppStore画像の自動生成や法務チェックなどアプリをリリースする際に役立つスキルをまとめています。

## Architecture

```text
OpenSoloMakersKits
├── README.md
├── THIRD_PARTY_NOTICES.md
├── data/
│   ├── README.md
│   └── app-product-context.json
├── scripts/
│   ├── ensure-app-product-context.mjs
│   ├── run-gen-appstore-image.mjs
│   └── lib/
│       └── appstore-image-runner.mjs
├── editor/
│   ├── public/
│   ├── server.mjs
│   └── package.json
├── output/
│   └── app-store-screenshots/
│       ├── latest.json
│       └── runs/
└── skills/
    ├── app-product-summary/
    │   ├── SKILL.md
    │   └── references/
    ├── gen-feed-posts/
    │   └── instagram-feed-image-generation/
    └── gen-appstore-image/
        ├── SKILL.md
        ├── README.md
        ├── LICENSE
        ├── assets/
        ├── references/
        └── scripts/
```

## Generated file conventions

- `skills/app-product-summary/` が生成する JSON は、この bundle 全体の中核データとして扱う
- 中核データの既定保存先は `data/app-product-context.json`
- `data/app-product-context.json` は、Instagram フィード投稿画像生成や App Store / Google Play 用画像生成など、後段 skill が最初に参照する共通入力
- 中核ファイルの存在確認、生成元 skill、使用する後段 skill 一覧は `scripts/ensure-app-product-context.mjs` で管理する
- `data/app-product-context.json` を使用する skill は、使用前に `node scripts/ensure-app-product-context.mjs` を実行する
- script が missing を返した場合は、先に `skills/app-product-summary/` を使用して生成してから後段 skill を続行する
- `output/` はスクリーンショット、最終画像、planning file などの派生成果物置き場として使う

## Development commands

- Install: `pnpm install`
- Dev: `pnpm dev`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
