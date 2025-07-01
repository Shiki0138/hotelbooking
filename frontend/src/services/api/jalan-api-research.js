/**
 * じゃらんAPI調査結果と代替案
 * 
 * 【じゃらんnetについて】
 * じゃらんnetは日本最大級の宿泊予約サイトの一つですが、
 * 2023年現在、外部開発者向けの公開APIは提供されていません。
 * 
 * 【利用可能性】
 * - 公開API: ✗ 提供なし
 * - アフィリエイトAPI: △ リクルート社のアフィリエイトプログラム経由で限定的に利用可能
 * - スクレイピング: ✗ 利用規約で禁止
 * 
 * 【代替API提案】
 * 
 * 1. 楽天トラベルAPI（実装済み）
 *    - 無料で利用可能
 *    - 豊富な検索オプション
 *    - 日本全国のホテル情報
 * 
 * 2. Booking.com API
 *    - パートナープログラム加入が必要
 *    - 国際的なホテル情報も豊富
 *    - 日本語対応あり
 * 
 * 3. Expedia Affiliate Network (EAN)
 *    - アフィリエイトプログラム
 *    - 詳細な料金・空室情報
 *    - 審査が必要
 * 
 * 4. Agoda Partner API
 *    - アジア地域に強い
 *    - 日本のホテル情報も豊富
 *    - パートナー登録必要
 * 
 * 5. トリバゴ (Trivago) API
 *    - ホテル価格比較に特化
 *    - パートナープログラム
 * 
 * 【推奨構成】
 * メインAPI: 楽天トラベルAPI
 * サブAPI: Booking.com API（審査通過後）
 * 
 * この組み合わせで日本国内ホテルの大部分をカバー可能
 */

// 将来的にじゃらんAPIが公開された場合の実装予約スペース
class JalanAPI {
  constructor() {
    console.warn('じゃらんAPIは現在利用できません。楽天トラベルAPIを使用してください。');
  }

  // 将来の実装のためのインターフェース定義
  async searchHotels(params) {
    throw new Error('じゃらんAPIは現在利用できません');
  }

  async getHotelDetail(hotelId) {
    throw new Error('じゃらんAPIは現在利用できません');
  }
}

export default JalanAPI;