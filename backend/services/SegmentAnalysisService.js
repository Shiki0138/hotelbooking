class SegmentAnalysisService {
  constructor(supabase) {
    this.supabase = supabase;
    
    // セグメント定義
    this.SEGMENTS = {
      single: {
        name: 'ひとり旅',
        icon: '👤',
        characteristics: {
          room_capacity: [1],
          preferred_amenities: ['wifi', 'work_desk', 'gym', 'spa'],
          price_range: { min: 5000, max: 20000 }
        }
      },
      couple: {
        name: 'カップル',
        icon: '👫',
        characteristics: {
          room_capacity: [2],
          preferred_amenities: ['spa', 'restaurant', 'romantic_dinner', 'view_room'],
          price_range: { min: 10000, max: 40000 }
        }
      },
      family_young: {
        name: 'ファミリー（小さなお子様）',
        icon: '👨‍👩‍👧',
        characteristics: {
          room_capacity: [3, 4],
          preferred_amenities: ['kids_pool', 'playground', 'family_rooms', 'cribs', 'high_chairs'],
          price_range: { min: 8000, max: 25000 }
        }
      },
      family_teen: {
        name: 'ファミリー（ティーン）',
        icon: '👨‍👩‍👧‍👦',
        characteristics: {
          room_capacity: [3, 4, 5],
          preferred_amenities: ['pool', 'game_room', 'family_rooms', 'wifi'],
          price_range: { min: 10000, max: 30000 }
        }
      },
      senior_couple: {
        name: 'シニアカップル',
        icon: '👴👵',
        characteristics: {
          room_capacity: [2],
          preferred_amenities: ['onsen', 'spa', 'wheelchair_accessible', 'elevator', 'restaurant'],
          price_range: { min: 15000, max: 50000 }
        }
      },
      business: {
        name: 'ビジネス',
        icon: '💼',
        characteristics: {
          room_capacity: [1],
          preferred_amenities: ['business_center', 'meeting_rooms', 'high_speed_wifi', 'work_desk', 'laundry'],
          price_range: { min: 6000, max: 15000 }
        }
      },
      group: {
        name: 'グループ',
        icon: '👥',
        characteristics: {
          room_capacity: [4, 5, 6],
          preferred_amenities: ['large_rooms', 'connecting_rooms', 'group_dining', 'parking'],
          price_range: { min: 8000, max: 20000 }
        }
      }
    };
    
    // 旅行目的スコアリング
    this.PURPOSE_SCORES = {
      leisure: {
        single: 80,
        couple: 90,
        family_young: 85,
        family_teen: 85,
        senior_couple: 90,
        business: 30,
        group: 90
      },
      business: {
        single: 70,
        couple: 20,
        family_young: 10,
        family_teen: 10,
        senior_couple: 20,
        business: 100,
        group: 40
      },
      anniversary: {
        single: 30,
        couple: 100,
        family_young: 40,
        family_teen: 40,
        senior_couple: 95,
        business: 10,
        group: 50
      },
      weekend: {
        single: 70,
        couple: 85,
        family_young: 90,
        family_teen: 90,
        senior_couple: 80,
        business: 40,
        group: 85
      },
      workation: {
        single: 90,
        couple: 70,
        family_young: 30,
        family_teen: 40,
        senior_couple: 50,
        business: 80,
        group: 60
      }
    };
  }

  // プロフィール情報からライフスタイルセグメント自動判定
  async analyzeUserProfile(userId) {
    try {
      // ユーザーの予約履歴を取得
      const { data: bookings } = await this.supabase
        .from('bookings')
        .select(`
          *,
          rooms (
            capacity,
            type,
            amenities
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // ユーザーのお気に入りを取得
      const { data: favorites } = await this.supabase
        .from('favorites')
        .select(`
          hotels (
            amenities,
            star_rating
          )
        `)
        .eq('user_id', userId);

      // ユーザーの検索履歴を取得
      const { data: searches } = await this.supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('searched_at', { ascending: false })
        .limit(20);

      // セグメント判定ロジック
      const segment = this.determineLifestyleSegment(bookings, favorites, searches);
      const travelPurposes = this.analyzeTravelPurposes(bookings, searches);
      const preferences = this.analyzePreferences(bookings, favorites);

      return {
        lifestyle_segment: segment,
        travel_purposes: travelPurposes,
        preferred_amenities: preferences.amenities,
        price_sensitivity: preferences.priceSensitivity,
        booking_lead_time_days: preferences.avgLeadTime,
        typical_stay_duration: preferences.avgStayDuration,
        has_children: preferences.hasChildren,
        children_ages: preferences.childrenAges,
        mobility_needs: preferences.mobilityNeeds,
        pet_friendly_required: preferences.petFriendly
      };
    } catch (error) {
      console.error('Error analyzing user profile:', error);
      return null;
    }
  }

  determineLifestyleSegment(bookings, favorites, searches) {
    if (!bookings || bookings.length === 0) {
      return 'single'; // デフォルト
    }

    // 予約パターンから判定
    const roomCapacities = bookings.map(b => b.rooms?.capacity || 1);
    const avgCapacity = roomCapacities.reduce((a, b) => a + b, 0) / roomCapacities.length;
    
    // 家族向けアメニティの利用頻度
    const familyAmenities = ['kids_pool', 'playground', 'family_rooms', 'cribs', 'high_chairs'];
    const hasFamilyBookings = bookings.some(b => 
      b.rooms?.amenities?.some(a => familyAmenities.includes(a))
    );

    // ビジネス向けアメニティの利用頻度
    const businessAmenities = ['business_center', 'meeting_rooms', 'high_speed_wifi', 'work_desk'];
    const hasBusinessBookings = bookings.filter(b => 
      b.rooms?.amenities?.some(a => businessAmenities.includes(a))
    ).length > bookings.length * 0.3;

    // 年齢層の推定（検索パターンから）
    const seniorIndicators = searches?.some(s => 
      s.search_query?.toLowerCase().includes('バリアフリー') ||
      s.search_query?.toLowerCase().includes('温泉')
    );

    // セグメント判定
    if (hasFamilyBookings && avgCapacity >= 3) {
      const hasTeenIndicators = bookings.some(b => 
        b.rooms?.amenities?.includes('game_room') || 
        b.rooms?.capacity >= 4
      );
      return hasTeenIndicators ? 'family_teen' : 'family_young';
    } else if (hasBusinessBookings) {
      return 'business';
    } else if (seniorIndicators && avgCapacity <= 2) {
      return 'senior_couple';
    } else if (avgCapacity >= 2.5) {
      return 'group';
    } else if (avgCapacity >= 1.8) {
      return 'couple';
    } else {
      return 'single';
    }
  }

  analyzeTravelPurposes(bookings, searches) {
    const purposes = new Set();

    // 予約パターンから目的を推定
    if (bookings) {
      bookings.forEach(booking => {
        // 週末予約が多い
        const checkIn = new Date(booking.check_in_date);
        if (checkIn.getDay() === 5 || checkIn.getDay() === 6) {
          purposes.add('weekend');
        }

        // 長期滞在
        const nights = Math.ceil(
          (new Date(booking.check_out_date) - new Date(booking.check_in_date)) / 
          (1000 * 60 * 60 * 24)
        );
        if (nights >= 5) {
          purposes.add('workation');
        }
      });
    }

    // 検索パターンから目的を推定
    if (searches) {
      searches.forEach(search => {
        const query = search.search_query?.toLowerCase() || '';
        if (query.includes('記念日') || query.includes('anniversary')) {
          purposes.add('anniversary');
        }
        if (query.includes('出張') || query.includes('ビジネス')) {
          purposes.add('business');
        }
      });
    }

    // デフォルトでレジャーを追加
    purposes.add('leisure');

    return Array.from(purposes);
  }

  analyzePreferences(bookings, favorites) {
    const preferences = {
      amenities: [],
      priceSensitivity: 'medium',
      avgLeadTime: 14,
      avgStayDuration: 2,
      hasChildren: false,
      childrenAges: [],
      mobilityNeeds: false,
      petFriendly: false
    };

    if (!bookings || bookings.length === 0) {
      return preferences;
    }

    // よく利用するアメニティを集計
    const amenityCount = {};
    bookings.forEach(booking => {
      (booking.rooms?.amenities || []).forEach(amenity => {
        amenityCount[amenity] = (amenityCount[amenity] || 0) + 1;
      });
    });

    // お気に入りホテルのアメニティも考慮
    if (favorites) {
      favorites.forEach(fav => {
        (fav.hotels?.amenities || []).forEach(amenity => {
          amenityCount[amenity] = (amenityCount[amenity] || 0) + 0.5;
        });
      });
    }

    // 頻出アメニティを抽出
    preferences.amenities = Object.entries(amenityCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([amenity]) => amenity);

    // 価格感度の分析
    const prices = bookings.map(b => b.total_amount / b.nights).filter(p => p > 0);
    if (prices.length > 0) {
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      if (avgPrice < 8000) preferences.priceSensitivity = 'high';
      else if (avgPrice > 20000) preferences.priceSensitivity = 'low';
    }

    // 予約リードタイムの計算
    const leadTimes = bookings.map(b => {
      const bookingDate = new Date(b.created_at);
      const checkInDate = new Date(b.check_in_date);
      return Math.ceil((checkInDate - bookingDate) / (1000 * 60 * 60 * 24));
    }).filter(days => days > 0);

    if (leadTimes.length > 0) {
      preferences.avgLeadTime = Math.round(
        leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
      );
    }

    // 平均滞在日数
    const stayDurations = bookings.map(b => b.nights).filter(n => n > 0);
    if (stayDurations.length > 0) {
      preferences.avgStayDuration = Math.round(
        stayDurations.reduce((a, b) => a + b, 0) / stayDurations.length
      );
    }

    // 特別なニーズの検出
    preferences.hasChildren = amenityCount['kids_pool'] > 0 || 
                            amenityCount['playground'] > 0 ||
                            amenityCount['cribs'] > 0;
    
    preferences.mobilityNeeds = amenityCount['wheelchair_accessible'] > 0 ||
                               amenityCount['elevator'] > 0;
    
    preferences.petFriendly = amenityCount['pet_friendly'] > 0;

    return preferences;
  }

  // レコメンデーションとユーザーセグメントのマッチングスコア計算
  calculatePersonalizationScore(hotel, userSegment, currentPurpose) {
    let score = 50; // ベーススコア
    const reasons = [];

    // セグメント特性との一致度
    const segmentDef = this.SEGMENTS[userSegment.lifestyle_segment];
    if (segmentDef) {
      // 部屋収容人数の一致
      const roomCapacity = hotel.rooms?.[0]?.capacity || 2;
      if (segmentDef.characteristics.room_capacity.includes(roomCapacity)) {
        score += 15;
        reasons.push('room_capacity_match');
      }

      // 価格帯の一致
      const hotelPrice = hotel.rooms?.[0]?.base_price || hotel.price || 0;
      if (hotelPrice >= segmentDef.characteristics.price_range.min && 
          hotelPrice <= segmentDef.characteristics.price_range.max) {
        score += 20;
        reasons.push('price_range_match');
      }

      // 推奨アメニティとの一致
      const hotelAmenities = hotel.amenities || [];
      const matchingAmenities = segmentDef.characteristics.preferred_amenities.filter(amenity =>
        hotelAmenities.some(ha => ha.toLowerCase().includes(amenity.toLowerCase()))
      );
      score += matchingAmenities.length * 8;
      reasons.push(...matchingAmenities);
    }

    // 旅行目的との一致度
    if (currentPurpose && this.PURPOSE_SCORES[currentPurpose]) {
      const purposeScore = this.PURPOSE_SCORES[currentPurpose][userSegment.lifestyle_segment] || 50;
      score += (purposeScore / 100) * 25; // 最大25点
      if (purposeScore >= 80) {
        reasons.push(`${currentPurpose}_purpose_match`);
      }
    }

    // ユーザーの好みのアメニティとの一致
    if (userSegment.preferred_amenities && hotel.amenities) {
      const userAmenityMatches = userSegment.preferred_amenities.filter(amenity =>
        hotel.amenities.some(ha => ha.toLowerCase().includes(amenity.toLowerCase()))
      );
      score += userAmenityMatches.length * 5;
      reasons.push(...userAmenityMatches.map(a => `user_pref_${a}`));
    }

    // 特別なニーズへの対応
    if (userSegment.has_children && hotel.amenities) {
      const childFriendly = ['kids_pool', 'playground', 'family_rooms', 'cribs', 'high_chairs'];
      const hasChildAmenities = childFriendly.some(cf => 
        hotel.amenities.some(ha => ha.toLowerCase().includes(cf))
      );
      if (hasChildAmenities) {
        score += 25;
        reasons.push('child_friendly');
      }
    }

    if (userSegment.mobility_needs && hotel.amenities) {
      const hasAccessibility = hotel.amenities.some(a => 
        a.toLowerCase().includes('wheelchair') || a.toLowerCase().includes('elevator')
      );
      if (hasAccessibility) {
        score += 30;
        reasons.push('accessibility');
      }
    }

    if (userSegment.pet_friendly_required && hotel.amenities) {
      const isPetFriendly = hotel.amenities.some(a => a.toLowerCase().includes('pet'));
      if (isPetFriendly) {
        score += 35;
        reasons.push('pet_friendly');
      }
    }

    return {
      score: Math.min(score, 100),
      reasons: reasons,
      is_personalized: score >= 75
    };
  }

  // デモ用のセグメントデータ生成
  generateDemoSegment(segmentType) {
    const segment = this.SEGMENTS[segmentType];
    if (!segment) return null;

    return {
      lifestyle_segment: segmentType,
      travel_purposes: ['leisure', 'weekend'],
      preferred_amenities: segment.characteristics.preferred_amenities.slice(0, 3),
      price_sensitivity: 'medium',
      has_children: segmentType.includes('family'),
      children_ages: segmentType === 'family_young' ? [3, 5] : segmentType === 'family_teen' ? [13, 16] : [],
      mobility_needs: segmentType === 'senior_couple',
      pet_friendly_required: false,
      booking_lead_time_days: 14,
      typical_stay_duration: segmentType === 'business' ? 1 : 2
    };
  }

  // 理由タグの生成
  generateReasonTags(reasons, language = 'ja') {
    const tagMap = {
      ja: {
        room_capacity_match: '人数にぴったり',
        price_range_match: '予算に最適',
        wifi: 'Wi-Fi完備',
        spa: 'スパあり',
        onsen: '温泉',
        pool: 'プール',
        kids_pool: 'キッズプール',
        family_rooms: 'ファミリールーム',
        business_center: 'ビジネスセンター',
        work_desk: '作業デスク',
        child_friendly: 'お子様歓迎',
        accessibility: 'バリアフリー',
        pet_friendly: 'ペット可',
        leisure_purpose_match: 'レジャーに最適',
        business_purpose_match: 'ビジネスに最適',
        anniversary_purpose_match: '記念日に最適',
        weekend_purpose_match: '週末旅行に最適',
        workation_purpose_match: 'ワーケーションに最適'
      },
      en: {
        room_capacity_match: 'Perfect for group size',
        price_range_match: 'Within budget',
        wifi: 'Wi-Fi available',
        spa: 'Spa facilities',
        onsen: 'Hot springs',
        pool: 'Swimming pool',
        kids_pool: 'Kids pool',
        family_rooms: 'Family rooms',
        business_center: 'Business center',
        work_desk: 'Work desk',
        child_friendly: 'Child-friendly',
        accessibility: 'Accessible',
        pet_friendly: 'Pet-friendly',
        leisure_purpose_match: 'Great for leisure',
        business_purpose_match: 'Perfect for business',
        anniversary_purpose_match: 'Ideal for anniversaries',
        weekend_purpose_match: 'Perfect for weekends',
        workation_purpose_match: 'Great for workation'
      }
    };

    const tags = reasons.map(reason => {
      if (reason.startsWith('user_pref_')) {
        const amenity = reason.replace('user_pref_', '');
        return tagMap[language][amenity] || amenity;
      }
      return tagMap[language][reason] || reason;
    }).filter(tag => tag);

    // 最大5つのタグに制限
    return [...new Set(tags)].slice(0, 5);
  }
}

module.exports = SegmentAnalysisService;