-- 日本の高級ホテルのサンプルデータ
-- 実際の楽天APIデータで置き換え可能

-- まず既存のデータをクリア（オプション）
-- TRUNCATE hotels CASCADE;

-- 東京の高級ホテル
INSERT INTO hotels (
    name, description, address, city, state, country, 
    latitude, longitude, star_rating, total_rooms,
    check_in_time, check_out_time, amenities, images,
    is_active
) VALUES 
(
    'ザ・リッツ・カールトン東京',
    '東京ミッドタウンに位置する最高級ホテル。53階からの眺望と世界クラスのサービス。',
    '東京都港区赤坂9-7-1',
    '東京',
    '東京都',
    '日本',
    35.6658, 139.7301,
    5.0, 248,
    '15:00', '12:00',
    '["無料Wi-Fi", "スパ", "フィットネスセンター", "レストラン", "バー", "コンシェルジュ", "ルームサービス", "駐車場"]'::jsonb,
    '["https://images.unsplash.com/photo-1566073771259-6a8506099945", "https://images.unsplash.com/photo-1582719508461-905c673771fd"]'::jsonb,
    true
),
(
    'パークハイアット東京',
    '新宿の高層ビル最上階に位置する洗練されたホテル。映画「ロスト・イン・トランスレーション」の舞台。',
    '東京都新宿区西新宿3-7-1-2',
    '東京',
    '東京都',
    '日本',
    35.6851, 139.6907,
    5.0, 177,
    '15:00', '12:00',
    '["無料Wi-Fi", "スパ", "プール", "フィットネスセンター", "レストラン", "バー", "図書室"]'::jsonb,
    '["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa", "https://images.unsplash.com/photo-1564501049412-61c2a3083791"]'::jsonb,
    true
),
(
    'マンダリンオリエンタル東京',
    '日本橋の歴史的エリアに位置する超高級ホテル。ミシュラン星付きレストランを複数併設。',
    '東京都中央区日本橋室町2-1-1',
    '東京',
    '東京都',
    '日本',
    35.6870, 139.7732,
    5.0, 178,
    '15:00', '12:00',
    '["無料Wi-Fi", "スパ", "フィットネスセンター", "ミシュラン星レストラン", "バー", "茶室"]'::jsonb,
    '["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4", "https://images.unsplash.com/photo-1571896349842-33c89424de2d"]'::jsonb,
    true
);

-- 大阪の高級ホテル
INSERT INTO hotels (
    name, description, address, city, state, country,
    latitude, longitude, star_rating, total_rooms,
    check_in_time, check_out_time, amenities, images,
    is_active
) VALUES
(
    'ザ・リッツ・カールトン大阪',
    '梅田の中心に位置する最高級ホテル。英国貴族の邸宅をイメージした内装。',
    '大阪府大阪市北区梅田2-5-25',
    '大阪',
    '大阪府',
    '日本',
    34.7002, 135.4937,
    5.0, 291,
    '15:00', '12:00',
    '["無料Wi-Fi", "スパ", "フィットネスセンター", "レストラン", "バー", "クラブラウンジ"]'::jsonb,
    '["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb", "https://images.unsplash.com/photo-1615460549969-36fa19521a04"]'::jsonb,
    true
),
(
    'セントレジスホテル大阪',
    '本町の新しいランドマーク。日本の美意識と最新の設備が融合。',
    '大阪府大阪市中央区本町3-6-12',
    '大阪',
    '大阪府',
    '日本',
    34.6831, 135.4998,
    5.0, 160,
    '15:00', '12:00',
    '["無料Wi-Fi", "スパ", "フィットネスセンター", "鉄板焼きレストラン", "バー", "バトラーサービス"]'::jsonb,
    '["https://images.unsplash.com/photo-1625244724120-1fd1d34d00f6", "https://images.unsplash.com/photo-1611892440504-42a792e24d32"]'::jsonb,
    true
);

-- 京都の高級ホテル
INSERT INTO hotels (
    name, description, address, city, state, country,
    latitude, longitude, star_rating, total_rooms,
    check_in_time, check_out_time, amenities, images,
    is_active
) VALUES
(
    'フォーシーズンズホテル京都',
    '東山の静かな池庭に囲まれた隠れ家的高級ホテル。日本の伝統美を体現。',
    '京都府京都市東山区妙法院前側町445-3',
    '京都',
    '京都府',
    '日本',
    34.9884, 135.7721,
    5.0, 123,
    '15:00', '12:00',
    '["無料Wi-Fi", "スパ", "日本庭園", "茶室", "レストラン", "バー", "コンシェルジュ"]'::jsonb,
    '["https://images.unsplash.com/photo-1578662996442-48f60103fc96", "https://images.unsplash.com/photo-1598548097316-8ba88a6b8c8f"]'::jsonb,
    true
),
(
    'ザ・リッツ・カールトン京都',
    '鴨川沿いに位置し、東山三十六峰を望む絶好のロケーション。',
    '京都府京都市中京区鴨川二条大橋畔',
    '京都',
    '京都府',
    '日本',
    35.0156, 135.7755,
    5.0, 134,
    '15:00', '12:00',
    '["無料Wi-Fi", "スパ", "フィットネスセンター", "レストラン", "バー", "アート展示"]'::jsonb,
    '["https://images.unsplash.com/photo-1545158535-c3f7168c28b6", "https://images.unsplash.com/photo-1600011689032-8b628b8a8747"]'::jsonb,
    true
);

-- ホテルの部屋データを追加
INSERT INTO rooms (
    hotel_id, name, description, room_type, capacity,
    price, amenities, images, is_available
)
SELECT 
    h.id,
    'デラックスルーム',
    '広々とした客室からは都市の景観を一望。高級アメニティ完備。',
    'DELUXE',
    2,
    45000, -- 通常価格
    '["キングサイズベッド", "バスタブ", "ミニバー", "セーフティボックス", "バスローブ"]'::jsonb,
    '["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b"]'::jsonb,
    true
FROM hotels h
WHERE h.name LIKE '%リッツ・カールトン%';

-- 割引価格のある部屋
INSERT INTO rooms (
    hotel_id, name, description, room_type, capacity,
    price, original_price, discount_percentage, amenities, images, is_available
)
SELECT 
    h.id,
    'エグゼクティブスイート【直前割引】',
    '直前予約特別価格！通常より30%OFF。リビングルーム付きの豪華スイート。',
    'SUITE',
    2,
    70000, -- 割引価格
    100000, -- 通常価格
    30, -- 割引率
    '["リビングルーム", "キングサイズベッド", "ジャグジー", "ミニバー", "バトラーサービス"]'::jsonb,
    '["https://images.unsplash.com/photo-1591088398332-8a7791972843"]'::jsonb,
    true
FROM hotels h
WHERE h.name LIKE '%パークハイアット%';

-- プロモーション情報
INSERT INTO hotel_promotions (hotel_id, title, description, discount_percentage, valid_from, valid_until)
SELECT 
    h.id,
    '直前予約特別割引',
    '3日以内のご宿泊で最大30%OFF！',
    30,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days'
FROM hotels h;

-- 空室状況（今後7日間）
INSERT INTO room_availability (room_id, date, available_count, price)
SELECT 
    r.id,
    CURRENT_DATE + generate_series(0, 6),
    CASE 
        WHEN random() > 0.7 THEN 1  -- 30%の確率で残り1室
        WHEN random() > 0.4 THEN 2  -- 30%の確率で残り2室
        ELSE 3                      -- 40%の確率で残り3室
    END,
    r.price * CASE 
        WHEN generate_series(0, 6) < 3 THEN 0.7  -- 3日以内は30%割引
        ELSE 1
    END
FROM rooms r;