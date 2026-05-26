# Style Prompts

実際の App Store スクリーンショットの中でも質が高い事例から抽出した、名前付きビジュアルスタイル集です。ユーザーがこれらのスタイル名を指定したり、ここにある prompt を貼り付けたりした場合は、対応するファイルに書かれた**仕様全体**を採用してください。対象は palette、typography、layout rhythm、decorative accents、copy tone まで含みます。

まずはスタイルを全体へ適用し、そのあと必要に応じて個別スライドだけ上書きします。

ユーザーの prompt が既存の名前付きスタイルに一致しない場合は、`SKILL.md` の General Visual Design Principles を基準にしつつ、ここにある中で**最も近い**スタイルを起点に選びます。

---

## Deep style spec 一覧 (`./style-prompts/`)

**deep spec を読む前に、必ず [`./style-prompts/_QUALITY_BAR.md`](./style-prompts/_QUALITY_BAR.md) を先に読んでください。** ここには、すべてのスタイルに共通する sizing、illustration の polish、contrast、auto-reject rule が定義されています。各 deep spec は、その上に style 固有の定量ルールを追加する構成です。

**ユーザーがこれらのスタイル名を指定したら、スライド生成前に必ず対応する deep spec file を読んでください。**

| # | Slug | Deep spec file | 使いどころ |
|---|------|----------------|-----------|
| 01 | `retro-rubberhose-mascot` | [01-retro-rubberhose-mascot.md](./style-prompts/01-retro-rubberhose-mascot.md) | 心地よい散歩アプリや習慣化アプリに。1930年代風カートゥーンキャラクター、クリーム + マスタード、白い手袋のマスコット、太めのレトロ見出し。Cancoco 由来。 |
| 02 | `moody-curated-dating` | [02-moody-curated-dating.md](./style-prompts/02-moody-curated-dating.md) | 会員制の dating / dinner club 系に。暗めの lifestyle photography、白い serif headline、italic emphasis。Mate 由来。 |
| 03 | `paper-sticker-skeuomorphic` | [03-paper-sticker-skeuomorphic.md](./style-prompts/03-paper-sticker-skeuomorphic.md) | 学生向け organizer、notes、hobby アプリに。コルクボード背景、紙の切り抜き風 UI、マーカーペン手書き、ステッカー風 pixel-art。Folderly 由来。 |
| 04 | `dreamy-pastel-couples` | [04-dreamy-pastel-couples.md](./style-prompts/04-dreamy-pastel-couples.md) | couples / long-distance / pet-companion 系に。綿あめのような空グラデーション、3D globe、kawaii pets、ライラック系 italic serif emphasis。Between 由来。 |
| 05 | `hand-drawn-editorial-tasks` | [05-hand-drawn-editorial-tasks.md](./style-prompts/05-hand-drawn-editorial-tasks.md) | デザイン感度の高い productivity / tasks / notes に。navy + cream + coral、script accent word、傾いた phone、doodle squiggles。Superlist 由来。 |
| 06 | `glossy-3d-kbeauty-creator` | [06-glossy-3d-kbeauty-creator.md](./style-prompts/06-glossy-3d-kbeauty-creator.md) | K-beauty / creator economy / influencer-brand collab 向け。深い紫グラデーション、光沢のある chrome 3D numerals、kawaii ghost mascot、黄色い hashtag chip。Nuri Lounge 由来。 |

---

## スタイルの適用方法

ユーザーがスタイル名を指定したときの例:

`"use the Hand-Drawn Editorial style"`

この場合は次の順で適用します。

1. 対応する deep spec file を読む
   - `_QUALITY_BAR.md` を先に読む
2. theme palette を指定された hex 値に合わせる
3. headline と body の font family を指定された stack にする
4. headline emphasis の挙動を仕様どおりに合わせる
5. layout rhythm を仕様どおりに適用する
6. decorative accents を少なくとも 60% のスライドに入れる
7. copy tone を指定された voice rule に合わせて書き換える

スタイルとユーザー指定のブランドカラーがぶつかる場合は、ブランドカラーを優先し、周辺の palette だけを近い明度・近い方向へ調整します。

---

## 組み合わせと上書き

- ユーザーがスタイル名と custom brand color を両方指定した場合は、brand color に近い明度の palette color を差し替えます。ただし typography と accent rule はそのまま維持します。
- ユーザーがスタイル名と layout を同時指定した場合は、指定スタイルの typography と accents を維持し、layout rhythm だけを入れ替えます。
- 2 つのスタイル名が指定された場合は、最初のものを主スタイルとし、2 つ目から借りる要素は 1 つまでに絞ります。
  - typography か decoration のどちらか一方だけ

## 新しいスタイルを追加する場合

この一覧にない新しいスタイルをユーザーが説明し、その結果を気に入った場合は、`./style-prompts/` に次の連番で deep spec file を追加する案を出してよいです。既存と同じ field layout に従います。

- Palette
- Typography
- Headline emphasis
- Layout rhythm
- Decorative accents
- Copy tone

そのうえで、上の index table に 1 行追加します。
