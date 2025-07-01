import { getSupabaseClient, executeQuery } from '../_lib/supabase.js';
import { getCircuitBreaker, errorResponse, retryWithBackoff, rateLimit } from '../_middleware.js';

// Search hotels with error handling and circuit breaker
async function searchHotels(params) {
  const circuitBreaker = getCircuitBreaker('hotel-search');
  
  return circuitBreaker.execute(async () => {
    const client = getSupabaseClient();
    
    let query = client
      .from('hotels')
      .select(`
        id,
        name,
        description,
        address,
        city,
        country,
        price_per_night,
        rating,
        amenities,
        images,
        available_rooms,
        created_at
      `);

    // Apply filters
    if (params.city) {
      query = query.ilike('city', `%${params.city}%`);
    }
    
    if (params.minPrice) {
      query = query.gte('price_per_night', params.minPrice);
    }
    
    if (params.maxPrice) {
      query = query.lte('price_per_night', params.maxPrice);
    }
    
    if (params.minRating) {
      query = query.gte('rating', params.minRating);
    }
    
    // Pagination
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 20;
    const offset = (page - 1) * limit;
    
    query = query
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      hotels: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    };
  });
}

// API handler with rate limiting
const handler = async (req, res) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json(errorResponse(new Error('Method not allowed'), 405));
  }

  try {
    // Parse query parameters
    const params = {
      city: req.query.city,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      minRating: req.query.minRating ? parseFloat(req.query.minRating) : undefined,
      page: req.query.page,
      limit: req.query.limit
    };

    // Search with retry logic
    const results = await retryWithBackoff(
      () => searchHotels(params),
      3,
      1000
    );

    // Cache headers for CDN
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    
    return res.status(200).json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Hotel search error:', error);
    
    const statusCode = error.message.includes('Circuit breaker') ? 503 : 500;
    return res.status(statusCode).json(errorResponse(error, statusCode));
  }
};

// Apply rate limiting
export default rateLimit(60000, 100)(handler);