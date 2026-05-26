# Brand Discovery

アプリのブランド感を、見た目の好き嫌いではなくコードとアセットから拾うための入口。

## 1. 色の source of truth

優先して探す:

- CSS variables
  - 例: `--primary`, `--accent`, `--background`, `--foreground`
- Tailwind config
  - 例: `theme.extend.colors`
- design token files
- SwiftUI `Color`
- UIKit color constants
- `.xcassets` の color set
- app icon / launch assets

## 2. まず読むファイル

- `globals.css`
- `tailwind.config.*`
- `theme.*`
- `tokens.*`
- `colors.*`
- `palette.*`
- `DesignSystem.*`
- `Theme.*`
- `Assets.xcassets/**/Contents.json`

## 3. 追加で見る面

- onboarding
- paywall
- empty state
- app icon
- marketing site
- screenshots / promo assets が repo にあればそれも見る

## 4. 雰囲気を読む観点

- 高級 / premium:
  - 暗めの surface
  - 彩度控えめ
  - 余白広め
  - copy が短く硬め
- カジュアル / lifestyle:
  - 暖色寄り neutral
  - 角丸強め
  - copy がやわらかい
- ポップ / playful:
  - 彩度高め accent
  - コントラスト強め
  - shape や装飾が多い
- calm / wellness:
  - 低コントラスト
  - 淡い色
  - copy が安心寄り
- tech / modern:
  - cool tone
  - 直線的
  - contrast 強め

## 5. まとめるときのコツ

- 色は 1 色で決めず、primary / accent / surface / foreground で分ける
- dark mode があるなら `surface_color_dark` と `foreground_color_dark` も残す
- 推測は `〜に見える`, `〜寄り`, `推定` と書く
- 背景方針では、`そのブランドならスクショ背景をどう敷くか` まで言う
