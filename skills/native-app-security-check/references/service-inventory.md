# 利用サービス棚卸し

セキュリティレビューの前に、アプリと周辺システムが使っている外部サービス、クラウド、BaaS、SaaS、CI/CDを把握する。サービス名だけでなく、何に使っているか、どのコードや設定から分かるか、アプリ側だけで判断できない確認事項を分ける。

## まず確認する場所

- 依存関係: `Package.resolved`、`Package.swift`、`Podfile.lock`、`Cartfile.resolved`、`build.gradle`、`pubspec.yaml`、`package.json`。
- アプリ設定: `Info.plist`、Entitlements、`GoogleService-Info.plist`、`firebase.json`、`supabase` 設定、URL Schemes、Associated Domains。
- コード: `import`、SDKクライアント生成、エンドポイントURL、環境変数名、API呼び出し、ログ/分析/クラッシュ送信。
- インフラ: `terraform`、`opentofu`、`*.tf`、`cloudbuild.yaml`、`Dockerfile`、`docker-compose.yml`、Kubernetes/Helm、Cloud Run、Cloudflare Workers/Pages、`wrangler.toml`。
- CI/CD: `.github/workflows`、GitLab CI、Bitbucket Pipelines、CircleCI、Fastlane、Xcode Cloud、Cloud Build。
- ドキュメントとスクリプト: `README`、`docs`、`Makefile`、`scripts`、デプロイ用シェル、環境変数サンプル。

## 検出パターン

- Supabase: `supabase-swift`、`import Supabase`、`SupabaseClient`、`SUPABASE_URL`、`SUPABASE_ANON_KEY`、`.auth`、`.from(...)`、`.rpc(...)`、Edge Functions URL。
- Firebase / Google: `GoogleService-Info.plist`、`FirebaseApp.configure`、`FirebaseAuth`、`Firestore`、`Messaging`、`Analytics`、`Crashlytics`、`google-services.json`。
- GCP / Cloud Run: `gcloud run deploy`、`google_cloud_run_service`、`google_cloud_run_v2_service`、`run.googleapis.com`、`cloudbuild.yaml`、Artifact Registry、Secret Manager、Cloud Scheduler、Pub/Sub。
- Cloudflare: `wrangler.toml`、Workers、Pages、KV、R2、D1、Queues、`cloudflare_*` Terraform resource、Cloudflare DNS/API token、Turnstile。
- AWS: `aws_*` Terraform resource、CloudFormation/SAM、S3、Cognito、Lambda、API Gateway、CloudFront、SNS/SQS、Secrets Manager。
- Azure: `azurerm_*` Terraform resource、Bicep/ARM、App Service、Functions、Key Vault、Entra ID、Storage。
- 認証/SaaS: Auth0、Clerk、Okta、Cognito、Stripe、RevenueCat、Sentry、Datadog、Amplitude、Mixpanel、OneSignal、SendGrid、Twilio。
- CDN/API: `api.`、`cdn.`、GraphQL endpoint、OpenAPI定義、API Gateway、Cloudflare proxy、Firebase Hosting、Vercel、Netlify。

## OSSツールの使い分け

- 依存関係の棚卸し: Syft、cdxgen、SwiftPM系の依存グラフツールを使い、SDKやライブラリ名からサービス候補を抽出する。
- コード利用箇所の抽出: SemgrepのSwift/汎用ルールで、SDK import、クライアント生成、環境変数名、URL、API呼び出しを拾う。
- IaC/CI/CDの抽出と設定確認: Checkov、Trivy config、Semgrep YAML/HCLルールで、Terraform、CloudFormation、Kubernetes、Dockerfile、GitHub Actions、Cloud Buildを確認する。
- 実クラウド資産の棚卸し: 認証情報を安全に使える場合のみ、CloudQuery、Steampipe、Cartography、Fix InventoryなどでGCP/AWS/Azure/Cloudflare/GitHub/Kubernetesの実リソースを読む。

## 出力する地図

- サービス名: 例 `Supabase`、`Cloud Run`、`Cloudflare Workers`。
- 用途: 認証、DB、Storage、API実行、配信、DNS、分析、通知、決済、監視など。
- 証拠: 依存ファイル、設定ファイル、コード参照、IaC resource、CI/CDコマンド。
- セキュリティ確認: 認可、秘密情報、ネットワーク公開範囲、ログ、レート制限、環境分離、権限、鍵ローテーション。
- 判定: `コードで確認済み`、`設定で確認済み`、`人間確認が必要`、`未確認`。

## 注意

- URLや環境変数名だけで本番利用と決めつけない。サンプル、古い設定、コメント、テストコードの可能性を分けて書く。
- クライアント側にある anon/public key は即秘密情報とは限らないが、権限境界やRLS/API側認可の確認が必要になる。
- 実クラウド資産の確認は、リポジトリからの静的解析では分からない。必要な権限、対象プロジェクト、読み取り範囲を明示してから行う。
