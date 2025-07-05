const { createClient } = require('@supabase/supabase-js');

class PreferenceMatchingService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * Match hotel data against all active user preferences
   */
  async matchHotelWithPreferences(hotelData) {
    try {
      // Get all active user preferences
      const { data: preferences, error } = await this.supabase
        .from('user_preferences')
        .select('*, user_profiles!inner(email)')
        .eq('auto_match_enabled', true);

      if (error) {
        console.error('[PreferenceMatching] Error fetching preferences:', error);
        return [];
      }

      const matches = [];

      // Check each preference against the hotel
      for (const preference of preferences) {
        const matchResult = this.calculateMatch(hotelData, preference);
        
        if (matchResult.score >= (preference.notification_settings?.match_threshold || 80)) {
          matches.push({
            userId: preference.user_id,
            userEmail: preference.user_profiles?.email,
            preferenceId: preference.id,
            hotelData,
            matchScore: matchResult.score,
            matchDetails: matchResult.details,
            preference
          });
        }
      }

      // Save match history
      if (matches.length > 0) {
        await this.saveMatchHistory(matches);
      }

      return matches;
    } catch (error) {
      console.error('[PreferenceMatching] Fatal error:', error);
      return [];
    }
  }

  /**
   * Calculate match score between hotel and preference
   */
  calculateMatch(hotel, preference) {
    const scores = {
      location: 0,
      price: 0,
      amenities: 0,
      roomType: 0
    };
    const weights = this.getWeights(preference.match_priority);
    
    // Location matching
    if (preference.preferred_locations?.length > 0) {
      const locationMatch = preference.preferred_locations.some(loc => 
        hotel.location?.toLowerCase().includes(loc.toLowerCase())
      );
      scores.location = locationMatch ? 100 : 0;
    } else if (preference.preferred_prefectures?.length > 0) {
      const prefectureMatch = preference.preferred_prefectures.some(pref => 
        hotel.prefecture?.toLowerCase() === pref.toLowerCase()
      );
      scores.location = prefectureMatch ? 100 : 0;
    } else {
      scores.location = 100; // No location preference = all locations match
    }

    // Price matching
    if (preference.budget_min || preference.budget_max) {
      const hotelPrice = hotel.price || hotel.currentPrice || 0;
      if (preference.budget_min && hotelPrice < preference.budget_min) {
        scores.price = 0;
      } else if (preference.budget_max && hotelPrice > preference.budget_max) {
        scores.price = 0;
      } else {
        // Calculate price score based on how well it fits within budget
        if (preference.budget_max) {
          const priceRatio = (preference.budget_max - hotelPrice) / preference.budget_max;
          scores.price = Math.min(100, priceRatio * 150); // Bonus for being under budget
        } else {
          scores.price = 100;
        }
      }
    } else {
      scores.price = 100; // No price preference
    }

    // Room type matching
    const preferredRoomTypes = preference.room_preferences?.types || [];
    if (preferredRoomTypes.length > 0 && hotel.roomType) {
      const roomTypeMatch = preferredRoomTypes.some(type => 
        hotel.roomType.toLowerCase().includes(type.toLowerCase())
      );
      scores.roomType = roomTypeMatch ? 100 : 50;
    } else {
      scores.roomType = 100;
    }

    // Amenities matching
    const preferredAmenities = preference.room_preferences?.amenities || [];
    if (preferredAmenities.length > 0 && hotel.amenities) {
      const matchedAmenities = preferredAmenities.filter(amenity =>
        hotel.amenities.some(ha => ha.toLowerCase().includes(amenity.toLowerCase()))
      );
      scores.amenities = (matchedAmenities.length / preferredAmenities.length) * 100;
    } else {
      scores.amenities = 100;
    }

    // Calculate weighted total score
    const totalScore = Math.round(
      (scores.location * weights.location +
       scores.price * weights.price +
       scores.amenities * weights.amenities +
       scores.roomType * weights.roomType) / 
      (weights.location + weights.price + weights.amenities + weights.roomType)
    );

    return {
      score: totalScore,
      details: scores
    };
  }

  /**
   * Get scoring weights based on priority
   */
  getWeights(priority) {
    const weights = {
      price: { location: 1, price: 3, amenities: 0.5, roomType: 0.5 },
      location: { location: 3, price: 1, amenities: 0.5, roomType: 0.5 },
      availability: { location: 1, price: 1, amenities: 1, roomType: 1 },
      balanced: { location: 1, price: 1, amenities: 1, roomType: 1 }
    };
    return weights[priority] || weights.balanced;
  }

  /**
   * Save match history
   */
  async saveMatchHistory(matches) {
    try {
      const matchRecords = matches.map(match => ({
        user_id: match.userId,
        preference_id: match.preferenceId,
        hotel_id: match.hotelData.hotelNo || match.hotelData.id,
        hotel_name: match.hotelData.hotelName || match.hotelData.name,
        match_score: match.matchScore,
        match_details: match.matchDetails,
        notification_sent: false
      }));

      const { error } = await this.supabase
        .from('preference_match_history')
        .insert(matchRecords);

      if (error) {
        console.error('[PreferenceMatching] Error saving match history:', error);
      }
    } catch (error) {
      console.error('[PreferenceMatching] Error in saveMatchHistory:', error);
    }
  }

  /**
   * Get user preferences by user ID
   */
  async getUserPreferences(userId) {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('[PreferenceMatching] Error fetching user preferences:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[PreferenceMatching] Error in getUserPreferences:', error);
      return null;
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId, preferences) {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('[PreferenceMatching] Error updating preferences:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('[PreferenceMatching] Error in updateUserPreferences:', error);
      return { success: false, error };
    }
  }

  /**
   * Get recent matches for a user
   */
  async getUserMatches(userId, limit = 20) {
    try {
      const { data, error } = await this.supabase
        .from('preference_match_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[PreferenceMatching] Error fetching user matches:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('[PreferenceMatching] Error in getUserMatches:', error);
      return [];
    }
  }

  /**
   * Mark match as viewed
   */
  async markMatchAsViewed(matchId, userId) {
    try {
      const { error } = await this.supabase
        .from('preference_match_history')
        .update({ user_viewed: true })
        .eq('id', matchId)
        .eq('user_id', userId);

      if (error) {
        console.error('[PreferenceMatching] Error marking match as viewed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[PreferenceMatching] Error in markMatchAsViewed:', error);
      return false;
    }
  }

  /**
   * Update match action
   */
  async updateMatchAction(matchId, userId, action) {
    try {
      const validActions = ['viewed', 'saved', 'booked', 'dismissed'];
      if (!validActions.includes(action)) {
        throw new Error(`Invalid action: ${action}`);
      }

      const { error } = await this.supabase
        .from('preference_match_history')
        .update({ user_action: action })
        .eq('id', matchId)
        .eq('user_id', userId);

      if (error) {
        console.error('[PreferenceMatching] Error updating match action:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[PreferenceMatching] Error in updateMatchAction:', error);
      return false;
    }
  }
}

module.exports = PreferenceMatchingService;