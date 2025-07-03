-- Demo Mode Sample Data
-- Worker3: Phase1 - Database Design
-- Sample data for testing and demonstration

-- Sample demo users
INSERT INTO demo_users (id, email, name, preferred_areas, notification_enabled) VALUES
('550e8400-e29b-41d4-a716-446655440101', 'demo@example.com', 'デモユーザー', ARRAY['東京都', '大阪府'], true),
('550e8400-e29b-41d4-a716-446655440102', 'tester@example.com', 'テストユーザー', ARRAY['京都府', '沖縄県'], true),
('550e8400-e29b-41d4-a716-446655440103', 'user@example.com', '山田太郎', ARRAY['北海道', '神奈川県'], false);

-- Sample alert settings
INSERT INTO alert_settings (user_id, price_drop_threshold, price_drop_percentage, availability_alert, daily_digest, instant_alerts, max_alerts_per_day) VALUES
('550e8400-e29b-41d4-a716-446655440101', 2000, 15, true, true, true, 8),
('550e8400-e29b-41d4-a716-446655440102', 1000, 10, true, false, true, 5),
('550e8400-e29b-41d4-a716-446655440103', 3000, 20, false, true, false, 3);

-- Sample watchlist entries (using hypothetical Rakuten hotel IDs)
INSERT INTO watchlist (id, user_id, hotel_id, hotel_name, area, prefecture, max_price, min_price, check_in_date, check_out_date, guests_count) VALUES
('660e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440101', 'RAK001', 'ザ・リッツ・カールトン東京', '六本木', '東京都', 50000, 0, '2025-07-15', '2025-07-16', 2),
('660e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440101', 'RAK002', 'マンダリン オリエンタル 東京', '日本橋', '東京都', 60000, 0, '2025-07-20', '2025-07-21', 2),
('660e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440102', 'RAK003', 'フォーシーズンズホテル京都', '東山区', '京都府', 80000, 30000, '2025-08-01', '2025-08-02', 2),
('660e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440102', 'RAK004', 'ハレクラニ沖縄', '国頭郡', '沖縄県', 70000, 0, '2025-08-15', '2025-08-17', 4),
('660e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440103', 'RAK005', 'ニセコ グラン ヒラフ', 'ニセコ町', '北海道', 40000, 15000, '2025-12-20', '2025-12-22', 2);

-- Sample price history data
INSERT INTO hotel_price_history (hotel_id, hotel_name, area, check_in_date, check_out_date, guests_count, current_price, previous_price, availability_status, check_timestamp) VALUES
('RAK001', 'ザ・リッツ・カールトン東京', '六本木', '2025-07-15', '2025-07-16', 2, 45000, 52000, 'available', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('RAK001', 'ザ・リッツ・カールトン東京', '六本木', '2025-07-15', '2025-07-16', 2, 48000, 45000, 'available', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
('RAK001', 'ザ・リッツ・カールトン東京', '六本木', '2025-07-15', '2025-07-16', 2, 42000, 48000, 'limited', CURRENT_TIMESTAMP - INTERVAL '6 hours'),

('RAK002', 'マンダリン オリエンタル 東京', '日本橋', '2025-07-20', '2025-07-21', 2, 55000, 58000, 'available', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('RAK002', 'マンダリン オリエンタル 東京', '日本橋', '2025-07-20', '2025-07-21', 2, 52000, 55000, 'available', CURRENT_TIMESTAMP - INTERVAL '12 hours'),

('RAK003', 'フォーシーズンズホテル京都', '東山区', '2025-08-01', '2025-08-02', 2, 75000, 78000, 'available', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('RAK004', 'ハレクラニ沖縄', '国頭郡', '2025-08-15', '2025-08-17', 4, 65000, 72000, 'limited', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('RAK005', 'ニセコ グラン ヒラフ', 'ニセコ町', '2025-12-20', '2025-12-22', 2, 38000, 41000, 'available', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Sample notification history
INSERT INTO demo_notifications (id, user_id, watchlist_id, notification_type, hotel_data, price_info, email_subject, email_status, sent_at) VALUES
('770e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440101', '660e8400-e29b-41d4-a716-446655440101', 'price_drop', 
'{"hotel_id": "RAK001", "hotel_name": "ザ・リッツ・カールトン東京", "area": "六本木", "current_price": 42000, "availability": "limited"}'::jsonb,
'{"previous_price": 48000, "current_price": 42000, "drop_amount": 6000, "drop_percentage": 12}'::jsonb,
'【価格下落アラート】ザ・リッツ・カールトン東京 - ¥6,000下落', 'sent', CURRENT_TIMESTAMP - INTERVAL '6 hours'),

('770e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440102', '660e8400-e29b-41d4-a716-446655440104', 'availability', 
'{"hotel_id": "RAK004", "hotel_name": "ハレクラニ沖縄", "area": "国頭郡", "current_price": 65000, "availability": "limited"}'::jsonb,
'{"rooms_available": 2, "status_change": "available_to_limited"}'::jsonb,
'【空室アラート】ハレクラニ沖縄 - 残り僅か', 'sent', CURRENT_TIMESTAMP - INTERVAL '1 day'),

('770e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440101', '660e8400-e29b-41d4-a716-446655440102', 'price_drop', 
'{"hotel_id": "RAK002", "hotel_name": "マンダリン オリエンタル 東京", "area": "日本橋", "current_price": 52000, "availability": "available"}'::jsonb,
'{"previous_price": 55000, "current_price": 52000, "drop_amount": 3000, "drop_percentage": 5}'::jsonb,
'【価格下落アラート】マンダリン オリエンタル 東京 - ¥3,000下落', 'sent', CURRENT_TIMESTAMP - INTERVAL '12 hours');

-- Sample hotel check queue entries
INSERT INTO hotel_check_queue (hotel_id, check_in_date, check_out_date, guests_count, priority, status, scheduled_at) VALUES
('RAK001', '2025-07-15', '2025-07-16', 2, 1, 'pending', CURRENT_TIMESTAMP + INTERVAL '1 hour'),
('RAK002', '2025-07-20', '2025-07-21', 2, 1, 'pending', CURRENT_TIMESTAMP + INTERVAL '2 hours'),
('RAK003', '2025-08-01', '2025-08-02', 2, 2, 'pending', CURRENT_TIMESTAMP + INTERVAL '4 hours'),
('RAK004', '2025-08-15', '2025-08-17', 4, 1, 'pending', CURRENT_TIMESTAMP + INTERVAL '1 hour'),
('RAK005', '2025-12-20', '2025-12-22', 2, 3, 'pending', CURRENT_TIMESTAMP + INTERVAL '8 hours');

-- Views for common queries
CREATE OR REPLACE VIEW active_watchlist AS
SELECT 
    w.*,
    u.email,
    u.name as user_name,
    s.price_drop_threshold,
    s.instant_alerts,
    s.availability_alert
FROM watchlist w
JOIN demo_users u ON w.user_id = u.id
LEFT JOIN alert_settings s ON w.user_id = s.user_id
WHERE w.is_active = true 
AND u.notification_enabled = true;

CREATE OR REPLACE VIEW recent_price_changes AS
SELECT 
    hotel_id,
    hotel_name,
    area,
    check_in_date,
    check_out_date,
    guests_count,
    current_price,
    previous_price,
    calculate_price_drop_percentage(current_price, previous_price) as price_drop_percentage,
    (previous_price - current_price) as price_drop_amount,
    availability_status,
    check_timestamp
FROM hotel_price_history
WHERE check_timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
AND previous_price IS NOT NULL
AND previous_price != current_price
ORDER BY check_timestamp DESC;

CREATE OR REPLACE VIEW notification_summary AS
SELECT 
    u.email,
    u.name,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN n.sent_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as today_notifications,
    COUNT(CASE WHEN n.notification_type = 'price_drop' THEN 1 END) as price_alerts,
    COUNT(CASE WHEN n.notification_type = 'availability' THEN 1 END) as availability_alerts,
    MAX(n.sent_at) as last_notification_sent
FROM demo_users u
LEFT JOIN demo_notifications n ON u.id = n.user_id
WHERE u.notification_enabled = true
GROUP BY u.id, u.email, u.name
ORDER BY last_notification_sent DESC;