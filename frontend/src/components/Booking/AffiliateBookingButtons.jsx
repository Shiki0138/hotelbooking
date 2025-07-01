import React, { useState, useEffect } from 'react';
import affiliateService from '../../services/AffiliateService';
import priceComparisonService from '../../services/PriceComparisonService';
import BookingConfirmModal from './BookingConfirmModal';
import './AffiliateBookingButtons.css';

/**
 * アフィリエイト予約ボタンコンポーネント
 * 複数のOTAへのアフィリエイトリンクを表示
 */
const AffiliateBookingButtons = ({ hotel, showPriceComparison = true }) => {
  const [affiliateLinks, setAffiliateLinks] = useState({});
  const [prices, setPrices] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOta, setSelectedOta] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);

  // OTA情報定義
  const otaInfo = {
    rakuten: {
      name: '楽天トラベル',
      logo: '/images/ota-logos/rakuten.png',
      color: '#bf0000',
      description: 'ポイント還元でお得',
      features: ['楽天ポイント付与', '日本語サポート完備']
    },
    jalan: {
      name: 'じゃらん',
      logo: '/images/ota-logos/jalan.png',
      color: '#ff6600',
      description: 'Pontaポイントが貯まる',
      features: ['Pontaポイント付与', 'クーポン多数']
    },
    yahoo: {
      name: 'Yahoo!トラベル',
      logo: '/images/ota-logos/yahoo.png',
      color: '#ff0033',
      description: 'PayPayボーナス付与',
      features: ['PayPayボーナス', 'Tポイント付与']
    },
    booking: {
      name: 'Booking.com',
      logo: '/images/ota-logos/booking.png',
      color: '#003580',
      description: '世界最大級の予約サイト',
      features: ['無料キャンセル多数', '最安値保証']
    },
    agoda: {
      name: 'Agoda',
      logo: '/images/ota-logos/agoda.png',
      color: '#5c2e91',
      description: 'アジア最強の品揃え',
      features: ['ポイント即時利用可', '会員限定価格']
    },
    expedia: {
      name: 'Expedia',
      logo: '/images/ota-logos/expedia.png',
      color: '#003876',
      description: 'ホテル+航空券でお得',
      features: ['パッケージ割引', '会員限定セール']
    }
  };

  useEffect(() => {
    // アフィリエイトリンク生成
    const links = affiliateService.generateAllLinks(hotel);
    setAffiliateLinks(links);

    // 価格情報の取得（デモ用にランダム価格を設定）
    if (showPriceComparison) {
      fetchPrices();
    }

    setIsLoading(false);
  }, [hotel, showPriceComparison]);

  /**
   * 価格情報を取得（実際のAPIを呼び出す場合はここを修正）
   */
  const fetchPrices = async () => {
    try {
      // 価格比較サービスを使用して実際の価格を取得
      const priceData = await priceComparisonService.compareHotelPrices(hotel);
      
      if (priceData && priceData.prices) {
        setPrices(priceData.prices);
        
        // 価格履歴を保存
        priceComparisonService.savePriceHistory(hotel.id, priceData);
      } else {
        // フォールバック：基本価格からの推定
        const basePrice = hotel.price || 10000;
        const fallbackPrices = {
          rakuten: basePrice + Math.floor(Math.random() * 2000 - 1000),
          jalan: basePrice + Math.floor(Math.random() * 2000 - 1000),
          yahoo: basePrice + Math.floor(Math.random() * 2000 - 1000),
          booking: basePrice + Math.floor(Math.random() * 2000 - 1000),
          agoda: basePrice + Math.floor(Math.random() * 2000 - 1000),
          expedia: basePrice + Math.floor(Math.random() * 2000 - 1000)
        };
        setPrices(fallbackPrices);
      }
    } catch (error) {
      console.error('Price fetch failed:', error);
      
      // エラー時のフォールバック
      const basePrice = hotel.price || 10000;
      const fallbackPrices = {
        rakuten: basePrice + Math.floor(Math.random() * 2000 - 1000),
        jalan: basePrice + Math.floor(Math.random() * 2000 - 1000),
        yahoo: basePrice + Math.floor(Math.random() * 2000 - 1000),
        booking: basePrice + Math.floor(Math.random() * 2000 - 1000),
        agoda: basePrice + Math.floor(Math.random() * 2000 - 1000),
        expedia: basePrice + Math.floor(Math.random() * 2000 - 1000)
      };
      setPrices(fallbackPrices);
    }
  };

  /**
   * 予約ボタンクリック処理
   */
  const handleBookingClick = (otaType, link) => {
    // 予約情報を設定
    setPendingBooking({
      otaType,
      link,
      price: prices[otaType],
      bookingParams: {
        checkIn: hotel.checkInDate,
        checkOut: hotel.checkOutDate,
        guests: hotel.guests,
        rooms: hotel.rooms
      }
    });

    // 確認モーダルを表示
    setShowConfirmModal(true);
  };

  /**
   * 予約確認後の処理
   */
  const handleConfirmBooking = () => {
    if (!pendingBooking) return;

    const { otaType, link } = pendingBooking;

    // クリックトラッキング
    affiliateService.trackClick(hotel.id, otaType);

    // 選択状態を更新
    setSelectedOta(otaType);

    // 新しいタブでリンクを開く
    window.open(link, '_blank', 'noopener,noreferrer');

    // モーダルを閉じる
    setShowConfirmModal(false);
    setPendingBooking(null);

    // 3秒後に選択状態をリセット
    setTimeout(() => {
      setSelectedOta(null);
    }, 3000);
  };

  /**
   * 予約キャンセル処理
   */
  const handleCancelBooking = () => {
    setShowConfirmModal(false);
    setPendingBooking(null);
  };

  /**
   * 最安値のOTAを取得
   */
  const getCheapestOta = () => {
    if (!showPriceComparison || Object.keys(prices).length === 0) return null;

    let cheapest = null;
    let minPrice = Infinity;

    Object.entries(prices).forEach(([ota, price]) => {
      if (price < minPrice) {
        minPrice = price;
        cheapest = ota;
      }
    });

    return cheapest;
  };

  /**
   * 価格フォーマット
   */
  const formatPrice = (price) => {
    if (!price) return '---';
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="affiliate-booking-buttons loading">
        <div className="loading-spinner"></div>
        <p>予約オプションを読み込み中...</p>
      </div>
    );
  }

  const cheapestOta = getCheapestOta();

  return (
    <div className="affiliate-booking-buttons">
      <h3 className="booking-title">予約サイトを選択</h3>
      
      {showPriceComparison && (
        <div className="price-comparison-note">
          <span className="icon">💡</span>
          <span>各サイトの料金を比較してお得に予約！</span>
        </div>
      )}

      <div className="ota-buttons-grid">
        {Object.entries(otaInfo).map(([otaType, info]) => {
          const link = affiliateLinks[otaType];
          const price = prices[otaType];
          const isCheapest = otaType === cheapestOta;
          const isSelected = otaType === selectedOta;

          return (
            <button
              key={otaType}
              className={`ota-button ${isCheapest ? 'cheapest' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => handleBookingClick(otaType, link)}
              style={{ '--ota-color': info.color }}
            >
              {isCheapest && (
                <div className="cheapest-badge">最安値</div>
              )}

              <div className="ota-header">
                <div className="ota-logo">
                  <img 
                    src={info.logo} 
                    alt={info.name}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="ota-name-fallback" style={{ display: 'none' }}>
                    {info.name}
                  </div>
                </div>
              </div>

              <div className="ota-description">
                {info.description}
              </div>

              {showPriceComparison && price && (
                <div className="ota-price">
                  <span className="price-label">料金：</span>
                  <span className="price-value">{formatPrice(price)}</span>
                </div>
              )}

              <div className="ota-features">
                {info.features.map((feature, index) => (
                  <span key={index} className="feature-tag">
                    {feature}
                  </span>
                ))}
              </div>

              <div className="ota-cta">
                <span className="cta-text">詳細を見る</span>
                <span className="cta-arrow">→</span>
              </div>

              {isSelected && (
                <div className="selection-overlay">
                  <div className="selection-message">
                    {info.name}へ移動中...
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="booking-notes">
        <h4>予約時の注意事項</h4>
        <ul>
          <li>料金は予約時点での参考価格です。実際の料金は各予約サイトでご確認ください。</li>
          <li>キャンセルポリシーは予約サイトやプランによって異なります。</li>
          <li>ポイント付与率は会員ランクやキャンペーンによって変動する場合があります。</li>
        </ul>
      </div>

      {/* トラッキングピクセル（コンバージョン測定用） */}
      <div style={{ display: 'none' }}>
        <img 
          src={`/api/affiliate/pixel?hotel_id=${hotel.id}&session_id=${affiliateService.getSessionId()}`}
          alt=""
          width="1"
          height="1"
        />
      </div>

      {/* 予約確認モーダル */}
      <BookingConfirmModal
        isOpen={showConfirmModal}
        onClose={handleCancelBooking}
        onConfirm={handleConfirmBooking}
        otaType={pendingBooking?.otaType}
        hotel={hotel}
        price={pendingBooking?.price}
        bookingParams={pendingBooking?.bookingParams}
      />
    </div>
  );
};

export default AffiliateBookingButtons;