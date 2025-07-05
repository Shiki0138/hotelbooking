import React from 'react';

interface SimplePersonalizedSectionProps {
  hotels: Array<{
    id: string;
    name: string;
    price: number;
    image?: string;
    location?: string;
    reason_tags?: string[];
    personalization_score?: number;
    is_personalized?: boolean;
  }>;
  userSegment: string;
}

export const SimplePersonalizedSection: React.FC<SimplePersonalizedSectionProps> = ({
  hotels,
  userSegment
}) => {
  const getSegmentName = (segment: string) => {
    const segments: Record<string, string> = {
      single: 'ひとり旅',
      couple: 'カップル',
      family_young: 'ファミリー（小さなお子様）',
      family_teen: 'ファミリー（ティーン）',
      senior_couple: 'シニアカップル',
      business: 'ビジネス',
      group: 'グループ'
    };
    return segments[segment] || segment;
  };

  const getReasonTag = (tag: string) => {
    const tagMap: Record<string, string> = {
      room_capacity_match: '人数にぴったり',
      price_range_match: '予算に最適',
      spa: 'スパあり',
      pool: 'プール',
      restaurant: 'レストラン',
      business_center: 'ビジネスセンター',
      family_rooms: 'ファミリールーム'
    };
    return tagMap[tag] || tag;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          🎯 {getSegmentName(userSegment)}向けのおすすめ
        </h3>
        <p className="text-gray-600">
          あなたの旅行スタイルに合わせてカスタマイズされたホテルをご紹介
        </p>
      </div>

      <div className="space-y-4">
        {hotels.map((hotel) => (
          <div key={hotel.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-semibold text-gray-900 flex items-center">
                  {hotel.name}
                  {hotel.is_personalized && (
                    <span className="ml-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-1 rounded-full text-xs">
                      ⭐ あなた向け
                    </span>
                  )}
                </h4>
                <p className="text-sm text-gray-600">{hotel.location}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">
                  ¥{hotel.price.toLocaleString()}
                </div>
                {hotel.personalization_score && (
                  <div className="text-xs text-gray-500">
                    マッチ度: {hotel.personalization_score}%
                  </div>
                )}
              </div>
            </div>

            {hotel.reason_tags && hotel.reason_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {hotel.reason_tags.slice(0, 4).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {getReasonTag(tag)}
                  </span>
                ))}
              </div>
            )}

            <button className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              詳細を見る
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};