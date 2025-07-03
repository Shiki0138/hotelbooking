/**
 * 史上最強見積システム - 計算エンジン
 * Worker3: 見積エンジン・PDF出力担当
 * Created: 2025-07-02 (PRESIDENT緊急命令)
 */

const supabase = require('./supabase-client');

class QuoteCalculationEngine {
  constructor() {
    this.taxCache = new Map();
    this.calculationVersion = '1.0.0';
  }

  /**
   * 見積総額計算（メイン関数）
   */
  async calculateQuote(quoteData) {
    const startTime = Date.now();
    
    try {
      console.log('🔢 見積計算開始:', quoteData.id || 'NEW');

      // 1. 明細計算
      const itemCalculations = await this.calculateItems(quoteData.items || []);
      
      // 2. 小計計算
      const subtotal = this.calculateSubtotal(itemCalculations);
      
      // 3. 割引計算
      const discountData = await this.calculateDiscount(subtotal, quoteData.discount);
      
      // 4. 税額計算
      const taxData = await this.calculateTax(subtotal - discountData.amount, quoteData.tax_rate);
      
      // 5. 総額計算
      const total = this.calculateTotal(subtotal, discountData.amount, taxData.amount);

      const result = {
        calculation_id: this.generateCalculationId(),
        items: itemCalculations,
        subtotal: this.roundCurrency(subtotal),
        discount: discountData,
        tax: taxData,
        total: this.roundCurrency(total),
        currency: quoteData.currency || 'JPY',
        calculation_metadata: {
          version: this.calculationVersion,
          calculation_time: Date.now() - startTime,
          item_count: itemCalculations.length,
          calculation_method: 'standard'
        }
      };

      console.log('✅ 見積計算完了:', {
        subtotal: result.subtotal,
        tax: result.tax.amount,
        total: result.total,
        execution_time: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('❌ 見積計算エラー:', error);
      return {
        success: false,
        error: error.message,
        execution_time: Date.now() - startTime
      };
    }
  }

  /**
   * 明細計算
   */
  async calculateItems(items) {
    const calculations = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        const itemCalc = await this.calculateSingleItem(item, i + 1);
        calculations.push(itemCalc);
      } catch (error) {
        console.error(`明細 ${i + 1} 計算エラー:`, error);
        throw new Error(`明細 ${i + 1} の計算に失敗しました: ${error.message}`);
      }
    }

    return calculations;
  }

  /**
   * 単一明細計算
   */
  async calculateSingleItem(item, order) {
    const {
      item_name,
      description = '',
      quantity = 1,
      unit = '個',
      unit_price = 0,
      discount_rate = 0,
      discount_amount = 0,
      tax_category = 'taxable',
      specifications = {}
    } = item;

    // 入力検証
    if (quantity <= 0) {
      throw new Error(`${item_name}: 数量は1以上である必要があります`);
    }
    if (unit_price < 0) {
      throw new Error(`${item_name}: 単価は0以上である必要があります`);
    }

    // 基本金額計算
    const base_amount = this.roundCurrency(quantity * unit_price);

    // 割引計算
    let final_discount_amount = 0;
    if (discount_rate > 0) {
      final_discount_amount = this.roundCurrency(base_amount * discount_rate / 100);
    } else if (discount_amount > 0) {
      final_discount_amount = Math.min(discount_amount, base_amount);
    }

    // 明細総額
    const line_total = this.roundCurrency(base_amount - final_discount_amount);

    return {
      order,
      item_name,
      description,
      quantity: this.roundQuantity(quantity),
      unit,
      unit_price: this.roundCurrency(unit_price),
      base_amount: this.roundCurrency(base_amount),
      discount: {
        rate: discount_rate,
        amount: this.roundCurrency(final_discount_amount),
        method: discount_rate > 0 ? 'percentage' : 'fixed'
      },
      line_total: this.roundCurrency(line_total),
      tax_category,
      specifications,
      calculated_at: new Date().toISOString()
    };
  }

  /**
   * 小計計算
   */
  calculateSubtotal(itemCalculations) {
    return itemCalculations.reduce((sum, item) => sum + item.line_total, 0);
  }

  /**
   * 割引計算
   */
  async calculateDiscount(subtotal, discountConfig = {}) {
    const {
      rate = 0,
      amount = 0,
      type = 'none',
      condition = {},
      max_discount = null
    } = discountConfig;

    let discount_amount = 0;
    let discount_method = 'none';

    switch (type) {
      case 'percentage':
        discount_amount = subtotal * rate / 100;
        discount_method = 'percentage';
        break;
      
      case 'fixed':
        discount_amount = Math.min(amount, subtotal);
        discount_method = 'fixed';
        break;
      
      case 'volume':
        discount_amount = await this.calculateVolumeDiscount(subtotal, condition);
        discount_method = 'volume';
        break;
      
      case 'early_payment':
        discount_amount = await this.calculateEarlyPaymentDiscount(subtotal, condition);
        discount_method = 'early_payment';
        break;
      
      default:
        discount_amount = 0;
    }

    // 最大割引額制限
    if (max_discount && discount_amount > max_discount) {
      discount_amount = max_discount;
    }

    return {
      type,
      rate,
      amount: this.roundCurrency(discount_amount),
      method: discount_method,
      applied_conditions: condition
    };
  }

  /**
   * 税額計算
   */
  async calculateTax(taxable_amount, tax_rate = 10.0) {
    try {
      // 税設定取得（キャッシュ使用）
      const taxSettings = await this.getTaxSettings(tax_rate);
      
      let tax_amount = 0;
      let calculation_method = 'standard';

      switch (taxSettings.calculation_method) {
        case 'inclusive':
          // 内税計算
          tax_amount = taxable_amount * tax_rate / (100 + tax_rate);
          calculation_method = 'inclusive';
          break;
        
        case 'exclusive':
        default:
          // 外税計算（標準）
          tax_amount = taxable_amount * tax_rate / 100;
          calculation_method = 'exclusive';
          break;
      }

      // 端数処理
      tax_amount = this.roundTax(tax_amount, taxSettings.rounding_method);

      return {
        rate: tax_rate,
        amount: this.roundCurrency(tax_amount),
        taxable_amount: this.roundCurrency(taxable_amount),
        calculation_method,
        rounding_method: taxSettings.rounding_method,
        tax_name: taxSettings.tax_name
      };

    } catch (error) {
      console.error('税額計算エラー:', error);
      
      // フォールバック計算
      const fallback_amount = this.roundCurrency(taxable_amount * tax_rate / 100);
      
      return {
        rate: tax_rate,
        amount: fallback_amount,
        taxable_amount: this.roundCurrency(taxable_amount),
        calculation_method: 'fallback',
        rounding_method: 'round',
        tax_name: '消費税'
      };
    }
  }

  /**
   * 総額計算
   */
  calculateTotal(subtotal, discount_amount, tax_amount) {
    return subtotal - discount_amount + tax_amount;
  }

  /**
   * ボリューム割引計算
   */
  async calculateVolumeDiscount(subtotal, condition) {
    const { thresholds = [] } = condition;
    
    for (const threshold of thresholds.sort((a, b) => b.min_amount - a.min_amount)) {
      if (subtotal >= threshold.min_amount) {
        return subtotal * threshold.discount_rate / 100;
      }
    }
    
    return 0;
  }

  /**
   * 早期支払割引計算
   */
  async calculateEarlyPaymentDiscount(subtotal, condition) {
    const { discount_rate = 2, days_threshold = 10 } = condition;
    
    // 実際の実装では支払予定日との比較が必要
    // ここでは条件が満たされた場合の計算のみ
    return subtotal * discount_rate / 100;
  }

  /**
   * 税設定取得（キャッシュ付き）
   */
  async getTaxSettings(tax_rate) {
    const cacheKey = `tax_rate_${tax_rate}`;
    
    if (this.taxCache.has(cacheKey)) {
      return this.taxCache.get(cacheKey);
    }

    const { data, error } = await supabase
      .from('tax_settings')
      .select('*')
      .eq('tax_rate', tax_rate)
      .eq('is_active', true)
      .lte('effective_from', new Date().toISOString().split('T')[0])
      .gte('effective_until', new Date().toISOString().split('T')[0])
      .single();

    if (error || !data) {
      // デフォルト税設定
      const defaultSettings = {
        tax_name: '消費税',
        tax_rate: tax_rate,
        calculation_method: 'exclusive',
        rounding_method: 'round'
      };
      
      this.taxCache.set(cacheKey, defaultSettings);
      return defaultSettings;
    }

    this.taxCache.set(cacheKey, data);
    return data;
  }

  /**
   * 複雑料金体系計算
   */
  async calculateComplexPricing(pricingConfig) {
    const {
      base_price = 0,
      tier_pricing = [],
      time_based_pricing = {},
      location_based_pricing = {},
      custom_modifiers = []
    } = pricingConfig;

    let final_price = base_price;

    // 階層価格計算
    if (tier_pricing.length > 0) {
      final_price = await this.calculateTierPricing(base_price, tier_pricing);
    }

    // 時間ベース価格調整
    if (Object.keys(time_based_pricing).length > 0) {
      final_price = await this.applyTimeBasedPricing(final_price, time_based_pricing);
    }

    // 地域ベース価格調整
    if (Object.keys(location_based_pricing).length > 0) {
      final_price = await this.applyLocationBasedPricing(final_price, location_based_pricing);
    }

    // カスタム修正要素
    for (const modifier of custom_modifiers) {
      final_price = await this.applyCustomModifier(final_price, modifier);
    }

    return this.roundCurrency(final_price);
  }

  /**
   * 段階価格計算
   */
  async calculateTierPricing(base_price, tier_pricing) {
    for (const tier of tier_pricing.sort((a, b) => b.min_quantity - a.min_quantity)) {
      if (base_price >= tier.min_quantity) {
        return base_price * tier.unit_price;
      }
    }
    return base_price;
  }

  /**
   * 見積有効性検証
   */
  async validateQuote(quoteData) {
    const errors = [];

    // 必須項目チェック
    if (!quoteData.client_name) {
      errors.push('顧客名は必須です');
    }

    if (!quoteData.items || quoteData.items.length === 0) {
      errors.push('見積明細は1つ以上必要です');
    }

    // 明細検証
    if (quoteData.items) {
      quoteData.items.forEach((item, index) => {
        if (!item.item_name) {
          errors.push(`明細 ${index + 1}: 商品・サービス名は必須です`);
        }
        if (item.quantity <= 0) {
          errors.push(`明細 ${index + 1}: 数量は1以上である必要があります`);
        }
        if (item.unit_price < 0) {
          errors.push(`明細 ${index + 1}: 単価は0以上である必要があります`);
        }
      });
    }

    // 金額妥当性チェック
    if (quoteData.tax_rate && (quoteData.tax_rate < 0 || quoteData.tax_rate > 100)) {
      errors.push('税率は0%〜100%の範囲で設定してください');
    }

    return {
      is_valid: errors.length === 0,
      errors
    };
  }

  /**
   * 計算履歴保存
   */
  async saveCalculationHistory(quote_id, calculation_data, calculated_by = null) {
    try {
      const { data, error } = await supabase
        .from('calculation_history')
        .insert({
          quote_id,
          calculation_data,
          calculation_method: 'standard',
          calculated_by,
          execution_time_ms: calculation_data.calculation_metadata?.calculation_time || 0
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('計算履歴保存エラー:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // ユーティリティ関数
  // ========================================

  /**
   * 通貨丸め処理
   */
  roundCurrency(amount, decimals = 0) {
    return Math.round(amount * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * 税額丸め処理
   */
  roundTax(amount, method = 'round') {
    switch (method) {
      case 'floor':
        return Math.floor(amount);
      case 'ceil':
        return Math.ceil(amount);
      case 'round':
      default:
        return Math.round(amount);
    }
  }

  /**
   * 数量丸め処理
   */
  roundQuantity(quantity, decimals = 3) {
    return Math.round(quantity * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * 計算ID生成
   */
  generateCalculationId() {
    return `CALC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 税キャッシュクリア
   */
  clearTaxCache() {
    this.taxCache.clear();
    console.log('税設定キャッシュをクリアしました');
  }

  /**
   * 計算エンジン統計取得
   */
  getEngineStats() {
    return {
      version: this.calculationVersion,
      tax_cache_size: this.taxCache.size,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage()
    };
  }
}

// シングルトンインスタンス
const quoteCalculationEngine = new QuoteCalculationEngine();

module.exports = quoteCalculationEngine;