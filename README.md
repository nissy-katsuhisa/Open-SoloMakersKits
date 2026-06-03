# OpenSoloMakersKits

`AgentOrchestration` から同期した、OSS として公開可能な skill bundle を置くためのリポジトリです。

## 構成

- `skills/`: 公開用の skill bundle

## 現在の skill

- `skills/gen-feed-posts/`: アプリ文脈を踏まえたフィード投稿生成 workflow bundle

## ローカルでのソースオブトゥルース

各 skill の編集元は次の場所にあります。

- `../AgentOrchestration/`

`AgentOrchestration` を編集元とし、このリポジトリは OSS 公開先として扱ってください。

## ライセンス

このリポジトリは、ルートの [LICENSE](LICENSE) に記載された MIT ライセンスで公開します。

ただし、一部にはサードパーティ由来のコードやドキュメントが含まれており、それらについては元の著作権表示およびライセンス表示を保持します。詳細は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) と、各ディレクトリ内の `LICENSE` を参照してください。

## 公開前チェック

- 内部向けの記述や参照が残っていないか確認する
- 追加したファイルにライセンス方針と矛盾がないか確認する
- GitHub リポジトリ `agentsync/OpenSoloMakersKits` へコミットして push する
