import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HotelCardEnhanced } from './HotelCardEnhanced';
import { PricePredictionChart } from './PricePredictionChart';

interface HotelDetailModalProps {
  hotel: any;
  selectedDates: { checkin: string; checkout: string };
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  favorites: string[];
  onToggleFavorite: (hotelId: string) => void;
}

export const HotelDetailModal: React.FC<HotelDetailModalProps> = ({
  hotel,
  selectedDates,
  isOpen,
  onClose,
  currentUser,
  favorites,
  onToggleFavorite
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!hotel) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 100,
              backdropFilter: 'blur(4px)'
            }}
          />

          {/* モーダル */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90vw',
              maxWidth: '900px',
              maxHeight: '90vh',
              background: 'white',
              borderRadius: '20px',
              zIndex: 101,
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
            }}
          >
            {/* ヘッダー */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px' }}>
                  {hotel.name}
                </h2>
                <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
                  📍 {hotel.location}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  color: 'white',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* タブナビゲーション */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e5e7eb',
              background: '#f9fafb'
            }}>
              {[
                { id: 'overview', label: '概要', icon: '🏨' },
                { id: 'prices', label: 'AI価格予測', icon: '📊' },
                { id: 'amenities', label: '設備・サービス', icon: '🎯' },
                { id: 'reviews', label: 'レビュー', icon: '⭐' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '16px 12px',
                    border: 'none',
                    background: activeTab === tab.id ? 'white' : 'transparent',
                    color: activeTab === tab.id ? '#1f2937' : '#6b7280',
                    fontWeight: activeTab === tab.id ? '600' : '400',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* コンテンツ */}
            <div style={{
              height: 'calc(90vh - 200px)',
              overflowY: 'auto',
              padding: '24px'
            }}>
              {activeTab === 'overview' && (
                <div>
                  <HotelCardEnhanced
                    hotel={hotel}
                    selectedDates={selectedDates}
                    isFavorite={favorites.includes(hotel.id)}
                    onToggleFavorite={onToggleFavorite}
                    currentUser={currentUser}
                    onHotelClick={() => {}}
                  />
                  
                  <div style={{ marginTop: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                      ホテル詳細
                    </h3>
                    <div style={{
                      background: '#f9fafb',
                      padding: '20px',
                      borderRadius: '12px',
                      lineHeight: '1.6'
                    }}>
                      <p style={{ marginBottom: '16px', color: '#374151' }}>
                        {hotel.description || '快適な滞在をお約束する上質なホテルです。最新の設備と心温まるおもてなしで、お客様をお迎えいたします。'}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div>
                          <strong>チェックイン:</strong> {hotel.checkinTime || '15:00'}
                        </div>
                        <div>
                          <strong>チェックアウト:</strong> {hotel.checkoutTime || '11:00'}
                        </div>
                        <div>
                          <strong>客室数:</strong> {hotel.roomCount || '120'}室
                        </div>
                        <div>
                          <strong>築年数:</strong> {hotel.buildYear || '2018'}年
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'prices' && (
                <PricePredictionChart
                  hotelId={hotel.id}
                  selectedDates={selectedDates}
                />
              )}

              {activeTab === 'amenities' && (
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                    設備・サービス
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                        🏊 レクリエーション
                      </h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {['プール', 'フィットネスジム', 'スパ', 'サウナ'].map((item, index) => (
                          <li key={index} style={{ padding: '4px 0', color: '#374151' }}>✓ {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                        🍽️ ダイニング
                      </h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {['レストラン', 'バー', 'ルームサービス', 'コンシェルジュ'].map((item, index) => (
                          <li key={index} style={{ padding: '4px 0', color: '#374151' }}>✓ {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                        💼 ビジネス
                      </h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {['会議室', 'ビジネスセンター', '無料Wi-Fi', 'コピー・FAX'].map((item, index) => (
                          <li key={index} style={{ padding: '4px 0', color: '#374151' }}>✓ {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                        🚗 アクセス
                      </h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {['駐車場', '送迎サービス', '地下鉄直結', 'バス停徒歩1分'].map((item, index) => (
                          <li key={index} style={{ padding: '4px 0', color: '#374151' }}>✓ {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                    ゲストレビュー
                  </h3>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '20px',
                      background: 'linear-gradient(135deg, #fef3c7, #fee2e2)',
                      borderRadius: '12px'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
                          {hotel.rating}
                        </div>
                        <div style={{ color: '#f59e0b', fontSize: '20px' }}>
                          {'★'.repeat(Math.floor(hotel.rating))}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {hotel.reviewCount}件のレビュー
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        {[5, 4, 3, 2, 1].map((star) => (
                          <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', minWidth: '20px' }}>{star}★</span>
                            <div style={{
                              flex: 1,
                              height: '8px',
                              background: '#e5e7eb',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${Math.random() * 80 + 10}%`,
                                height: '100%',
                                background: '#f59e0b',
                                borderRadius: '4px'
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[1, 2, 3].map((review) => (
                      <div key={review} style={{
                        padding: '16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #667eea, #764ba2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}>
                              {review === 1 ? 'A' : review === 2 ? 'M' : 'T'}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '14px' }}>
                                {review === 1 ? 'Akinobu' : review === 2 ? 'Michiko' : 'Takeshi'}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                2024年{Math.floor(Math.random() * 12) + 1}月宿泊
                              </div>
                            </div>
                          </div>
                          <div style={{ color: '#f59e0b' }}>
                            {'★'.repeat(5 - review + 3)}
                          </div>
                        </div>
                        <p style={{ color: '#374151', lineHeight: '1.5', margin: 0 }}>
                          {review === 1 ? 'スタッフの対応が素晴らしく、部屋も清潔で快適でした。朝食も美味しく、また利用したいと思います。' :
                           review === 2 ? 'ロケーションが最高で、観光地へのアクセスも良好。設備も充実していて満足です。' :
                           'コストパフォーマンスが良く、期待以上のサービスでした。次回も必ず利用します。'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};