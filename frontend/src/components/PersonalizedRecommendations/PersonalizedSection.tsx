import React, { useState, useEffect } from 'react';
import axios from '../../config/axios';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { RecommendationCard } from './RecommendationCard';
import { SegmentSelector } from './SegmentSelector';
import { useTranslation } from 'react-i18next';
import { 
  StaggeredContainer,
  StaggeredItem,
  TextReveal
} from '../Animation/MotionComponents';
import {
  ResponsiveGrid
} from '../Layout/ResponsiveLayout';
import './PersonalizedSection.css';

interface PersonalizedRecommendation {
  id: string;
  name: string;
  description: string;
  image_url: string;
  city: string;
  country: string;
  star_rating: number;
  user_rating: number;
  amenities: string[];
  rooms: any[];
  reason_tags: string[];
  personalization_score: number;
  is_personalized: boolean;
}

interface PersonalizedSectionProps {
  demoMode?: boolean;
}

export const PersonalizedSection: React.FC<PersonalizedSectionProps> = ({ demoMode = false }) => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSegmentSelector, setShowSegmentSelector] = useState(false);
  const [hasSegment, setHasSegment] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  const [travelPurpose, setTravelPurpose] = useState<string>('leisure');

  useEffect(() => {
    if (demoMode) {
      // デモモードの場合はローカルストレージから読み込み
      const savedSegment = localStorage.getItem('demoSegment');
      if (savedSegment) {
        const segment = JSON.parse(savedSegment);
        setSelectedSegment(segment.lifestyle_segment);
        setHasSegment(true);
        fetchDemoRecommendations(segment.lifestyle_segment);
      } else {
        setShowSegmentSelector(true);
      }
    } else if (user) {
      checkUserSegment();
      fetchRecommendations();
      fetchFavorites();
    }
  }, [user, demoMode]);

  const checkUserSegment = async () => {
    if (!user) return;

    try {
      const response = await axios.get('/api/segments/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setHasSegment(!!response.data.data);
    } catch (error) {
      console.error('Error checking user segment:', error);
    }
  };

  const fetchRecommendations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await axios.get('/api/segments/recommendations', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          limit: 6
        }
      });

      if (response.data.success && response.data.data.recommendations) {
        setRecommendations(response.data.data.recommendations);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      // 404エラーの場合はセグメント設定を促す
      if (error.response?.status === 404) {
        setShowSegmentSelector(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDemoRecommendations = async (segmentType: string) => {
    setLoading(true);
    try {
      const response = await axios.get('/api/segments/personalized', {
        params: {
          demo: 'true',
          segmentType: segmentType,
          travelPurpose: travelPurpose,
          limit: 6
        }
      });

      if (response.data.hotels) {
        setRecommendations(response.data.hotels);
      }
    } catch (error) {
      console.error('Error fetching demo recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      const response = await axios.get('/api/favorites', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const favoriteIds = response.data.data.map((fav: any) => fav.hotel_id);
        setFavorites(new Set(favoriteIds));
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const handleFavoriteToggle = async (hotelId: string) => {
    if (!user) return;

    try {
      if (favorites.has(hotelId)) {
        await axios.delete(`/api/favorites/${hotelId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(hotelId);
          return newSet;
        });
      } else {
        await axios.post('/api/favorites', 
          { hotel_id: hotelId },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        setFavorites(prev => new Set(prev).add(hotelId));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleSegmentComplete = () => {
    setShowSegmentSelector(false);
    setHasSegment(true);
    if (demoMode) {
      const savedSegment = localStorage.getItem('demoSegment');
      if (savedSegment) {
        const segment = JSON.parse(savedSegment);
        setSelectedSegment(segment.lifestyle_segment);
        fetchDemoRecommendations(segment.lifestyle_segment);
      }
    } else {
      fetchRecommendations();
    }
  };

  // デモモード以外でログインしていない場合は何も表示しない
  if (!demoMode && !user) return null;

  // セグメント選択画面を表示
  if (showSegmentSelector) {
    return <SegmentSelector onComplete={handleSegmentComplete} />;
  }

  // レコメンデーションがない場合
  if (!loading && recommendations.length === 0) {
    return null;
  }

  return (
    <section className="personalized-section" aria-label="パーソナライズされたおすすめ">
      <div className="section-header">
        <TextReveal text="あなたへのおすすめ" className="section-title" />
        <p className="section-subtitle">
          {demoMode 
            ? 'あなたの選択したセグメントに基づいてセレクトしました' 
            : 'あなたの好みや過去の利用履歴に基づいてセレクトしました'}
        </p>
        {demoMode && (
          <div className="mt-4 flex items-center gap-4">
            <select
              value={travelPurpose}
              onChange={(e) => {
                setTravelPurpose(e.target.value);
                if (selectedSegment) {
                  fetchDemoRecommendations(selectedSegment);
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="leisure">レジャー</option>
              <option value="business">ビジネス</option>
              <option value="anniversary">記念日</option>
              <option value="weekend">週末旅行</option>
              <option value="workation">ワーケーション</option>
            </select>
            <button 
              onClick={() => setShowSegmentSelector(true)}
              className="px-4 py-2 text-purple-600 hover:text-purple-700"
            >
              セグメントを変更
            </button>
          </div>
        )}
        {!demoMode && !hasSegment && (
          <button 
            onClick={() => setShowSegmentSelector(true)}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            プロフィールを設定してより良いおすすめを見る
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-t-lg"></div>
              <div className="bg-white p-4 rounded-b-lg">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <StaggeredContainer>
          <ResponsiveGrid
            columns={{ mobile: 1, tablet: 2, desktop: 3 }}
            gap="24px"
            className="mt-8"
          >
            {recommendations.map((hotel) => (
              <StaggeredItem key={hotel.id}>
                <RecommendationCard
                  hotel={hotel}
                  onFavoriteToggle={demoMode ? undefined : handleFavoriteToggle}
                  isFavorite={!demoMode && favorites.has(hotel.id)}
                />
              </StaggeredItem>
            ))}
          </ResponsiveGrid>
        </StaggeredContainer>
      )}

      {recommendations.length > 0 && (
        <div className="text-center mt-8">
          <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-shadow">
            もっと見る
          </button>
        </div>
      )}
    </section>
  );
};