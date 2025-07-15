import React, { useState } from 'react';

const SimpleHotelApp: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [checkinDate, setCheckinDate] = useState('');
  const [checkoutDate, setCheckoutDate] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);

  // 今日の日付を取得
  React.useEffect(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setCheckinDate(today.toISOString().split('T')[0]);
    setCheckoutDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      alert('ホテル名を入力してください');
      return;
    }

    // AI予測データ（実際のAIで生成される想定）
    const aiPrediction = {
      bestBookingTime: "今から2週間後",
      savings: "最大15%安く",
      trend: "価格上昇傾向",
      confidence: 87
    };

    const results = {
      hotelName: searchQuery,
      checkinDate,
      checkoutDate,
      aiPrediction,
      prices: [
        { provider: '楽天トラベル', price: 42000, badge: '最安値', rank: '🥇' },
        { provider: 'Booking.com', price: 43500, rank: '🥈' },
        { provider: 'じゃらん', price: 44200, rank: '🥉' }
      ],
      priceCalendar: [
        { date: '1/20', price: '38k', color: '#e8f5e8', textColor: '#22c55e' },
        { date: '1/27', price: '42k', color: '#fff3cd', textColor: '#f59e0b' },
        { date: '2/3', price: '45k', color: '#fee2e2', textColor: '#dc2626' },
        { date: '2/10', price: '39k', color: '#e8f5e8', textColor: '#22c55e' },
        { date: '2/17', price: '43k', color: '#fff3cd', textColor: '#f59e0b' },
        { date: '2/24', price: '47k', color: '#fee2e2', textColor: '#dc2626' },
        { date: '3/3', price: '40k', color: '#e8f5e8', textColor: '#22c55e' }
      ]
    };

    setSearchResults(results);
    setShowResults(true);
  };

  const handleAreaSelect = (area: string) => {
    alert(`${area}のホテルを検索します`);
  };

  const handleBackToSearch = () => {
    setShowResults(false);
    setSearchResults(null);
  };

  if (showResults && searchResults) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F7CAC9 0%, #92A8D1 100%)', padding: '20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* 戻るボタン */}
          <button
            onClick={handleBackToSearch}
            style={{
              marginBottom: '20px',
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            ← 検索に戻る
          </button>

          {/* 結果表示 */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', color: '#333' }}>{searchResults.hotelName} の検索結果</h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
              {searchResults.checkinDate} - {searchResults.checkoutDate}
            </p>

            {/* AI予測セクション */}
            <div style={{
              background: 'linear-gradient(135deg, #F7CAC9 0%, #92A8D1 100%)',
              color: 'white',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px', marginRight: '8px' }}>🤖</span>
                <strong>Gemini AI予測</strong>
              </div>
              <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                📅 最適予約時期: <strong>{searchResults.aiPrediction.bestBookingTime}</strong>
              </p>
              <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                💰 予想節約額: <strong>{searchResults.aiPrediction.savings}</strong>
              </p>
              <p style={{ fontSize: '12px', opacity: 0.9 }}>
                信頼度: {searchResults.aiPrediction.confidence}% | {searchResults.aiPrediction.trend}
              </p>
            </div>

            {/* 価格比較 */}
            <h4 style={{ marginBottom: '12px', color: '#333' }}>現在の最安値比較</h4>
            {searchResults.prices.map((price: any, index: number) => (
              <div key={price.provider} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ marginRight: '8px' }}>{price.rank}</span>
                  {price.provider}
                </div>
                <div style={{
                  fontWeight: '600',
                  color: index === 0 ? '#E8B4B8' : '#333'
                }}>
                  ¥{price.price.toLocaleString()}
                </div>
              </div>
            ))}

            {/* 価格カレンダー */}
            <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
              <h4 style={{ marginBottom: '12px', color: '#333' }}>📊 今後の価格予想</h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px',
                fontSize: '12px'
              }}>
                {searchResults.priceCalendar.map((day: any, index: number) => (
                  <div key={index} style={{
                    textAlign: 'center',
                    padding: '8px',
                    background: day.color,
                    borderRadius: '4px'
                  }}>
                    <div>{day.date}</div>
                    <div style={{ fontWeight: '600', color: day.textColor }}>{day.price}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
                🟢 安い 🟡 普通 🔴 高い
              </p>
            </div>

            <button
              onClick={handleBackToSearch}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '12px',
                background: '#E8B4B8',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              新しい検索
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F7CAC9 0%, #92A8D1 100%)',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '300', marginBottom: '16px' }}>
          AIが見つける、あなただけの特別価格
        </h1>
        <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '40px' }}>
          ✨ Gemini AIが最適なタイミングをお知らせ
        </p>

        {/* 検索カード */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          marginBottom: '40px'
        }}>
          <input
            type="text"
            placeholder="ホテル名を入力（例：リッツカールトン）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              marginBottom: '16px',
              outline: 'none',
              color: '#333',
              boxSizing: 'border-box'
            }}
          />

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#666', fontWeight: '500' }}>
                チェックイン
              </label>
              <input
                type="date"
                value={checkinDate}
                onChange={(e) => setCheckinDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  outline: 'none',
                  color: '#333',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#666', fontWeight: '500' }}>
                チェックアウト
              </label>
              <input
                type="date"
                value={checkoutDate}
                onChange={(e) => setCheckoutDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  outline: 'none',
                  color: '#333',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #E8B4B8 0%, #B8D4E3 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            🔍 検索
          </button>
        </div>

        <p style={{ marginBottom: '24px', opacity: 0.8 }}>または</p>

        {/* エリアボタン */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginTop: '24px'
        }}>
          <button
            onClick={() => handleAreaSelect('東京')}
            style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🗼 東京
          </button>
          <button
            onClick={() => handleAreaSelect('京都')}
            style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🏯 京都
          </button>
          <button
            onClick={() => handleAreaSelect('沖縄')}
            style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🌺 沖縄
          </button>
          <button
            onClick={() => handleAreaSelect('今週末')}
            style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🎯 今週末
          </button>
        </div>

        <div style={{
          marginTop: '40px',
          padding: '16px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          fontSize: '14px'
        }}>
          📱 システム稼働中 - シンプルモード
        </div>
      </div>
    </div>
  );
};

export default SimpleHotelApp;