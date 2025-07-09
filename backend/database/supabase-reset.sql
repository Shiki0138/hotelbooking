-- Supabaseデータベースのリセット用SQL
-- 既存のオブジェクトを削除してから再作成する場合に使用

-- 1. ビューの削除
DROP VIEW IF EXISTS luxury_deals_view CASCADE;
DROP VIEW IF EXISTS price_change_analysis CASCADE;

-- 2. インデックスの削除
DROP INDEX IF EXISTS idx_hotels_location;
DROP INDEX IF EXISTS idx_hotels_active;
DROP INDEX IF EXISTS idx_rooms_hotel;
DROP INDEX IF EXISTS idx_bookings_user;
DROP INDEX IF EXISTS idx_bookings_hotel;
DROP INDEX IF EXISTS idx_bookings_dates;
DROP INDEX IF EXISTS idx_availability_room_date;
DROP INDEX IF EXISTS idx_search_history_user;
DROP INDEX IF EXISTS idx_favorites_user;
DROP INDEX IF EXISTS idx_watchlist_user;
DROP INDEX IF EXISTS idx_hotels_crawling_rakuten;
DROP INDEX IF EXISTS idx_availability_crawling_dates;

-- 3. テーブルの削除（依存関係の順序で）
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS watchlist CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS search_history CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS price_history_crawling CASCADE;
DROP TABLE IF EXISTS availability_crawling CASCADE;
DROP TABLE IF EXISTS hotels_crawling CASCADE;
DROP TABLE IF EXISTS hotels CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS availability_calendar CASCADE;
DROP TABLE IF EXISTS price_rules CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS realtime_inventory CASCADE;

-- 4. 関数の削除
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 成功メッセージ
DO $$
BEGIN
    RAISE NOTICE '既存のデータベースオブジェクトを削除しました。';
END
$$;