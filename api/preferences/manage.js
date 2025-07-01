import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const { method } = req;
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: '認証が必要です' });
  }

  try {
    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: '認証エラー' });
    }

    switch (method) {
      case 'GET':
        return getPreferences(user.id, res);
      case 'POST':
        return createPreference(user.id, req.body, res);
      case 'PUT':
        return updatePreference(user.id, req.body, res);
      case 'DELETE':
        return deletePreference(user.id, req.query.id, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Preference error:', error);
    return res.status(500).json({ error: 'システムエラー' });
  }
}

// Get user preferences
async function getPreferences(userId, res) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select(`
      *,
      hotels (
        id,
        name,
        city,
        prefecture
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'データ取得エラー' });
  }

  return res.status(200).json({
    success: true,
    preferences: data || []
  });
}

// Create new preference
async function createPreference(userId, preference, res) {
  // Validate input
  if (!preference.area_name && !preference.hotel_id) {
    return res.status(400).json({ 
      error: 'エリアまたはホテルを指定してください' 
    });
  }

  // Check existing preferences limit (max 10 per user)
  const { count } = await supabase
    .from('user_preferences')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  if (count >= 10) {
    return res.status(400).json({ 
      error: '登録できる条件は最大10件までです' 
    });
  }

  // Create preference
  const newPreference = {
    user_id: userId,
    hotel_id: preference.hotel_id || null,
    area_name: preference.area_name || null,
    min_price: preference.min_price || null,
    max_price: preference.max_price || null,
    checkin_date: preference.checkin_date || null,
    checkout_date: preference.checkout_date || null,
    flexibility_days: preference.flexibility_days || 0,
    notify_last_minute: preference.notify_last_minute !== false,
    notify_price_drop: preference.notify_price_drop !== false,
    notify_new_availability: preference.notify_new_availability !== false,
    is_active: true
  };

  const { data, error } = await supabase
    .from('user_preferences')
    .insert(newPreference)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: '登録エラー' });
  }

  // Start matching for this preference
  await startMatching(data);

  return res.status(201).json({
    success: true,
    preference: data,
    message: '希望条件を登録しました'
  });
}

// Update preference
async function updatePreference(userId, updates, res) {
  if (!updates.id) {
    return res.status(400).json({ error: 'IDが必要です' });
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', updates.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: '更新エラー' });
  }

  return res.status(200).json({
    success: true,
    preference: data,
    message: '希望条件を更新しました'
  });
}

// Delete preference
async function deletePreference(userId, preferenceId, res) {
  if (!preferenceId) {
    return res.status(400).json({ error: 'IDが必要です' });
  }

  const { error } = await supabase
    .from('user_preferences')
    .update({ is_active: false })
    .eq('id', preferenceId)
    .eq('user_id', userId);

  if (error) {
    return res.status(500).json({ error: '削除エラー' });
  }

  return res.status(200).json({
    success: true,
    message: '希望条件を削除しました'
  });
}

// Start matching process for a preference
async function startMatching(preference) {
  try {
    // Find matching hotels
    let query = supabase
      .from('room_inventory')
      .select(`
        *,
        hotels!inner (
          id,
          name,
          city,
          prefecture,
          address
        )
      `)
      .gt('available_rooms', 0);

    // Date range filter
    if (preference.checkin_date) {
      const startDate = new Date(preference.checkin_date);
      const endDate = preference.checkout_date ? new Date(preference.checkout_date) : new Date(startDate);
      
      // Add flexibility
      if (preference.flexibility_days > 0) {
        startDate.setDate(startDate.getDate() - preference.flexibility_days);
        endDate.setDate(endDate.getDate() + preference.flexibility_days);
      }

      query = query
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);
    } else {
      // Default to next 30 days
      const today = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

      query = query
        .gte('date', today.toISOString().split('T')[0])
        .lte('date', thirtyDaysLater.toISOString().split('T')[0]);
    }

    // Price filter
    if (preference.min_price) {
      query = query.gte('price', preference.min_price);
    }
    if (preference.max_price) {
      query = query.lte('price', preference.max_price);
    }

    // Hotel/Area filter
    if (preference.hotel_id) {
      query = query.eq('hotel_id', preference.hotel_id);
    } else if (preference.area_name) {
      // This requires a join, so we'll filter in memory
    }

    const { data: matches, error } = await query;

    if (error) {
      console.error('Matching error:', error);
      return;
    }

    // Filter by area if specified
    let filteredMatches = matches || [];
    if (preference.area_name && !preference.hotel_id) {
      filteredMatches = filteredMatches.filter(match => 
        match.hotels.city === preference.area_name || 
        match.hotels.prefecture === preference.area_name
      );
    }

    // If matches found, create notification
    if (filteredMatches.length > 0) {
      const bestMatch = filteredMatches.sort((a, b) => a.price - b.price)[0];
      
      await supabase
        .from('preference_matches')
        .insert({
          preference_id: preference.id,
          user_id: preference.user_id,
          hotel_id: bestMatch.hotel_id,
          room_inventory_id: bestMatch.id,
          match_date: bestMatch.date,
          match_price: bestMatch.price,
          match_score: calculateMatchScore(preference, bestMatch),
          created_at: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Matching process error:', error);
  }
}

// Calculate match score
function calculateMatchScore(preference, match) {
  let score = 100;

  // Price match
  if (preference.min_price && match.price < preference.min_price) {
    score -= 20;
  }
  if (preference.max_price && match.price > preference.max_price) {
    score -= 20;
  }

  // Date flexibility
  if (preference.checkin_date) {
    const prefDate = new Date(preference.checkin_date);
    const matchDate = new Date(match.date);
    const daysDiff = Math.abs(matchDate - prefDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= preference.flexibility_days) {
      score += 10;
    } else {
      score -= daysDiff * 2;
    }
  }

  // Last minute bonus
  const daysUntilCheckIn = Math.floor((new Date(match.date) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysUntilCheckIn <= 3) {
    score += 15;
  } else if (daysUntilCheckIn <= 7) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}