-- 地域データの初期データ投入
-- 高級ホテル直前予約システム

-- 都道府県データ
INSERT INTO prefectures (name, name_en, region, latitude, longitude) VALUES
('東京都', 'Tokyo', '関東', 35.6762, 139.6503),
('神奈川県', 'Kanagawa', '関東', 35.4478, 139.6425),
('大阪府', 'Osaka', '関西', 34.6937, 135.5023),
('京都府', 'Kyoto', '関西', 35.0116, 135.7681),
('兵庫県', 'Hyogo', '関西', 34.6913, 135.1830),
('愛知県', 'Aichi', '中部', 35.1802, 136.9066),
('福岡県', 'Fukuoka', '九州', 33.6064, 130.4181),
('北海道', 'Hokkaido', '北海道', 43.2642, 142.8595),
('沖縄県', 'Okinawa', '沖縄', 26.2540, 127.8310),
('静岡県', 'Shizuoka', '中部', 34.9769, 138.3831)
ON CONFLICT (name) DO NOTHING;

-- 主要都市データ
INSERT INTO cities (prefecture_id, name, name_en, latitude, longitude, population, is_major_city) VALUES
-- 東京都
((SELECT id FROM prefectures WHERE name = '東京都'), '新宿区', 'Shinjuku', 35.6938, 139.7034, 333000, TRUE),
((SELECT id FROM prefectures WHERE name = '東京都'), '渋谷区', 'Shibuya', 35.6580, 139.7016, 230000, TRUE),
((SELECT id FROM prefectures WHERE name = '東京都'), '港区', 'Minato', 35.6581, 139.7414, 248000, TRUE),
((SELECT id FROM prefectures WHERE name = '東京都'), '千代田区', 'Chiyoda', 35.6939, 139.7531, 60000, TRUE),
((SELECT id FROM prefectures WHERE name = '東京都'), '中央区', 'Chuo', 35.6751, 139.7737, 170000, TRUE),
((SELECT id FROM prefectures WHERE name = '東京都'), '台東区', 'Taito', 35.7071, 139.7786, 200000, TRUE),

-- 神奈川県
((SELECT id FROM prefectures WHERE name = '神奈川県'), '横浜市', 'Yokohama', 35.4437, 139.6380, 3770000, TRUE),
((SELECT id FROM prefectures WHERE name = '神奈川県'), '川崎市', 'Kawasaki', 35.5308, 139.7029, 1530000, TRUE),
((SELECT id FROM prefectures WHERE name = '神奈川県'), '鎌倉市', 'Kamakura', 35.3193, 139.5469, 172000, TRUE),
((SELECT id FROM prefectures WHERE name = '神奈川県'), '箱根町', 'Hakone', 35.2329, 139.0241, 11000, TRUE),

-- 大阪府
((SELECT id FROM prefectures WHERE name = '大阪府'), '大阪市', 'Osaka', 34.6937, 135.5023, 2750000, TRUE),
((SELECT id FROM prefectures WHERE name = '大阪府'), '堺市', 'Sakai', 34.5732, 135.4827, 830000, TRUE),

-- 京都府
((SELECT id FROM prefectures WHERE name = '京都府'), '京都市', 'Kyoto', 35.0116, 135.7681, 1460000, TRUE),

-- 兵庫県
((SELECT id FROM prefectures WHERE name = '兵庫県'), '神戸市', 'Kobe', 34.6913, 135.1830, 1520000, TRUE),

-- 愛知県
((SELECT id FROM prefectures WHERE name = '愛知県'), '名古屋市', 'Nagoya', 35.1815, 136.9066, 2320000, TRUE),

-- 福岡県
((SELECT id FROM prefectures WHERE name = '福岡県'), '福岡市', 'Fukuoka', 33.5904, 130.4017, 1610000, TRUE),

-- 北海道
((SELECT id FROM prefectures WHERE name = '北海道'), '札幌市', 'Sapporo', 43.0642, 141.3469, 1970000, TRUE),

-- 沖縄県
((SELECT id FROM prefectures WHERE name = '沖縄県'), '那覇市', 'Naha', 26.2124, 127.6792, 320000, TRUE),

-- 静岡県
((SELECT id FROM prefectures WHERE name = '静岡県'), '熱海市', 'Atami', 35.0950, 139.0677, 36000, TRUE)
ON CONFLICT DO NOTHING;

-- 価格カテゴリデータ
INSERT INTO price_categories (name, min_price, max_price, category_code, description, target_customer) VALUES
('エコノミー', 0, 15000, 'ECONOMY', 'リーズナブルな価格帯のホテル', 'ビジネス・観光客'),
('スタンダード', 15001, 30000, 'STANDARD', '標準的な価格帯のホテル', '一般観光客・家族連れ'),
('プレミアム', 30001, 50000, 'PREMIUM', '上質なサービスのホテル', 'カップル・記念日'),
('ラグジュアリー', 50001, 100000, 'LUXURY', '高級ホテル・リゾート', '特別な滞在・VIP'),
('ウルトララグジュアリー', 100001, NULL, 'ULTRA', '最高級ホテル・スイート', 'セレブリティ・特別なゲスト')
ON CONFLICT (category_code) DO NOTHING;

-- 主要駅データ（東京エリア）
INSERT INTO stations (city_id, name, name_en, line_name, latitude, longitude, is_major_station) VALUES
((SELECT id FROM cities WHERE name = '新宿区'), '新宿駅', 'Shinjuku Station', 'JR山手線', 35.6896, 139.7006, TRUE),
((SELECT id FROM cities WHERE name = '渋谷区'), '渋谷駅', 'Shibuya Station', 'JR山手線', 35.6580, 139.7016, TRUE),
((SELECT id FROM cities WHERE name = '港区'), '品川駅', 'Shinagawa Station', 'JR東海道線', 35.6284, 139.7387, TRUE),
((SELECT id FROM cities WHERE name = '千代田区'), '東京駅', 'Tokyo Station', 'JR東海道線', 35.6812, 139.7671, TRUE),
((SELECT id FROM cities WHERE name = '台東区'), '上野駅', 'Ueno Station', 'JR山手線', 35.7140, 139.7774, TRUE),
((SELECT id FROM cities WHERE name = '港区'), '六本木駅', 'Roppongi Station', '地下鉄日比谷線', 35.6627, 139.7311, TRUE)
ON CONFLICT DO NOTHING;

-- 主要観光地データ
INSERT INTO tourist_spots (city_id, name, name_en, category, description, latitude, longitude, rating) VALUES
((SELECT id FROM cities WHERE name = '台東区'), '浅草寺', 'Sensoji Temple', 'temple', '東京最古の寺院', 35.7148, 139.7967, 4.5),
((SELECT id FROM cities WHERE name = '渋谷区'), '明治神宮', 'Meiji Shrine', 'temple', '明治天皇を祀る神社', 35.6761, 139.6993, 4.3),
((SELECT id FROM cities WHERE name = '中央区'), '築地市場', 'Tsukiji Market', 'shopping', '有名な魚市場', 35.6654, 139.7707, 4.2),
((SELECT id FROM cities WHERE name = '港区'), '東京タワー', 'Tokyo Tower', 'entertainment', '東京のシンボルタワー', 35.6586, 139.7454, 4.1),
((SELECT id FROM cities WHERE name = '京都市'), '清水寺', 'Kiyomizu Temple', 'temple', '世界遺産の寺院', 34.9949, 135.7850, 4.6),
((SELECT id FROM cities WHERE name = '京都市'), '金閣寺', 'Kinkaku-ji', 'temple', '金色に輝く寺院', 35.0394, 135.7292, 4.7),
((SELECT id FROM cities WHERE name = '大阪市'), '大阪城', 'Osaka Castle', 'museum', '豊臣秀吉の居城', 34.6873, 135.5262, 4.2),
((SELECT id FROM cities WHERE name = '鎌倉市'), '鎌倉大仏', 'Great Buddha of Kamakura', 'temple', '高徳院の大仏', 35.3167, 139.5362, 4.4),
((SELECT id FROM cities WHERE name = '箱根町'), '箱根神社', 'Hakone Shrine', 'temple', '湖畔の美しい神社', 35.2069, 139.0248, 4.3)
ON CONFLICT DO NOTHING;