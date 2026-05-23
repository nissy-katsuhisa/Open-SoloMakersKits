# Source Discovery

初見のアプリコードベースでプロダクト要約を作るときは、まず `何のアプリか`、`どの体験が主役か`、`どの行動を促しているか` を見つける。

## 1. 最初に探すファイル

### Entry point / app shell

- `App.tsx`
- `main.tsx`
- `app/layout.tsx`
- `index.js`
- `main.dart`
- `lib/main.dart`
- `MyApp.swift`
- `*App.swift`
- `AndroidManifest.xml`
- `Info.plist`

ここでは次を見る:

- アプリ名
- 初期画面
- タブやナビゲーション
- 認証や onboarding の有無

### Route / navigation

- `routes`
- `router`
- `navigation`
- `tabs`
- `screens`
- `pages`

ここでは次を見る:

- 主要ページの並び
- 中核体験の位置づけ
- 深い導線の有無

### Product-defining surfaces

- `onboarding`
- `landing`
- `profile`
- `feed`
- `home`
- `search`
- `discover`
- `group`
- `community`
- `share`
- `summary`
- `analytics`
- `settings`

ここでは次を見る:

- 何を記録するアプリか
- 何を作る / 投稿するアプリか
- 何を共有するアプリか
- 誰とどうつながるアプリか

### Copy / localization / metadata

- `localization`
- `strings`
- `xcstrings`
- `copy`
- `manifest`
- `package.json`
- `pubspec.yaml`

ここでは次を見る:

- プロダクトが自分でどう名乗っているか
- どんな価値訴求ワードを使っているか

## 2. grep 起点

次の語は、プロダクトの芯を見つける起点になりやすい。

- `share`
- `invite`
- `follow`
- `friend`
- `community`
- `creator`
- `subscription`
- `premium`
- `summary`
- `history`
- `save`
- `bookmark`
- `insight`
- `analytics`
- `notification`
- `recommend`
- `discover`

## 3. 読み方のコツ

- 画面一覧を見て `何が中心体験か` を先に当てる
- onboarding や localization の文言で `約束している価値` を拾う
- settings に `notification`、`privacy`、`subscription` があるかで、継続利用と収益化の方向性を読む
- share、poster、export、download があるときは、外部発信の意図が強いとみる
- group、chat、invite、member があるときは、複数人利用が重要だとみる

## 4. 推測してよいこと / だめなこと

推測してよい:

- どんな人に刺さりそうか
- どんな提供価値を重視していそうか
- どんなペインを解こうとしていそうか

推測してよい:

- 実際の利用者属性の仮説
  - ただし `想定される`, `〜そう`, `〜に見える` などの表現で断定は避ける

推測しない:

- 売上や継続率
- 課金率
- インタビュー済みであるかのような断定
