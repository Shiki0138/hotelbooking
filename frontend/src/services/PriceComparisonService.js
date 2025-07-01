/**
 * 価格比較サービス
 * 複数のOTAから価格情報を取得・比較する
 */

class PriceComparisonService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30分
  }

  /**
   * 複数OTAの価格を比較取得
   * @param {Object} hotel - ホテル情報
   * @returns {Promise<Object>} 価格比較データ
   */
  async compareHotelPrices(hotel) {
    const cacheKey = this.getCacheKey(hotel);
    
    // キャッシュチェック
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // 並列で各OTAの価格を取得
      const pricePromises = [
        this.fetchRakutenPrice(hotel),
        this.fetchJalanPrice(hotel),
        this.fetchYahooTravelPrice(hotel),
        this.fetchBookingPrice(hotel),
        this.fetchAgodaPrice(hotel),
        this.fetchExpediaPrice(hotel)
      ];

      const results = await Promise.allSettled(pricePromises);
      
      const prices = {
        rakuten: this.extractResult(results[0]),
        jalan: this.extractResult(results[1]),
        yahoo: this.extractResult(results[2]),
        booking: this.extractResult(results[3]),
        agoda: this.extractResult(results[4]),
        expedia: this.extractResult(results[5])
      };

      // 最安値・最高値の計算
      const validPrices = Object.values(prices).filter(p => p !== null);
      const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
      const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : null;
      
      // 最安値のOTAを特定
      let cheapestOta = null;
      if (minPrice !== null) {
        cheapestOta = Object.entries(prices).find(([ota, price]) => price === minPrice)?.[0];
      }

      const comparisonData = {
        prices,
        minPrice,
        maxPrice,
        cheapestOta,
        averagePrice: validPrices.length > 0 ? validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length : null,
        validCount: validPrices.length,
        lastUpdated: new Date().toISOString()
      };

      // キャッシュに保存
      this.cache.set(cacheKey, {
        data: comparisonData,
        timestamp: Date.now()
      });

      return comparisonData;
    } catch (error) {
      console.error('Price comparison failed:', error);
      
      // フォールバック：基本価格からの推定
      return this.generateFallbackPrices(hotel);
    }
  }

  /**
   * 楽天トラベル価格取得
   * @param {Object} hotel - ホテル情報
   * @returns {Promise<number|null>} 価格
   */
  async fetchRakutenPrice(hotel) {
    try {
      // 実際のAPIエンドポイントの場合
      if (process.env.REACT_APP_RAKUTEN_APP_ID) {
        const params = new URLSearchParams({
          applicationId: process.env.REACT_APP_RAKUTEN_APP_ID,
          hotelNo: hotel.rakutenHotelId || hotel.id,
          checkinDate: hotel.checkInDate?.replace(/-/g, '') || '',
          checkoutDate: hotel.checkOutDate?.replace(/-/g, '') || '',
          adultNum: hotel.guests || 2
        });

        const response = await fetch(
          `https://app.rakuten.co.jp/services/api/Travel/VacantHotelSearch/20170426?${params}`
        );
        
        if (response.ok) {
          const data = await response.json();
          return data.hotels?.[0]?.hotel?.[1]?.roomInfo?.[0]?.dailyCharge?.total || null;
        }
      }
      
      // デモ用：基本価格からの推定
      return this.estimatePrice(hotel, 'rakuten');
    } catch (error) {
      console.warn('Rakuten price fetch failed:', error);
      return this.estimatePrice(hotel, 'rakuten');
    }
  }

  /**
   * じゃらん価格取得
   * @param {Object} hotel - ホテル情報
   * @returns {Promise<number|null>} 価格
   */
  async fetchJalanPrice(hotel) {
    try {
      // デモ用：基本価格からの推定
      return this.estimatePrice(hotel, 'jalan');
    } catch (error) {
      console.warn('Jalan price fetch failed:', error);
      return this.estimatePrice(hotel, 'jalan');
    }
  }

  /**
   * Yahoo!トラベル価格取得
   * @param {Object} hotel - ホテル情報
   * @returns {Promise<number|null>} 価格
   */
  async fetchYahooTravelPrice(hotel) {
    try {
      // デモ用：基本価格からの推定
      return this.estimatePrice(hotel, 'yahoo');
    } catch (error) {
      console.warn('Yahoo Travel price fetch failed:', error);
      return this.estimatePrice(hotel, 'yahoo');
    }
  }

  /**
   * Booking.com価格取得
   * @param {Object} hotel - ホテル情報
   * @returns {Promise<number|null>} 価格
   */
  async fetchBookingPrice(hotel) {
    try {
      // デモ用：基本価格からの推定
      return this.estimatePrice(hotel, 'booking');
    } catch (error) {
      console.warn('Booking.com price fetch failed:', error);
      return this.estimatePrice(hotel, 'booking');
    }
  }

  /**
   * Agoda価格取得
   * @param {Object} hotel - ホテル情報
   * @returns {Promise<number|null>} 価格
   */
  async fetchAgodaPrice(hotel) {
    try {
      // デモ用：基本価格からの推定
      return this.estimatePrice(hotel, 'agoda');
    } catch (error) {
      console.warn('Agoda price fetch failed:', error);
      return this.estimatePrice(hotel, 'agoda');
    }
  }

  /**
   * Expedia価格取得
   * @param {Object} hotel - ホテル情報
   * @returns {Promise<number|null>} 価格
   */
  async fetchExpediaPrice(hotel) {
    try {
      // デモ用：基本価格からの推定
      return this.estimatePrice(hotel, 'expedia');
    } catch (error) {
      console.warn('Expedia price fetch failed:', error);
      return this.estimatePrice(hotel, 'expedia');
    }
  }

  /**
   * 価格の推定（デモ用）
   * @param {Object} hotel - ホテル情報
   * @param {string} otaType - OTAタイプ
   * @returns {number|null} 推定価格
   */
  estimatePrice(hotel, otaType) {
    const basePrice = hotel.price || hotel.pricing?.minPrice || 10000;
    
    // OTAごとの価格変動係数
    const priceMultipliers = {
      rakuten: 1.0 + (Math.random() - 0.5) * 0.2, // ±10%
      jalan: 1.0 + (Math.random() - 0.5) * 0.25, // ±12.5%
      yahoo: 1.0 + (Math.random() - 0.5) * 0.15, // ±7.5%
      booking: 1.0 + (Math.random() - 0.5) * 0.3, // ±15%
      agoda: 1.0 + (Math.random() - 0.5) * 0.25, // ±12.5%
      expedia: 1.0 + (Math.random() - 0.5) * 0.2 // ±10%
    };

    // 曜日や季節による価格変動を考慮
    let seasonMultiplier = 1.0;
    if (hotel.checkInDate) {
      const checkInDate = new Date(hotel.checkInDate);
      const dayOfWeek = checkInDate.getDay();
      const month = checkInDate.getMonth();
      
      // 週末料金の割増
      if (dayOfWeek === 5 || dayOfWeek === 6) { // 金土
        seasonMultiplier *= 1.2;
      }
      
      // 繁忙期の割増
      if ([7, 8, 11, 0].includes(month)) { // 8月、9月、12月、1月
        seasonMultiplier *= 1.3;
      }
      
      // ゴールデンウィーク・お盆の割増
      if (month === 4 || month === 7) { // 5月、8月
        seasonMultiplier *= 1.5;
      }
    }

    const estimatedPrice = Math.round(basePrice * (priceMultipliers[otaType] || 1.0) * seasonMultiplier);
    
    // 最小価格の設定
    return Math.max(estimatedPrice, 3000);
  }

  /**
   * Promise.allSettledの結果から値を抽出
   * @param {Object} result - Promise.allSettledの結果
   * @returns {*} 成功時の値またはnull
   */
  extractResult(result) {
    return result.status === 'fulfilled' ? result.value : null;
  }

  /**
   * キャッシュキーの生成
   * @param {Object} hotel - ホテル情報
   * @returns {string} キャッシュキー
   */
  getCacheKey(hotel) {
    return `${hotel.id}_${hotel.checkInDate}_${hotel.checkOutDate}_${hotel.guests}_${hotel.rooms}`;
  }

  /**
   * フォールバック価格データの生成
   * @param {Object} hotel - ホテル情報
   * @returns {Object} フォールバック価格データ
   */
  generateFallbackPrices(hotel) {
    const basePrice = hotel.price || hotel.pricing?.minPrice || 10000;
    
    const prices = {
      rakuten: this.estimatePrice(hotel, 'rakuten'),
      jalan: this.estimatePrice(hotel, 'jalan'),
      yahoo: this.estimatePrice(hotel, 'yahoo'),
      booking: this.estimatePrice(hotel, 'booking'),
      agoda: this.estimatePrice(hotel, 'agoda'),
      expedia: this.estimatePrice(hotel, 'expedia')
    };

    const validPrices = Object.values(prices).filter(p => p !== null);
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);
    const cheapestOta = Object.entries(prices).find(([ota, price]) => price === minPrice)?.[0];

    return {
      prices,
      minPrice,
      maxPrice,
      cheapestOta,
      averagePrice: validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length,
      validCount: validPrices.length,
      lastUpdated: new Date().toISOString(),
      isEstimated: true
    };
  }

  /**
   * 価格履歴の保存
   * @param {string} hotelId - ホテルID
   * @param {Object} priceData - 価格データ
   */
  savePriceHistory(hotelId, priceData) {
    try {
      const historyKey = `price_history_${hotelId}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      
      history.push({
        ...priceData,
        timestamp: Date.now()
      });
      
      // 過去30日分のみ保持
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const filteredHistory = history.filter(entry => entry.timestamp > thirtyDaysAgo);
      
      localStorage.setItem(historyKey, JSON.stringify(filteredHistory));
    } catch (error) {
      console.warn('Failed to save price history:', error);
    }
  }

  /**
   * 価格履歴の取得
   * @param {string} hotelId - ホテルID
   * @returns {Array} 価格履歴
   */
  getPriceHistory(hotelId) {
    try {
      const historyKey = `price_history_${hotelId}`;
      return JSON.parse(localStorage.getItem(historyKey) || '[]');
    } catch (error) {
      console.warn('Failed to get price history:', error);
      return [];
    }
  }

  /**
   * 価格アラートの設定
   * @param {string} hotelId - ホテルID
   * @param {number} targetPrice - 目標価格
   * @param {string} email - 通知先メール
   */
  setPriceAlert(hotelId, targetPrice, email) {
    try {
      const alertKey = `price_alert_${hotelId}`;
      const alert = {
        hotelId,
        targetPrice,
        email,
        createdAt: new Date().toISOString(),
        isActive: true
      };
      
      localStorage.setItem(alertKey, JSON.stringify(alert));
      
      // サーバーにアラート設定を送信（実装時）
      // this.sendPriceAlertToServer(alert);
    } catch (error) {
      console.warn('Failed to set price alert:', error);
    }
  }

  /**
   * キャッシュクリア
   */
  clearCache() {
    this.cache.clear();
  }
}

// シングルトンインスタンスとしてエクスポート
const priceComparisonService = new PriceComparisonService();

export default priceComparisonService;