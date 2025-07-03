-- 🚀 史上最強見積システム データベース設計
-- PRESIDENT緊急命令による即座実装

-- ===== 見積システム用データベーススキーマ =====

-- 1. 顧客マスター
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    tax_id VARCHAR(50),
    payment_terms INTEGER DEFAULT 30, -- 支払い期限（日数）
    discount_rate DECIMAL(5,4) DEFAULT 0.0000, -- 割引率
    is_vip BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 商品・サービスマスター
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit_price DECIMAL(12,2) NOT NULL,
    unit VARCHAR(20) DEFAULT '個',
    tax_rate DECIMAL(5,4) DEFAULT 0.10, -- 消費税率
    cost_price DECIMAL(12,2), -- 原価
    margin_rate DECIMAL(5,4), -- 利益率
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. 見積書テーブル
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number VARCHAR(50) UNIQUE NOT NULL, -- 見積書番号
    customer_id UUID NOT NULL REFERENCES customers(id),
    status VARCHAR(20) DEFAULT 'draft', -- draft, sent, approved, rejected, expired
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- 金額関連
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0, -- 小計
    discount_amount DECIMAL(15,2) DEFAULT 0, -- 割引額
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0, -- 消費税額
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0, -- 合計金額
    
    -- 日付関連
    quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE, -- 有効期限
    
    -- その他
    notes TEXT,
    terms_conditions TEXT,
    payment_method VARCHAR(50),
    delivery_date DATE,
    
    -- システム項目
    created_by UUID, -- 作成者
    approved_by UUID, -- 承認者
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- インデックス
    INDEX idx_quote_number (quote_number),
    INDEX idx_customer_id (customer_id),
    INDEX idx_status (status),
    INDEX idx_quote_date (quote_date),
    INDEX idx_valid_until (valid_until)
);

-- 4. 見積明細テーブル
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    
    -- 商品情報（スナップショット）
    product_code VARCHAR(50),
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- 数量・単価
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(20) DEFAULT '個',
    unit_price DECIMAL(12,2) NOT NULL,
    
    -- 計算項目
    line_total DECIMAL(15,2) NOT NULL, -- 行合計
    discount_rate DECIMAL(5,4) DEFAULT 0, -- 行割引率
    tax_rate DECIMAL(5,4) DEFAULT 0.10, -- 消費税率
    
    -- 表示順序
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- インデックス
    INDEX idx_quote_id (quote_id),
    INDEX idx_product_id (product_id)
);

-- 5. 見積履歴テーブル（バージョン管理）
CREATE TABLE quote_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id),
    version_number INTEGER NOT NULL,
    change_type VARCHAR(20) NOT NULL, -- created, updated, status_changed, etc.
    changed_by UUID,
    changes JSONB, -- 変更内容の詳細
    snapshot JSONB, -- 見積書の全スナップショット
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- インデックス
    INDEX idx_quote_history_quote_id (quote_id),
    INDEX idx_quote_history_version (quote_id, version_number)
);

-- 6. 見積テンプレートテーブル
CREATE TABLE quote_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    template_data JSONB NOT NULL, -- テンプレートの構造データ
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. 税率マスター
CREATE TABLE tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tax_name VARCHAR(50) NOT NULL,
    rate DECIMAL(5,4) NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. 通貨マスター
CREATE TABLE currencies (
    code VARCHAR(3) PRIMARY KEY, -- JPY, USD, EUR, etc.
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(5) NOT NULL,
    exchange_rate DECIMAL(10,6) DEFAULT 1.0, -- 対円レート
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. 見積書設定テーブル
CREATE TABLE quote_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID, -- 組織ID（マルチテナント対応）
    
    -- 番号設定
    quote_number_prefix VARCHAR(10) DEFAULT 'Q',
    quote_number_format VARCHAR(50) DEFAULT '{prefix}-{YYYY}{MM}-{####}',
    current_number INTEGER DEFAULT 1,
    
    -- デフォルト設定
    default_valid_days INTEGER DEFAULT 30,
    default_payment_terms INTEGER DEFAULT 30,
    default_tax_rate DECIMAL(5,4) DEFAULT 0.10,
    default_currency VARCHAR(3) DEFAULT 'JPY',
    
    -- 承認設定
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_threshold DECIMAL(15,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. パフォーマンス分析テーブル
CREATE TABLE quote_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id),
    
    -- 分析指標
    conversion_rate DECIMAL(5,4), -- 成約率
    avg_response_time INTEGER, -- 平均応答時間（時間）
    competitor_count INTEGER, -- 競合数
    
    -- 営業指標
    sales_rep_id UUID,
    lead_source VARCHAR(100),
    deal_probability DECIMAL(5,4),
    expected_close_date DATE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===== 初期データ挿入 =====

-- デフォルト通貨
INSERT INTO currencies (code, name, symbol, exchange_rate) VALUES
('JPY', '日本円', '¥', 1.0),
('USD', '米ドル', '$', 150.0),
('EUR', 'ユーロ', '€', 160.0);

-- デフォルト税率
INSERT INTO tax_rates (tax_name, rate, effective_date, is_default) VALUES
('消費税', 0.10, '2019-10-01', TRUE),
('軽減税率', 0.08, '2019-10-01', FALSE);

-- サンプル商品データ
INSERT INTO products (product_code, product_name, category, unit_price, unit, description) VALUES
('WEB-001', 'ウェブサイト制作', 'Webサービス', 500000, '式', '企業サイト制作一式'),
('SYS-001', 'システム開発', 'システム', 1000000, '式', 'カスタムシステム開発'),
('CON-001', 'コンサルティング', 'コンサル', 50000, '時間', '技術コンサルティング'),
('MNT-001', '保守サービス', '保守', 30000, '月', '月次保守サービス');

-- ===== 高速化インデックス =====

-- 見積書検索用複合インデックス
CREATE INDEX idx_quotes_customer_status_date ON quotes(customer_id, status, quote_date DESC);
CREATE INDEX idx_quotes_total_amount ON quotes(total_amount DESC);
CREATE INDEX idx_quotes_valid_until_status ON quotes(valid_until, status) WHERE status IN ('sent', 'approved');

-- 見積明細検索用インデックス
CREATE INDEX idx_quote_items_product_name ON quote_items USING gin(to_tsvector('japanese', product_name));

-- 分析用インデックス
CREATE INDEX idx_quote_analytics_conversion ON quote_analytics(conversion_rate DESC) WHERE conversion_rate IS NOT NULL;

-- ===== トリガー・制約 =====

-- 見積書番号自動生成関数
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
    settings RECORD;
    new_number INTEGER;
    formatted_number VARCHAR;
BEGIN
    -- 設定取得
    SELECT * INTO settings FROM quote_settings LIMIT 1;
    
    IF settings IS NULL THEN
        -- デフォルト設定使用
        new_number := (SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '\d+$') AS INTEGER)), 0) + 1 FROM quotes);
        NEW.quote_number := 'Q-' || TO_CHAR(NOW(), 'YYYY') || TO_CHAR(NOW(), 'MM') || '-' || LPAD(new_number::TEXT, 4, '0');
    ELSE
        -- カスタム設定使用
        UPDATE quote_settings SET current_number = current_number + 1 WHERE id = settings.id;
        formatted_number := settings.quote_number_format;
        formatted_number := REPLACE(formatted_number, '{prefix}', settings.quote_number_prefix);
        formatted_number := REPLACE(formatted_number, '{YYYY}', TO_CHAR(NOW(), 'YYYY'));
        formatted_number := REPLACE(formatted_number, '{MM}', TO_CHAR(NOW(), 'MM'));
        formatted_number := REPLACE(formatted_number, '{####}', LPAD(settings.current_number::TEXT, 4, '0'));
        NEW.quote_number := formatted_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 見積書番号自動生成トリガー
CREATE TRIGGER trigger_generate_quote_number
    BEFORE INSERT ON quotes
    FOR EACH ROW
    WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
    EXECUTE FUNCTION generate_quote_number();

-- 見積書金額自動計算関数
CREATE OR REPLACE FUNCTION calculate_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
    quote_record RECORD;
    subtotal DECIMAL(15,2);
    discount_amount DECIMAL(15,2);
    tax_amount DECIMAL(15,2);
    total_amount DECIMAL(15,2);
BEGIN
    -- 見積書IDの取得
    IF TG_OP = 'DELETE' THEN
        SELECT id INTO quote_record FROM quotes WHERE id = OLD.quote_id;
    ELSE
        SELECT id INTO quote_record FROM quotes WHERE id = NEW.quote_id;
    END IF;
    
    -- 小計計算
    SELECT COALESCE(SUM(line_total), 0) INTO subtotal
    FROM quote_items 
    WHERE quote_id = quote_record.id;
    
    -- 割引額・税額・合計計算
    SELECT 
        COALESCE(q.discount_amount, 0),
        subtotal - COALESCE(q.discount_amount, 0)
    INTO discount_amount, total_amount
    FROM quotes q WHERE q.id = quote_record.id;
    
    -- 消費税計算
    tax_amount := total_amount * 0.10;
    total_amount := total_amount + tax_amount;
    
    -- 見積書テーブル更新
    UPDATE quotes SET 
        subtotal = subtotal,
        tax_amount = tax_amount,
        total_amount = total_amount,
        updated_at = NOW()
    WHERE id = quote_record.id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 見積書金額自動計算トリガー
CREATE TRIGGER trigger_calculate_quote_totals
    AFTER INSERT OR UPDATE OR DELETE ON quote_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_quote_totals();

-- 見積履歴記録関数
CREATE OR REPLACE FUNCTION record_quote_history()
RETURNS TRIGGER AS $$
DECLARE
    version_num INTEGER;
    change_type VARCHAR;
BEGIN
    -- バージョン番号取得
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO version_num
    FROM quote_history WHERE quote_id = NEW.id;
    
    -- 変更タイプ判定
    IF TG_OP = 'INSERT' THEN
        change_type := 'created';
    ELSIF OLD.status != NEW.status THEN
        change_type := 'status_changed';
    ELSE
        change_type := 'updated';
    END IF;
    
    -- 履歴記録
    INSERT INTO quote_history (
        quote_id, 
        version_number, 
        change_type, 
        changed_by, 
        snapshot
    ) VALUES (
        NEW.id,
        version_num,
        change_type,
        NEW.created_by,
        to_jsonb(NEW)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 見積履歴記録トリガー
CREATE TRIGGER trigger_record_quote_history
    AFTER INSERT OR UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION record_quote_history();

-- ===== セキュリティ設定 =====

-- Row Level Security有効化
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（例：ユーザーは自分の組織の見積のみアクセス可能）
-- CREATE POLICY quote_access_policy ON quotes
--     FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- ===== パフォーマンス最適化 =====

-- パーティショニング（年月別）
-- CREATE TABLE quotes_2024_01 PARTITION OF quotes
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 統計情報更新
ANALYZE customers;
ANALYZE products;
ANALYZE quotes;
ANALYZE quote_items;

COMMENT ON DATABASE postgres IS '史上最強見積システム - PRESIDENT緊急命令による実装';