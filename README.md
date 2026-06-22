# OpenSoloMakersKits

個人開発者がアプリをリリースするときに役立つ skill bundle をまとめた OSS リポジトリです。

## 構成

- `skills/`: 公開用の skill bundle
- `scripts/`: 共通入力確認と、Editorなしで実行できる生成runner
- `editor/`: ローカルでスキルを確認・実行するための軽量Editor
- `docs/`: リリースやブランチ運用などの公開作業メモ
- `skill-explanation-images/`: READMEなどで参照するスキル解説画像

## 現在の公開対象

- `skills/gen-appstore-image/`: App Store / Google Play 用スクリーンショット画像を、アプリ理解・ブランド抽出・必要なスクリーンショット取得を踏まえて生成する skill bundle
  - 種別: skill bundle（入口は `skills/gen-appstore-image/SKILL.md`）
  - 解説画像: [`skill-explanation-images/gen-appstore-image-flow.png`](skill-explanation-images/gen-appstore-image-flow.png)
- `skills/check-native-app-legal/`: iOS、Android、その他ネイティブアプリの法務・ストア審査リスクを、コード・公開ページ・人間レビューの3レーンで確認する skill
  - 種別: 単体 skill
  - 更新日: 2026-06-12
  - 解説画像: [`skill-explanation-images/check-native-app-legal-flow.png`](skill-explanation-images/check-native-app-legal-flow.png)
  - 注意: このskillは法務確認の一次整理を補助するもので、法的助言ではありません。確実な対策が必要な場合は、自分で最新情報を調べ、必要に応じて弁護士などの専門家に確認してください。
- `skills/native-app-security-check/`: iOS、Android、その他ネイティブアプリのコード・設定・利用サービスを読み、セキュリティ確認項目を整理する skill
  - 種別: 単体 skill
  - 更新日: 2026-06-12
  - 解説画像: [`skill-explanation-images/native-app-security-check-flow.png`](skill-explanation-images/native-app-security-check-flow.png)
  - 参考OSS確認バージョン（2026-06-12時点）:
    - Syft: `v1.45.1`
    - cdxgen: `v12.5.1`
    - Semgrep: `v1.166.0`
    - Checkov: `3.3.1`
    - Trivy: `v0.71.0`
    - CloudQuery: `plugins-source-airtable-v2.3.11`（GitHub latest release tag。CloudQueryはプラグイン単位のリリースを含む）
    - Steampipe: `v2.4.4`
    - Cartography: `0.137.0`
    - Fix Inventory: `4.2.0`
  - 注意: このskillはコード・設定・利用サービスの棚卸しを補助するもので、これだけでセキュリティが完成するわけではありません。実クラウド設定、RLS/認可、鍵運用、ログ、実機確認、ペンテストは別途確認してください。
- `skills/app-product-summary/`: アプリのコードベースから、プロダクト理解とブランド理解をまとめた `data/app-product-context.json` を出力する skill
  - 種別: 単体 skill
  - 解説画像: [`skill-explanation-images/app-product-summary-flow.png`](skill-explanation-images/app-product-summary-flow.png)

## リリース運用

スキルは機能ごとに段階的に公開します。ブランチの使い分けと公開手順は [docs/release-flow.md](docs/release-flow.md) を参照してください。

## ローカル実行

EditorなしでApp Store画像生成を試す場合:

```bash
node scripts/run-gen-appstore-image.mjs --demo
```

Editorで確認する場合:

```bash
cd editor
npm run dev
```

生成物は `output/` 配下に保存し、GitHubには含めません。

## ライセンス

このリポジトリは、ルートの [LICENSE](LICENSE) に記載された MIT ライセンスで公開します。

ただし、一部にはサードパーティ由来のコードやドキュメントが含まれており、それらについては元の著作権表示およびライセンス表示を保持します。詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) と、各ディレクトリ内の `LICENSE` を参照してください。

## 公開前チェック

- 内部向けの記述や参照が残っていないか確認する
- 追加したファイルにライセンス方針と矛盾がないか確認する
- GitHub リポジトリ `agentsync/OpenSoloMakersKits` へコミットして push する
