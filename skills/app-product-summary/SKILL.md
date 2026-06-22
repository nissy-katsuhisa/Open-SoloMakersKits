---
name: app-product-summary
description: アプリのコードベースから、後段 skill の共通入力になる `app product context JSON` を出力したいときに使う。主要機能、価値、ターゲット像、ユーザー課題、コピー候補に加えて、CSS 変数、Tailwind、SwiftUI Color、asset catalog、アプリアイコン、コピーのトーンから `ブランドカラー`、`ビジュアルトーン`、`背景方針`、`スクショ向き画面候補` まで抽出したいときに使用。
---

# App Product Summary

アプリのコード、文言、設定ファイル、画面構成、デザイントークン、色アセットを読み、  
`アプリ理解 + ブランド理解` を 1 つの JSON に統合して出す。  
この JSON は App Store / Google Play 用画像生成など、後段 skill の中核入力として扱う。

# Workflow

## 1. 先に入口を読む

- まず `references/source-discovery.md` を開く
- 次に `references/brand-discovery.md` を開く
- `何のアプリか` と `どんな見た目の約束をしているか` を分けて探す

優先して見る候補:

- app entry point
- tabs / routes / navigation
- onboarding / landing / paywall
- localization / strings / manifest / app config
- global styles / CSS variables / Tailwind config
- theme files / color tokens / asset catalog / app icon
- debug launch arguments / preview factories / fixture screens

## 2. 事実と推測を分ける

- `main_features` や `brand.colors` は、コードやアセットから確認できる事実を優先する
- `audience`、`benefits`、`user_pains`、`brand.brand_concept`、`brand.background_direction` は推測を含めてよい
- 推測は、画面構成、コピー、継続利用導線、収益化の痕跡、配色、角丸、タイポ、画面密度から積み上げる
- 実在しない機能や色 token を補完しない

## 3. プロダクト理解を作る

- 画面単位ではなく、ユーザー価値のまとまりで `main_features` を束ねる
- まず次を押さえる:
  - 何をするアプリか
  - どの行動が主役か
  - 何が残るか / 記録されるか
  - 誰に刺さりそうか
  - 何にお金を払う余地がありそうか

## 4. ブランド理解を作る

- source of truth を優先する:
  - CSS variables
  - Tailwind theme
  - token files
  - SwiftUI `Color`
  - UIKit color constants
  - `.xcassets` の color set
  - app icon
- light / dark がある場合は両方見る
- 最低限次を埋める:
  - primary color
  - secondary / accent color
  - surface color
  - surface dark color
  - foreground color
  - foreground dark color

## 5. スクショや画像生成向け情報へ落とす

- 下流 skill が使いやすいように、背景や訴求に使う情報まで入れる
- 最低限次を入れる:
  - `tone_keywords`
  - `brand.background_direction`
  - `screenshot_candidates`
  - `catchcopies`
- iOS app なら、`screenshot_candidates` を考えるときに debug launch destination や preview factory があるかも見る
- `UI_TESTS` や `DEBUG_*` 引数で安定起動できる screen があれば、evidence か inferred note に残す

## 6. JSON schema を固定する

- 出力は原則 1 ファイルの JSON にまとめる
- 保存先の第一候補は `data/app-product-context.json`
- このファイルは下流 skill が最初に読む canonical context として扱う
- top-level key は次で固定する

```json
{
  "schema_version": "app-info/v1",
  "product_name": "My App",
  "platforms": ["iOS"],
  "product_summary": "短い要約",
  "main_features": [
    {
      "title": "機能名",
      "description": "何ができるか",
      "evidence": ["path/to/file"]
    }
  ],
  "audience": {
    "core_target": "コアターゲット像",
    "behavior_traits": ["行動特性"]
  },
  "benefits": ["提供価値"],
  "user_pains": [
    {
      "title": "Pain title",
      "description": "継続しやすい困りごと"
    }
  ],
  "catchcopies": [
    {
      "text": "短いコピー",
      "is_push": true
    }
  ],
  "tone_keywords": ["premium", "calm"],
  "brand": {
    "primary_color": "#2563EB",
    "secondary_color": "#F59E0B",
    "surface_color": "#F5F7FB",
    "surface_color_dark": "#0F172A",
    "foreground_color": "#111827",
    "foreground_color_dark": "#F8FAFC",
    "brand_concept": "modern, focused",
    "personality": "sharp but approachable",
    "background_direction": "背景方針",
    "evidence": ["brand token or asset path"]
  },
  "screenshot_candidates": [
    {
      "screen_slug": "home",
      "reason": "hero 向き",
      "priority": "high"
    }
  ],
  "evidence_notes": {
    "fact_based": ["事実ベースの根拠"],
    "inferred": ["推測ベースの説明"]
  }
}
```

# Writing Rules

- 日本語で出力する
- JSON の value だけを埋め、schema は崩さない
- 色は取れたら hex を優先する
- 不明なら空文字ではなく、取れた範囲で埋めつつ `evidence_notes.inferred` に理由を書く
- `catchcopies` は 3 案前後が望ましい
- `tone_keywords` は 2 から 6 個に絞る

# Output

- 保存先の第一候補:
  - `data/app-product-context.json`
- アプリ名が不明なら repo 名、bundle id、manifest 名、表示名から推定する
- 既存ファイルを更新する場合は key 構造を崩さず差し替える
- 最終回答では、保存先 path と、事実ベース / 推測ベースの切り分けを短く伝える

# References

- `references/source-discovery.md`: プロダクト理解の入口
- `references/brand-discovery.md`: 色、トークン、ブランドの雰囲気を拾う入口
