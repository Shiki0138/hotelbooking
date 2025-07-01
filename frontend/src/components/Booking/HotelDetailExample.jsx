import React from 'react';
import { AffiliateBookingButtons } from './index';
import affiliateService from '../../services/AffiliateService';

/**
 * ホテル詳細ページでのアフィリエイト機能統合例
 */
const HotelDetailExample = ({ hotel }) => {
  // サンプルホテルデータ
  const sampleHotel = hotel || {
    id: 'hotel_001',
    name: '東京グランドホテル',
    description: '東京駅から徒歩5分の便利な立地にある高級ホテル',
    price: 15000,
    rating: 4.5,
    images: ['/images/hotel-sample.jpg'],
    // 各OTAでのホテルID
    rakutenHotelId: '123456',
    jalanHotelId: 'jln_001',
    yahooHotelId: 'yh_001',
    bookingId: 'bk_001',
    agodaId: 'ag_001',
    expediaId: 'ex_001'
  };

  // ホテル詳細表示時にインプレッショントラッキング
  React.useEffect(() => {
    // ページビューをトラッキング（オプション）
    if (window.gtag) {
      window.gtag('event', 'view_hotel', {
        hotel_id: sampleHotel.id,
        hotel_name: sampleHotel.name,
        price: sampleHotel.price
      });
    }
  }, [sampleHotel]);

  return (
    <div className="hotel-detail-page">
      {/* ホテル基本情報 */}
      <div className="hotel-header">
        <h1>{sampleHotel.name}</h1>
        <div className="hotel-rating">
          ⭐ {sampleHotel.rating} / 5.0
        </div>
      </div>

      <div className="hotel-content">
        {/* ホテル画像 */}
        <div className="hotel-images">
          <img 
            src={sampleHotel.images[0]} 
            alt={sampleHotel.name}
            style={{ width: '100%', height: '400px', objectFit: 'cover', borderRadius: '12px' }}
          />
        </div>

        {/* ホテル説明 */}
        <div className="hotel-description">
          <h2>ホテルについて</h2>
          <p>{sampleHotel.description}</p>
        </div>

        {/* アフィリエイト予約ボタン */}
        <div className="booking-section">
          <h2>予約オプション</h2>
          <AffiliateBookingButtons 
            hotel={sampleHotel}
            showPriceComparison={true}
          />
        </div>

        {/* その他の情報 */}
        <div className="hotel-amenities">
          <h2>設備・サービス</h2>
          <ul>
            <li>✓ 無料Wi-Fi</li>
            <li>✓ 朝食付き</li>
            <li>✓ 24時間フロント</li>
            <li>✓ 駐車場完備</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .hotel-detail-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }

        .hotel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .hotel-header h1 {
          font-size: 32px;
          color: #111827;
          margin: 0;
        }

        .hotel-rating {
          font-size: 18px;
          color: #f59e0b;
          font-weight: 600;
        }

        .hotel-content {
          display: grid;
          gap: 32px;
        }

        .hotel-description {
          background: #f9fafb;
          padding: 24px;
          border-radius: 12px;
        }

        .hotel-description h2 {
          font-size: 20px;
          margin: 0 0 16px 0;
          color: #111827;
        }

        .hotel-description p {
          color: #4b5563;
          line-height: 1.6;
        }

        .booking-section h2 {
          font-size: 20px;
          margin: 0 0 16px 0;
          color: #111827;
        }

        .hotel-amenities {
          background: #f9fafb;
          padding: 24px;
          border-radius: 12px;
        }

        .hotel-amenities h2 {
          font-size: 20px;
          margin: 0 0 16px 0;
          color: #111827;
        }

        .hotel-amenities ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .hotel-amenities li {
          color: #4b5563;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
};

export default HotelDetailExample;