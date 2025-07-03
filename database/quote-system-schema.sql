-- 史上最強見積システム データベーススキーマ
-- Worker3: 見積エンジン・PDF出力担当
-- Created: 2025-07-02 (PRESIDENT緊急命令)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. 見積管理テーブル
CREATE TABLE IF NOT EXISTS quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_number VARCHAR(50) UNIQUE NOT NULL, -- QT-2025-000001 形式
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_phone VARCHAR(50),
    client_company VARCHAR(255),
    client_address TEXT,
    
    -- 見積内容
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- 金額情報
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 10.0, -- 消費税率
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_rate DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- ステータス
    status VARCHAR(20) DEFAULT 'draft', -- draft, sent, accepted, rejected, expired
    priority VARCHAR(10) DEFAULT 'normal', -- low, normal, high, urgent
    
    -- 日付
    quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE, -- 見積有効期限
    delivery_date DATE, -- 納期
    
    -- メタデータ
    currency VARCHAR(3) DEFAULT 'JPY',
    language VARCHAR(5) DEFAULT 'ja',
    template_id VARCHAR(50),
    notes TEXT,
    internal_notes TEXT,
    
    -- 追跡情報
    created_by UUID REFERENCES users(id),
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- システム情報
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    CONSTRAINT positive_amounts CHECK (subtotal >= 0 AND tax_amount >= 0 AND total_amount >= 0)
);

-- 2. 見積明細テーブル
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    
    -- 明細情報
    item_order INTEGER NOT NULL DEFAULT 1,
    category VARCHAR(100),
    item_name VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- 数量・単価
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit VARCHAR(50) DEFAULT '個',
    unit_price DECIMAL(12,2) NOT NULL,
    
    -- 割引
    discount_rate DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    
    -- 計算結果
    line_total DECIMAL(12,2) NOT NULL,
    
    -- 税区分
    tax_category VARCHAR(20) DEFAULT 'taxable', -- taxable, tax_free, tax_exempt
    
    -- メタデータ
    item_code VARCHAR(100),
    specifications JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_values CHECK (quantity > 0 AND unit_price >= 0 AND line_total >= 0),
    CONSTRAINT valid_tax_category CHECK (tax_category IN ('taxable', 'tax_free', 'tax_exempt'))
);

-- 3. 見積テンプレートテーブル
CREATE TABLE IF NOT EXISTS quote_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) DEFAULT 'standard', -- standard, service, product, project
    
    -- デザイン設定
    logo_url TEXT,
    color_scheme JSONB DEFAULT '{"primary": "#1e40af", "secondary": "#64748b"}'::jsonb,
    font_family VARCHAR(100) DEFAULT 'Noto Sans JP',
    
    -- レイアウト設定
    layout_config JSONB DEFAULT '{
        "show_logo": true,
        "show_company_info": true,
        "show_client_info": true,
        "show_item_codes": false,
        "show_specifications": true,
        "show_notes": true,
        "footer_text": "ご不明な点がございましたら、お気軽にお問い合わせください。"
    }'::jsonb,
    
    -- 会社情報
    company_info JSONB DEFAULT '{
        "name": "株式会社サンプル",
        "address": "東京都渋谷区xxx-xxx",
        "phone": "03-xxxx-xxxx",
        "email": "info@example.com",
        "website": "https://example.com"
    }'::jsonb,
    
    -- 標準条件
    default_tax_rate DECIMAL(5,2) DEFAULT 10.0,
    default_valid_days INTEGER DEFAULT 30,
    default_terms TEXT DEFAULT '支払い条件：月末締め翌月末払い',
    
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 計算履歴テーブル
CREATE TABLE IF NOT EXISTS calculation_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    
    -- 計算結果
    calculation_data JSONB NOT NULL,
    calculation_method VARCHAR(50),
    
    -- 実行情報
    calculated_by UUID REFERENCES users(id),
    calculation_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER,
    
    -- バージョン管理
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT TRUE
);

-- 5. PDF出力履歴テーブル
CREATE TABLE IF NOT EXISTS pdf_exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    
    -- ファイル情報
    filename VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_size_bytes INTEGER,
    file_hash VARCHAR(64),
    
    -- 出力設定
    template_id UUID REFERENCES quote_templates(id),
    export_format VARCHAR(20) DEFAULT 'pdf',
    page_size VARCHAR(10) DEFAULT 'A4',
    orientation VARCHAR(20) DEFAULT 'portrait',
    
    -- メタデータ
    export_purpose VARCHAR(50), -- quote, invoice, receipt, archive
    watermark TEXT,
    password_protected BOOLEAN DEFAULT FALSE,
    
    -- 実行情報
    exported_by UUID REFERENCES users(id),
    export_status VARCHAR(20) DEFAULT 'completed',
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_export_format CHECK (export_format IN ('pdf', 'html', 'excel')),
    CONSTRAINT valid_page_size CHECK (page_size IN ('A4', 'A5', 'B5', 'Letter')),
    CONSTRAINT valid_orientation CHECK (orientation IN ('portrait', 'landscape')),
    CONSTRAINT valid_export_status CHECK (export_status IN ('processing', 'completed', 'failed'))
);

-- 6. 税計算設定テーブル
CREATE TABLE IF NOT EXISTS tax_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- 税率設定
    tax_name VARCHAR(100) NOT NULL, -- 消費税, 軽減税率, 非課税 etc
    tax_rate DECIMAL(5,2) NOT NULL,
    tax_type VARCHAR(20) DEFAULT 'consumption', -- consumption, service, luxury
    
    -- 適用条件
    effective_from DATE NOT NULL,
    effective_until DATE,
    applicable_categories JSONB DEFAULT '[]'::jsonb,
    
    -- 計算方法
    calculation_method VARCHAR(20) DEFAULT 'inclusive', -- inclusive, exclusive
    rounding_method VARCHAR(20) DEFAULT 'round', -- round, floor, ceil
    
    -- 地域設定
    country_code VARCHAR(2) DEFAULT 'JP',
    region VARCHAR(100),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_calculation_method CHECK (calculation_method IN ('inclusive', 'exclusive')),
    CONSTRAINT valid_rounding_method CHECK (rounding_method IN ('round', 'floor', 'ceil'))
);

-- インデックス作成
CREATE INDEX idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX idx_quotes_client_email ON quotes(client_email);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_quote_date ON quotes(quote_date DESC);
CREATE INDEX idx_quotes_created_by ON quotes(created_by);

CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX idx_quote_items_order ON quote_items(quote_id, item_order);
CREATE INDEX idx_quote_items_category ON quote_items(category);

CREATE INDEX idx_quote_templates_type ON quote_templates(template_type);
CREATE INDEX idx_quote_templates_active ON quote_templates(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_calculation_history_quote ON calculation_history(quote_id);
CREATE INDEX idx_calculation_history_current ON calculation_history(is_current) WHERE is_current = TRUE;

CREATE INDEX idx_pdf_exports_quote ON pdf_exports(quote_id);
CREATE INDEX idx_pdf_exports_created ON pdf_exports(created_at DESC);

CREATE INDEX idx_tax_settings_active ON tax_settings(is_active, effective_from, effective_until);

-- トリガー関数
CREATE OR REPLACE FUNCTION update_quote_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- 見積明細変更時に見積総額を再計算
    UPDATE quotes SET
        subtotal = (
            SELECT COALESCE(SUM(line_total), 0)
            FROM quote_items
            WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
    
    -- 税額・総額も再計算
    UPDATE quotes SET
        tax_amount = ROUND(subtotal * tax_rate / 100, 0),
        total_amount = subtotal + ROUND(subtotal * tax_rate / 100, 0) - COALESCE(discount_amount, 0)
    WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 見積明細変更時の自動計算トリガー
CREATE TRIGGER trigger_update_quote_totals
    AFTER INSERT OR UPDATE OR DELETE ON quote_items
    FOR EACH ROW EXECUTE FUNCTION update_quote_totals();

-- 見積番号自動生成関数
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
    new_number VARCHAR(50);
    year_suffix VARCHAR(4);
    sequence_num INTEGER;
BEGIN
    year_suffix := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    -- 今年の最大番号を取得
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number, 9, 6) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM quotes
    WHERE quote_number LIKE 'QT-' || year_suffix || '-%';
    
    new_number := 'QT-' || year_suffix || '-' || LPAD(sequence_num::TEXT, 6, '0');
    
    NEW.quote_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 見積番号自動生成トリガー
CREATE TRIGGER trigger_generate_quote_number
    BEFORE INSERT ON quotes
    FOR EACH ROW
    WHEN (NEW.quote_number IS NULL)
    EXECUTE FUNCTION generate_quote_number();

-- 標準税設定データ
INSERT INTO tax_settings (tax_name, tax_rate, effective_from, is_active) VALUES
('消費税（標準税率）', 10.0, '2019-10-01', TRUE),
('軽減税率', 8.0, '2019-10-01', TRUE),
('非課税', 0.0, '1989-04-01', TRUE)
ON CONFLICT DO NOTHING;

-- 標準テンプレートデータ
INSERT INTO quote_templates (template_name, template_type, is_default, is_active) VALUES
('標準見積書テンプレート', 'standard', TRUE, TRUE),
('サービス見積書テンプレート', 'service', FALSE, TRUE),
('商品見積書テンプレート', 'product', FALSE, TRUE),
('プロジェクト見積書テンプレート', 'project', FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- RLS設定
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_exports ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can manage their own quotes" ON quotes
    FOR ALL USING (auth.uid() = created_by OR auth.uid() IS NULL);

CREATE POLICY "Users can manage items of their quotes" ON quote_items
    FOR ALL USING (
        quote_id IN (SELECT id FROM quotes WHERE created_by = auth.uid())
        OR auth.uid() IS NULL
    );

CREATE POLICY "Users can view their calculation history" ON calculation_history
    FOR SELECT USING (
        quote_id IN (SELECT id FROM quotes WHERE created_by = auth.uid())
        OR auth.uid() IS NULL
    );

CREATE POLICY "Users can view their PDF exports" ON pdf_exports
    FOR ALL USING (
        quote_id IN (SELECT id FROM quotes WHERE created_by = auth.uid())
        OR auth.uid() IS NULL
    );

-- テンプレートと税設定は全員閲覧可能
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates are publicly readable" ON quote_templates FOR SELECT USING (TRUE);

ALTER TABLE tax_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tax settings are publicly readable" ON tax_settings FOR SELECT USING (TRUE);

COMMIT;

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '🚀 史上最強見積システム - データベース構築完了！';
    RAISE NOTICE '📊 テーブル数: 6個（見積・明細・テンプレート・履歴・PDF・税設定）';
    RAISE NOTICE '🔧 インデックス数: 15個';
    RAISE NOTICE '⚡ 関数・トリガー数: 4個';
    RAISE NOTICE '🛡️ RLS ポリシー数: 6個';
    RAISE NOTICE '💡 自動計算・番号生成・履歴管理機能完備';
    RAISE NOTICE '📋 Phase 1 完了 - 次Phase 2: 計算エンジン実装開始！';
END $$;