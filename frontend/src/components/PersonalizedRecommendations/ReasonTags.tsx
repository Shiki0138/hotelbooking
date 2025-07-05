import React from 'react';
import { useTranslation } from 'react-i18next';

interface ReasonTagsProps {
  tags: string[];
  className?: string;
}

const TAG_TRANSLATIONS: Record<string, { label: string; icon: string }> = {
  // アメニティ関連
  kids_pool: { label: 'キッズプール', icon: '🏊' },
  family_rooms: { label: 'ファミリールーム', icon: '👨‍👩‍👧‍👦' },
  playground: { label: 'プレイグラウンド', icon: '🎠' },
  cribs: { label: 'ベビーベッド', icon: '👶' },
  high_chairs: { label: 'ハイチェア', icon: '🪑' },
  pet_friendly: { label: 'ペット可', icon: '🐕' },
  wheelchair_accessible: { label: 'バリアフリー', icon: '♿' },
  spa: { label: 'スパ', icon: '💆' },
  onsen: { label: '温泉', icon: '♨️' },
  pool: { label: 'プール', icon: '🏊' },
  gym: { label: 'ジム', icon: '🏋️' },
  restaurant: { label: 'レストラン', icon: '🍽️' },
  bar: { label: 'バー', icon: '🍷' },
  business_center: { label: 'ビジネスセンター', icon: '💼' },
  meeting_rooms: { label: '会議室', icon: '📊' },
  high_speed_wifi: { label: '高速Wi-Fi', icon: '📶' },
  wifi: { label: 'Wi-Fi完備', icon: '📶' },
  work_desk: { label: 'ワークデスク', icon: '💻' },
  free_breakfast: { label: '朝食無料', icon: '🥐' },
  airport_shuttle: { label: '空港送迎', icon: '🚌' },
  parking: { label: '駐車場', icon: '🚗' },
  electric_car_charging: { label: 'EV充電', icon: '🔌' },
  beach_access: { label: 'ビーチアクセス', icon: '🏖️' },
  ski_storage: { label: 'スキー保管', icon: '⛷️' },
  bicycle_rental: { label: '自転車レンタル', icon: '🚴' },
  concierge: { label: 'コンシェルジュ', icon: '🎩' },
  room_service: { label: 'ルームサービス', icon: '🛎️' },
  laundry_service: { label: 'ランドリー', icon: '🧺' },
  laundry: { label: 'ランドリー', icon: '🧺' },
  non_smoking: { label: '禁煙', icon: '🚭' },
  air_conditioning: { label: 'エアコン', icon: '❄️' },
  romantic_atmosphere: { label: 'ロマンチック', icon: '💕' },
  romantic_dinner: { label: 'ロマンチックディナー', icon: '🕯️' },
  view_room: { label: '眺望ルーム', icon: '🌅' },
  couples_spa: { label: 'カップルスパ', icon: '💑' },
  honeymoon_suite: { label: 'ハネムーンスイート', icon: '🌹' },
  senior_discount: { label: 'シニア割引', icon: '👴' },
  quiet_area: { label: '静かなエリア', icon: '🤫' },
  medical_assistance: { label: '医療サポート', icon: '🏥' },
  elevator: { label: 'エレベーター', icon: '🛗' },
  large_rooms: { label: '広い部屋', icon: '🏠' },
  connecting_rooms: { label: 'コネクティングルーム', icon: '🚪' },
  group_dining: { label: 'グループダイニング', icon: '🍽️' },
  game_room: { label: 'ゲームルーム', icon: '🎮' },
  
  // マッチング理由
  room_capacity_match: { label: '人数にぴったり', icon: '✅' },
  price_range_match: { label: '予算に最適', icon: '💰' },
  child_friendly: { label: 'お子様歓迎', icon: '👶' },
  accessibility: { label: 'バリアフリー対応', icon: '♿' },
  leisure_purpose_match: { label: 'レジャーに最適', icon: '🎪' },
  business_purpose_match: { label: 'ビジネスに最適', icon: '💼' },
  anniversary_purpose_match: { label: '記念日に最適', icon: '🎉' },
  weekend_purpose_match: { label: '週末旅行に最適', icon: '📅' },
  workation_purpose_match: { label: 'ワーケーションに最適', icon: '💻' }
};

export const ReasonTags: React.FC<ReasonTagsProps> = ({ tags, className = '' }) => {
  const { t } = useTranslation();

  const getTagDisplay = (tag: string) => {
    return TAG_TRANSLATIONS[tag] || { label: tag, icon: '📍' };
  };

  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.slice(0, 5).map((tag, index) => {
        const { label, icon } = getTagDisplay(tag);
        return (
          <div
            key={index}
            className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-purple-50 to-pink-50 
                     border border-purple-200 rounded-full text-xs text-purple-700 font-medium"
          >
            <span className="mr-1">{icon}</span>
            <span>{label}</span>
          </div>
        );
      })}
      {tags.length > 5 && (
        <div className="inline-flex items-center px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
          +{tags.length - 5}
        </div>
      )}
    </div>
  );
};