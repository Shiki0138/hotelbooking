/**
 * 史上最強見積システム - PDF生成サービス
 * Worker3: 見積エンジン・PDF出力担当
 * Created: 2025-07-02 (PRESIDENT緊急命令)
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const supabase = require('./supabase-client');

class QuotePDFService {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'exports', 'pdfs');
    this.tempDir = path.join(process.cwd(), 'temp', 'pdfs');
    this.fontPaths = {
      regular: path.join(__dirname, '../assets/fonts/NotoSansJP-Regular.ttf'),
      bold: path.join(__dirname, '../assets/fonts/NotoSansJP-Bold.ttf')
    };
    
    this.initializeDirectories();
  }

  /**
   * 見積書PDF生成（メイン関数）
   */
  async generateQuotePDF(quote_id, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log('📄 PDF生成開始:', quote_id);

      // 1. 見積データ取得
      const quoteData = await this.getQuoteData(quote_id);
      if (!quoteData.success) {
        throw new Error(quoteData.error);
      }

      // 2. テンプレート設定取得
      const template = await this.getTemplate(options.template_id);

      // 3. PDF設定
      const pdfConfig = {
        page_size: options.page_size || 'A4',
        orientation: options.orientation || 'portrait',
        margins: options.margins || { top: 50, bottom: 50, left: 50, right: 50 },
        watermark: options.watermark || null,
        ...options
      };

      // 4. PDF文書作成
      const doc = this.createPDFDocument(pdfConfig);
      const filename = this.generateFilename(quoteData.data, options.export_purpose);
      const filepath = path.join(this.outputDir, filename);

      // 5. ストリーム設定
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // 6. PDF内容生成
      await this.generatePDFContent(doc, quoteData.data, template, pdfConfig);

      // 7. PDF完了
      doc.end();

      // 8. ストリーム完了待機
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });

      // 9. ファイル情報取得
      const fileStats = fs.statSync(filepath);
      const fileHash = await this.calculateFileHash(filepath);

      // 10. 出力履歴保存
      const exportRecord = await this.saveExportHistory({
        quote_id,
        filename,
        file_path: filepath,
        file_size_bytes: fileStats.size,
        file_hash: fileHash,
        template_id: template.id,
        export_format: 'pdf',
        page_size: pdfConfig.page_size,
        orientation: pdfConfig.orientation,
        export_purpose: options.export_purpose || 'quote',
        watermark: pdfConfig.watermark,
        exported_by: options.exported_by
      });

      const result = {
        success: true,
        filename,
        filepath,
        file_size: fileStats.size,
        file_hash: fileHash,
        export_id: exportRecord.data?.id,
        generation_time: Date.now() - startTime
      };

      console.log('✅ PDF生成完了:', {
        filename,
        size: `${Math.round(fileStats.size / 1024)}KB`,
        time: `${Date.now() - startTime}ms`
      });

      return result;

    } catch (error) {
      console.error('❌ PDF生成エラー:', error);
      return {
        success: false,
        error: error.message,
        generation_time: Date.now() - startTime
      };
    }
  }

  /**
   * PDF文書作成
   */
  createPDFDocument(config) {
    const doc = new PDFDocument({
      size: config.page_size,
      layout: config.orientation,
      margins: config.margins,
      info: {
        Title: '見積書',
        Author: 'LastMinuteStay Quote System',
        Subject: '見積書PDF',
        Creator: 'QuotePDFService v1.0',
        Producer: 'PDFKit'
      }
    });

    return doc;
  }

  /**
   * PDF内容生成
   */
  async generatePDFContent(doc, quoteData, template, config) {
    const pageWidth = doc.page.width - config.margins.left - config.margins.right;
    let currentY = config.margins.top;

    // 1. ヘッダー部分
    currentY = await this.renderHeader(doc, quoteData, template, currentY, pageWidth);
    currentY += 20;

    // 2. 会社情報・顧客情報
    currentY = await this.renderCompanyAndClientInfo(doc, quoteData, template, currentY, pageWidth);
    currentY += 30;

    // 3. 見積書タイトル
    currentY = await this.renderQuoteTitle(doc, quoteData, currentY, pageWidth);
    currentY += 20;

    // 4. 見積明細テーブル
    currentY = await this.renderItemsTable(doc, quoteData, currentY, pageWidth);
    currentY += 20;

    // 5. 合計金額部分
    currentY = await this.renderTotalSection(doc, quoteData, currentY, pageWidth);
    currentY += 30;

    // 6. 備考・条件
    currentY = await this.renderNotesSection(doc, quoteData, template, currentY, pageWidth);

    // 7. フッター
    await this.renderFooter(doc, quoteData, template, pageWidth);

    // 8. ウォーターマーク（オプション）
    if (config.watermark) {
      await this.renderWatermark(doc, config.watermark);
    }
  }

  /**
   * ヘッダー描画
   */
  async renderHeader(doc, quoteData, template, y, pageWidth) {
    // ロゴ（もしあれば）
    if (template.logo_url && template.layout_config.show_logo) {
      // ロゴ描画処理（実装簡略化）
      doc.fontSize(16).fillColor('#666666').text('LOGO', 50, y);
    }

    // 見積番号・日付
    doc.fontSize(12).fillColor('#333333');
    doc.text(`見積番号: ${quoteData.quote_number}`, pageWidth - 150, y, { align: 'right' });
    doc.text(`見積日: ${this.formatDate(quoteData.quote_date)}`, pageWidth - 150, y + 15, { align: 'right' });
    
    if (quoteData.valid_until) {
      doc.text(`有効期限: ${this.formatDate(quoteData.valid_until)}`, pageWidth - 150, y + 30, { align: 'right' });
    }

    return y + 60;
  }

  /**
   * 会社・顧客情報描画
   */
  async renderCompanyAndClientInfo(doc, quoteData, template, y, pageWidth) {
    const companyInfo = template.company_info;
    const leftWidth = pageWidth * 0.5;

    // 会社情報（左側）
    if (template.layout_config.show_company_info) {
      doc.fontSize(14).fillColor('#333333').text('お見積先', 50, y);
      doc.fontSize(10).fillColor('#666666');
      doc.text(companyInfo.name, 50, y + 20);
      doc.text(companyInfo.address, 50, y + 35);
      doc.text(`TEL: ${companyInfo.phone}`, 50, y + 50);
      doc.text(`Email: ${companyInfo.email}`, 50, y + 65);
    }

    // 顧客情報（右側）
    if (template.layout_config.show_client_info) {
      const rightX = 50 + leftWidth + 20;
      doc.fontSize(14).fillColor('#333333').text('お客様', rightX, y);
      doc.fontSize(10).fillColor('#666666');
      doc.text(quoteData.client_name, rightX, y + 20);
      
      if (quoteData.client_company) {
        doc.text(quoteData.client_company, rightX, y + 35);
      }
      
      if (quoteData.client_email) {
        doc.text(quoteData.client_email, rightX, y + 50);
      }
      
      if (quoteData.client_phone) {
        doc.text(quoteData.client_phone, rightX, y + 65);
      }
    }

    return y + 100;
  }

  /**
   * 見積書タイトル描画
   */
  async renderQuoteTitle(doc, quoteData, y, pageWidth) {
    doc.fontSize(18).fillColor('#333333');
    doc.text(quoteData.title || '見積書', 50, y, { align: 'center', width: pageWidth });

    if (quoteData.description) {
      doc.fontSize(10).fillColor('#666666');
      doc.text(quoteData.description, 50, y + 30, { align: 'center', width: pageWidth });
      return y + 60;
    }

    return y + 40;
  }

  /**
   * 明細テーブル描画
   */
  async renderItemsTable(doc, quoteData, y, pageWidth) {
    const items = quoteData.quote_items || [];
    const tableHeaders = ['項目', '数量', '単位', '単価', '金額'];
    const colWidths = [pageWidth * 0.35, pageWidth * 0.1, pageWidth * 0.1, pageWidth * 0.2, pageWidth * 0.25];
    
    let currentY = y;

    // テーブルヘッダー
    doc.rect(50, currentY, pageWidth, 25).fillAndStroke('#f0f0f0', '#cccccc');
    doc.fillColor('#333333').fontSize(10);

    let currentX = 50;
    tableHeaders.forEach((header, index) => {
      doc.text(header, currentX + 5, currentY + 8, { width: colWidths[index] - 10, align: 'center' });
      currentX += colWidths[index];
    });

    currentY += 25;

    // テーブル明細
    items.forEach((item, index) => {
      const rowHeight = Math.max(20, Math.ceil(item.item_name.length / 30) * 12 + 8);
      
      // 行背景
      if (index % 2 === 1) {
        doc.rect(50, currentY, pageWidth, rowHeight).fill('#f9f9f9');
      }

      // 行ボーダー
      doc.rect(50, currentY, pageWidth, rowHeight).stroke('#cccccc');

      doc.fillColor('#333333').fontSize(9);

      // セル内容
      currentX = 50;
      
      // 項目名
      doc.text(item.item_name, currentX + 5, currentY + 5, { 
        width: colWidths[0] - 10, 
        height: rowHeight - 10 
      });
      currentX += colWidths[0];

      // 数量
      doc.text(this.formatNumber(item.quantity), currentX + 5, currentY + 5, { 
        width: colWidths[1] - 10, 
        align: 'right' 
      });
      currentX += colWidths[1];

      // 単位
      doc.text(item.unit || '個', currentX + 5, currentY + 5, { 
        width: colWidths[2] - 10, 
        align: 'center' 
      });
      currentX += colWidths[2];

      // 単価
      doc.text(this.formatCurrency(item.unit_price), currentX + 5, currentY + 5, { 
        width: colWidths[3] - 10, 
        align: 'right' 
      });
      currentX += colWidths[3];

      // 金額
      doc.text(this.formatCurrency(item.line_total), currentX + 5, currentY + 5, { 
        width: colWidths[4] - 10, 
        align: 'right' 
      });

      currentY += rowHeight;
    });

    return currentY + 10;
  }

  /**
   * 合計金額部分描画
   */
  async renderTotalSection(doc, quoteData, y, pageWidth) {
    const summaryWidth = 200;
    const summaryX = pageWidth - summaryWidth + 50;
    let currentY = y;

    // 小計
    doc.fontSize(10).fillColor('#333333');
    doc.text('小計:', summaryX, currentY);
    doc.text(this.formatCurrency(quoteData.subtotal), summaryX + 100, currentY, { align: 'right' });
    currentY += 15;

    // 割引
    if (quoteData.discount_amount && quoteData.discount_amount > 0) {
      doc.fillColor('#d97706');
      doc.text('割引:', summaryX, currentY);
      doc.text(`-${this.formatCurrency(quoteData.discount_amount)}`, summaryX + 100, currentY, { align: 'right' });
      currentY += 15;
    }

    // 税額
    doc.fillColor('#333333');
    doc.text(`消費税 (${quoteData.tax_rate}%):`, summaryX, currentY);
    doc.text(this.formatCurrency(quoteData.tax_amount), summaryX + 100, currentY, { align: 'right' });
    currentY += 15;

    // 合計（太字、大きめ）
    doc.rect(summaryX - 5, currentY, summaryWidth + 10, 25).fillAndStroke('#f0f0f0', '#333333');
    doc.fontSize(12).fillColor('#333333');
    doc.text('合計金額:', summaryX, currentY + 6);
    doc.text(this.formatCurrency(quoteData.total_amount), summaryX + 100, currentY + 6, { align: 'right' });

    return currentY + 35;
  }

  /**
   * 備考・条件描画
   */
  async renderNotesSection(doc, quoteData, template, y, pageWidth) {
    let currentY = y;

    // 備考
    if (quoteData.notes) {
      doc.fontSize(11).fillColor('#333333').text('備考:', 50, currentY);
      doc.fontSize(9).fillColor('#666666');
      doc.text(quoteData.notes, 50, currentY + 15, { width: pageWidth });
      currentY += 40;
    }

    // 標準条件
    if (template.default_terms) {
      doc.fontSize(11).fillColor('#333333').text('お取引条件:', 50, currentY);
      doc.fontSize(9).fillColor('#666666');
      doc.text(template.default_terms, 50, currentY + 15, { width: pageWidth });
      currentY += 30;
    }

    return currentY;
  }

  /**
   * フッター描画
   */
  async renderFooter(doc, quoteData, template, pageWidth) {
    const footerY = doc.page.height - 80;
    
    doc.fontSize(8).fillColor('#999999');
    
    if (template.layout_config.footer_text) {
      doc.text(template.layout_config.footer_text, 50, footerY, { 
        width: pageWidth, 
        align: 'center' 
      });
    }

    // ページ番号
    doc.text(`Page 1 of 1`, 50, footerY + 15, { 
      width: pageWidth, 
      align: 'center' 
    });
  }

  /**
   * ウォーターマーク描画
   */
  async renderWatermark(doc, watermarkText) {
    doc.save();
    doc.rotate(45, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.fontSize(60).fillColor('#f0f0f0').fillOpacity(0.3);
    doc.text(watermarkText, 0, doc.page.height / 2 - 30, {
      width: doc.page.width,
      align: 'center'
    });
    doc.restore();
  }

  /**
   * 見積データ取得
   */
  async getQuoteData(quote_id) {
    try {
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items(*)
        `)
        .eq('id', quote_id)
        .single();

      if (quoteError) throw quoteError;

      return { success: true, data: quote };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * テンプレート取得
   */
  async getTemplate(template_id) {
    try {
      let query = supabase.from('quote_templates').select('*');
      
      if (template_id) {
        query = query.eq('id', template_id);
      } else {
        query = query.eq('is_default', true);
      }

      const { data, error } = await query.single();

      if (error) throw error;

      return data;
    } catch (error) {
      // デフォルトテンプレート
      return {
        id: 'default',
        template_name: '標準テンプレート',
        layout_config: {
          show_logo: false,
          show_company_info: true,
          show_client_info: true,
          footer_text: 'お見積りに関するお問い合わせは、お気軽にご連絡ください。'
        },
        company_info: {
          name: '株式会社サンプル',
          address: '東京都渋谷区xxx-xxx',
          phone: '03-xxxx-xxxx',
          email: 'info@example.com'
        },
        default_terms: '・お支払い条件: 月末締め翌月末払い\n・有効期限: 見積日より30日間\n・消費税は別途申し受けます'
      };
    }
  }

  /**
   * ファイル名生成
   */
  generateFilename(quoteData, purpose = 'quote') {
    const date = new Date().toISOString().split('T')[0];
    const sanitizedClientName = quoteData.client_name.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
    
    return `${purpose}_${quoteData.quote_number}_${sanitizedClientName}_${date}.pdf`;
  }

  /**
   * ファイルハッシュ計算
   */
  async calculateFileHash(filepath) {
    const crypto = require('crypto');
    const fileBuffer = fs.readFileSync(filepath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * 出力履歴保存
   */
  async saveExportHistory(exportData) {
    try {
      const { data, error } = await supabase
        .from('pdf_exports')
        .insert(exportData)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('出力履歴保存エラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ディレクトリ初期化
   */
  initializeDirectories() {
    [this.outputDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // ========================================
  // フォーマッティング関数
  // ========================================

  formatCurrency(amount, currency = 'JPY') {
    if (currency === 'JPY') {
      return `¥${Number(amount).toLocaleString()}`;
    }
    return Number(amount).toLocaleString();
  }

  formatNumber(value, decimals = 0) {
    return Number(value).toFixed(decimals);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * サービス統計
   */
  getServiceStats() {
    return {
      output_directory: this.outputDir,
      temp_directory: this.tempDir,
      supported_formats: ['pdf'],
      supported_page_sizes: ['A4', 'A5', 'B5', 'Letter'],
      version: '1.0.0'
    };
  }
}

module.exports = new QuotePDFService();