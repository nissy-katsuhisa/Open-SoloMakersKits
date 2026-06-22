---
name: gen-appstore-image
description: App Store または Google Play のスクリーンショットを直接生成したいときに使う。app store, play store, screenshots, marketing assets, screenshot generation, iOS simulator captures, store asset preparation などの依頼で起動する想定。
---

# App Store & Google Play スクリーンショット生成

## 概要

この skill は、**既存の iOS アプリ repository の中で動かす**前提と相性が良いです。コードからアプリを理解し、実際のデザインシグナルからブランド方針を導き、シミュレータからベーススクリーンショットを取得し、最終的な App Store / Google Play 用画像を直接生成します。

対応する planning target:

- **iPhone 6.9"** (portrait) — Apple App Store の既定出力
- **iPad 13"** (portrait) — Apple App Store で iPad 対応が必要な場合
- **Android Phone** (portrait) — Google Play の既定出力
- **Android Tablet 7"** (portrait + landscape) — 必要なときだけ
- **Android Tablet 10"** (portrait + landscape) — 必要なときだけ
- **Feature Graphic** (1024×500 banner) — Google Play store listing header

## 基本原則

**Screenshots are advertisements, not documentation.**  
各スクリーンショットは、1 つの訴求だけを売るべきです。この skill は素材とビジュアル方針を整え、最終的なストア画像まで直接生成します。

## この skill が行うこと

1. `node scripts/ensure-app-product-context.mjs` を実行し、missing の場合は `../app-product-summary/SKILL.md` を使ってまずコードからアプリを理解する
2. その結果をもとに、初回の slide arc、feature priority、copy direction、background theme direction を提案する
3. 対象が **iOS app** の場合は、この skill 自体が **Build iOS Apps: ios-debugger-agent** を使ってベーススクリーンショットを自動取得する
4. スクリーンショットとアイコン素材を、確認・作業用 output folder に整理する
5. 後段の生成を deterministic にする screenshot-planning 出力を書く
6. `output/app-store-screenshots/<generated-at>/` 配下に App Store / Google Play 用の最終画像だけを生成する

この skill は headless に実行され、最後は最終画像アセットで終わります。

## Step 1: まずアプリを理解し、そのあと不足分だけ聞く

ユーザーにアプリ説明を求める前に、まず現在の repository を調べてください。

### 1A. product と brand の baseline を作る

- まず `node scripts/ensure-app-product-context.mjs` を実行する
- script が missing を返した場合は、先に `../app-product-summary/SKILL.md` を使って生成する
- `../app-product-summary/SKILL.md` の出力は `data/app-product-context.json` に保存する
- そこにある情報を次の fact base として扱う
  - app name
  - core features
  - differentiator になりそうな点
  - screenshot copy に変換できそうな user pain
  - primary / secondary color
  - neutral surface
  - brand concept
  - screenshot generation 用の background direction

### 1B. iOS app repo の中ではこの workflow を前提にする

- 既定の想定: 現在の working directory は iOS app repository であり、ユーザーはアプリ本体から始まる screenshot workflow を求めている
- すでに良いスクリーンショットが disk 上にあるなら再利用してよい
- スクリーンショットがない、古い、明らかに不十分な場合は新しく取得する
- non-iOS target では、従来の manual screenshot path を fallback として残す

### 1C. 足りない marketing decision だけ聞く

コードからの要約ができたあとに、不足している判断だけを聞きます。

### 必須確認

1. **Screenshot source**  
   「既存スクリーンショットを再利用するか、iOS simulator から新しく撮るか」
2. **Priority screens / states**  
   「5-7 枚に絞るなら、どの画面を最優先にするか」
3. **Style direction**  
   「アプリ本来のブランド感に寄せるか、あえて別方向へ強めに押すか」

### 任意確認

4. **Target stores** — Apple App Store only, Google Play only, or both?
5. **iPad / Android tablet screenshots** — 必要ならサイズと向きを確認する
6. **Feature Graphic** — 1024×500 の Play Store banner が必要か
7. **Localized screenshots** — 対応言語
8. **Number of slides** — Apple は最大 10、Google Play は最大 8
9. **App icon path** — app repo から自信を持って見つけられない場合だけ聞く
10. **Additional instructions** — その他の指定

**IMPORTANT:** ユーザーが途中で与えた指示は、skill の既定値より常に優先します。

## Step 2: ベーススクリーンショットを取得または収集する

### iOS-first path (preferred)

現在の repo が iOS app なら、最終 plan を書く前にスクリーンショットを取得します。

- この skill 自体の workflow の中で iOS 撮影フローを進める
- **Build iOS Apps: ios-debugger-agent** を使って build, launch, simulator 操作を行う
- machine にすでに入っている simulator runtime を優先する
- iPhone ベース撮影には **6.1 inch iPhone simulator** を優先する
- `data/app-product-context.json` の narrative に素直に対応する主要画面を撮る
- raw capture は `output/ios-page-screenshots/<screen-slug>.png` に保存する
- iPad も必要なら、iPhone とは別のセットとして管理する
- 最初に 1 枚だけテスト撮影し、permission prompt, keyboard, onboarding blocker, loading spinner がないことを確認する

### Store output の最小方針

- Apple App Store 向けの iPhone 画像は、既定では **6.9" 1セットだけ**を生成する
- App Store Connect が許容する範囲では、最高要件の family だけを出して Apple 側の縮小に任せる
- iPhone で 6.9" family を使えない特別事情がある場合だけ、別 family を検討する
- iPad 対応アプリでは、既定では **13" iPad 1セットだけ**を生成する
- Google Play では、**1デバイス種別につき1セット**を生成する
- つまり Android phone は 1セット、7" tablet は必要なときだけ 1セット、10" tablet も必要なときだけ 1セット
- Google Play の **feature graphic** は別枠の必須アセットとして扱う
- ユーザーが tablet 不要と明示したら、Android phone と feature graphic だけに絞る

### iOS capture の実務ルール

- build configuration を決め打ちしない
- まず shared scheme と project config を確認し、simulator 向けの launch 用 configuration を使う
- `Debug` が存在しない project では、scheme が指している `Local` や `Dev` などの configuration を優先する
- build 成功後は、その configuration に対応する `.app` を使って install する
- launch 時の bundle id も build した app の `Info.plist` から確認する
- simulator capture の最初の 1 枚では、ネットワークや Firebase 初期化を避けるための test argument がないか探す
- `UI_TESTS`、`DEBUG_*`、preview factory、debug launch destination のような入口があれば最優先で使う
- app code に simulator 専用の fixed screen launch があるなら、手動遷移よりそれを優先する
- first success を作るまでは、profile、home、composer などの preview-ready な画面を 1 枚だけ撮る
- 初回撮影が通ったら、同じ build artifact と launch pattern を再利用して他画面へ広げる

この撮影フローでは最低限次をこの skill 内で判断して進めます。

1. app の entry, tab, route, onboarding, paywall, profile などから主要画面候補を洗い出す
2. `data/app-product-context.json` の `screenshot_candidates` と feature priority を見て撮影順を決める
3. boot 済み simulator と installed runtime を確認し、最も自然な iPhone / iPad 構成を選ぶ
4. build と launch を行い、permission prompt や loading blocker を避けながら画面遷移する
5. hero, differentiator, core flow, trust screen の順で raw capture を保存する

このとき追加で見るポイント:

1. shared scheme がどの build configuration を launch に使っているか
2. app entry に `ProcessInfo.processInfo.arguments` ベースの debug launch 分岐があるか
3. preview factory や fixture が stable data を持っているか
4. `UI_TESTS` 引数で Firebase, analytics, audio autoplay を抑止できるか
5. bundle id が production とは別の local / staging identifier になっていないか

優先する page-selection 順:

1. hero に使いやすい主画面
2. 最も強い differentiator
3. 1 つか 2 つの core task flow
4. trust / history / profile / summary 画面
5. widget, extension, watch, share state など ecosystem が見える補助画面

### Manual asset path (fallback)

- target が iOS app でない、または simulator capture ができない場合は、既存スクリーンショットをユーザーに求める
- marketing composite ではなく、実際の app capture を要求する

## Step 3: 素材を整理する

次のような予測しやすい output folder を作ります。

```text
data/
└── app-product-context.json

output/
├── ios-page-screenshots/
├── app-store-screenshots/
│   └── {generated-at}/
│       ├── 01.png
│       ├── 02.png
│       └── ...
├── app-store-screenshot-previews/
│   └── {generated-at}/
│       └── contact-sheet.png
└── app-store-screenshot-work/
    ├── source-assets/
    │   ├── app-icon.png
    │   └── screenshots/
    │       ├── apple/iphone/{locale}/01.png … N.png
    │       ├── apple/ipad/{locale}/01.png … N.png
    │       ├── android/phone/{locale}/01.png … N.png
    │       ├── android/tablet-7/{portrait|landscape}/{locale}/...
    │       └── android/tablet-10/{portrait|landscape}/{locale}/...
    ├── current/
    │   ├── screenshot-plan.md
    │   └── screenshot-plan.json
    └── {generated-at}/
        ├── manifest.json
        ├── screenshot-plan.md
        └── screenshot-plan.json
```

- `output/app-store-screenshots/` には提出・利用する生成画像だけを置く
- contact sheet など確認用画像は `output/app-store-screenshot-previews/` に置く
- raw capture、upload、plan、manifest、copy-fit report などの作業ファイルは `output/app-store-screenshot-work/` に置く
- 生成ごとに `output/app-store-screenshots/{generated-at}/` を作り、過去生成と混ざらないようにする
- raw capture は work folder の `source-assets` layout に合わせて rename または copy する
- app icon は `output/app-store-screenshot-work/source-assets/app-icon.png` に export または copy する
- locale が 1 つしかなくても locale folder は明示的に残す

## Step 4: screenshot plan を作る

最初の基準は `data/app-product-context.json` に置きます。使用前の確認は `scripts/ensure-app-product-context.mjs` で行い、missing の場合は先に `../app-product-summary/SKILL.md` で生成します。

`output/app-store-screenshot-work/current/screenshot-plan.md` には最低限次を含めます。

1. product summary
2. target stores and devices
3. prioritized slide arc
4. per-slide message
5. recommended screenshot mapping
6. brand-led background direction
7. localization notes

また、`output/app-store-screenshot-work/current/screenshot-plan.json` には最低限次を含めます。

- `app_name`
- `target_stores`
- `devices`
- `locales`
- `brand`
- `slides`

推奨 slide object fields:

- `order`
- `goal`
- `screen_slug`
- `screen_path`
- `headline`
- `label`
- `visual_tone`
- `background_direction`
- `layout`

### Step 4.5: copy-fit validation を必ず通す

- headline copy を書いたら、そのまま最終生成へ進まずに copy-fit validator を実行する
- validator は現行の headline font size と layout width を前提に、次を検査する
  - 何文字までなら 1 行に収まるか
  - 何文字目から折り返しが始まるか
  - manual line break だけでは収まらず、自動折り返しが起きていないか
  - `る。`、`を、` のような 2-3 文字だけの短い表示行がないか
  - 句読点や記号から始まる表示行がないか
  - device ごとの headline 文字数上限を超えていないか
- validator は次を使う

```text
scripts/validate-copy-fit.mjs
```

- 想定コマンド例:

```bash
node scripts/validate-copy-fit.mjs \
  --file output/app-store-screenshot-work/current/screenshot-plan.json \
  --device iphone \
  --locale ja
```

- validator は `*.copy-fit-report.json` を出力する
- `ok: false` または exit code 1 の場合は、そのまま先へ進まない
- failing slide だけ headline を作り直し、再度 validator を走らせる
- **validator に通るまでこの工程を繰り返す**
- validator report の `rules` と `fittedSlides[].fittedStyle` を、最終 renderer の text style に反映する
- 生成側の headline prompt には次を含める
  - 1 行ごとに最低 4 文字以上を保つ
  - `る。`、`を、`、`で。` のような語尾だけの行を作らない
  - 自動改行に頼らず、必要なら agent が手動で改行位置を入れる
  - headline は device ごとの上限文字数内に収める
  - validator が落ちた slide だけ局所的に修正する

### 4.6: headline の可変フォントサイズ

- headline は基準サイズから始め、文字数・手動改行ごとに必要なら縮小する
- validator の `fittedSlides[].fittedStyle.fontSize` を使える場合は、その値を renderer に渡す
- 独自 renderer の場合も同等の処理を入れる
  - 基準サイズで manual line が収まるか測る
  - 収まらなければ最小 `78%` まで段階的に下げる
  - それでも収まらない、または 4 文字未満の表示行が出る場合は copy を書き直す
- フォントを小さくし続けて無理に詰め込まない。iPhone headline は原則 26 文字以内にする

## Step 5: 最終画像を生成する

- screenshot plan と取得済みスクリーンショットを使って、最終的な store image を直接生成する
- style preset を使う場合は、まず `references/style-prompts.md` を読み、必要な deep spec を `references/style-prompts/` から選ぶ
- template renderer が iPhone bezel を `public/mockup.png` として参照する場合は、この skill に同梱した `assets/mockup.png` をコピーして使う
- 最終 composition には次がすでに反映されている状態を目指す
  - headline copy
  - slide ordering
  - brand-led な background color と surface direction
  - phone / tablet framing
  - store ごとの aspect と resolution requirement
- 同じ device family の中では device mockup の横幅・scale を全 slide で統一する
  - 1 枚で phone size を調整したら、その canonical width を他 slide にも反映する
  - `device-top` では、phone bottom から canvas bottom までの余白を計算し、その中央に label + headline block を置く
  - `device-bottom` では、同じ phone width を保ち、必要なら下側を自然に crop する。copy と phone が重なる場合は copy を上に逃がし、phone を縮小しない
  - 調整後は contact sheet などの preview PNG を作り、全 slide を同時に目視確認できるようにする
- code-native renderer を使う場合は、単発の手作業で終わらせず `scripts/render-appstore-screenshots.mjs` に renderer settings を渡して生成する
  - `--phone-scale` で device の canonical scale を固定する
  - `--phone-y <order:offset>` で slide ごとの上下調整を明示する
  - `--headline-weight` は原則 `700` から始め、特別な理由なく `900` のような heavy weight にしない
  - slide counter (`3/5`, `5/5` など) は既定では表示しない。ユーザーが明示した場合だけ `--show-counters` を使う
  - renderer settings は `output/app-store-screenshot-work/latest.json` と run manifest の `renderAdjustments` に残し、次回の再生成で同じ見た目を再現できるようにする
- image-generation method が environment によって違っても、asset organization は deterministic であることを優先する
- 最終 deliverable は次に保存する

```text
output/app-store-screenshots/{generated-at}/
├── 01.png
├── 02.png
└── ...
```

- environment が image generation を直接サポートするなら、screenshot plan からそのまま marketing screenshot を生成する
- 代わりに code-native renderer を使う環境なら、その renderer で同じ最終出力を作る
- ユーザーには planning file だけでなく、最終 PNG asset を返す
- Apple 側で同一家族内の縮小が許される場合は、iPhone は `6.9` のみ、iPad は `13` のみを返す
- Android は Play Console にそのまま載せる device class ごとの 1セットだけを返す
- 最終生成の直前にも、copy を差し替えたなら validator を再度通してから export する

## Step 6: copy の考え方

screenshot copy を書く、または見直すときは次を守ります。

### 重要ルール

1. **見出しは 1 枚につき 1 つの訴求**
2. **短く、一般的な言葉を使う**
3. **できるだけ 1 行 3-5 語**
4. **UI 説明より benefit を優先**
5. **2-3文字だけの表示行を作らない**
6. **自動折り返しに任せず、必要なら手動改行を入れる**
7. **文字数に応じて font size を下げるが、最小 78% を下回るなら copy を短くする**

### 推奨する訴求の流れ

大まかな構成は次を目安にします。

1. hero / main benefit
2. differentiator
3. key workflow
4. another key workflow
5. trust / proof / history
6. feature wall or closer

## Step 7: ローカライズ

- 言語一覧は必ずユーザーに確認する
- copy が弱くなるなら、直訳はしない
- 該当する場合は RTL の懸念も記録する

## Step 8: 最終 QA

### メッセージ品質

- 1 枚につき 1 つの訴求になっているか
- hero slide が 1 秒で main benefit を伝えられるか
- thumbnail サイズでも copy が読めるか

### アセット品質

- screenshot が主張している画面と一致しているか
- permission prompt や一時 overlay が残っていないか
- filename が安定していて zero-padded か
- device と locale の対応が明示されているか

## 完了時の共有内容

完了時にはユーザーへ次を伝えます。

1. brand foundation file の保存先
2. raw screenshot の保存先
3. screenshot plan file の保存先
4. 最終生成画像の保存先
5. 対応済みの device / locale
6. まだ手動で補う必要がある gap
