/**
 * LastMinute Booking Service
 * 直前予約特化サービス - 24時間以内のチェックイン対応ホテル管理
 */

import HotelSearchService from './HotelSearchService.js';

class LastMinuteBookingService {
  constructor() {
    this.lastMinuteCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5分 (より短いキャッシュ時間)
    this.realTimeUpdateInterval = null;
    this.currentTime = new Date();
  }

  /**
   * 24時間以内チェックイン可能ホテルを検索
   * @param {Object} searchParams - 検索パラメータ
   * @returns {Array} フィルター済みホテルリスト
   */
  async searchLastMinuteHotels(searchParams) {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      // 基本検索パラメータに24時間以内の条件を追加
      const lastMinuteParams = {
        ...searchParams,
        checkIn: searchParams.checkIn || this.formatDate(now),
        checkOut: searchParams.checkOut || this.formatDate(tomorrow),
        lastMinuteOnly: true
      };

      // キャッシュチェック
      const cacheKey = this.generateLastMinuteCacheKey(lastMinuteParams);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return this.updateRealTimeData(cached);
      }

      // 通常の検索を実行
      const allHotels = await HotelSearchService.searchHotels(lastMinuteParams);
      
      // 直前予約専用フィルタリング
      const lastMinuteHotels = this.filterLastMinuteAvailable(allHotels, now);
      
      // 割引率と緊急性情報を追加
      const enrichedHotels = lastMinuteHotels.map(hotel => 
        this.enrichWithLastMinuteData(hotel, now)
      );

      // 直前予約優先でソート
      const sortedHotels = this.sortByLastMinutePriority(enrichedHotels);

      // キャッシュに保存
      this.saveToCache(cacheKey, sortedHotels);

      return sortedHotels;
    } catch (error) {
      console.error('LastMinute hotel search failed:', error);
      return [];
    }
  }

  /**
   * 24時間以内チェックイン可能かどうかを判定
   * @param {Object} hotel - ホテル情報
   * @param {Date} currentTime - 現在時刻
   * @returns {Boolean} チェックイン可能フラグ
   */
  canCheckInWithin24Hours(hotel, currentTime = new Date()) {
    try {
      const checkInTime = hotel.policies?.checkIn || '15:00';
      const checkInHour = parseInt(checkInTime.split(':')[0]);
      
      // 今日の残り時間を計算
      const today = new Date(currentTime);
      const todayCheckIn = new Date(today);
      todayCheckIn.setHours(checkInHour, 0, 0, 0);
      
      // 明日のチェックイン時刻
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(checkInHour, 0, 0, 0);

      // 24時間以内にチェックイン可能な時刻があるか
      const next24Hours = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
      
      return (todayCheckIn >= currentTime && todayCheckIn <= next24Hours) ||
             (tomorrow >= currentTime && tomorrow <= next24Hours);
    } catch (error) {
      console.warn('Check-in time validation failed:', error);
      return true; // デフォルトで利用可能とする
    }
  }

  /**
   * 直前予約向けにホテルをフィルタリング
   * @param {Array} hotels - ホテルリスト
   * @param {Date} currentTime - 現在時刻
   * @returns {Array} フィルタリング済みホテルリスト
   */
  filterLastMinuteAvailable(hotels, currentTime) {
    return hotels.filter(hotel => {
      // 基本的な利用可能性チェック
      if (!hotel.available) return false;
      
      // 24時間以内チェックイン可能チェック
      if (!this.canCheckInWithin24Hours(hotel, currentTime)) return false;
      
      // 最終予約可能時刻チェック
      const bookingDeadline = this.calculateBookingDeadline(hotel, currentTime);
      if (bookingDeadline <= currentTime) return false;
      
      return true;
    });
  }

  /**
   * 最終予約可能時刻を計算
   * @param {Object} hotel - ホテル情報
   * @param {Date} currentTime - 現在時刻
   * @returns {Date} 最終予約可能時刻
   */
  calculateBookingDeadline(hotel, currentTime = new Date()) {
    try {
      const checkInTime = hotel.policies?.checkIn || '15:00';
      const checkInHour = parseInt(checkInTime.split(':')[0]);
      
      // 基本的にはチェックイン時刻の2時間前まで予約可能
      const bookingCutoffHours = hotel.lastMinuteBookingCutoff || 2;
      
      const today = new Date(currentTime);
      const todayDeadline = new Date(today);
      todayDeadline.setHours(checkInHour - bookingCutoffHours, 0, 0, 0);
      
      // 今日の締切が過ぎている場合は明日の締切を返す
      if (todayDeadline <= currentTime) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(checkInHour - bookingCutoffHours, 0, 0, 0);
        return tomorrow;
      }
      
      return todayDeadline;
    } catch (error) {
      console.warn('Booking deadline calculation failed:', error);
      // デフォルトは現在時刻から6時間後
      return new Date(currentTime.getTime() + 6 * 60 * 60 * 1000);
    }
  }

  /**
   * 直前割引率を計算
   * @param {Object} hotel - ホテル情報
   * @param {Date} currentTime - 現在時刻
   * @returns {Object} 割引情報
   */
  calculateLastMinuteDiscount(hotel, currentTime = new Date()) {
    try {
      const basePrice = hotel.price?.original || hotel.price?.total || 0;
      const currentPrice = hotel.price?.total || 0;
      
      // 時間による動的割引率計算
      const deadline = this.calculateBookingDeadline(hotel, currentTime);
      const timeUntilDeadline = deadline.getTime() - currentTime.getTime();
      const hoursUntilDeadline = timeUntilDeadline / (1000 * 60 * 60);
      
      let discountRate = 0;
      
      // 緊急度による割引率
      if (hoursUntilDeadline <= 2) {
        discountRate = 0.25; // 25%割引
      } else if (hoursUntilDeadline <= 6) {
        discountRate = 0.20; // 20%割引
      } else if (hoursUntilDeadline <= 12) {
        discountRate = 0.15; // 15%割引
      } else if (hoursUntilDeadline <= 24) {
        discountRate = 0.10; // 10%割引
      }
      
      // 既存の割引がある場合は比較して良い方を適用
      const existingDiscount = basePrice > 0 ? (basePrice - currentPrice) / basePrice : 0;
      const finalDiscountRate = Math.max(discountRate, existingDiscount);
      
      const discountedPrice = basePrice * (1 - finalDiscountRate);
      const savingsAmount = basePrice - discountedPrice;
      
      return {
        hasDiscount: finalDiscountRate > 0,
        discountRate: Math.round(finalDiscountRate * 100),
        originalPrice: basePrice,
        discountedPrice: Math.round(discountedPrice),
        savingsAmount: Math.round(savingsAmount),
        urgencyLevel: this.calculateUrgencyLevel(hoursUntilDeadline)
      };
    } catch (error) {
      console.warn('Discount calculation failed:', error);
      return {
        hasDiscount: false,
        discountRate: 0,
        originalPrice: hotel.price?.total || 0,
        discountedPrice: hotel.price?.total || 0,
        savingsAmount: 0,
        urgencyLevel: 'low'
      };
    }
  }

  /**
   * 緊急度レベルを計算
   * @param {Number} hoursUntilDeadline - 締切までの時間
   * @returns {String} 緊急度レベル
   */
  calculateUrgencyLevel(hoursUntilDeadline) {
    if (hoursUntilDeadline <= 2) return 'critical';
    if (hoursUntilDeadline <= 6) return 'high';
    if (hoursUntilDeadline <= 12) return 'medium';
    return 'low';
  }

  /**
   * ホテルに直前予約情報を追加
   * @param {Object} hotel - ホテル情報
   * @param {Date} currentTime - 現在時刻
   * @returns {Object} 拡張されたホテル情報
   */
  enrichWithLastMinuteData(hotel, currentTime) {
    const bookingDeadline = this.calculateBookingDeadline(hotel, currentTime);
    const discountInfo = this.calculateLastMinuteDiscount(hotel, currentTime);
    const timeUntilDeadline = bookingDeadline.getTime() - currentTime.getTime();
    
    return {
      ...hotel,
      lastMinute: {
        isLastMinute: true,
        bookingDeadline,
        timeUntilDeadline,
        hoursUntilDeadline: Math.floor(timeUntilDeadline / (1000 * 60 * 60)),
        minutesUntilDeadline: Math.floor((timeUntilDeadline % (1000 * 60 * 60)) / (1000 * 60)),
        urgencyLevel: discountInfo.urgencyLevel,
        canCheckInToday: this.canCheckInToday(hotel, currentTime),
        nextAvailableCheckIn: this.getNextAvailableCheckIn(hotel, currentTime)
      },
      discount: discountInfo,
      // 価格を割引価格で更新
      price: {
        ...hotel.price,
        total: discountInfo.discountedPrice || hotel.price.total,
        original: discountInfo.originalPrice || hotel.price.total,
        discount: discountInfo.hasDiscount ? discountInfo.discountRate : null,
        savings: discountInfo.savingsAmount
      }
    };
  }

  /**
   * 今日チェックイン可能かチェック
   * @param {Object} hotel - ホテル情報
   * @param {Date} currentTime - 現在時刻
   * @returns {Boolean} 今日チェックイン可能フラグ
   */
  canCheckInToday(hotel, currentTime) {
    try {
      const checkInTime = hotel.policies?.checkIn || '15:00';
      const checkInHour = parseInt(checkInTime.split(':')[0]);
      
      const today = new Date(currentTime);
      const todayCheckIn = new Date(today);
      todayCheckIn.setHours(checkInHour, 0, 0, 0);
      
      return todayCheckIn > currentTime;
    } catch (error) {
      return false;
    }
  }

  /**
   * 次回利用可能チェックイン時刻を取得
   * @param {Object} hotel - ホテル情報
   * @param {Date} currentTime - 現在時刻
   * @returns {Date} 次回チェックイン時刻
   */
  getNextAvailableCheckIn(hotel, currentTime = new Date()) {
    try {
      const checkInTime = hotel.policies?.checkIn || '15:00';
      const checkInHour = parseInt(checkInTime.split(':')[0]);
      
      const today = new Date(currentTime);
      const todayCheckIn = new Date(today);
      todayCheckIn.setHours(checkInHour, 0, 0, 0);
      
      if (todayCheckIn > currentTime) {
        return todayCheckIn;
      } else {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(checkInHour, 0, 0, 0);
        return tomorrow;
      }
    } catch (error) {
      // デフォルトは今日の15:00
      const today = new Date(currentTime);
      today.setHours(15, 0, 0, 0);
      return today;
    }
  }

  /**
   * 直前予約優先でソート
   * @param {Array} hotels - ホテルリスト
   * @returns {Array} ソート済みホテルリスト
   */
  sortByLastMinutePriority(hotels) {
    return hotels.sort((a, b) => {
      // 1. 緊急度による優先度
      const urgencyOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      const urgencyDiff = urgencyOrder[b.lastMinute?.urgencyLevel] - urgencyOrder[a.lastMinute?.urgencyLevel];
      if (urgencyDiff !== 0) return urgencyDiff;
      
      // 2. 割引率による優先度
      const discountDiff = (b.discount?.discountRate || 0) - (a.discount?.discountRate || 0);
      if (discountDiff !== 0) return discountDiff;
      
      // 3. 価格による優先度（安い順）
      return a.price.total - b.price.total;
    });
  }

  /**
   * リアルタイムでデータを更新
   * @param {Array} hotels - ホテルリスト
   * @returns {Array} 更新されたホテルリスト
   */
  updateRealTimeData(hotels) {
    const currentTime = new Date();
    return hotels.map(hotel => {
      if (hotel.lastMinute) {
        const bookingDeadline = new Date(hotel.lastMinute.bookingDeadline);
        const timeUntilDeadline = bookingDeadline.getTime() - currentTime.getTime();
        
        // 締切を過ぎた場合は除外
        if (timeUntilDeadline <= 0) {
          return null;
        }
        
        // 時間情報を更新
        return {
          ...hotel,
          lastMinute: {
            ...hotel.lastMinute,
            timeUntilDeadline,
            hoursUntilDeadline: Math.floor(timeUntilDeadline / (1000 * 60 * 60)),
            minutesUntilDeadline: Math.floor((timeUntilDeadline % (1000 * 60 * 60)) / (1000 * 60))
          }
        };
      }
      return hotel;
    }).filter(hotel => hotel !== null);
  }

  /**
   * 日付をフォーマット
   * @param {Date} date - 日付
   * @returns {String} フォーマット済み日付文字列
   */
  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * キャッシュキー生成
   * @param {Object} params - パラメータ
   * @returns {String} キャッシュキー
   */
  generateLastMinuteCacheKey(params) {
    return `lastminute_${JSON.stringify({
      location: params.location,
      checkIn: params.checkIn,
      guests: params.guests,
      rooms: params.rooms
    })}`;
  }

  /**
   * キャッシュから取得
   * @param {String} key - キャッシュキー
   * @returns {Array|null} キャッシュデータ
   */
  getFromCache(key) {
    const cached = this.lastMinuteCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  /**
   * キャッシュに保存
   * @param {String} key - キャッシュキー
   * @param {Array} data - データ
   */
  saveToCache(key, data) {
    this.lastMinuteCache.set(key, {
      data,
      timestamp: Date.now()
    });

    // 古いキャッシュエントリをクリーンアップ
    if (this.lastMinuteCache.size > 20) {
      const oldestKey = this.lastMinuteCache.keys().next().value;
      this.lastMinuteCache.delete(oldestKey);
    }
  }

  /**
   * リアルタイム更新を開始
   * @param {Function} callback - 更新コールバック
   */
  startRealTimeUpdates(callback) {
    if (this.realTimeUpdateInterval) {
      clearInterval(this.realTimeUpdateInterval);
    }
    
    this.realTimeUpdateInterval = setInterval(() => {
      this.currentTime = new Date();
      if (callback) callback(this.currentTime);
    }, 60000); // 1分間隔で更新
  }

  /**
   * リアルタイム更新を停止
   */
  stopRealTimeUpdates() {
    if (this.realTimeUpdateInterval) {
      clearInterval(this.realTimeUpdateInterval);
      this.realTimeUpdateInterval = null;
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.lastMinuteCache.clear();
  }

  /**
   * サービスの破棄
   */
  destroy() {
    this.stopRealTimeUpdates();
    this.clearCache();
  }
}

export default new LastMinuteBookingService();