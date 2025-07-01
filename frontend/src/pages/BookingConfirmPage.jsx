import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MorphingButton, ScrollReveal } from '../components/Animation/MotionComponents';
import { LoadingSpinner } from '../components/Loading/LoadingComponents';
import NetworkErrorHandler from '../components/Booking/NetworkErrorHandler';
import { validateBookingForm, getFieldValidator } from '../utils/validation';

const BookingConfirmPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hotel, bookingParams, selectedRoom, source } = location.state || {};
  
  const [loading, setLoading] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequests: ''
  });
  
  const [errors, setErrors] = useState({});
  const [agreed, setAgreed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('onsite'); // onsite or credit
  const [networkError, setNetworkError] = useState(null);

  // ホテル情報がない場合は検索ページにリダイレクト
  useEffect(() => {
    if (!hotel || !bookingParams) {
      navigate('/practical');
    }
  }, [hotel, bookingParams, navigate]);

  if (!hotel || !bookingParams) {
    return null;
  }

  // 宿泊日数の計算
  const checkInDate = new Date(bookingParams.checkIn);
  const checkOutDate = new Date(bookingParams.checkOut);
  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

  // 合計金額の計算
  const pricePerNight = selectedRoom?.price?.total || selectedRoom?.pricing?.minPrice || 
                        hotel.pricing?.minPrice || hotel.price?.total || 10000;
  const roomCharge = pricePerNight * nights * bookingParams.rooms;
  const serviceFee = Math.floor(roomCharge * 0.1); // 10%のサービス料
  const tax = Math.floor(roomCharge * 0.08); // 8%の税金
  const totalAmount = roomCharge + serviceFee + tax;

  // フォームバリデーション
  const validateForm = () => {
    const validation = validateBookingForm({ ...guestInfo, agreed });
    setErrors(validation.errors);
    return validation.isValid;
  };

  // リアルタイムバリデーション
  const handleFieldChange = (fieldName, value) => {
    setGuestInfo(prev => ({ ...prev, [fieldName]: value }));
    
    // フィールドが変更されたらエラーをクリア
    if (errors[fieldName]) {
      const validator = getFieldValidator(fieldName);
      const validation = validator(value);
      
      setErrors(prev => ({
        ...prev,
        [fieldName]: validation.isValid ? undefined : validation.error
      }));
    }
  };

  // 予約処理
  const handleBooking = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    // 実際の予約処理をシミュレート
    try {
      // API呼び出しをシミュレート
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // ランダムでエラーを発生させる（テスト用）
      if (Math.random() > 0.9) {
        throw new Error('予約システムが混雑しています。しばらくしてから再度お試しください。');
      }
      
      setLoading(false);
      
      // 予約完了ページに遷移
      navigate('/booking/complete', {
        state: {
          bookingDetails: {
            hotel,
            bookingParams,
            selectedRoom,
            guestInfo,
            totalAmount,
            paymentMethod,
            bookingId: `LMS${Date.now().toString(36).toUpperCase()}`,
            bookingDate: new Date().toISOString(),
            source
          }
        }
      });
    } catch (error) {
      setLoading(false);
      setNetworkError(error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
          <h1 style={{ 
            margin: '0',
            fontSize: '1.8rem',
            fontWeight: 'bold',
            color: '#333'
          }}>
            予約確認
          </h1>
        </div>
      </header>

      <ScrollReveal>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '40px' }}>
            {/* 左側：予約詳細 */}
            <div>
              {/* ホテル情報 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '16px',
                padding: '25px',
                marginBottom: '30px',
                backdropFilter: 'blur(10px)'
              }}>
                <h2 style={{ marginBottom: '20px', color: '#333' }}>予約内容</h2>
                
                <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                  <img
                    src={hotel.imageUrl || hotel.images?.[0]?.url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80'}
                    alt={hotel.name}
                    style={{
                      width: '120px',
                      height: '90px',
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                  />
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>{hotel.name}</h3>
                    <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                      {hotel.address?.fullAddress || hotel.location?.address}
                    </p>
                    {hotel.rating && (
                      <div style={{ marginTop: '8px' }}>
                        <span style={{ color: '#ffa500' }}>
                          {'★'.repeat(Math.floor(hotel.reviewAverage || hotel.rating.overall || 0))}
                        </span>
                        <span style={{ marginLeft: '8px', color: '#666', fontSize: '14px' }}>
                          {(hotel.reviewAverage || hotel.rating.overall || 0).toFixed(1)}/5
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px',
                  padding: '20px',
                  background: 'rgba(0, 0, 0, 0.03)',
                  borderRadius: '12px'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>チェックイン</div>
                    <div style={{ fontWeight: 'bold' }}>
                      {new Date(bookingParams.checkIn).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short'
                      })}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {hotel.checkIn || '15:00'}〜
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>チェックアウト</div>
                    <div style={{ fontWeight: 'bold' }}>
                      {new Date(bookingParams.checkOut).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short'
                      })}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      〜{hotel.checkOut || '10:00'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>宿泊数</div>
                    <div style={{ fontWeight: 'bold' }}>{nights}泊</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>人数・部屋数</div>
                    <div style={{ fontWeight: 'bold' }}>
                      {bookingParams.guests}名 / {bookingParams.rooms}室
                    </div>
                  </div>
                </div>
              </div>

              {/* ゲスト情報フォーム */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '16px',
                padding: '25px',
                backdropFilter: 'blur(10px)'
              }}>
                <h2 style={{ marginBottom: '20px', color: '#333' }}>ゲスト情報</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      姓 <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={guestInfo.lastName}
                      onChange={(e) => handleFieldChange('lastName', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: errors.lastName ? '1px solid #d32f2f' : '1px solid #ddd',
                        fontSize: '16px'
                      }}
                      placeholder="例: 田中"
                    />
                    {errors.lastName && (
                      <p style={{ color: '#d32f2f', fontSize: '12px', marginTop: '5px' }}>
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      名 <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={guestInfo.firstName}
                      onChange={(e) => handleFieldChange('firstName', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: errors.firstName ? '1px solid #d32f2f' : '1px solid #ddd',
                        fontSize: '16px'
                      }}
                      placeholder="例: 太郎"
                    />
                    {errors.firstName && (
                      <p style={{ color: '#d32f2f', fontSize: '12px', marginTop: '5px' }}>
                        {errors.firstName}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    メールアドレス <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={guestInfo.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: errors.email ? '1px solid #d32f2f' : '1px solid #ddd',
                      fontSize: '16px'
                    }}
                    placeholder="例: taro@example.com"
                  />
                  {errors.email && (
                    <p style={{ color: '#d32f2f', fontSize: '12px', marginTop: '5px' }}>
                      {errors.email}
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    電話番号 <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    value={guestInfo.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: errors.phone ? '1px solid #d32f2f' : '1px solid #ddd',
                      fontSize: '16px'
                    }}
                    placeholder="例: 03-1234-5678 または 09012345678"
                  />
                  {errors.phone && (
                    <p style={{ color: '#d32f2f', fontSize: '12px', marginTop: '5px' }}>
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    特別なリクエスト（任意）
                  </label>
                  <textarea
                    value={guestInfo.specialRequests}
                    onChange={(e) => handleFieldChange('specialRequests', e.target.value)}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: errors.specialRequests ? '1px solid #d32f2f' : '1px solid #ddd',
                      fontSize: '16px',
                      resize: 'vertical'
                    }}
                    placeholder="アレルギー、特別な要望などがあればご記入ください"
                    maxLength={500}
                  />
                  {errors.specialRequests && (
                    <p style={{ color: '#d32f2f', fontSize: '12px', marginTop: '5px' }}>
                      {errors.specialRequests}
                    </p>
                  )}
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '5px', textAlign: 'right' }}>
                    {guestInfo.specialRequests.length}/500文字
                  </p>
                </div>
              </div>
            </div>

            {/* 右側：料金サマリー */}
            <div style={{ position: 'sticky', top: '100px', height: 'fit-content' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '16px',
                padding: '25px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '1.3rem', color: '#333' }}>
                  料金詳細
                </h3>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: '#666' }}>
                      客室料金（¥{pricePerNight.toLocaleString()} × {nights}泊 × {bookingParams.rooms}室）
                    </span>
                    <span style={{ fontWeight: 'bold' }}>¥{roomCharge.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: '#666' }}>サービス料</span>
                    <span style={{ fontWeight: 'bold' }}>¥{serviceFee.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: '#666' }}>消費税</span>
                    <span style={{ fontWeight: 'bold' }}>¥{tax.toLocaleString()}</span>
                  </div>
                  <div style={{ 
                    borderTop: '1px solid #ddd',
                    paddingTop: '10px',
                    marginTop: '10px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>合計</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea' }}>
                      ¥{totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 支払い方法 */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ marginBottom: '15px', fontSize: '1.1rem', color: '#333' }}>
                    支払い方法
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '15px',
                      border: paymentMethod === 'onsite' ? '2px solid #667eea' : '1px solid #ddd',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: paymentMethod === 'onsite' ? 'rgba(102, 126, 234, 0.05)' : 'white'
                    }}>
                      <input
                        type="radio"
                        value="onsite"
                        checked={paymentMethod === 'onsite'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        style={{ marginRight: '10px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 'bold' }}>現地で支払い</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>チェックイン時にホテルでお支払い</div>
                      </div>
                    </label>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '15px',
                      border: paymentMethod === 'credit' ? '2px solid #667eea' : '1px solid #ddd',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: paymentMethod === 'credit' ? 'rgba(102, 126, 234, 0.05)' : 'white'
                    }}>
                      <input
                        type="radio"
                        value="credit"
                        checked={paymentMethod === 'credit'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        style={{ marginRight: '10px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 'bold' }}>クレジットカード</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>今すぐオンラインで支払い</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div style={{ 
                  background: 'rgba(102, 126, 234, 0.1)',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                    ※ これはデモンストレーションです。実際の課金は発生しません。
                  </p>
                </div>

                {/* 利用規約同意 */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      style={{ marginRight: '10px', marginTop: '4px' }}
                    />
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      <a href="#" style={{ color: '#667eea' }}>利用規約</a>および
                      <a href="#" style={{ color: '#667eea' }}>プライバシーポリシー</a>に同意します
                    </span>
                  </label>
                  {errors.agreed && (
                    <p style={{ color: '#d32f2f', fontSize: '12px', marginTop: '5px' }}>
                      {errors.agreed}
                    </p>
                  )}
                </div>

                {/* 予約ボタン */}
                <MorphingButton
                  onClick={handleBooking}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '15px',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <LoadingSpinner size="small" color="white" />
                      予約処理中...
                    </span>
                  ) : (
                    '予約を確定する'
                  )}
                </MorphingButton>

                <button
                  onClick={() => navigate(-1)}
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    padding: '12px',
                    background: 'transparent',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    color: '#666',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  戻る
                </button>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
      
      {/* ネットワークエラーハンドラー */}
      <NetworkErrorHandler
        error={networkError}
        onRetry={() => {
          setNetworkError(null);
          handleBooking();
        }}
        onDismiss={() => setNetworkError(null)}
      />
    </div>
  );
};

export default BookingConfirmPage;