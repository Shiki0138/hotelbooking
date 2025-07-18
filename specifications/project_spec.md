# 📋 プロジェクト仕様書

**変換日時**: 2025-06-26 18:49:47
**プロジェクト**: default

---

プロジェクト要件テンプレート（Google Cloud Platform 版）

⸻

プロジェクト名

ラストミニット・マッチ（Last-Minute Match）
― 直前キャンセル・価格最適化に特化したホテル予約プラットフォーム

⸻

概要
	•	目的 : 直前予約ニーズ（突然の休暇／子育て家族／突発出張／高級宿ハンター）と、宿泊施設側の「急な空室を埋めたい」「手数料を下げたい」という課題を同時に解決。
	•	差別化 :
	1.	スマート検索＋ペルソナ UI（家族・ディール・ワーク etc.）
	2.	キャンセル待ち通知 ＆ ブッキング・ウォッチドッグ（予約後の価格／空室監視）
	3.	低率コミッション＋需要インサイト提供 で宿に価値提供
	4.	サイトコントローラー連携（手間いらず／ねっぱん！）で在庫を一括確保
	•	採用クラウド : Google Cloud Platform（GCP） を全面利用。初期は Cloud Run＋Cloud SQL を中心としたサーバーレス構成、スケール後は GKE Autopilot へ段階的に移行。

⸻

主要機能
	1.	スマート検索 & ペルソナフィルター
	•	0–7 日先の空室を即表示、GPS／地図連動、家族・ディール・ワーク等の高次フィルターでUIが動的変更。
	2.	スマートアラートエンジン
	•	キャンセル待ち通知 : 満室→空室を数分単位で検出しメール／LINE／プッシュ通知。
	•	ブッキング・ウォッチドッグ : 予約確認メール転送で価格下落・上位グレード出現を自動監視＆再予約提案。
	3.	直前割ディールハブ
	•	OTA API から割引率・希少性を算出し「今夜最大50 %OFF」「今週末掘り出し物」を特集。
	4.	宿泊施設ダッシュボード
	•	待機ユーザー数ヒートマップ、ターゲットクーポン、需要予測、料金最適化アルゴリズム。
	5.	サイトコントローラー／OTA API 連携
	•	手間いらず・ねっぱん！API で在庫同期、Expedia Rapid／Booking.com Affiliate で補完。
	6.	AI パーソナライズ & レコメンド
	•	LLM＋レコメンダーで嗜好・季節・位置・需要を学習し最適提案。
	7.	モバイルアプリ & 多言語対応（段階的）
	•	Push 即時通知、英語・中国語・韓国語 UI、インバウンド需要取り込み。

⸻

ユーザーストーリー
	•	自発的な家族として、子連れ対応設備が整った宿の空きを今週末で探したい。なぜなら子供の体調で予定が直前まで決められないから。
	•	憧れのディールシーカーとして、満室の高級旅館にキャンセルが出たら即通知を受け取りたい。なぜなら通常は取れない宿をお得に確保したいから。
	•	柔軟なプロフェッショナルとして、Wi-Fiとデスク環境が完備されたホテルを明日出張先で予約したい。なぜなら仕事効率を維持しつつブレジャーも楽しみたいから。
	•	ホテル管理者として、直前キャンセル分を自動で埋めたい。なぜなら高いOTA手数料を払わず稼働率を最大化したいから。

⸻

技術要件

フロントエンド

項目	採用技術	理由・詳細
フレームワーク	Next.js (React 18)	SSG/SSR 併用で SEO・高速レンダリング。
UI / スタイリング	Tailwind CSS + shadcn/ui + Framer Motion	ペルソナ切替アニメ・アクセシビリティ担保。
状態管理	TanStack Query（サーバー状態）＋Zustand（ローカル）	OTA キャッシュと UI 状態を分離。
地図表示	Google Maps JS API	緯度経度検索・クラスタリング・現在地検索。
多言語化	next-intl / i18next	インバウンド需要を想定。

バックエンド

項目	採用技術	補足
言語 / FW	Node.js + NestJS (TypeScript)	DI / Modular / マイクロサービス拡張容易。
API 統合	Apollo GraphQL Federation	複数 OTA REST を一元化。
データベース	Cloud SQL for PostgreSQL (HA) + PostGIS + JSONB	地理検索 & OTA 生データ格納。
メッセージング	Cloud Tasks & Pub/Sub	キャンセル監視／価格監視ワーカー。
キャッシュ	Cloud Memorystore for Redis（オプション）	高頻度データを数分キャッシュ。
認証	Auth0 + JWT + RBAC	SNS・メールログイン、多ロール対応。
通知サービス	SendGrid（メール） + Firebase FCM（プッシュ） + LINE Messaging API	GCP マーケットプレイス & ネイティブ連携。

インフラ / デプロイ

項目	GCP サービス	詳細
コンテナ実行	Cloud Run（MVP） → GKE Autopilot（スケール後）	完全マネージド→クラスタ制御移行。
オブジェクトストレージ / CDN	Cloud Storage + Cloud CDN	静的アセット・画像・API キャッシュ。
監視 / ログ	Cloud Monitoring（旧 Stackdriver） + Cloud Logging + Error Reporting + Cloud Trace	メトリクス・アラート・分散トレース統合。
セキュリティ	Cloud Armor (WAF) + Identity-Aware Proxy (IAP)	L7 DDoS 防御、ゼロトラスト境界。
シークレット管理	Secret Manager + Cloud KMS	PII 暗号鍵管理・自動ローテーション。
IaC	Terraform + Google Cloud Blueprints	マルチ環境コード化。
CI/CD	GitHub Actions → Cloud Build → Cloud Deploy (Blue/Green)	PR → Build → Rollout 全自動。
VPC ネットワーク	VPC Native + Serverless VPC Access	Cloud Run ↔ Cloud SQL 私設サブネット経由。


⸻

非機能要件

カテゴリ	目標値 & 対策
パフォーマンス	検索 API p95 応答 < 300 ms、FCP < 1.8 s。Cloud CDN & Edge Caching。
可用性	99.9 %（Cloud Run regional、Cloud SQL HA、Cloud Storage Multi-Region）。
スケーラビリティ	Cloud Run max-instances & GKE HPA による 1 → 50,000 同時接続水平拡張。
セキュリティ	HTTPS 強制、Cloud Armor WAF、CSP/HSTS、OWASP Top-10 準拠、SOC 2 相当ログ。
プライバシー	GDPR / APPI 準拠、Retention 90 日、PII 暗号化（KMS）。
アクセシビリティ	WCAG 2.1 AA、キーボード操作完結、色覚対応カラーパレット。


⸻

制約事項

項目	内容
予算	MVP GCP コスト：月額 ≤ ¥150,000（Cloud Run、Cloud SQL、CDN、ネットワーク）。
期限	仕様確定後 12 週間で MVP β 公開（2 週スプリント）。
技術的	民泊（Airbnb 等）データ除外、IE11 非対応。


⸻

優先順位
	1.	スマート検索 & キャンセル待ち通知（P0 / MVP）
	2.	ブッキング・ウォッチドッグ & サイトコントローラー連携（P0→P1）
	3.	ペルソナ UI／AI レコメンド／ホテルダッシュボード（P1）
	4.	モバイルアプリ & プッシュ通知／多言語化（P2）
	5.	ソーシャル共有・データレポート販売（P3）

⸻

参考資料
	•	戦略設計書『ラストミニット・マッチ』全章
	•	Google Cloud 公式ドキュメント（Cloud Run, Cloud SQL, Cloud CDN, Cloud Deploy など）
	•	楽天トラベル Web Service API・じゃらん Web Service API
	•	手間いらず／ねっぱん！ サイトコントローラー API 仕様
	•	Expedia Group Traveler Value Index 2024, HotelTonight 技術公開事例
	•	一休.com「空室待ち」・BIGLOBE「宿みっけ」機能比較レポート

⸻

備考

収益モデル（ハイブリッド・フリーミアム）

フェーズ	ユーザー収益	ホテル収益	コメント
MVP	無料	手数料 0 %	市場浸透 & データ蓄積優先
V2	プレミアム（月額 ¥300〜）無制限アラート + 価格監視 + SMS 通知	低率コミッション 5–8 %	手数料は OTA の 1/2～1/3 で訴求
V3	データレポート販売・広告・法人 API	ターゲットクーポン配信料	事業多角化

開発ロードマップ（概要）

期間	主なユーザー機能	ホテル／連携	技術マイルストーン
0–3 か月	検索・単一ホテルキャンセル通知	手動ホテル登録	Cloud Run + Cloud SQL 基盤
3–6 か月	ペルソナ UI & 価格監視 β	ダッシュボード α	手間いらず API 連携 / PubSub
6–12 か月	AI レコメンド・アプリ	ターゲットクーポン	ねっぱん！ API / GKE Autopilot
12 か月～	ソーシャル・データ販	高度分析	GDS / 大手 OTA Rapid API

リスクと緩和策

リスク	緩和策
コールドスタート（2 面市場）	子育て家族 × 箱根等のニッチで臨界質量形成 → 横展開。
サイトコントローラー交渉遅延	早期に仕様取得・PoC、並行して OTA Affiliate で在庫補完。
競合の機能追随	ペルソナ特化 UX ＋ コミュニティ構築で差別化、ブランドを先行確立。


⸻

---

**注意**: この仕様書は全エージェントが参照します。変更時は必ずPRESIDENTの承認を得てください。
