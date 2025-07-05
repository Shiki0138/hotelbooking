import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '../middleware/auth';
import SegmentAnalysisService from '../../services/SegmentAnalysisService';
import { segmentController } from '../controllers/segmentController';

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

// POST /api/segments - ユーザーセグメント登録・更新
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      lifestyle_segment,
      travel_purposes,
      preferred_amenities,
      price_sensitivity,
      booking_lead_time_days,
      typical_stay_duration,
      has_children,
      children_ages,
      mobility_needs,
      pet_friendly_required
    } = req.body;

    // 既存のセグメントを確認
    const { data: existingSegment } = await supabase
      .from('user_segments')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existingSegment) {
      // 更新
      result = await supabase
        .from('user_segments')
        .update({
          lifestyle_segment,
          travel_purposes: travel_purposes || [],
          preferred_amenities: preferred_amenities || [],
          price_sensitivity: price_sensitivity || 'medium',
          booking_lead_time_days,
          typical_stay_duration,
          has_children: has_children || false,
          children_ages: children_ages || [],
          mobility_needs: mobility_needs || false,
          pet_friendly_required: pet_friendly_required || false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      // 新規作成
      result = await supabase
        .from('user_segments')
        .insert({
          user_id: userId,
          lifestyle_segment,
          travel_purposes: travel_purposes || [],
          preferred_amenities: preferred_amenities || [],
          price_sensitivity: price_sensitivity || 'medium',
          booking_lead_time_days,
          typical_stay_duration,
          has_children: has_children || false,
          children_ages: children_ages || [],
          mobility_needs: mobility_needs || false,
          pet_friendly_required: pet_friendly_required || false
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error saving user segment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save user segment'
    });
  }
});

// GET /api/segments/recommendations - セグメント別おすすめホテル取得
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { limit = 10, offset = 0, purpose } = req.query;

    // ユーザーのセグメント情報を取得
    const { data: userSegment, error: segmentError } = await supabase
      .from('user_segments')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (segmentError || !userSegment) {
      // セグメントが未設定の場合は自動判定を試みる
      const segmentService = new SegmentAnalysisService(supabase);
      const autoSegment = await segmentService.analyzeUserProfile(userId);
      
      if (!autoSegment) {
        return res.status(404).json({
          success: false,
          error: 'User segment not found. Please set your preferences first.'
        });
      }
      
      // 自動判定したセグメントを保存
      await supabase
        .from('user_segments')
        .insert({
          user_id: userId,
          ...autoSegment
        });
    }

    const segment = userSegment || await segmentService.analyzeUserProfile(userId);

    // セグメントに基づくレコメンデーション取得
    let query = supabase
      .from('segment_recommendations')
      .select(`
        *,
        hotels!inner (
          id,
          name,
          description,
          image_url,
          city,
          country,
          star_rating,
          user_rating,
          amenities,
          rooms!inner (
            id,
            type,
            base_price,
            capacity,
            amenities
          )
        )
      `)
      .eq('segment', segment.lifestyle_segment)
      .order('relevance_score', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    // 旅行目的でフィルタリング
    if (purpose && segment.travel_purposes.includes(purpose as string)) {
      query = query.contains('valid_for_purposes', [purpose]);
    }

    const { data: recommendations, error: recError } = await query;

    if (recError) throw recError;

    // パーソナライズスコアを計算
    const personalizedRecommendations = recommendations.map(rec => {
      const segmentService = new SegmentAnalysisService(supabase);
      const personalScore = segmentService.calculatePersonalizationScore(
        rec,
        segment,
        purpose as string
      );

      return {
        ...rec,
        personalization_score: personalScore,
        is_personalized: personalScore > 70
      };
    });

    // パーソナライズスコアで再ソート
    personalizedRecommendations.sort((a, b) => 
      b.personalization_score - a.personalization_score
    );

    res.json({
      success: true,
      data: {
        recommendations: personalizedRecommendations,
        user_segment: segment,
        total: personalizedRecommendations.length
      }
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch personalized recommendations'
    });
  }
});

// GET /api/segments/profile - ユーザーのセグメント情報取得
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    const { data: segment, error } = await supabase
      .from('user_segments')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({
      success: true,
      data: segment || null
    });
  } catch (error) {
    console.error('Error fetching user segment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user segment'
    });
  }
});

// POST /api/segments/analyze - プロフィールからセグメント自動判定
router.post('/analyze', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const segmentService = new SegmentAnalysisService(supabase);
    
    const analyzedSegment = await segmentService.analyzeUserProfile(userId);
    
    if (!analyzedSegment) {
      return res.status(400).json({
        success: false,
        error: 'Unable to analyze user profile'
      });
    }

    res.json({
      success: true,
      data: analyzedSegment
    });
  } catch (error) {
    console.error('Error analyzing user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze user profile'
    });
  }
});

// 新しいエンドポイント：セグメント情報取得（デモ対応）
router.get('/info', segmentController.getSegmentInfo);

// 新しいエンドポイント：パーソナライズドレコメンデーション（デモ対応）
router.get('/personalized', (req, res, next) => {
  if (req.query.demo === 'true') {
    next();
  } else {
    authenticate(req, res, next);
  }
}, segmentController.getPersonalizedRecommendations);

export default router;