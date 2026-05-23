# App Info Shape

このスキルが受け取る app 情報ファイルは、前段の summary スキルが作る前提で扱う。

## 理想の JSON shape

```json
{
  "product_name": "Myu",
  "product_summary": "...",
  "main_features": [
    { "title": "...", "description": "..." }
  ],
  "catchcopies": [
    { "text": "...", "is_push": true }
  ],
  "tone_keywords": ["...", "..."],
  "benefits": ["...", "..."]
}
```

## 使い方

- `product_name`: brand_name に優先利用
- `product_summary`: cover / benefit の文脈に利用
- `main_features`: 2枚目の feature label 候補に利用
- `catchcopies`: 1枚目や3枚目の見出し候補に利用
- `tone_keywords`: prompt 内の雰囲気づけに利用
- `benefits`: 3枚目の見出しや補助文に利用

## markdown の場合

markdown しかない場合は、次の見出しから抽出してよい。

- `プロダクトの要約`
- `主要機能`
- `提供価値`
- `キャッチコピー`
