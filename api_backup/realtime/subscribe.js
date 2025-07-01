import { createClient } from '@supabase/supabase-js';

// Supabase Realtime subscription endpoint
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Service key for server-side operations
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, hotelIds, preferences } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'ユーザーIDが必要です' });
  }

  try {
    // Create or update realtime subscription preferences
    const subscriptionData = {
      user_id: userId,
      hotel_ids: hotelIds || [],
      areas: preferences?.areas || [],
      min_price: preferences?.minPrice,
      max_price: preferences?.maxPrice,
      notification_types: ['realtime', 'price_drop', 'new_availability'],
      is_active: true,
      created_at: new Date().toISOString()
    };

    // Store subscription preferences
    const { data, error } = await supabase
      .from('realtime_subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;

    // Return subscription configuration for client
    const config = {
      channel: `user_${userId}_notifications`,
      filters: {
        hotels: data.hotel_ids,
        areas: data.areas,
        priceRange: {
          min: data.min_price,
          max: data.max_price
        }
      },
      events: ['inventory_update', 'price_change', 'new_availability']
    };

    return res.status(200).json({
      success: true,
      subscription: config,
      message: 'リアルタイム通知の設定が完了しました'
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return res.status(500).json({
      error: 'サブスクリプションの設定に失敗しました'
    });
  }
}