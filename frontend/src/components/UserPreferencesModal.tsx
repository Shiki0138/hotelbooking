import React, { useState, useEffect } from 'react';
import authService, { UserPreferences } from '../services/mockAuth.service';

interface UserPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const REGIONS = [
  { value: 'hokkaido', label: '北海道' },
  { value: 'tohoku', label: '東北' },
  { value: 'kanto', label: '関東' },
  { value: 'chubu', label: '中部' },
  { value: 'kansai', label: '関西' },
  { value: 'chugoku', label: '中国' },
  { value: 'shikoku', label: '四国' },
  { value: 'kyushu', label: '九州' },
  { value: 'okinawa', label: '沖縄' }
];

const HOTEL_TYPES = [
  { value: 'luxury', label: '高級ホテル' },
  { value: 'resort', label: 'リゾートホテル' },
  { value: 'business', label: 'ビジネスホテル' },
  { value: 'ryokan', label: '旅館' },
  { value: 'city', label: 'シティホテル' }
];

const AMENITIES = [
  { value: 'spa', label: 'スパ' },
  { value: 'pool', label: 'プール' },
  { value: 'gym', label: 'フィットネス' },
  { value: 'restaurant', label: 'レストラン' },
  { value: 'bar', label: 'バー' },
  { value: 'onsen', label: '温泉' },
  { value: 'parking', label: '駐車場' },
  { value: 'wifi', label: '無料Wi-Fi' }
];

export const UserPreferencesModal: React.FC<UserPreferencesModalProps> = ({ isOpen, onClose, userId }) => {
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({
    preferred_regions: [],
    preferred_prefectures: [],
    min_budget: null,
    max_budget: null,
    hotel_types: [],
    notification_enabled: true,
    notification_frequency: 'daily',
    travel_months: [],
    advance_notice_days: 30,
    min_rating: 4.0,
    must_have_amenities: []
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadPreferences();
    }
  }, [isOpen, userId]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const data = await authService.getUserPreferences(userId);
      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authService.updateUserPreferences(userId, preferences);
      onClose();
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayValue = (field: keyof UserPreferences, value: string) => {
    const currentValues = (preferences[field] as string[]) || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    setPreferences({
      ...preferences,
      [field]: newValues
    });
  };

  const toggleMonth = (month: number) => {
    const currentMonths = preferences.travel_months || [];
    const newMonths = currentMonths.includes(month)
      ? currentMonths.filter(m => m !== month)
      : [...currentMonths, month];
    
    setPreferences({
      ...preferences,
      travel_months: newMonths
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">お気に入り条件設定</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* 通知設定 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">通知設定</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.notification_enabled}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      notification_enabled: e.target.checked
                    })}
                    className="mr-2"
                  />
                  <span>お得な情報をメールで受け取る</span>
                </label>
                
                <div className="ml-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    配信頻度
                  </label>
                  <select
                    value={preferences.notification_frequency}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      notification_frequency: e.target.value as 'daily' | 'weekly' | 'immediate'
                    })}
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md"
                    disabled={!preferences.notification_enabled}
                  >
                    <option value="immediate">即時</option>
                    <option value="daily">毎日</option>
                    <option value="weekly">週1回</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 希望地域 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">希望地域</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {REGIONS.map(region => (
                  <label key={region.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.preferred_regions?.includes(region.value) || false}
                      onChange={() => toggleArrayValue('preferred_regions', region.value)}
                      className="mr-2"
                    />
                    <span>{region.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 価格帯 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">価格帯（1泊あたり）</h3>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  placeholder="最低価格"
                  value={preferences.min_budget || ''}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    min_budget: e.target.value ? parseInt(e.target.value) : null
                  })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                />
                <span>〜</span>
                <input
                  type="number"
                  placeholder="最高価格"
                  value={preferences.max_budget || ''}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    max_budget: e.target.value ? parseInt(e.target.value) : null
                  })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                />
                <span>円</span>
              </div>
            </div>

            {/* ホテルタイプ */}
            <div>
              <h3 className="text-lg font-semibold mb-3">ホテルタイプ</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {HOTEL_TYPES.map(type => (
                  <label key={type.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.hotel_types?.includes(type.value) || false}
                      onChange={() => toggleArrayValue('hotel_types', type.value)}
                      className="mr-2"
                    />
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 希望の旅行時期 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">希望の旅行時期</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {[...Array(12)].map((_, i) => (
                  <label key={i + 1} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.travel_months?.includes(i + 1) || false}
                      onChange={() => toggleMonth(i + 1)}
                      className="mr-2"
                    />
                    <span>{i + 1}月</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 必須設備 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">必須設備・サービス</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {AMENITIES.map(amenity => (
                  <label key={amenity.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.must_have_amenities?.includes(amenity.value) || false}
                      onChange={() => toggleArrayValue('must_have_amenities', amenity.value)}
                      className="mr-2"
                    />
                    <span>{amenity.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* その他の条件 */}
            <div>
              <h3 className="text-lg font-semibold mb-3">その他の条件</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最低評価
                  </label>
                  <select
                    value={preferences.min_rating}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      min_rating: parseFloat(e.target.value)
                    })}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="3.0">3.0以上</option>
                    <option value="3.5">3.5以上</option>
                    <option value="4.0">4.0以上</option>
                    <option value="4.5">4.5以上</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    何日前から通知を受け取る
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={preferences.advance_notice_days}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        advance_notice_days: parseInt(e.target.value) || 30
                      })}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                      min="1"
                      max="365"
                    />
                    <span>日前</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : '保存する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};