import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MorphingButton } from '../components/Animation/MotionComponents';
import confetti from 'canvas-confetti';

const BookingCompletePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { bookingDetails } = location.state || {};

  // 予約情報がない場合はホームページにリダイレクト
  useEffect(() => {
    if (!bookingDetails) {
      navigate('/');
      return;
    }

    // 祝福のアニメーション
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, [bookingDetails, navigate]);

  if (!bookingDetails) {
    return null;
  }

  const { hotel, bookingParams, selectedRoom, guestInfo, totalAmount, paymentMethod, bookingId, bookingDate, source } = bookingDetails;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}
      >
        {/* 成功アイコン */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #5cb85c 0%, #4cae4c 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 30px auto'
          }}
        >
          <span style={{ fontSize: '40px', color: 'white' }}>✓</span>
        </motion.div>

        <h1 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '10px',
          color: '#333'
        }}>
          予約が完了しました！
        </h1>
        
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#666',
          marginBottom: '30px'
        }}>
          ご予約ありがとうございます
        </p>

        {/* 予約番号 */}
        <div style={{
          background: 'rgba(102, 126, 234, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
            予約番号
          </p>
          <p style={{ 
            margin: '0', 
            fontSize: '1.5rem', 
            fontWeight: 'bold',
            color: '#667eea',
            fontFamily: 'monospace'
          }}>
            {bookingId}
          </p>
        </div>

        {/* 予約詳細 */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.03)',
          borderRadius: '12px',
          padding: '25px',
          textAlign: 'left',
          marginBottom: '30px'
        }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', color: '#333' }}>
            予約内容
          </h3>

          <div style={{ marginBottom: '15px' }}>
            <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
              ホテル
            </p>
            <p style={{ margin: '0', fontWeight: 'bold', color: '#333' }}>
              {hotel.name}
            </p>
            {selectedRoom && (
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                プラン: {selectedRoom.name || 'スタンダードプラン'}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '15px' }}>
            <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
              宿泊日
            </p>
            <p style={{ margin: '0', fontWeight: 'bold', color: '#333' }}>
              {new Date(bookingParams.checkIn).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
              })} 〜 {new Date(bookingParams.checkOut).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
              })}
            </p>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
              {Math.ceil((new Date(bookingParams.checkOut) - new Date(bookingParams.checkIn)) / (1000 * 60 * 60 * 24))}泊 / 
              {bookingParams.rooms}室 / {bookingParams.guests}名
            </p>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
              ゲスト名
            </p>
            <p style={{ margin: '0', fontWeight: 'bold', color: '#333' }}>
              {guestInfo.lastName} {guestInfo.firstName} 様
            </p>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
              合計金額
            </p>
            <p style={{ margin: '0', fontSize: '1.3rem', fontWeight: 'bold', color: '#667eea' }}>
              ¥{totalAmount.toLocaleString()}
            </p>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
              支払い方法: {paymentMethod === 'onsite' ? '現地支払い' : 'クレジットカード'}
            </p>
          </div>

          <div>
            <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '14px' }}>
              予約日時
            </p>
            <p style={{ margin: '0', fontSize: '14px', color: '#333' }}>
              {new Date(bookingDate).toLocaleString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {/* 確認メール通知 */}
        <div style={{
          background: 'rgba(76, 175, 80, 0.1)',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '20px' }}>📧</span>
          <p style={{ margin: '0', fontSize: '14px', color: '#666', textAlign: 'left' }}>
            予約確認メールを <strong>{guestInfo.email}</strong> に送信しました。
            メール内の指示に従って、チェックイン手続きを行ってください。
          </p>
        </div>

        {/* 重要な情報 */}
        <div style={{
          background: 'rgba(255, 193, 7, 0.1)',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '30px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#f57c00' }}>
            ⚠️ 重要なお知らせ
          </h4>
          <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
            <li>チェックイン時間: {hotel.checkIn || '15:00'} 〜</li>
            <li>チェックアウト時間: 〜 {hotel.checkOut || '10:00'}</li>
            {paymentMethod === 'onsite' && (
              <li>チェックイン時に料金をお支払いください</li>
            )}
            <li>キャンセルポリシーについてはホテルにお問い合わせください</li>
          </ul>
        </div>

        {/* アクションボタン */}
        <div style={{ display: 'flex', gap: '15px' }}>
          <MorphingButton
            onClick={() => navigate('/practical')}
            style={{
              flex: 1,
              padding: '12px 20px',
              fontSize: '16px'
            }}
          >
            新しい検索
          </MorphingButton>
          
          <button
            onClick={() => window.print()}
            style={{
              flex: 1,
              padding: '12px 20px',
              background: 'rgba(102, 126, 234, 0.1)',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '8px',
              color: '#667eea',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'background 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(102, 126, 234, 0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(102, 126, 234, 0.1)'}
          >
            印刷する
          </button>
        </div>

        {/* 注意事項 */}
        <p style={{ 
          marginTop: '30px',
          fontSize: '12px',
          color: '#999',
          lineHeight: '1.6'
        }}>
          ※ この画面は実際の予約ではなくデモンストレーションです。<br />
          実際の予約は各ホテルの公式サイトまたは予約サイトで行ってください。
        </p>
      </motion.div>
    </div>
  );
};

export default BookingCompletePage;