import { Request, Response } from 'express';
import SegmentAnalysisService from '../../services/SegmentAnalysisService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const segmentService = new SegmentAnalysisService(supabase);

export const segmentController = {
  // ユーザーセグメントの取得または生成
  async getUserSegment(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { demo, segmentType } = req.query;

      // デモモードの場合
      if (demo === 'true' && segmentType) {
        const demoSegment = segmentService.generateDemoSegment(segmentType as string);
        if (!demoSegment) {
          return res.status(400).json({ error: 'Invalid segment type' });
        }
        return res.json({ segment: demoSegment, isDemo: true });
      }

      // 通常モード
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const segment = await segmentService.analyzeUserProfile(userId);
      res.json({ segment, isDemo: false });
    } catch (error) {
      console.error('Error getting user segment:', error);
      res.status(500).json({ error: 'Failed to get user segment' });
    }
  },

  // セグメントの保存/更新
  async saveUserSegment(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const segmentData = req.body;
      
      // Supabaseのuser_profilesテーブルに保存
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          lifestyle_segment: segmentData.lifestyle_segment,
          travel_purposes: segmentData.travel_purposes,
          preferred_amenities: segmentData.preferred_amenities,
          price_sensitivity: segmentData.price_sensitivity,
          has_children: segmentData.has_children,
          children_ages: segmentData.children_ages,
          mobility_needs: segmentData.mobility_needs,
          pet_friendly_required: segmentData.pet_friendly_required,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({ success: true, segment: data });
    } catch (error) {
      console.error('Error saving user segment:', error);
      res.status(500).json({ error: 'Failed to save user segment' });
    }
  },

  // パーソナライズされたレコメンデーションの取得
  async getPersonalizedRecommendations(req: Request, res: Response) {
    try {
      const { 
        segmentType, 
        travelPurpose = 'leisure',
        location,
        checkIn,
        checkOut,
        demo = 'false'
      } = req.query;

      // デモモード用のセグメント生成
      let userSegment;
      if (demo === 'true' && segmentType) {
        userSegment = segmentService.generateDemoSegment(segmentType as string);
      } else if (req.user?.id) {
        userSegment = await segmentService.analyzeUserProfile(req.user.id);
      }

      if (!userSegment) {
        return res.status(400).json({ error: 'User segment not found' });
      }

      // ホテルデータを取得（デモ用の仮データ）
      const hotels = await getHotelsData(location as string, checkIn as string, checkOut as string);

      // 各ホテルのパーソナライゼーションスコアを計算
      const personalizedHotels = hotels.map(hotel => {
        const result = segmentService.calculatePersonalizationScore(
          hotel, 
          userSegment, 
          travelPurpose as string
        );
        
        return {
          ...hotel,
          personalization_score: result.score,
          reason_tags: segmentService.generateReasonTags(result.reasons, 'ja'),
          is_personalized: result.is_personalized
        };
      });

      // スコアの高い順にソート
      personalizedHotels.sort((a, b) => b.personalization_score - a.personalization_score);

      res.json({
        hotels: personalizedHotels.slice(0, 20), // 上位20件
        segment: userSegment,
        travelPurpose
      });
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      res.status(500).json({ error: 'Failed to get recommendations' });
    }
  },

  // セグメント情報の取得
  async getSegmentInfo(req: Request, res: Response) {
    try {
      const segments = Object.entries(segmentService.SEGMENTS).map(([key, value]) => ({
        id: key,
        ...value
      }));

      const purposes = Object.keys(segmentService.PURPOSE_SCORES);

      res.json({
        segments,
        purposes
      });
    } catch (error) {
      console.error('Error getting segment info:', error);
      res.status(500).json({ error: 'Failed to get segment info' });
    }
  }
};

// デモ用のホテルデータ取得関数
async function getHotelsData(location?: string, checkIn?: string, checkOut?: string) {
  // デモ用の仮データ
  return [
    {
      id: '1',
      name: 'ファミリーリゾートホテル東京',
      city: '東京',
      country: '日本',
      star_rating: 4,
      user_rating: 4.5,
      image_url: '/images/hotel1.jpg',
      amenities: ['kids_pool', 'playground', 'family_rooms', 'restaurant', 'wifi', 'parking'],
      rooms: [{
        id: 'r1',
        name: 'ファミリールーム',
        capacity: 4,
        base_price: 15000
      }]
    },
    {
      id: '2',
      name: 'ビジネスホテル品川',
      city: '東京',
      country: '日本',
      star_rating: 3,
      user_rating: 4.2,
      image_url: '/images/hotel2.jpg',
      amenities: ['business_center', 'high_speed_wifi', 'work_desk', 'laundry', 'restaurant'],
      rooms: [{
        id: 'r2',
        name: 'シングルルーム',
        capacity: 1,
        base_price: 8000
      }]
    },
    {
      id: '3',
      name: 'ラグジュアリー温泉旅館',
      city: '箱根',
      country: '日本',
      star_rating: 5,
      user_rating: 4.8,
      image_url: '/images/hotel3.jpg',
      amenities: ['onsen', 'spa', 'restaurant', 'view_room', 'romantic_dinner'],
      rooms: [{
        id: 'r3',
        name: 'デラックスツイン',
        capacity: 2,
        base_price: 35000
      }]
    },
    {
      id: '4',
      name: 'ペットフレンドリーホテル',
      city: '横浜',
      country: '日本',
      star_rating: 4,
      user_rating: 4.3,
      image_url: '/images/hotel4.jpg',
      amenities: ['pet_friendly', 'parking', 'restaurant', 'wifi'],
      rooms: [{
        id: 'r4',
        name: 'ペット可ルーム',
        capacity: 2,
        base_price: 12000
      }]
    },
    {
      id: '5',
      name: 'シニア向けバリアフリーホテル',
      city: '京都',
      country: '日本',
      star_rating: 4,
      user_rating: 4.6,
      image_url: '/images/hotel5.jpg',
      amenities: ['wheelchair_accessible', 'elevator', 'onsen', 'spa', 'restaurant'],
      rooms: [{
        id: 'r5',
        name: 'バリアフリールーム',
        capacity: 2,
        base_price: 18000
      }]
    }
  ];
}