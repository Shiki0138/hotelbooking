import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import RakutenTravelAPI from '../services/api/rakutenTravel';
import HotelSearchService from '../services/HotelSearchService';
import { MorphingButton, ScrollReveal, StaggeredContainer, StaggeredItem } from '../components/Animation/MotionComponents';
import { LoadingSpinner } from '../components/Loading/LoadingComponents';
import AffiliateBookingButtons from '../components/Booking/AffiliateBookingButtons';
import LazyImage from '../components/Image/LazyImage';
import { generateSrcSet, generateSizes } from '../utils/imageOptimization';

const HotelDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bookingParams, setBookingParams] = useState({
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    guests: parseInt(searchParams.get('guests')) || 2,
    rooms: parseInt(searchParams.get('rooms')) || 1
  });
  const source = searchParams.get('source') || 'rakuten';

  useEffect(() => {
    // 日付のデフォルト値を設定
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setBookingParams(prev => ({
      ...prev,
      checkIn: today.toISOString().split('T')[0],
      checkOut: tomorrow.toISOString().split('T')[0]
    }));

    loadHotelDetail();
  }, [id]);

  const loadHotelDetail = async () => {
    setLoading(true);
    try {
      let hotelData;
      
      // Sourceに基づいてデータを取得
      if (source === 'rakuten') {
        hotelData = await RakutenTravelAPI.getHotelDetail(id);
        
        // プラン情報も取得
        if (bookingParams.checkIn && bookingParams.checkOut) {
          try {
            const vacantRooms = await RakutenTravelAPI.searchVacantRooms({
              keyword: hotelData.name,
              checkinDate: bookingParams.checkIn,
              checkoutDate: bookingParams.checkOut,
              adults: bookingParams.guests,
              rooms: bookingParams.rooms,
              limit: 10
            });
            
            // 同じホテルのプランを抽出
            const hotelRooms = vacantRooms.filter(room => 
              room.id === id || room.name === hotelData.name
            );
            
            setRooms(hotelRooms);
          } catch (err) {
            console.warn('プラン情報の取得に失敗:', err);
          }
        }
      } else {
        // その他のAPIから取得
        const searchResults = await HotelSearchService.searchHotels({
          location: { name: id },
          checkIn: bookingParams.checkIn,
          checkOut: bookingParams.checkOut,
          guests: bookingParams.guests,
          rooms: bookingParams.rooms
        });
        
        hotelData = searchResults.find(h => h.id === id) || searchResults[0];
      }
      
      setHotel(hotelData);
    } catch (error) {
      console.error('Failed to load hotel details:', error);
      setError('ホテル情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = () => {
    // 予約確認ページに遷移
    navigate('/booking/confirm', {
      state: {
        hotel,
        bookingParams,
        selectedRoom,
        source
      }
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner size="large" text="ホテル情報を読み込み中..." />
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#d32f2f', marginBottom: '20px' }}>⚠️ {error || 'ホテルが見つかりません'}</h2>
          <MorphingButton onClick={() => navigate('/practical')}>
            検索に戻る
          </MorphingButton>
        </div>
      </div>
    );
  }

  const images = [
    hotel.imageUrl,
    hotel.thumbnailUrl,
    ...(hotel.additionalImages || [])
  ].filter(Boolean);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      {/* ヘッダー */}
      <header style={{ 
        background: 'rgba(255, 255, 255, 0.95)', 
        backdropFilter: 'blur(10px)',
        padding: '20px 0',
        boxShadow: '0 2px 20px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#667eea',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← 検索結果に戻る
          </button>
        </div>
      </header>

      <ScrollReveal>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          {/* 画像ギャラリー */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ 
              position: 'relative',
              borderRadius: '16px',
              overflow: 'hidden',
              height: '400px',
              marginBottom: '20px'
            }}>
              <LazyImage
                src={images[selectedImage] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80'}
                alt={hotel.name}
                aspectRatio={21/9}
                srcSet={generateSrcSet(images[selectedImage] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80')}
                sizes={generateSizes({ mobile: '100vw', tablet: '100vw', desktop: '100vw' })}
                objectFit="cover"
                threshold={0}
                loading="eager"
                fadeInDuration={600}
                enableBlurUp={true}
                showSkeleton={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
                {images.map((img, index) => (
                  <LazyImage
                    key={index}
                    src={img}
                    alt={`${hotel.name} ${index + 1}`}
                    onClick={() => setSelectedImage(index)}
                    aspectRatio={4/3}
                    srcSet={generateSrcSet(img, [200, 400])}
                    sizes="100px"
                    objectFit="cover"
                    threshold={0.5}
                    fadeInDuration={400}
                    enableBlurUp={true}
                    showSkeleton={true}
                    style={{
                      width: '100px',
                      height: '75px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: selectedImage === index ? '3px solid #667eea' : '3px solid transparent',
                      transition: 'border 0.3s ease'
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '40px' }}>
            {/* 左側：ホテル情報 */}
            <div>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#333' }}>
                {hotel.name}
              </h1>
              {hotel.nameKana && (
                <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '20px' }}>
                  {hotel.nameKana}
                </p>
              )}

              {/* 評価 */}
              {hotel.rating && (
                <div style={{ marginBottom: '30px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffa500' }}>
                      {'★'.repeat(Math.floor(hotel.reviewAverage || hotel.rating.overall || 0))}
                    </span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                      {(hotel.reviewAverage || hotel.rating.overall || 0).toFixed(1)}/5
                    </span>
                    <span style={{ color: '#666' }}>
                      ({hotel.reviewCount || 0} レビュー)
                    </span>
                  </div>
                  
                  {/* 詳細評価 */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '10px',
                    padding: '15px',
                    background: 'rgba(255, 255, 255, 0.5)',
                    borderRadius: '12px'
                  }}>
                    {[
                      { label: 'サービス', value: hotel.rating.service },
                      { label: '立地', value: hotel.rating.location },
                      { label: '部屋', value: hotel.rating.room },
                      { label: '設備', value: hotel.rating.equipment },
                      { label: '風呂', value: hotel.rating.bath },
                      { label: '食事', value: hotel.rating.meal }
                    ].map((item, index) => (
                      <div key={index}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                          {item.label}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div style={{ 
                            flex: 1,
                            height: '6px',
                            background: 'rgba(0, 0, 0, 0.1)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${(item.value / 5) * 100}%`,
                              height: '100%',
                              background: '#ffa500',
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                            {item.value ? item.value.toFixed(1) : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 基本情報 */}
              <StaggeredContainer>
                <StaggeredItem>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{ marginBottom: '15px', color: '#333' }}>基本情報</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {hotel.address && (
                        <div>
                          <span style={{ fontWeight: 'bold', marginRight: '10px' }}>📍 住所:</span>
                          <span>{hotel.address.fullAddress}</span>
                        </div>
                      )}
                      
                      {hotel.access && (
                        <div>
                          <span style={{ fontWeight: 'bold', marginRight: '10px' }}>🚃 アクセス:</span>
                          <span>{hotel.access}</span>
                        </div>
                      )}
                      
                      {hotel.nearestStation && (
                        <div>
                          <span style={{ fontWeight: 'bold', marginRight: '10px' }}>🚉 最寄り駅:</span>
                          <span>{hotel.nearestStation}</span>
                        </div>
                      )}
                      
                      {hotel.telephone && (
                        <div>
                          <span style={{ fontWeight: 'bold', marginRight: '10px' }}>📞 電話:</span>
                          <a href={`tel:${hotel.telephone}`} style={{ color: '#667eea' }}>
                            {hotel.telephone}
                          </a>
                        </div>
                      )}
                      
                      <div>
                        <span style={{ fontWeight: 'bold', marginRight: '10px' }}>🕐 チェックイン/アウト:</span>
                        <span>{hotel.checkIn || '15:00'} / {hotel.checkOut || '10:00'}</span>
                      </div>
                      
                      {hotel.roomCount && (
                        <div>
                          <span style={{ fontWeight: 'bold', marginRight: '10px' }}>🏢 総客室数:</span>
                          <span>{hotel.roomCount}室</span>
                        </div>
                      )}
                      
                      {hotel.hotelType && (
                        <div>
                          <span style={{ fontWeight: 'bold', marginRight: '10px' }}>🏨 タイプ:</span>
                          <span>{hotel.hotelType}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </StaggeredItem>

                {/* 特徴・設備 */}
                {hotel.description && (
                  <StaggeredItem>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      borderRadius: '12px',
                      padding: '20px',
                      marginBottom: '20px'
                    }}>
                      <h3 style={{ marginBottom: '15px', color: '#333' }}>ホテルの特徴</h3>
                      <p style={{ lineHeight: '1.8', color: '#666' }}>{hotel.description}</p>
                    </div>
                  </StaggeredItem>
                )}

                {/* 駐車場情報 */}
                {hotel.parking && (
                  <StaggeredItem>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      borderRadius: '12px',
                      padding: '20px'
                    }}>
                      <h3 style={{ marginBottom: '15px', color: '#333' }}>🚗 駐車場</h3>
                      <p style={{ color: '#666' }}>{hotel.parking}</p>
                    </div>
                  </StaggeredItem>
                )}
              </StaggeredContainer>
            </div>

            {/* 右側：予約ボックス */}
            <div style={{ position: 'sticky', top: '100px', height: 'fit-content' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '16px',
                padding: '25px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.5rem', color: '#333' }}>
                  予約情報
                </h3>

                {/* 価格表示 */}
                <div style={{ marginBottom: '25px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>
                    料金目安
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>
                      ¥{hotel.pricing?.minPrice?.toLocaleString() || '---'}
                    </span>
                    <span style={{ color: '#666' }}>〜</span>
                    <span style={{ fontSize: '1.5rem', color: '#666' }}>
                      ¥{hotel.pricing?.maxPrice?.toLocaleString() || '---'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    /泊
                  </div>
                </div>

                {/* 予約フォーム */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                      チェックイン
                    </label>
                    <input
                      type="date"
                      value={bookingParams.checkIn}
                      onChange={(e) => setBookingParams(prev => ({ ...prev, checkIn: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '16px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                      チェックアウト
                    </label>
                    <input
                      type="date"
                      value={bookingParams.checkOut}
                      onChange={(e) => setBookingParams(prev => ({ ...prev, checkOut: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '16px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                        人数
                      </label>
                      <select
                        value={bookingParams.guests}
                        onChange={(e) => setBookingParams(prev => ({ ...prev, guests: parseInt(e.target.value) }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                          fontSize: '16px'
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <option key={num} value={num}>{num}名</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
                        部屋数
                      </label>
                      <select
                        value={bookingParams.rooms}
                        onChange={(e) => setBookingParams(prev => ({ ...prev, rooms: parseInt(e.target.value) }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                          fontSize: '16px'
                        }}
                      >
                        {[1, 2, 3, 4].map(num => (
                          <option key={num} value={num}>{num}室</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* プラン選択 */}
                {rooms.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>
                      プランを選択
                    </label>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px', padding: '10px' }}>
                      {rooms.map((room, index) => (
                        <div
                          key={index}
                          onClick={() => setSelectedRoom(room)}
                          style={{
                            padding: '10px',
                            marginBottom: '10px',
                            border: selectedRoom === room ? '2px solid #667eea' : '1px solid #eee',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background: selectedRoom === room ? 'rgba(102, 126, 234, 0.05)' : 'white'
                          }}
                        >
                          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                            {room.name || 'スタンダードプラン'}
                          </div>
                          <div style={{ fontSize: '14px', color: '#666' }}>
                            ¥{(room.price?.total || room.pricing?.minPrice || 10000).toLocaleString()} / 泊
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 予約ボタン */}
                <MorphingButton
                  onClick={handleBooking}
                  disabled={!bookingParams.checkIn || !bookingParams.checkOut}
                  style={{
                    width: '100%',
                    padding: '15px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    opacity: (!bookingParams.checkIn || !bookingParams.checkOut) ? 0.5 : 1
                  }}
                >
                  予約を進める
                </MorphingButton>

                {/* 新しい複数OTA予約ボタン */}
                <div style={{ marginTop: '20px' }}>
                  <AffiliateBookingButtons 
                    hotel={{
                      ...hotel,
                      // 日付・人数パラメータの追加
                      checkInDate: bookingParams.checkIn,
                      checkOutDate: bookingParams.checkOut,
                      guests: bookingParams.guests,
                      rooms: bookingParams.rooms,
                      // 価格情報の追加
                      price: selectedRoom?.price?.total || hotel.pricing?.minPrice || 10000
                    }}
                    showPriceComparison={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
};

export default HotelDetailPage;