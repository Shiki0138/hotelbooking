import React, { useState } from 'react';
import './BookingConfirmModal.css';

/**
 * 予約前確認モーダルコンポーネント
 * 外部サイト遷移前に利用規約・注意事項を表示
 */
const BookingConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  otaType, 
  hotel, 
  price,
  bookingParams 
}) => {
  const [agreed, setAgreed] = useState(false);
  const [understood, setUnderstood] = useState(false);

  // OTA情報定義
  const otaInfo = {
    rakuten: {
      name: '楽天トラベル',
      color: '#bf0000',
      benefits: [
        '楽天ポイントが貯まる・使える',
        '日本語での手厚いサポート',
        '楽天会員限定の特典・割引'
      ],
      terms: [
        'キャンセル料は宿泊施設の規定に従います',
        '楽天ポイントの付与は予約成立後となります',
        '価格は予約時点での参考価格です'
      ]
    },
    jalan: {
      name: 'じゃらん',
      color: '#ff6600',
      benefits: [
        'Pontaポイントが貯まる・使える',
        '豊富なクーポン・割引',
        'じゃらん限定プラン'
      ],
      terms: [
        'キャンセル料は宿泊施設の規定に従います',
        'Pontaポイントの付与は宿泊完了後となります',
        '価格は予約時点での参考価格です'
      ]
    },
    yahoo: {
      name: 'Yahoo!トラベル',
      color: '#ff0033',
      benefits: [
        'PayPayボーナスが貯まる',
        'Tポイントも貯まる・使える',
        'Yahoo!プレミアム会員特典'
      ],
      terms: [
        'キャンセル料は宿泊施設の規定に従います',
        'PayPayボーナスの付与は宿泊完了後となります',
        '価格は予約時点での参考価格です'
      ]
    },
    booking: {
      name: 'Booking.com',
      color: '#003580',
      benefits: [
        '無料キャンセル対応プラン多数',
        '最安値保証制度',
        '世界中の豊富な宿泊施設'
      ],
      terms: [
        'キャンセル料は選択したプランによります',
        '価格は予約時点での参考価格です',
        '最安値保証の適用には条件があります'
      ]
    },
    agoda: {
      name: 'Agoda',
      color: '#5c2e91',
      benefits: [
        'ポイントが即時利用可能',
        '会員限定価格でお得',
        'アジア地域に強い品揃え'
      ],
      terms: [
        'キャンセル料は選択したプランによります',
        'ポイント利用には条件があります',
        '価格は予約時点での参考価格です'
      ]
    },
    expedia: {
      name: 'Expedia',
      color: '#003876',
      benefits: [
        'ホテル+航空券でお得',
        'パッケージ割引',
        '会員限定セール'
      ],
      terms: [
        'キャンセル料は選択したプランによります',
        'パッケージ料金は組み合わせによります',
        '価格は予約時点での参考価格です'
      ]
    }
  };

  const currentOta = otaInfo[otaType] || otaInfo.rakuten;

  const handleConfirm = () => {
    if (agreed && understood) {
      onConfirm();
      setAgreed(false);
      setUnderstood(false);
    }
  };

  const handleClose = () => {
    onClose();
    setAgreed(false);
    setUnderstood(false);
  };

  if (!isOpen) return null;

  return (
    <div className="booking-confirm-modal-overlay" onClick={handleClose}>
      <div className="booking-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ '--ota-color': currentOta.color }}>
          <h2>
            <span className="ota-icon">🏨</span>
            {currentOta.name}へ移動します
          </h2>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* ホテル情報 */}
          <div className="hotel-summary">
            <img 
              src={hotel.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&q=80'} 
              alt={hotel.name}
              className="hotel-thumbnail"
            />
            <div className="hotel-details">
              <h3>{hotel.name}</h3>
              <p className="hotel-location">{hotel.address?.fullAddress || hotel.location?.address}</p>
              {price && (
                <p className="estimated-price">参考価格: ¥{price.toLocaleString()}/泊</p>
              )}
            </div>
          </div>

          {/* 予約情報 */}
          {bookingParams && (
            <div className="booking-summary">
              <h4>🗓️ 予約情報</h4>
              <div className="booking-info-grid">
                <div>
                  <span className="label">チェックイン:</span>
                  <span className="value">
                    {new Date(bookingParams.checkIn).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div>
                  <span className="label">チェックアウト:</span>
                  <span className="value">
                    {new Date(bookingParams.checkOut).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div>
                  <span className="label">人数:</span>
                  <span className="value">{bookingParams.guests}名</span>
                </div>
                <div>
                  <span className="label">部屋数:</span>
                  <span className="value">{bookingParams.rooms}室</span>
                </div>
              </div>
            </div>
          )}

          {/* OTAのメリット */}
          <div className="ota-benefits">
            <h4>✨ {currentOta.name}のメリット</h4>
            <ul>
              {currentOta.benefits.map((benefit, index) => (
                <li key={index}>{benefit}</li>
              ))}
            </ul>
          </div>

          {/* 重要な注意事項 */}
          <div className="important-notice">
            <h4>⚠️ 重要な注意事項</h4>
            <div className="notice-box">
              <p><strong>外部サイトへの移動について</strong></p>
              <ul>
                <li>これから{currentOta.name}の公式サイトに移動します</li>
                <li>予約の完了は{currentOta.name}で行ってください</li>
                <li>当サイトでは予約の管理・キャンセルはできません</li>
                <li>料金やキャンセル規定は移動先サイトでご確認ください</li>
              </ul>
            </div>
          </div>

          {/* 利用規約 */}
          <div className="terms-section">
            <h4>📋 予約時の注意点</h4>
            <ul className="terms-list">
              {currentOta.terms.map((term, index) => (
                <li key={index}>{term}</li>
              ))}
              <li>当サイトは予約の仲介を行うものであり、宿泊契約は{currentOta.name}と利用者間で成立します</li>
              <li>トラブルや質問は{currentOta.name}のカスタマーサポートにお問い合わせください</li>
            </ul>
          </div>

          {/* 同意チェックボックス */}
          <div className="agreement-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
              />
              <span className="checkmark"></span>
              外部サイト移動について理解しました
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span className="checkmark"></span>
              注意事項に同意し、{currentOta.name}で予約を進めます
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-button" 
            onClick={handleClose}
          >
            キャンセル
          </button>
          <button 
            className="confirm-button"
            onClick={handleConfirm}
            disabled={!agreed || !understood}
            style={{ 
              '--ota-color': currentOta.color,
              opacity: (!agreed || !understood) ? 0.5 : 1
            }}
          >
            {currentOta.name}で予約する
          </button>
        </div>

        {/* データ収集に関する通知 */}
        <div className="privacy-notice">
          <p>
            <span className="privacy-icon">🔒</span>
            プライバシー保護のため、個人情報は{currentOta.name}に直接入力してください。
            当サイトでは予約に関する個人情報を収集・保存いたしません。
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmModal;