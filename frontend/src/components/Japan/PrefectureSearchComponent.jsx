import React, { useState, useEffect, useRef } from 'react';
import { 
  PREFECTURES, 
  TOURIST_SPOTS,
  MAJOR_STATIONS,
  getHotelCountByPrefecture,
  findNearestStations,
  getAveragePriceByArea,
  getSeasonalRecommendations 
} from '../../services/api/japanLocation';
import './PrefectureSearchComponent.css';

const PrefectureSearchComponent = ({ onSearch, onLocationSelect }) => {
  const [selectedPrefecture, setSelectedPrefecture] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [hotelCount, setHotelCount] = useState(null);
  const [priceRange, setPriceRange] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [hoveredPrefecture, setHoveredPrefecture] = useState(null);
  const [nearestStations, setNearestStations] = useState([]);
  const [touristSpots, setTouristSpots] = useState([]);
  const [seasonalInfo, setSeasonalInfo] = useState([]);
  
  const mapContainerRef = useRef(null);

  // 都道府県選択時の処理
  useEffect(() => {
    if (selectedPrefecture) {
      fetchPrefectureData(selectedPrefecture);
    }
  }, [selectedPrefecture]);

  const fetchPrefectureData = async (prefCode) => {
    try {
      // ホテル数を取得
      const count = await getHotelCountByPrefecture(prefCode);
      setHotelCount(count);
      
      // 価格帯を取得
      const prices = await getAveragePriceByArea(prefCode);
      setPriceRange(prices);
      
      // 観光地情報を設定
      setTouristSpots(TOURIST_SPOTS[prefCode] || []);
      
      // 季節のおすすめ情報
      const currentMonth = new Date().getMonth() + 1;
      const seasonal = getSeasonalRecommendations(prefCode, currentMonth);
      setSeasonalInfo(seasonal);
    } catch (error) {
      console.error('データ取得エラー:', error);
    }
  };

  // 都道府県のSVGパスデータ（簡略版）
  const getPrefecturePath = (prefCode) => {
    // 実際の実装では、日本地図のSVGパスデータを使用
    const pathData = {
      '01': 'M 300 50 L 350 50 L 350 100 L 300 100 Z', // 北海道（簡略化）
      '13': 'M 320 250 L 340 250 L 340 270 L 320 270 Z', // 東京都（簡略化）
      // ... 他の都道府県
    };
    return pathData[prefCode] || '';
  };

  // 都道府県クリック時の処理
  const handlePrefectureClick = (prefecture) => {
    setSelectedPrefecture(prefecture.code);
    setSelectedCity('');
    
    if (onLocationSelect) {
      onLocationSelect({
        type: 'prefecture',
        code: prefecture.code,
        name: prefecture.name,
        region: prefecture.region
      });
    }
  };

  // 都市選択時の処理
  const handleCitySelect = (city) => {
    setSelectedCity(city);
    
    if (onLocationSelect) {
      onLocationSelect({
        type: 'city',
        prefecture: selectedPrefecture,
        city: city
      });
    }
    
    // 検索実行
    if (onSearch) {
      onSearch({
        prefecture: selectedPrefecture,
        city: city
      });
    }
  };

  // 駅からの検索
  const handleStationSearch = (station) => {
    if (onSearch) {
      onSearch({
        nearStation: station.name,
        maxDistance: 1000, // 1km以内
        lines: station.lines
      });
    }
  };

  // 観光地からの検索
  const handleTouristSpotSearch = (spot) => {
    if (onSearch) {
      onSearch({
        nearSpot: spot.name,
        spotType: spot.type,
        coordinates: { lat: spot.lat, lng: spot.lng }
      });
    }
  };

  return (
    <div className="prefecture-search-container">
      {/* 検索モード切替 */}
      <div className="search-mode-tabs">
        <button 
          className={`tab ${!showMap ? 'active' : ''}`}
          onClick={() => setShowMap(false)}
        >
          リスト検索
        </button>
        <button 
          className={`tab ${showMap ? 'active' : ''}`}
          onClick={() => setShowMap(true)}
        >
          地図から検索
        </button>
      </div>

      {!showMap ? (
        /* リスト形式の検索 */
        <div className="list-search">
          {/* 都道府県選択 */}
          <div className="prefecture-select-section">
            <label htmlFor="prefecture-select">都道府県を選択</label>
            <select 
              id="prefecture-select"
              value={selectedPrefecture}
              onChange={(e) => handlePrefectureClick(
                PREFECTURES.find(p => p.code === e.target.value)
              )}
              className="prefecture-dropdown"
            >
              <option value="">都道府県を選択してください</option>
              {['北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州', '沖縄'].map(region => (
                <optgroup key={region} label={region}>
                  {PREFECTURES.filter(p => p.region === region).map(pref => (
                    <option key={pref.code} value={pref.code}>
                      {pref.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* 都市選択（都道府県選択後） */}
          {selectedPrefecture && (
            <div className="city-select-section">
              <label>主要都市から選択</label>
              <div className="city-buttons">
                {PREFECTURES.find(p => p.code === selectedPrefecture)?.majorCities.map(city => (
                  <button 
                    key={city}
                    className={`city-button ${selectedCity === city ? 'selected' : ''}`}
                    onClick={() => handleCitySelect(city)}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* エリア情報表示 */}
          {selectedPrefecture && (
            <div className="area-info-section">
              <div className="info-cards">
                {/* ホテル数 */}
                {hotelCount && (
                  <div className="info-card">
                    <div className="info-label">登録ホテル数</div>
                    <div className="info-value">{hotelCount.toLocaleString()}件</div>
                  </div>
                )}
                
                {/* 価格帯 */}
                {priceRange && (
                  <div className="info-card">
                    <div className="info-label">平均価格帯</div>
                    <div className="info-value">
                      ¥{priceRange.min.toLocaleString()} 〜 ¥{priceRange.max.toLocaleString()}
                      <div className="info-sub">平均: ¥{priceRange.avg.toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* 季節のおすすめ */}
              {seasonalInfo.length > 0 && (
                <div className="seasonal-info">
                  <h4>今の季節のおすすめ</h4>
                  <ul>
                    {seasonalInfo.map((info, index) => (
                      <li key={index}>{info}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 主要駅 */}
              {MAJOR_STATIONS[selectedPrefecture] && (
                <div className="stations-section">
                  <h4>主要駅から検索</h4>
                  <div className="station-list">
                    {MAJOR_STATIONS[selectedPrefecture].map(station => (
                      <div key={station.name} className="station-card">
                        <div className="station-name">{station.name}</div>
                        <div className="station-lines">
                          {station.lines.slice(0, 3).join('・')}
                        </div>
                        <button 
                          className="search-nearby-btn"
                          onClick={() => handleStationSearch(station)}
                        >
                          周辺を検索
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 観光地 */}
              {touristSpots.length > 0 && (
                <div className="tourist-spots-section">
                  <h4>人気観光地から検索</h4>
                  <div className="spots-grid">
                    {touristSpots.map(spot => (
                      <div key={spot.name} className="spot-card">
                        <div className="spot-icon">
                          {getSpotIcon(spot.type)}
                        </div>
                        <div className="spot-name">{spot.name}</div>
                        <button 
                          className="search-nearby-btn"
                          onClick={() => handleTouristSpotSearch(spot)}
                        >
                          周辺ホテル
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 地図形式の検索 */
        <div className="map-search" ref={mapContainerRef}>
          <div className="japan-map-container">
            <svg 
              viewBox="0 0 500 600" 
              className="japan-map"
              xmlns="http://www.w3.org/2000/svg"
            >
              {PREFECTURES.map(prefecture => (
                <g key={prefecture.code}>
                  <path
                    d={getPrefecturePath(prefecture.code)}
                    className={`prefecture-path ${selectedPrefecture === prefecture.code ? 'selected' : ''}`}
                    onClick={() => handlePrefectureClick(prefecture)}
                    onMouseEnter={() => setHoveredPrefecture(prefecture)}
                    onMouseLeave={() => setHoveredPrefecture(null)}
                  />
                  {/* 観光地マーカー */}
                  {TOURIST_SPOTS[prefecture.code]?.map(spot => (
                    <circle
                      key={spot.name}
                      cx={mapProjection(spot.lng)}
                      cy={mapProjection(spot.lat, true)}
                      r="3"
                      className="tourist-marker"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTouristSpotSearch(spot);
                      }}
                    />
                  ))}
                </g>
              ))}
            </svg>
            
            {/* ホバー時の情報表示 */}
            {hoveredPrefecture && (
              <div className="map-tooltip">
                <div className="tooltip-prefecture">{hoveredPrefecture.name}</div>
                <div className="tooltip-region">{hoveredPrefecture.region}地方</div>
              </div>
            )}
          </div>
          
          {/* 地図の凡例 */}
          <div className="map-legend">
            <h4>凡例</h4>
            <div className="legend-item">
              <span className="legend-color selected"></span>
              <span>選択中</span>
            </div>
            <div className="legend-item">
              <span className="legend-marker tourist"></span>
              <span>観光地</span>
            </div>
          </div>
        </div>
      )}

      {/* クイックアクセス */}
      <div className="quick-access">
        <h4>人気エリアクイックアクセス</h4>
        <div className="quick-buttons">
          <button onClick={() => handlePrefectureClick(PREFECTURES.find(p => p.code === '13'))}>
            東京
          </button>
          <button onClick={() => handlePrefectureClick(PREFECTURES.find(p => p.code === '27'))}>
            大阪
          </button>
          <button onClick={() => handlePrefectureClick(PREFECTURES.find(p => p.code === '26'))}>
            京都
          </button>
          <button onClick={() => handlePrefectureClick(PREFECTURES.find(p => p.code === '01'))}>
            北海道
          </button>
          <button onClick={() => handlePrefectureClick(PREFECTURES.find(p => p.code === '47'))}>
            沖縄
          </button>
        </div>
      </div>
    </div>
  );
};

// ヘルパー関数
const getSpotIcon = (type) => {
  const icons = {
    temple: '🏯',
    shrine: '⛩️',
    castle: '🏰',
    landmark: '🗼',
    nature: '🌳',
    park: '🌸',
    palace: '🏛️',
    entertainment: '🎭',
    theme_park: '🎢',
    aquarium: '🐠',
    shopping: '🛍️'
  };
  return icons[type] || '📍';
};

// 簡易的な地図投影関数
const mapProjection = (coord, isLat = false) => {
  // 実際の実装では、適切な地図投影法を使用
  if (isLat) {
    return 600 - (coord - 24) * 10;
  }
  return (coord - 123) * 4;
};

export default PrefectureSearchComponent;