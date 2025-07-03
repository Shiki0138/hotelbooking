/**
 * Supabase Client Service - リアルタイム監視システム用
 * Worker3実装継続: Boss引き継ぎ
 */

const { createClient } = require('@supabase/supabase-js');

// IPv6対応 Supavisor URL使用
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// 接続テスト関数
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('demo_users')
      .select('count(*)')
      .limit(1);

    if (error) throw error;

    console.log('✅ Supabase接続成功');
    return true;
  } catch (error) {
    console.error('❌ Supabase接続エラー:', error);
    return false;
  }
}

// RPC関数: 監視対象ホテル取得
const rpcs = {
  async get_hotels_to_monitor() {
    const { data, error } = await supabase
      .from('watchlist_extended')
      .select(`
        *,
        demo_users!inner(email, name)
      `)
      .eq('is_active', true)
      .gte('checkin_date', new Date().toISOString().split('T')[0]);

    if (error) {
      console.error('監視対象取得エラー:', error);
      return { data: [], error };
    }

    // データを整形
    const formatted = data.map(item => ({
      id: item.id,
      hotel_no: item.hotel_no,
      hotel_name: item.hotel_name || `Hotel ${item.hotel_no}`,
      checkin_date: item.checkin_date,
      checkout_date: item.checkout_date,
      adult_num: item.adult_num || 2,
      target_price: item.target_price,
      alert_conditions: item.alert_conditions || {
        price_drop: true,
        new_availability: true,
        price_drop_threshold: 1000,
        price_drop_percentage: 10
      },
      user_id: item.user_id,
      user_email: item.demo_users.email,
      user_name: item.demo_users.name,
      created_at: item.created_at,
    }));

    return { data: formatted, error: null };
  },

  async detect_price_change(params) {
    const {
      p_hotel_no,
      p_checkin_date,
      p_checkout_date,
      p_adult_num,
      p_current_price
    } = params;

    // 過去の価格を取得
    const { data: history } = await supabase
      .from('price_history_15min')
      .select('price, checked_at')
      .eq('hotel_no', p_hotel_no)
      .eq('checkin_date', p_checkin_date)
      .eq('checkout_date', p_checkout_date)
      .eq('adult_num', p_adult_num)
      .order('checked_at', { ascending: false })
      .limit(2);

    if (!history || history.length < 2) {
      return { data: [{ has_change: false }], error: null };
    }

    const previousPrice = history[1].price;
    const priceDifference = previousPrice - p_current_price;
    const changePercentage = Math.round((priceDifference / previousPrice) * 100);

    const result = {
      has_change: priceDifference !== 0,
      previous_price: previousPrice,
      current_price: p_current_price,
      price_difference: priceDifference,
      change_percentage: changePercentage,
      is_price_drop: priceDifference > 0,
      is_price_increase: priceDifference < 0,
    };

    return { data: [result], error: null };
  }
};

// RPC関数をsupabaseクライアントに追加
supabase.rpc = function(functionName, params = {}) {
  if (rpcs[functionName]) {
    return rpcs[functionName](params);
  }
  throw new Error(`RPC function ${functionName} not found`);
};

module.exports = supabase;
module.exports.testConnection = testConnection;