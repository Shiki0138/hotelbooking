/**
 * アフィリエイトサービス
 * 各種アフィリエイトプログラムとの連携を管理
 */

class AffiliateService {
  constructor() {
    // アフィリエイトID設定
    this.affiliateConfig = {
      rakuten: {
        affiliateId: process.env.REACT_APP_RAKUTEN_AFFILIATE_ID || '',
        applicationId: process.env.REACT_APP_RAKUTEN_APP_ID || '',
        baseUrl: 'https://hb.afl.rakuten.co.jp/hgc/',
        travelUrl: 'https://travel.rakuten.co.jp/'
      },
      valueCommerce: {
        sid: process.env.REACT_APP_VALUE_COMMERCE_SID || '', // サイトID
        pid: process.env.REACT_APP_VALUE_COMMERCE_PID || '', // プログラムID
        jalan: {
          baseUrl: 'https://ck.jp.ap.valuecommerce.com/servlet/referral',
          programId: '10801' // じゃらんのプログラムID
        },
        yahooTravel: {
          baseUrl: 'https://ck.jp.ap.valuecommerce.com/servlet/referral',
          programId: '10802' // Yahoo!トラベルのプログラムID
        }
      },
      a8net: {
        a8id: process.env.REACT_APP_A8NET_ID || '',
        baseUrl: 'https://px.a8.net/svt/ejp'
      }
    };

    // トラッキングデータ保存用
    this.trackingData = {
      clicks: {},
      conversions: {}
    };
  }

  /**
   * 楽天トラベルアフィリエイトリンク生成
   * @param {Object} hotel - ホテル情報
   * @returns {string} アフィリエイトリンク
   */
  generateRakutenLink(hotel) {
    const { affiliateId, baseUrl, travelUrl } = this.affiliateConfig.rakuten;
    
    // 検索パラメータの構築
    const searchParams = new URLSearchParams();
    
    if (hotel.checkInDate) searchParams.set('f_teien', hotel.checkInDate.replace(/-/g, ''));
    if (hotel.checkOutDate) searchParams.set('f_teiex', hotel.checkOutDate.replace(/-/g, ''));
    if (hotel.guests) searchParams.set('f_otona_su', hotel.guests.toString());
    if (hotel.rooms) searchParams.set('f_heya_su', hotel.rooms.toString());
    
    // ホテルIDの設定
    const hotelId = hotel.rakutenHotelId || hotel.id;
    let targetUrl;
    
    if (searchParams.toString()) {
      targetUrl = `${travelUrl}hotel/${hotelId}?${searchParams.toString()}`;
    } else {
      targetUrl = `${travelUrl}hotel/${hotelId}`;
    }
    
    // アフィリエイトIDがない場合は直接リンク
    if (!affiliateId) {
      return targetUrl;
    }

    // 楽天アフィリエイトURL構造
    const affiliateUrl = `${baseUrl}${affiliateId}/`;
    const encodedTargetUrl = encodeURIComponent(targetUrl);
    
    return `${affiliateUrl}?pc=${encodedTargetUrl}&m=${encodedTargetUrl}`;
  }

  /**
   * じゃらんアフィリエイトリンク生成（バリューコマース経由）
   * @param {Object} hotel - ホテル情報
   * @returns {string} アフィリエイトリンク
   */
  generateJalanLink(hotel) {
    const { sid, pid, jalan } = this.affiliateConfig.valueCommerce;
    
    // 検索パラメータの構築
    const searchParams = new URLSearchParams();
    
    if (hotel.checkInDate) searchParams.set('checkin_date', hotel.checkInDate);
    if (hotel.checkOutDate) searchParams.set('checkout_date', hotel.checkOutDate);
    if (hotel.guests) searchParams.set('adult_num', hotel.guests.toString());
    if (hotel.rooms) searchParams.set('room_num', hotel.rooms.toString());
    
    // ホテルIDの設定
    const hotelId = hotel.jalanHotelId || hotel.id;
    let targetUrl;
    
    if (searchParams.toString()) {
      targetUrl = `https://www.jalan.net/hotel/${hotelId}?${searchParams.toString()}`;
    } else {
      targetUrl = `https://www.jalan.net/hotel/${hotelId}`;
    }
    
    // アフィリエイトIDがない場合は直接リンク
    if (!sid || !pid) {
      return targetUrl;
    }

    const params = new URLSearchParams({
      sid: sid,
      pid: pid,
      vcid: jalan.programId,
      url: encodeURIComponent(targetUrl)
    });

    return `${jalan.baseUrl}?${params.toString()}`;
  }

  /**
   * Yahoo!トラベルアフィリエイトリンク生成（バリューコマース経由）
   * @param {Object} hotel - ホテル情報
   * @returns {string} アフィリエイトリンク
   */
  generateYahooTravelLink(hotel) {
    const { sid, pid, yahooTravel } = this.affiliateConfig.valueCommerce;
    
    // 検索パラメータの構築
    const searchParams = new URLSearchParams();
    
    if (hotel.checkInDate) searchParams.set('checkin', hotel.checkInDate);
    if (hotel.checkOutDate) searchParams.set('checkout', hotel.checkOutDate);
    if (hotel.guests) searchParams.set('adult', hotel.guests.toString());
    if (hotel.rooms) searchParams.set('room', hotel.rooms.toString());
    
    // ホテルIDの設定
    const hotelId = hotel.yahooHotelId || hotel.id;
    let targetUrl;
    
    if (searchParams.toString()) {
      targetUrl = `https://travel.yahoo.co.jp/hotel/${hotelId}?${searchParams.toString()}`;
    } else {
      targetUrl = `https://travel.yahoo.co.jp/hotel/${hotelId}`;
    }
    
    // アフィリエイトIDがない場合は直接リンク
    if (!sid || !pid) {
      return targetUrl;
    }

    const params = new URLSearchParams({
      sid: sid,
      pid: pid,
      vcid: yahooTravel.programId,
      url: encodeURIComponent(targetUrl)
    });

    return `${yahooTravel.baseUrl}?${params.toString()}`;
  }

  /**
   * A8.net経由のその他OTAリンク生成
   * @param {Object} hotel - ホテル情報
   * @param {string} otaType - OTAタイプ（booking.com, agoda等）
   * @returns {string} アフィリエイトリンク
   */
  generateA8Link(hotel, otaType) {
    const { a8id, baseUrl } = this.affiliateConfig.a8net;
    
    // 検索パラメータの構築
    const searchParams = new URLSearchParams();
    
    if (hotel.checkInDate) searchParams.set('checkin', hotel.checkInDate);
    if (hotel.checkOutDate) searchParams.set('checkout', hotel.checkOutDate);
    if (hotel.guests) searchParams.set('group_adults', hotel.guests.toString());
    if (hotel.rooms) searchParams.set('no_rooms', hotel.rooms.toString());
    
    let baseOtaUrl;
    const hotelId = hotel.bookingId || hotel.agodaId || hotel.expediaId || hotel.id;
    
    switch (otaType) {
      case 'booking.com':
        baseOtaUrl = `https://www.booking.com/hotel/jp/${hotelId}.html`;
        break;
      case 'agoda':
        baseOtaUrl = `https://www.agoda.com/hotel/${hotelId}.html`;
        if (hotel.checkInDate) searchParams.set('checkIn', hotel.checkInDate);
        if (hotel.checkOutDate) searchParams.set('checkOut', hotel.checkOutDate);
        if (hotel.guests) searchParams.set('adults', hotel.guests.toString());
        if (hotel.rooms) searchParams.set('rooms', hotel.rooms.toString());
        break;
      case 'expedia':
        baseOtaUrl = `https://www.expedia.co.jp/hotel/${hotelId}`;
        if (hotel.checkInDate) searchParams.set('chkin', hotel.checkInDate);
        if (hotel.checkOutDate) searchParams.set('chkout', hotel.checkOutDate);
        break;
      default:
        return '#';
    }
    
    let targetUrl;
    if (searchParams.toString()) {
      targetUrl = `${baseOtaUrl}?${searchParams.toString()}`;
    } else {
      targetUrl = baseOtaUrl;
    }

    // アフィリエイトIDがない場合は直接リンク
    if (!a8id) {
      return targetUrl;
    }

    const params = new URLSearchParams({
      a8mat: a8id,
      guid: 'on',
      url: encodeURIComponent(targetUrl)
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * 全OTAのアフィリエイトリンクを生成
   * @param {Object} hotel - ホテル情報
   * @returns {Object} 各OTAのアフィリエイトリンク
   */
  generateAllLinks(hotel) {
    return {
      rakuten: this.generateRakutenLink(hotel),
      jalan: this.generateJalanLink(hotel),
      yahoo: this.generateYahooTravelLink(hotel),
      booking: this.generateA8Link(hotel, 'booking.com'),
      agoda: this.generateA8Link(hotel, 'agoda'),
      expedia: this.generateA8Link(hotel, 'expedia')
    };
  }

  /**
   * クリックトラッキング
   * @param {string} hotelId - ホテルID
   * @param {string} otaType - OTAタイプ
   */
  trackClick(hotelId, otaType) {
    const trackingKey = `${hotelId}_${otaType}`;
    const timestamp = new Date().toISOString();

    if (!this.trackingData.clicks[trackingKey]) {
      this.trackingData.clicks[trackingKey] = [];
    }

    this.trackingData.clicks[trackingKey].push({
      timestamp,
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      referrer: document.referrer
    });

    // ローカルストレージに保存
    this.saveTrackingData();

    // サーバーに送信（非同期）
    this.sendTrackingToServer('click', {
      hotelId,
      otaType,
      timestamp,
      sessionId: this.getSessionId()
    });
  }

  /**
   * コンバージョントラッキング
   * @param {string} hotelId - ホテルID
   * @param {string} otaType - OTAタイプ
   * @param {Object} bookingDetails - 予約詳細
   */
  trackConversion(hotelId, otaType, bookingDetails = {}) {
    const trackingKey = `${hotelId}_${otaType}`;
    const timestamp = new Date().toISOString();

    if (!this.trackingData.conversions[trackingKey]) {
      this.trackingData.conversions[trackingKey] = [];
    }

    this.trackingData.conversions[trackingKey].push({
      timestamp,
      sessionId: this.getSessionId(),
      bookingDetails,
      estimatedRevenue: this.calculateEstimatedRevenue(otaType, bookingDetails)
    });

    // ローカルストレージに保存
    this.saveTrackingData();

    // サーバーに送信（非同期）
    this.sendTrackingToServer('conversion', {
      hotelId,
      otaType,
      timestamp,
      sessionId: this.getSessionId(),
      bookingDetails
    });
  }

  /**
   * レポートデータ取得
   * @param {string} period - 期間（daily, weekly, monthly）
   * @returns {Object} レポートデータ
   */
  getReportData(period = 'daily') {
    const now = new Date();
    const periodStart = this.getPeriodStart(now, period);

    const clicks = this.filterByPeriod(this.trackingData.clicks, periodStart);
    const conversions = this.filterByPeriod(this.trackingData.conversions, periodStart);

    return {
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: now.toISOString(),
      summary: {
        totalClicks: this.countEvents(clicks),
        totalConversions: this.countEvents(conversions),
        conversionRate: this.calculateConversionRate(clicks, conversions),
        estimatedRevenue: this.calculateTotalRevenue(conversions)
      },
      byOta: this.aggregateByOta(clicks, conversions),
      byHotel: this.aggregateByHotel(clicks, conversions),
      timeline: this.generateTimeline(clicks, conversions, period)
    };
  }

  /**
   * 収益推定計算
   * @param {string} otaType - OTAタイプ
   * @param {Object} bookingDetails - 予約詳細
   * @returns {number} 推定収益
   */
  calculateEstimatedRevenue(otaType, bookingDetails) {
    const commissionRates = {
      rakuten: 0.01, // 1%
      jalan: 0.015, // 1.5%
      yahoo: 0.012, // 1.2%
      booking: 0.04, // 4%
      agoda: 0.035, // 3.5%
      expedia: 0.03 // 3%
    };

    const rate = commissionRates[otaType] || 0.02;
    const bookingAmount = bookingDetails.totalAmount || 0;

    return bookingAmount * rate;
  }

  /**
   * セッションID取得
   * @returns {string} セッションID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('affiliateSessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('affiliateSessionId', sessionId);
    }
    return sessionId;
  }

  /**
   * トラッキングデータをローカルストレージに保存
   */
  saveTrackingData() {
    try {
      localStorage.setItem('affiliateTrackingData', JSON.stringify(this.trackingData));
    } catch (error) {
      console.error('Failed to save tracking data:', error);
    }
  }

  /**
   * トラッキングデータをサーバーに送信
   * @param {string} eventType - イベントタイプ
   * @param {Object} data - 送信データ
   */
  async sendTrackingToServer(eventType, data) {
    try {
      const response = await fetch('/api/affiliate/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventType,
          data,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send tracking data');
      }
    } catch (error) {
      console.error('Error sending tracking data:', error);
      // エラー時はローカルに保存してリトライキューに入れる
      this.addToRetryQueue(eventType, data);
    }
  }

  /**
   * リトライキューに追加
   * @param {string} eventType - イベントタイプ
   * @param {Object} data - 送信データ
   */
  addToRetryQueue(eventType, data) {
    const retryQueue = JSON.parse(localStorage.getItem('affiliateRetryQueue') || '[]');
    retryQueue.push({
      eventType,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0
    });
    localStorage.setItem('affiliateRetryQueue', JSON.stringify(retryQueue));
  }

  /**
   * 期間でフィルタリング
   * @param {Object} data - データ
   * @param {Date} periodStart - 期間開始日
   * @returns {Object} フィルタリングされたデータ
   */
  filterByPeriod(data, periodStart) {
    const filtered = {};
    
    Object.entries(data).forEach(([key, events]) => {
      const filteredEvents = events.filter(event => 
        new Date(event.timestamp) >= periodStart
      );
      
      if (filteredEvents.length > 0) {
        filtered[key] = filteredEvents;
      }
    });

    return filtered;
  }

  /**
   * 期間開始日を取得
   * @param {Date} now - 現在日時
   * @param {string} period - 期間
   * @returns {Date} 期間開始日
   */
  getPeriodStart(now, period) {
    const start = new Date(now);
    
    switch (period) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
      default:
        start.setHours(0, 0, 0, 0);
    }

    return start;
  }

  /**
   * イベント数をカウント
   * @param {Object} events - イベントデータ
   * @returns {number} イベント数
   */
  countEvents(events) {
    return Object.values(events).reduce((total, eventList) => 
      total + eventList.length, 0
    );
  }

  /**
   * コンバージョン率計算
   * @param {Object} clicks - クリックデータ
   * @param {Object} conversions - コンバージョンデータ
   * @returns {number} コンバージョン率
   */
  calculateConversionRate(clicks, conversions) {
    const totalClicks = this.countEvents(clicks);
    const totalConversions = this.countEvents(conversions);
    
    return totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  }

  /**
   * 総収益計算
   * @param {Object} conversions - コンバージョンデータ
   * @returns {number} 総収益
   */
  calculateTotalRevenue(conversions) {
    let total = 0;
    
    Object.values(conversions).forEach(conversionList => {
      conversionList.forEach(conversion => {
        total += conversion.estimatedRevenue || 0;
      });
    });

    return total;
  }

  /**
   * OTA別集計
   * @param {Object} clicks - クリックデータ
   * @param {Object} conversions - コンバージョンデータ
   * @returns {Object} OTA別集計データ
   */
  aggregateByOta(clicks, conversions) {
    const otaData = {};
    
    // クリックデータの集計
    Object.entries(clicks).forEach(([key, events]) => {
      const [, otaType] = key.split('_');
      if (!otaData[otaType]) {
        otaData[otaType] = { clicks: 0, conversions: 0, revenue: 0 };
      }
      otaData[otaType].clicks += events.length;
    });

    // コンバージョンデータの集計
    Object.entries(conversions).forEach(([key, events]) => {
      const [, otaType] = key.split('_');
      if (!otaData[otaType]) {
        otaData[otaType] = { clicks: 0, conversions: 0, revenue: 0 };
      }
      otaData[otaType].conversions += events.length;
      events.forEach(event => {
        otaData[otaType].revenue += event.estimatedRevenue || 0;
      });
    });

    return otaData;
  }

  /**
   * ホテル別集計
   * @param {Object} clicks - クリックデータ
   * @param {Object} conversions - コンバージョンデータ
   * @returns {Object} ホテル別集計データ
   */
  aggregateByHotel(clicks, conversions) {
    const hotelData = {};
    
    // クリックデータの集計
    Object.entries(clicks).forEach(([key, events]) => {
      const [hotelId] = key.split('_');
      if (!hotelData[hotelId]) {
        hotelData[hotelId] = { clicks: 0, conversions: 0, revenue: 0 };
      }
      hotelData[hotelId].clicks += events.length;
    });

    // コンバージョンデータの集計
    Object.entries(conversions).forEach(([key, events]) => {
      const [hotelId] = key.split('_');
      if (!hotelData[hotelId]) {
        hotelData[hotelId] = { clicks: 0, conversions: 0, revenue: 0 };
      }
      hotelData[hotelId].conversions += events.length;
      events.forEach(event => {
        hotelData[hotelId].revenue += event.estimatedRevenue || 0;
      });
    });

    return hotelData;
  }

  /**
   * タイムライン生成
   * @param {Object} clicks - クリックデータ
   * @param {Object} conversions - コンバージョンデータ
   * @param {string} period - 期間
   * @returns {Array} タイムラインデータ
   */
  generateTimeline(clicks, conversions, period) {
    const timeline = [];
    const now = new Date();
    const periodStart = this.getPeriodStart(now, period);
    
    // 時間単位の設定
    const timeUnit = period === 'daily' ? 'hour' : 'day';
    const timeSpan = period === 'daily' ? 24 : (period === 'weekly' ? 7 : 30);
    
    for (let i = 0; i < timeSpan; i++) {
      const timePoint = new Date(periodStart);
      
      if (timeUnit === 'hour') {
        timePoint.setHours(timePoint.getHours() + i);
      } else {
        timePoint.setDate(timePoint.getDate() + i);
      }
      
      const nextTimePoint = new Date(timePoint);
      if (timeUnit === 'hour') {
        nextTimePoint.setHours(nextTimePoint.getHours() + 1);
      } else {
        nextTimePoint.setDate(nextTimePoint.getDate() + 1);
      }
      
      // 該当期間のイベントをカウント
      let clickCount = 0;
      let conversionCount = 0;
      
      Object.values(clicks).forEach(eventList => {
        clickCount += eventList.filter(event => {
          const eventTime = new Date(event.timestamp);
          return eventTime >= timePoint && eventTime < nextTimePoint;
        }).length;
      });
      
      Object.values(conversions).forEach(eventList => {
        conversionCount += eventList.filter(event => {
          const eventTime = new Date(event.timestamp);
          return eventTime >= timePoint && eventTime < nextTimePoint;
        }).length;
      });
      
      timeline.push({
        time: timePoint.toISOString(),
        clicks: clickCount,
        conversions: conversionCount
      });
    }
    
    return timeline;
  }

  /**
   * トラッキングデータを読み込み
   */
  loadTrackingData() {
    try {
      const savedData = localStorage.getItem('affiliateTrackingData');
      if (savedData) {
        this.trackingData = JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Failed to load tracking data:', error);
    }
  }
}

// シングルトンインスタンスとしてエクスポート
const affiliateService = new AffiliateService();
affiliateService.loadTrackingData();

export default affiliateService;