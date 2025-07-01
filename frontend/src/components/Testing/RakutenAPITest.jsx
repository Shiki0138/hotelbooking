import React, { useState, useEffect } from 'react';
import rakutenAPI from '../../services/api/rakutenTravel';
import './RakutenAPITest.css';

const RakutenAPITest = () => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState('');
  const [hotels, setHotels] = useState([]);
  const [error, setError] = useState(null);

  // テストケース定義
  const testCases = [
    {
      id: 'tokyo-shinjuku',
      name: '東京・新宿エリア検索',
      description: '新宿エリアのホテルを検索',
      execute: async () => {
        return await rakutenAPI.searchTokyoHotels('shinjuku', { limit: 10 });
      }
    },
    {
      id: 'osaka-umeda',
      name: '大阪・梅田エリア検索',
      description: '梅田エリアのホテルを検索',
      execute: async () => {
        return await rakutenAPI.searchOsakaHotels('umeda', { limit: 10 });
      }
    },
    {
      id: 'kyoto-station',
      name: '京都・京都駅周辺検索',
      description: '京都駅周辺のホテルを検索',
      execute: async () => {
        return await rakutenAPI.searchKyotoHotels('station', { limit: 10 });
      }
    },
    {
      id: 'keyword-search',
      name: 'キーワード検索（東京駅）',
      description: '東京駅周辺のホテルをキーワード検索',
      execute: async () => {
        return await rakutenAPI.searchByKeyword('東京駅', { limit: 10 });
      }
    },
    {
      id: 'vacant-search',
      name: '空室検索（東京・新宿）',
      description: '明日から1泊の空室を検索',
      execute: async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);
        
        return await rakutenAPI.searchVacantRooms({
          area: 'tokyo',
          subArea: 'shinjuku',
          checkinDate: tomorrow.toISOString().split('T')[0],
          checkoutDate: dayAfter.toISOString().split('T')[0],
          adults: 2,
          rooms: 1,
          limit: 10
        });
      }
    },
    {
      id: 'hotel-detail',
      name: 'ホテル詳細取得',
      description: 'アパホテル新宿歌舞伎町タワーの詳細',
      execute: async () => {
        const detail = await rakutenAPI.getHotelDetail('143637');
        return [detail]; // 配列形式に統一
      }
    }
  ];

  // テスト実行
  const runTest = async (testCase) => {
    setLoading(true);
    setError(null);
    setSelectedTest(testCase.id);
    
    const startTime = Date.now();
    
    try {
      const result = await testCase.execute();
      const endTime = Date.now();
      
      setHotels(result);
      
      const testResult = {
        id: testCase.id,
        name: testCase.name,
        status: 'success',
        message: `${result.length}件のホテルを取得`,
        duration: endTime - startTime,
        timestamp: new Date().toISOString()
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);
    } catch (err) {
      const endTime = Date.now();
      
      setError(err.message);
      
      const testResult = {
        id: testCase.id,
        name: testCase.name,
        status: 'error',
        message: err.message,
        duration: endTime - startTime,
        timestamp: new Date().toISOString()
      };
      
      setTestResults(prev => [testResult, ...prev.slice(0, 9)]);
    }
    
    setLoading(false);
  };

  // 全テスト実行
  const runAllTests = async () => {
    for (const testCase of testCases) {
      await runTest(testCase);
      // 各テスト間に1秒の遅延を入れる（API制限対策）
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  // エリア一覧の取得
  const [areas, setAreas] = useState([]);
  useEffect(() => {
    setAreas(rakutenAPI.getAvailableAreas());
  }, []);

  return (
    <div className="rakuten-api-test">
      <h2>楽天トラベルAPI テストツール</h2>
      
      {/* API情報 */}
      <div className="api-info">
        <h3>API設定</h3>
        <p>App ID: {import.meta.env.VITE_RAKUTEN_APP_ID || process.env.REACT_APP_RAKUTEN_APP_ID ? '設定済み' : 'テストキー使用中'}</p>
        <p>エンドポイント: https://app.rakuten.co.jp/services/api/Travel</p>
      </div>

      {/* テストケース一覧 */}
      <div className="test-cases">
        <h3>テストケース</h3>
        <div className="test-buttons">
          {testCases.map(test => (
            <button
              key={test.id}
              onClick={() => runTest(test)}
              disabled={loading}
              className={selectedTest === test.id ? 'active' : ''}
            >
              {test.name}
            </button>
          ))}
          <button
            onClick={runAllTests}
            disabled={loading}
            className="run-all"
          >
            全テスト実行
          </button>
        </div>
      </div>

      {/* テスト結果 */}
      <div className="test-results">
        <h3>実行結果</h3>
        {loading && <div className="loading">実行中...</div>}
        {error && <div className="error">{error}</div>}
        
        <div className="results-list">
          {testResults.map((result, index) => (
            <div
              key={`${result.id}-${index}`}
              className={`result-item ${result.status}`}
            >
              <span className="name">{result.name}</span>
              <span className="status">{result.status}</span>
              <span className="message">{result.message}</span>
              <span className="duration">{result.duration}ms</span>
            </div>
          ))}
        </div>
      </div>

      {/* ホテル一覧 */}
      {hotels.length > 0 && (
        <div className="hotel-results">
          <h3>取得したホテルデータ（{hotels.length}件）</h3>
          <div className="hotel-grid">
            {hotels.map(hotel => (
              <div key={hotel.id} className="hotel-card">
                <div className="hotel-image">
                  {hotel.thumbnailUrl && (
                    <img src={hotel.thumbnailUrl} alt={hotel.name} />
                  )}
                </div>
                <div className="hotel-info">
                  <h4>{hotel.name}</h4>
                  <p className="address">{hotel.address.fullAddress}</p>
                  <p className="access">{hotel.access}</p>
                  <div className="pricing">
                    <span className="price">
                      ¥{hotel.pricing.minPrice.toLocaleString()} 〜 
                      ¥{hotel.pricing.maxPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="rating">
                    <span>評価: {hotel.reviewAverage} ({hotel.reviewCount}件)</span>
                  </div>
                  <div className="details">
                    <span>チェックイン: {hotel.checkIn}</span>
                    <span>チェックアウト: {hotel.checkOut}</span>
                    <span>タイプ: {hotel.hotelType}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* エリア一覧 */}
      <div className="area-list">
        <h3>利用可能なエリア</h3>
        {areas.map(area => (
          <div key={area.code} className="area-item">
            <h4>{area.name}</h4>
            <div className="sub-areas">
              {area.subAreas.map(subArea => (
                <span key={subArea.code} className="sub-area">
                  {subArea.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RakutenAPITest;