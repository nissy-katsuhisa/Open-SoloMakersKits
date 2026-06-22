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
├── docs/
│   └── release-flow.md
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
│   ├── <skill-purpose>-results/
│   ├── <skill-purpose>-previews/
│   └── <skill-purpose>-work/
└── skills/
    ├── gen-appstore-image/
    │   ├── SKILL.md
    │   ├── README.md
    │   ├── LICENSE
    │   ├── assets/
    │   ├── references/
    │   └── scripts/
    ├── check-native-app-legal/
    │   ├── SKILL.md
    │   └── references/
    ├── native-app-security-check/
    │   ├── SKILL.md
    │   └── references/
    └── app-product-summary/
        ├── SKILL.md
        └── references/
```

## Generated file conventions

- `skills/app-product-summary/` が生成する JSON は、この bundle 全体の中核データとして扱う
- 中核データの既定保存先は `data/app-product-context.json`
- `data/app-product-context.json` は、App Store / Google Play 用画像生成など、後段 skill が最初に参照する共通入力
- 中核ファイルの存在確認、生成元 skill、使用する後段 skill 一覧は `scripts/ensure-app-product-context.mjs` で管理する
- `data/app-product-context.json` を使用する skill は、使用前に `node scripts/ensure-app-product-context.mjs` を実行する
- script が missing を返した場合は、先に `skills/app-product-summary/` を使用して生成してから後段 skill を続行する
- `output/` はローカル生成物置き場として使い、GitHubへ上げない
- 最終生成物は `output/<skill-purpose>-results/<generated-at>/` に置く
- 確認用画像やプレビューは、必要なスキルだけ `output/<skill-purpose>-previews/<generated-at>/` に置く
- manifest、latest、input、plan、中間ファイルなどの作業用ファイルは `output/<skill-purpose>-work/` に置く
- `<skill-purpose>` はスキルごとに短く一意な名前にし、他スキルの成果物が混ざる名前を使わない
- 既存スキルの互換性で別名フォルダを使う場合も、役割は results / previews / work と同じにする

## Release flow

- `main` は現在公開しているスキルだけを置く
- 全部入り状態は `codex/archive/full-skill-catalog-YYYY-MM-DD` に保存する
- 初回公開対象は `gen-appstore-image`, `check-native-app-legal`, `native-app-security-check`, `app-product-summary`
- 詳細は `docs/release-flow.md` を参照する

## Development commands

- Install: `pnpm install`
- Dev: `pnpm dev`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
