-- Sample data for LastMinuteStay
-- Worker3: Emergency 24H Release

-- Sample hotels in Tokyo
INSERT INTO hotels (id, name, name_en, location, prefecture, address, latitude, longitude, description, star_rating, amenities, images) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'ザ・リッツ・カールトン東京', 'The Ritz-Carlton Tokyo', '東京都港区', '東京都', '東京都港区赤坂9-7-1', 35.6654, 139.7307, '六本木の中心に位置する最高級ホテル', 5, 
'["スパ", "フィットネス", "レストラン", "バー", "コンシェルジュ", "WiFi無料"]'::jsonb,
'["https://images.unsplash.com/photo-1566073771259-6a8506099945", "https://images.unsplash.com/photo-1582719508461-905c673771fd"]'::jsonb),

('550e8400-e29b-41d4-a716-446655440002', 'マンダリン オリエンタル 東京', 'Mandarin Oriental Tokyo', '東京都中央区', '東京都', '東京都中央区日本橋室町2-1-1', 35.6870, 139.7726, '日本橋の高層階に位置するラグジュアリーホテル', 5,
'["スパ", "プール", "ミシュラン星付きレストラン", "バー", "WiFi無料"]'::jsonb,
'["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa", "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9"]'::jsonb),

('550e8400-e29b-41d4-a716-446655440003', 'パーク ハイアット 東京', 'Park Hyatt Tokyo', '東京都新宿区', '東京都', '東京都新宿区西新宿3-7-1-2', 35.6859, 139.6907, '新宿の高層ビル最上階のホテル', 5,
'["ジム", "スパ", "展望レストラン", "プール", "WiFi無料"]'::jsonb,
'["https://images.unsplash.com/photo-1445019980597-93fa8acb246c", "https://images.unsplash.com/photo-1584132967334-10e028bd69f7"]'::jsonb);

-- Sample rooms for each hotel
INSERT INTO rooms (id, hotel_id, room_type, room_name, capacity, base_price, description, amenities) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'deluxe', 'デラックスルーム', 2, 120000, '東京タワービューの広々としたお部屋', '["キングベッド", "バスタブ", "ミニバー", "セーフティボックス"]'::jsonb),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'suite', 'エグゼクティブスイート', 4, 250000, '富士山と東京の景色を一望できるスイート', '["リビングルーム", "キッチネット", "バスタブ", "シャワーブース"]'::jsonb),

('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'deluxe', 'デラックスシティルーム', 2, 98000, '日本橋の街並みを見渡せるお部屋', '["キングベッド", "バスタブ", "ワークデスク", "高速WiFi"]'::jsonb),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'suite', 'マンダリンスイート', 4, 280000, '最上階の豪華なスイートルーム', '["パノラマビュー", "ダイニングエリア", "バトラーサービス"]'::jsonb),

('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003', 'deluxe', 'パークデラックスルーム', 2, 85000, '新宿御苑を望む静かなお部屋', '["キングベッド", "デスク", "バスタブ", "ネスプレッソマシン"]'::jsonb),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440003', 'suite', 'パークスイート', 3, 180000, '広々としたリビングスペース付きスイート', '["独立したベッドルーム", "リビングルーム", "ダイニングエリア"]'::jsonb);

-- Sample availability for next 30 days with discounts
DO $$
DECLARE
    room_record RECORD;
    date_counter DATE;
    discount INT;
    available INT;
    discounted_price DECIMAL(10,2);
BEGIN
    FOR room_record IN SELECT id, base_price FROM rooms LOOP
        FOR i IN 0..29 LOOP
            date_counter := CURRENT_DATE + i;
            -- Random discount between 30-70%
            discount := 30 + floor(random() * 40)::int;
            -- Random availability 0-3 rooms
            available := floor(random() * 4)::int;
            -- Calculate discounted price
            discounted_price := room_record.base_price * (1 - discount::decimal / 100);
            
            INSERT INTO room_availability (room_id, date, available_count, price, discount_percentage)
            VALUES (room_record.id, date_counter, available, discounted_price, discount);
        END LOOP;
    END LOOP;
END $$;