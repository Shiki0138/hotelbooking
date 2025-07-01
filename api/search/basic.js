import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    city,
    prefecture,
    checkIn,
    checkOut,
    minPrice,
    maxPrice,
    page = 1,
    limit = 20
  } = req.query;

  // Validate dates
  if (!checkIn || !checkOut) {
    return res.status(400).json({ 
      error: 'チェックイン日とチェックアウト日を指定してください' 
    });
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (checkInDate >= checkOutDate) {
    return res.status(400).json({ 
      error: '日付の指定が正しくありません' 
    });
  }

  try {
    // Build query
    let query = supabase
      .from('hotels')
      .select(`
        id,
        name,
        name_en,
        address,
        city,
        prefecture,
        stars,
        description,
        base_price,
        room_inventory!inner (
          date,
          available_rooms,
          price
        )
      `)
      .eq('room_inventory.date', checkIn)
      .gt('room_inventory.available_rooms', 0);

    // Apply filters
    if (city) {
      query = query.eq('city', city);
    }

    if (prefecture) {
      query = query.eq('prefecture', prefecture);
    }

    if (minPrice) {
      query = query.gte('room_inventory.price', minPrice);
    }

    if (maxPrice) {
      query = query.lte('room_inventory.price', maxPrice);
    }

    // Order by price
    query = query.order('room_inventory.price', { ascending: true });

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    // Execute query
    const { data: hotels, error, count } = await query;

    if (error) {
      console.error('Search error:', error);
      return res.status(500).json({ 
        error: '検索中にエラーが発生しました' 
      });
    }

    // Format results
    const results = hotels.map(hotel => ({
      id: hotel.id,
      name: hotel.name,
      nameEn: hotel.name_en,
      address: hotel.address,
      city: hotel.city,
      prefecture: hotel.prefecture,
      stars: hotel.stars,
      description: hotel.description,
      price: hotel.room_inventory[0]?.price || hotel.base_price,
      availableRooms: hotel.room_inventory[0]?.available_rooms || 0
    }));

    // Save search history if user is authenticated
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        await supabase
          .from('search_history')
          .insert({
            user_id: user.id,
            search_params: {
              city,
              prefecture,
              checkIn,
              checkOut,
              minPrice,
              maxPrice
            },
            results_count: results.length
          });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        hotels: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit))
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ 
      error: 'システムエラーが発生しました' 
    });
  }
}