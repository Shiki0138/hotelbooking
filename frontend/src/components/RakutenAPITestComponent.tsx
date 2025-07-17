import React, { useState } from 'react';

interface TestResult {
  query: string;
  type: string;
  success: boolean;
  count: number;
  hotels?: any[];
  error?: string;
}

interface RakutenAPITestComponentProps {
  onBack?: () => void;
}

export const RakutenAPITestComponent: React.FC<RakutenAPITestComponentProps> = ({ onBack }) => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customQuery, setCustomQuery] = useState('');

  const RAKUTEN_API_KEY = '1044303809598455171';

  const searchHotel = async (query: string): Promise<TestResult> => {
    try {
      const params = new URLSearchParams({
        format: 'json',
        keyword: query,
        applicationId: RAKUTEN_API_KEY,
        hits: '5'
      });

      const url = `https://app.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426?${params.toString()}`;
      
      // CORS回避のためのプロキシを使用（開発環境用）
      const proxyUrl = `/api/rakuten-proxy?${params.toString()}`;
      
      try {
        // まずプロキシ経由を試行
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        if (data.error === 'CORS_ERROR') {
          throw new Error('CORS制限');
        }
        
        return data;
      } catch (proxyError) {
        // プロキシが使えない場合は直接アクセス（CORSエラーが発生する可能性）
        console.warn('プロキシ経由失敗、直接アクセスを試行:', proxyError);
        const response = await fetch(url);
        const data = await response.json();
        return data;
      }
    } catch (error) {
      // ネットワークエラーまたはCORSエラー
      return {
        error: 'NETWORK_ERROR',
        error_description: `アクセスエラー: ${error}`
      };
    }
  };

  const processApiResponse = (data: any, query: string): TestResult => {
    if (data.error) {
      return {
        query,
        type: 'error',
        success: false,
        count: 0,
        error: `${data.error}: ${data.error_description}`
      };
    }

    const hotels = data.hotels ? data.hotels.map((h: any) => ({
      name: h.hotel[0].hotelBasicInfo.hotelName,
      address: `${h.hotel[0].hotelBasicInfo.address1}${h.hotel[0].hotelBasicInfo.address2}`,
      price: h.hotel[0].hotelBasicInfo.hotelMinCharge,
      url: h.hotel[0].hotelBasicInfo.hotelInformationUrl
    })) : [];

    return {
      query,
      type: 'search',
      success: true,
      count: hotels.length,
      hotels
    };
  };

  const searchHotel = async (query: string): Promise<TestResult> => {
    try {
      const data = await makeApiRequest(query);
      return processApiResponse(data, query);
    } catch (error) {
      return {
        query,
        type: 'network_error',
        success: false,
        count: 0,
        error: `ネットワークエラー: ${error}`
      };
    }
  };

  const makeApiRequest = async (query: string) => {
    const params = new URLSearchParams({
      format: 'json',
      keyword: query,
      applicationId: RAKUTEN_API_KEY,
      hits: '5'
    });

    const url = `https://app.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426?${params.toString()}`;
    
    // CORS回避のためのプロキシを使用（開発環境用）
    const proxyUrl = `/api/rakuten-proxy?${params.toString()}`;
    
    try {
      // まずプロキシ経由を試行
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      if (data.error === 'CORS_ERROR') {
        throw new Error('CORS制限');
      }
      
      return data;
    } catch (proxyError) {
      // プロキシが使えない場合は直接アクセス（CORSエラーが発生する可能性）
      console.warn('プロキシ経由失敗、直接アクセスを試行:', proxyError);
      const response = await fetch(url);
      const data = await response.json();
      return data;
    }
  };


  const runPresetTests = async () => {
    setIsLoading(true);
    const queries = [
      'リッツカールトン東京',
      'リッツ',
      '東横イン',
      '東横イン新宿',
      'アパホテル',
      '新宿',
      '存在しないホテル12345'
    ];

    const results: TestResult[] = [];
    
    for (const query of queries) {
      const result = await searchHotel(query);
      results.push(result);
      // API制限対策で少し待機
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setTestResults(results);
    setIsLoading(false);
  };

  const testCustomQuery = async () => {
    if (!customQuery.trim()) return;
    
    setIsLoading(true);
    const result = await searchHotel(customQuery.trim());
    setTestResults([result]);
    setIsLoading(false);
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '20px auto',
      padding: '20px',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: 'pointer',
              marginRight: '16px'
            }}
          >
            ← 戻る
          </button>
        )}
        <h2 style={{ margin: 0 }}>🏨 楽天トラベルAPI検索テスト</h2>
      </div>
      
      {/* カスタム検索 */}
      <div style={{
        background: '#f5f5f5',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>🔍 ホテル検索テスト</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            placeholder="ホテル名を入力（例: リッツカールトン）"
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
            onKeyPress={(e) => e.key === 'Enter' && testCustomQuery()}
          />
          <button
            onClick={testCustomQuery}
            disabled={isLoading || !customQuery.trim()}
            style={{
              padding: '10px 20px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            検索
          </button>
        </div>
        
        <button
          onClick={runPresetTests}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isLoading ? '検索中...' : '📋 プリセットテスト実行'}
        </button>
      </div>

      {/* 結果表示 */}
      {testResults.length > 0 && (
        <div>
          <h3>📊 検索結果</h3>
          {testResults.map((result, index) => (
            <div key={index} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '15px',
              background: result.success ? '#f8fff8' : '#fff8f8'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <h4 style={{ margin: 0 }}>
                  「{result.query}」
                </h4>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  background: result.success ? '#d4edda' : '#f8d7da',
                  color: result.success ? '#155724' : '#721c24'
                }}>
                  {result.success ? `${result.count}軒見つかりました` : 'エラー'}
                </span>
              </div>

              {result.error && (
                <div style={{
                  color: '#dc3545',
                  background: '#f8d7da',
                  padding: '8px',
                  borderRadius: '4px',
                  marginBottom: '10px'
                }}>
                  ❌ {result.error}
                </div>
              )}

              {result.hotels && result.hotels.length > 0 && (
                <div>
                  {result.hotels.map((hotel, hotelIndex) => (
                    <div key={hotelIndex} style={{
                      background: 'white',
                      border: '1px solid #e9ecef',
                      borderRadius: '4px',
                      padding: '10px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                        {hotel.name}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                        📍 {hotel.address}
                      </div>
                      <div style={{ fontSize: '14px', color: '#007bff' }}>
                        💰 最低料金: ¥{hotel.price?.toLocaleString() || '未設定'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.success && result.count === 0 && (
                <div style={{
                  color: '#856404',
                  background: '#fff3cd',
                  padding: '8px',
                  borderRadius: '4px'
                }}>
                  ⚠️ 該当するホテルが見つかりませんでした
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* API説明 */}
      <div style={{
        background: '#e9ecef',
        padding: '15px',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h4>💡 楽天API検索の特徴</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li><strong>完全一致</strong>: ホテル名が正確に一致する場合に最適</li>
          <li><strong>部分一致</strong>: 「リッツ」で「リッツカールトン」系列を検索</li>
          <li><strong>地名検索</strong>: 「新宿」でその地域のホテルを検索</li>
          <li><strong>チェーン検索</strong>: 「東横イン」でチェーン全体を検索</li>
          <li><strong>あいまい検索</strong>: 表記ゆれ（ハイフンあり/なし）に対応</li>
        </ul>
      </div>
    </div>
  );
};