import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useTranslation } from 'react-i18next';
import axios from '../../config/axios';

interface SegmentSelectorProps {
  onComplete: () => void;
  initialSegment?: UserSegment;
}

interface UserSegment {
  lifestyle_segment: string;
  travel_purposes: string[];
  preferred_amenities: string[];
  price_sensitivity: string;
  has_children: boolean;
  children_ages: number[];
  mobility_needs: boolean;
  pet_friendly_required: boolean;
}

const LIFESTYLE_SEGMENTS = [
  { value: 'single', label: 'ひとり旅', icon: '👤' },
  { value: 'couple', label: 'カップル', icon: '👫' },
  { value: 'family_young', label: 'ファミリー（小さなお子様）', icon: '👨‍👩‍👧' },
  { value: 'family_teen', label: 'ファミリー（ティーン）', icon: '👨‍👩‍👧‍👦' },
  { value: 'senior_couple', label: 'シニアカップル', icon: '👴👵' },
  { value: 'business', label: 'ビジネス', icon: '💼' },
  { value: 'group', label: 'グループ', icon: '👥' }
];

const TRAVEL_PURPOSES = [
  { value: 'leisure', label: 'レジャー' },
  { value: 'business', label: 'ビジネス' },
  { value: 'anniversary', label: '記念日' },
  { value: 'weekend', label: '週末旅行' },
  { value: 'workation', label: 'ワーケーション' }
];

const AMENITIES = [
  { value: 'spa', label: 'スパ' },
  { value: 'pool', label: 'プール' },
  { value: 'gym', label: 'ジム' },
  { value: 'restaurant', label: 'レストラン' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'parking', label: '駐車場' },
  { value: 'pet_friendly', label: 'ペット可' },
  { value: 'kids_pool', label: 'キッズプール' },
  { value: 'wheelchair_accessible', label: 'バリアフリー' },
  { value: 'onsen', label: '温泉' }
];

export const SegmentSelector: React.FC<SegmentSelectorProps> = ({ 
  onComplete, 
  initialSegment 
}) => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [segment, setSegment] = useState<UserSegment>(initialSegment || {
    lifestyle_segment: '',
    travel_purposes: [],
    preferred_amenities: [],
    price_sensitivity: 'medium',
    has_children: false,
    children_ages: [],
    mobility_needs: false,
    pet_friendly_required: false
  });

  const handleSegmentSubmit = async () => {
    setLoading(true);
    try {
      // デモモードの場合はローカルストレージに保存
      if (!user) {
        localStorage.setItem('demoSegment', JSON.stringify(segment));
        onComplete();
        return;
      }
      
      // 通常モード：APIに保存
      await axios.post('/api/segments', segment, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      onComplete();
    } catch (error) {
      console.error('Error saving segment:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayValue = (field: 'travel_purposes' | 'preferred_amenities', value: string) => {
    setSegment(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">
          あなたにぴったりのホテルを見つけましょう
        </h2>

        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">
              あなたの旅行スタイルを教えてください
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {LIFESTYLE_SEGMENTS.map((ls) => (
                <button
                  key={ls.value}
                  onClick={() => setSegment({ ...segment, lifestyle_segment: ls.value })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    segment.lifestyle_segment === ls.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{ls.icon}</div>
                  <div className="text-sm">{ls.label}</div>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!segment.lifestyle_segment}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                次へ
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">
              よく旅行する目的をお選びください（複数選択可）
            </h3>
            <div className="space-y-3">
              {TRAVEL_PURPOSES.map((purpose) => (
                <label
                  key={purpose.value}
                  className="flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={segment.travel_purposes.includes(purpose.value)}
                    onChange={() => toggleArrayValue('travel_purposes', purpose.value)}
                    className="mr-3"
                  />
                  <span>{purpose.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 border border-gray-300 rounded-lg"
              >
                戻る
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={segment.travel_purposes.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                次へ
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">
              重視する設備・サービスをお選びください（複数選択可）
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {AMENITIES.map((amenity) => (
                <label
                  key={amenity.value}
                  className="flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={segment.preferred_amenities.includes(amenity.value)}
                    onChange={() => toggleArrayValue('preferred_amenities', amenity.value)}
                    className="mr-3"
                  />
                  <span>{amenity.label}</span>
                </label>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="font-semibold">その他の情報</h4>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={segment.has_children}
                  onChange={(e) => setSegment({ ...segment, has_children: e.target.checked })}
                  className="mr-3"
                />
                <span>お子様連れの旅行が多い</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={segment.mobility_needs}
                  onChange={(e) => setSegment({ ...segment, mobility_needs: e.target.checked })}
                  className="mr-3"
                />
                <span>バリアフリー対応が必要</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={segment.pet_friendly_required}
                  onChange={(e) => setSegment({ ...segment, pet_friendly_required: e.target.checked })}
                  className="mr-3"
                />
                <span>ペット同伴で旅行する</span>
              </label>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 border border-gray-300 rounded-lg"
              >
                戻る
              </button>
              <button
                onClick={handleSegmentSubmit}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? '保存中...' : '完了'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};