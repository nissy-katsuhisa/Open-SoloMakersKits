# コントリビューション

`gen-appstore-image` への貢献ありがとうございます。

このリポジトリは意図的に小さく保たれていますが、それでも変更は実際のエージェント挙動に影響します。ここでの変更の多くは、次のどちらかに当たります。

- `README.md`: 人間が skill を見つけて導入する方法
- `skills/gen-appstore-image/SKILL.md`: コーディングエージェントが実際にどう振る舞うか

## 良い貢献とは

- App Store スクリーンショット生成における実際の workflow 上の問題を解決している
- 生成結果の品質や信頼性を改善している
- さまざまな agent / environment で skill を使いやすくしている
- skill の方向性を保ちつつ、最終判断はユーザーに委ねている

## 対象範囲の目安

適している変更:

- export の信頼性向上
- prompt flow や要件ヒアリングの改善
- copy / design guidance の強化
- contributor 体験の改善
- install / usage ドキュメントの明確化

通常は適していない変更:

- ブランドスタイルのハードコード
- 一般化しない repo 固有の前提
- skill の目的から外れた大きな framework 追加
- 結果を良くしないまま skill を過度に冗長にする変更

## PR を開く前に

1. open PR を確認し、作業が重複していないか見る
2. `README.md` と `skills/gen-appstore-image/SKILL.md` の両方を読む
3. 必要に応じて、ユーザー向け docs と skill の挙動をそろえる

## 変更のテスト

このリポジトリには一般的な自動テストスイートがないため、手動の smoke-test checklist を使って確認します。

### README だけの変更の場合

- install 手順が引き続き自然か確認する
- 例にある path や command をそのまま使えるか確認する

### `SKILL.md` の変更の場合

少なくとも 1 つの現実的なシナリオで skill を確認してください。

1. 空のフォルダから始める
2. sample app に対して、agent に App Store screenshots の生成を依頼する
3. skill が次を満たすことを確認する
   - 最初に必要な discovery questions を聞く
   - "screenshots are ads, not docs" の原則を保つ
   - generator architecture に一貫性がある
   - export 手順が内部的に矛盾していない

### 強く推奨

PR description には次を含めてください。

- skill を試すときに使った prompt
- 何の挙動が変わったか
- 意図的に変えていない部分は何か

## 執筆ガイドライン

- 長文より、短く高密度な指示を優先する
- 例は現実的で production-oriented にする
- `README.md` と `SKILL.md` の間で大きな重複を避ける
  - ただし、対象読者が違うために重複が役立つならその限りではない
- workflow expectations を変える場合は、必要に応じて両方に記録する

## Pull Request チェックリスト

提出前に次を確認してください。

- 変更が具体的な問題を解決している
- 文言が人間と agent の両方にとって分かりやすい
- README と SKILL の指示が互いに矛盾していない
- PR description に、その変更が有用な理由が書かれている
