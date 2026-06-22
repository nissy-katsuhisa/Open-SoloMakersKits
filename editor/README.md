# OpenSoloMakersKits Editor

OpenSoloMakersKits のスキルを、ローカル dashboard で見る・入力する・生成物を確認するための editor です。

## Run

```bash
npm run dev
```

Open:

```text
http://localhost:4173
```

## Pages

- Home: コンセプト、スキル数、解説画像、Skills / Editor への導線
- Skills: `skills/` 配下の `SKILL.md` と `workflow.md` の一覧、説明、主要ファイル
- Editor: スキルを選び、入力値から実行履歴と生成物を作成

## Outputs

App Store画像生成の実行履歴と生成物は、repo直下の `output/app-store-screenshots/` に保存します。

```text
output/app-store-screenshots/latest.json
output/app-store-screenshots/runs/<runId>/
```

`editor/runs/` は旧仕様の保存先です。今後は使わず、`.gitignore` で除外します。
