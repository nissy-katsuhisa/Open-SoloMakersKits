# Data

`app-product-summary` が生成する共有コンテキストを置く場所です。

既定の中核ファイル:

- `data/app-product-context.json`

この JSON は、App Store / Google Play 用画像生成など、後段 skill が最初に読む共通入力として扱います。

`data/app-product-context.json` はアプリ固有の生成物なので、`.gitignore` 対象です。公開repoには含めません。

中核ファイルの管理 script:

- `scripts/ensure-app-product-context.mjs`

後段 skill を使う前に次を実行します。

```bash
node scripts/ensure-app-product-context.mjs
```

`data/app-product-context.json` が存在しない場合は、script の指示に従って先に `skills/app-product-summary/` を使用します。

使用する後段 skill の一覧は次で確認します。

```bash
node scripts/ensure-app-product-context.mjs --list-consumers
```
