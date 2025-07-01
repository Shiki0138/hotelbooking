import React, { useState } from 'react';
import AffiliateBookingButtons from './AffiliateBookingButtons';

/**
 * 予約システムテストページ
 * 実装した予約機能をテストするためのコンポーネント
 */
const BookingTestPage = () => {
  const [selectedHotel, setSelectedHotel] = useState('hotel1');
  const [checkInDate, setCheckInDate] = useState('2024-07-01');
  const [checkOutDate, setCheckOutDate] = useState('2024-07-02');
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);

  // テスト用ホテルデータ
  const testHotels = {
    hotel1: {
      id: 'test-hotel-001',
      name: '東京グランドホテル',
      nameKana: 'トウキョウグランドホテル',
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
      address: {
        fullAddress: '東京都千代田区丸の内1-1-1'
      },
      price: 15000,
      pricing: {
        minPrice: 12000,
        maxPrice: 25000
      },
      rakutenHotelId: '123456',
      jalanHotelId: 'jalan123',
      yahooHotelId: 'yahoo123',
      bookingId: 'booking123',
      agodaId: 'agoda123',
      expediaId: 'expedia123',
      rating: {
        overall: 4.2,
        service: 4.0,
        location: 4.5,
        room: 4.1,
        equipment: 4.0,
        bath: 3.8,
        meal: 4.3
      },
      reviewCount: 1250
    },
    hotel2: {
      id: 'test-hotel-002',
      name: '大阪ベイサイドリゾート',
      nameKana: 'オオサカベイサイドリゾート',
      imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&q=80',
      address: {
        fullAddress: '大阪府大阪市住之江区南港北1-13-11'
      },
      price: 18000,
      pricing: {
        minPrice: 14000,
        maxPrice: 30000
      },
      rakutenHotelId: '789012',
      jalanHotelId: 'jalan456',
      yahooHotelId: 'yahoo456',
      bookingId: 'booking456',
      agodaId: 'agoda456',
      expediaId: 'expedia456',
      rating: {
        overall: 4.5,
        service: 4.4,
        location: 4.6,
        room: 4.5,
        equipment: 4.3,
        bath: 4.7,
        meal: 4.2
      },
      reviewCount: 890
    },
    hotel3: {
      id: 'test-hotel-003',
      name: '沖縄オーシャンビューホテル',
      nameKana: 'オキナワオーシャンビューホテル',
      imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80',
      address: {
        fullAddress: '沖縄県那覇市西3-20-1'
      },
      price: 22000,
      pricing: {
        minPrice: 18000,
        maxPrice: 35000
      },
      rakutenHotelId: '345678',
      jalanHotelId: 'jalan789',
      yahooHotelId: 'yahoo789',
      bookingId: 'booking789',
      agodaId: 'agoda789',
      expediaId: 'expedia789',
      rating: {
        overall: 4.8,
        service: 4.7,
        location: 4.9,
        room: 4.8,
        equipment: 4.6,
        bath: 4.5,
        meal: 4.9
      },
      reviewCount: 2100
    }
  };

  const currentHotel = testHotels[selectedHotel];

  // 日付・人数パラメータを含むホテルデータを作成
  const hotelWithParams = {
    ...currentHotel,
    checkInDate,
    checkOutDate,
    guests,
    rooms
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* ヘッダー */}
        <header style={{ 
          background: 'rgba(255, 255, 255, 0.95)', 
          backdropFilter: 'blur(10px)',
          padding: '30px',
          borderRadius: '16px',
          marginBottom: '40px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{ 
            margin: '0 0 10px 0',
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            🧪 予約システムテスト
          </h1>
          <p style={{ 
            margin: '0',
            fontSize: '1.1rem',
            color: '#666'
          }}>
            楽天トラベルリダイレクト方式＋複数OTA対応の予約システムをテストできます
          </p>
        </header>

        {/* テスト設定パネル */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '40px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ 
            margin: '0 0 25px 0',
            fontSize: '1.5rem',
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            ⚙️ テスト設定
          </h2>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '25px'
          }}>
            {/* ホテル選択 */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#333'
              }}>
                テストホテル
              </label>
              <select
                value={selectedHotel}
                onChange={(e) => setSelectedHotel(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  background: 'white'
                }}
              >
                <option value="hotel1">東京グランドホテル</option>
                <option value="hotel2">大阪ベイサイドリゾート</option>
                <option value="hotel3">沖縄オーシャンビューホテル</option>
              </select>
            </div>

            {/* チェックイン日 */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#333'
              }}>
                チェックイン
              </label>
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* チェックアウト日 */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#333'
              }}>
                チェックアウト
              </label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* 人数 */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#333'
              }}>
                人数
              </label>
              <select
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  background: 'white'
                }}
              >
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>{num}名</option>
                ))}
              </select>
            </div>

            {/* 部屋数 */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#333'
              }}>
                部屋数
              </label>
              <select
                value={rooms}
                onChange={(e) => setRooms(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  background: 'white'
                }}
              >
                {[1, 2, 3, 4].map(num => (
                  <option key={num} value={num}>{num}室</option>
                ))}
              </select>
            </div>
          </div>

          {/* 現在の設定表示 */}
          <div style={{
            background: '#f0f8ff',
            border: '1px solid #e3f2fd',
            borderRadius: '12px',
            padding: '15px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
              📋 現在のテスト設定
            </h4>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
              fontSize: '14px',
              color: '#333'
            }}>
              <div><strong>ホテル:</strong> {currentHotel.name}</div>
              <div><strong>チェックイン:</strong> {new Date(checkInDate).toLocaleDateString('ja-JP')}</div>
              <div><strong>チェックアウト:</strong> {new Date(checkOutDate).toLocaleDateString('ja-JP')}</div>
              <div><strong>人数:</strong> {guests}名</div>
              <div><strong>部屋数:</strong> {rooms}室</div>
            </div>
          </div>
        </div>

        {/* ホテル情報表示 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '40px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ 
            margin: '0 0 25px 0',
            fontSize: '1.5rem',
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            🏨 選択中のホテル
          </h2>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <img
              src={currentHotel.imageUrl}
              alt={currentHotel.name}
              style={{
                width: '200px',
                height: '150px',
                objectFit: 'cover',
                borderRadius: '12px'
              }}
            />
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: '#333' }}>
                {currentHotel.name}
              </h3>
              <p style={{ margin: '0 0 8px 0', color: '#666' }}>
                {currentHotel.nameKana}
              </p>
              <p style={{ margin: '0 0 15px 0', color: '#666' }}>
                📍 {currentHotel.address.fullAddress}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#ffa500', fontSize: '1.2rem' }}>
                  {'★'.repeat(Math.floor(currentHotel.rating.overall))}
                </span>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {currentHotel.rating.overall.toFixed(1)}/5
                </span>
                <span style={{ color: '#666' }}>
                  ({currentHotel.reviewCount.toLocaleString()} レビュー)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* メイン機能テスト */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ 
            margin: '0 0 25px 0',
            fontSize: '1.5rem',
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            🚀 予約システムテスト
          </h2>

          <div style={{
            background: '#fff9e6',
            border: '1px solid #ffd666',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px'
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#b8860b' }}>
              💡 テスト内容
            </h4>
            <ul style={{ margin: '0', paddingLeft: '20px', color: '#8b6914' }}>
              <li>楽天トラベル、じゃらん、Yahoo!トラベル、Booking.com、Agoda、Expediaへのリダイレクト</li>
              <li>日付・人数パラメータの引き継ぎ</li>
              <li>アフィリエイトID付きURL生成</li>
              <li>価格比較表示（デモ用推定価格）</li>
              <li>予約前確認画面（利用規約・注意事項）</li>
              <li>外部サイト遷移の説明表示</li>
            </ul>
          </div>

          {/* 実際の予約ボタンコンポーネント */}
          <AffiliateBookingButtons
            hotel={hotelWithParams}
            showPriceComparison={true}
          />
        </div>

        {/* フッター */}
        <footer style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#666',
          fontSize: '14px'
        }}>
          <p>
            🔧 This is a test environment for the hotel booking system.
            <br />
            実際の課金・予約は発生しません。
          </p>
        </footer>
      </div>
    </div>
  );
};

export default BookingTestPage;