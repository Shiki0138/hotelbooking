import React, { useState, useEffect } from 'react';
import { Hotel } from './HotelCard';

interface HotelDetailProps {
  hotel: Hotel;
  onClose: () => void;
  searchParams?: {
    checkinDate: Date;
    checkoutDate: Date;
    adultNum: number;
    roomNum: number;
  };
}

interface RoomPlan {
  roomName: string;
  planName: string;
  price: number;
  mealType: string;
  smokingType: string;
  roomImageUrl?: string;
  planDescription?: string;
  cancelPolicy?: string;
  specialOffers?: string[];
}

const HotelDetail: React.FC<HotelDetailProps> = ({ hotel, onClose, searchParams }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'amenities' | 'reviews' | 'map'>('overview');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [roomPlans, setRoomPlans] = useState<RoomPlan[]>([]);
  const [loading, setLoading] = useState(false);

  // サンプル画像（実際は楽天APIから取得）
  const hotelImages = [
    hotel.hotelThumbnailUrl,
    hotel.roomThumbnailUrl,
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
  ].filter(Boolean);

  // サンプル料金プラン
  useEffect(() => {
    setLoading(true);
    // 実際は楽天API呼び出し
    setTimeout(() => {
      setRoomPlans([
        {
          roomName: 'スタンダードツイン',
          planName: '素泊まりプラン',
          price: hotel.hotelMinCharge,
          mealType: '食事なし',
          smokingType: '禁煙',
          specialOffers: ['Wi-Fi無料', 'キャンセル無料'],
        },
        {
          roomName: 'スタンダードツイン',
          planName: '朝食付きプラン',
          price: hotel.hotelMinCharge + 3000,
          mealType: '朝食あり',
          smokingType: '禁煙',
          specialOffers: ['Wi-Fi無料', '朝食ビュッフェ'],
        },
        {
          roomName: 'デラックスダブル',
          planName: '2食付きプラン',
          price: hotel.hotelMinCharge + 8000,
          mealType: '朝食・夕食あり',
          smokingType: '禁煙',
          specialOffers: ['Wi-Fi無料', '温泉入浴券付き'],
        },
      ]);
      setLoading(false);
    }, 1000);
  }, [hotel]);

  const getStayNights = () => {
    if (!searchParams?.checkinDate || !searchParams?.checkoutDate) return 1;
    const diffTime = searchParams.checkoutDate.getTime() - searchParams.checkinDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatPrice = (price: number) => {
    const nights = getStayNights();
    const totalPrice = price * nights;
    return {
      perNight: `¥${price.toLocaleString()}`,
      total: `¥${totalPrice.toLocaleString()}`,
      nights,
    };
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % hotelImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + hotelImages.length) % hotelImages.length);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto bg-white min-h-screen lg:min-h-0 lg:my-8 lg:rounded-lg lg:shadow-xl">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{hotel.hotelName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-yellow-400">
                {'★'.repeat(Math.floor(hotel.reviewAverage))}
              </span>
              <span className="text-sm font-medium">{hotel.reviewAverage.toFixed(1)}</span>
              <span className="text-sm text-gray-500">({hotel.reviewCount}件)</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 画像ギャラリー */}
        <div className="relative h-96 bg-gray-200">
          <img
            src={hotelImages[currentImageIndex]}
            alt={`${hotel.hotelName} - ${currentImageIndex + 1}`}
            className="w-full h-full object-cover"
          />
          
          {/* 画像ナビゲーション */}
          {hotelImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              {/* 画像インジケーター */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {hotelImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* タブナビゲーション */}
        <div className="border-b">
          <nav className="flex px-6">
            {[
              { key: 'overview', label: '概要', icon: '🏨' },
              { key: 'rooms', label: '客室・料金', icon: '🛏️' },
              { key: 'amenities', label: '設備・サービス', icon: '🎯' },
              { key: 'reviews', label: 'レビュー', icon: '⭐' },
              { key: 'map', label: 'アクセス', icon: '🗺️' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* タブコンテンツ */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 基本情報 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">基本情報</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">住所:</span> {hotel.address1} {hotel.address2}</p>
                    <p><span className="font-medium">電話:</span> {hotel.telephoneNo}</p>
                    <p><span className="font-medium">チェックイン:</span> 15:00〜</p>
                    <p><span className="font-medium">チェックアウト:</span> 〜10:00</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-3">アクセス</h3>
                  <p className="text-sm text-gray-700">{hotel.access}</p>
                </div>
              </div>

              {/* 特別情報 */}
              {hotel.hotelSpecial && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">特別なご案内</h3>
                  <p className="text-sm text-gray-700">{hotel.hotelSpecial}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">客室・料金プラン</h3>
              
              {searchParams && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">検索条件</h4>
                  <div className="text-sm text-blue-800">
                    <p>期間: {searchParams.checkinDate.toLocaleDateString('ja-JP')} - {searchParams.checkoutDate.toLocaleDateString('ja-JP')} ({getStayNights()}泊)</p>
                    <p>人数: 大人{searchParams.adultNum}名 / {searchParams.roomNum}部屋</p>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">料金プランを取得中...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {roomPlans.map((plan, index) => {
                    const pricing = formatPrice(plan.price);
                    return (
                      <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{plan.roomName}</h4>
                            <p className="text-blue-600 font-medium">{plan.planName}</p>
                            
                            <div className="mt-2 text-sm text-gray-600">
                              <p>食事: {plan.mealType}</p>
                              <p>客室: {plan.smokingType}</p>
                            </div>

                            {plan.specialOffers && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {plan.specialOffers.map((offer, i) => (
                                  <span key={i} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                    {offer}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="text-right ml-4">
                            <div className="text-2xl font-bold text-blue-600">{pricing.perNight}</div>
                            <div className="text-sm text-gray-500">1泊あたり</div>
                            {pricing.nights > 1 && (
                              <div className="text-lg font-semibold text-gray-900 mt-1">
                                合計 {pricing.total}
                              </div>
                            )}
                            
                            <a
                              href={hotel.hotelInformationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-3 bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors text-sm font-medium"
                            >
                              楽天で予約
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'amenities' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">設備・サービス</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-3">客室設備</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Wi-Fi無料</li>
                    <li>• エアコン</li>
                    <li>• テレビ</li>
                    <li>• 冷蔵庫</li>
                    <li>• ドライヤー</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">館内施設</h4>
                  <ul className="text-sm space-y-1">
                    <li>• レストラン</li>
                    <li>• 大浴場</li>
                    <li>• フィットネス</li>
                    <li>• コインランドリー</li>
                    <li>• 駐車場</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">サービス</h4>
                  <ul className="text-sm space-y-1">
                    <li>• 24時間フロント</li>
                    <li>• 荷物預かり</li>
                    <li>• クリーニング</li>
                    <li>• ルームサービス</li>
                    <li>• 宅配便受付</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold">ゲストレビュー</h3>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 text-xl">
                    {'★'.repeat(Math.floor(hotel.reviewAverage))}
                  </span>
                  <span className="text-xl font-bold">{hotel.reviewAverage.toFixed(1)}</span>
                  <span className="text-gray-500">({hotel.reviewCount}件のレビュー)</span>
                </div>
              </div>

              {hotel.userReview && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">"{hotel.userReview}"</p>
                </div>
              )}
              
              <div className="text-center py-8 text-gray-500">
                <p>詳細なレビューは楽天トラベルでご確認いただけます</p>
                <a
                  href={hotel.hotelInformationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  楽天トラベルで確認
                </a>
              </div>
            </div>
          )}

          {activeTab === 'map' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">アクセス・地図</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">住所・アクセス</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">住所:</span> {hotel.address1} {hotel.address2}</p>
                    <p><span className="font-medium">アクセス:</span> {hotel.access}</p>
                    <p><span className="font-medium">電話:</span> {hotel.telephoneNo}</p>
                  </div>
                </div>
                
                <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center">
                  <p className="text-gray-600">地図表示エリア</p>
                  <p className="text-xs text-gray-500 ml-2">
                    (緯度: {hotel.latitude}, 経度: {hotel.longitude})
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="text-sm text-gray-600">
              <p>最新の料金・空室状況は楽天トラベルでご確認ください</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                閉じる
              </button>
              <a
                href={hotel.hotelInformationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors font-medium"
              >
                楽天トラベルで予約
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelDetail;