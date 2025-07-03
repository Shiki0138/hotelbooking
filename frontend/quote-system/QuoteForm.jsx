// 🏆 史上最強見積システム - メインフォームコンポーネント
// PRESIDENT緊急命令による最高品質UI/UX実装

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './QuoteForm.css';

const QuoteForm = () => {
  // フォーム状態管理
  const [formData, setFormData] = useState({
    // 基本情報
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    company: '',
    
    // ホテル予約詳細
    destination: '',
    checkinDate: '',
    checkoutDate: '',
    rooms: 1,
    adults: 2,
    children: 0,
    
    // 追加サービス
    breakfast: false,
    dinner: false,
    spa: false,
    transport: false,
    insurance: false,
    
    // 料金設定
    roomType: 'standard',
    priceRange: 'mid',
    seasonPeak: false,
    groupDiscount: 0,
    
    // 特別要望
    specialRequests: '',
    accessibilityNeeds: false,
    petFriendly: false
  });

  // リアルタイム計算結果
  const [calculation, setCalculation] = useState({
    basePrice: 0,
    serviceTotal: 0,
    taxAmount: 0,
    discountAmount: 0,
    finalTotal: 0,
    breakdown: []
  });

  // UI状態管理
  const [currentStep, setCurrentStep] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ステップ設定
  const steps = [
    { id: 1, title: '基本情報', icon: '👤', description: 'お客様情報を入力' },
    { id: 2, title: '宿泊詳細', icon: '🏨', description: 'ホテル予約詳細を設定' },
    { id: 3, title: '追加サービス', icon: '⭐', description: 'オプションサービスを選択' },
    { id: 4, title: '料金確認', icon: '💰', description: '見積内容を確認' }
  ];

  // 料金計算ロジック
  const calculateQuote = useCallback(() => {
    setIsCalculating(true);
    
    // 基本料金計算
    const nights = formData.checkinDate && formData.checkoutDate ? 
      Math.ceil((new Date(formData.checkoutDate) - new Date(formData.checkinDate)) / (1000 * 60 * 60 * 24)) : 1;
    
    const roomRates = {
      economy: 8000,
      standard: 12000,
      deluxe: 18000,
      suite: 30000
    };
    
    const seasonMultiplier = formData.seasonPeak ? 1.5 : 1.0;
    const basePrice = roomRates[formData.roomType] * nights * formData.rooms * seasonMultiplier;
    
    // サービス料金計算
    const serviceRates = {
      breakfast: 2000 * formData.adults * nights,
      dinner: 5000 * formData.adults * nights,
      spa: 8000 * formData.adults,
      transport: 15000,
      insurance: basePrice * 0.05
    };
    
    const serviceTotal = Object.entries(serviceRates).reduce((total, [key, rate]) => {
      return total + (formData[key] ? rate : 0);
    }, 0);
    
    // 税金・割引計算
    const subtotal = basePrice + serviceTotal;
    const taxAmount = subtotal * 0.1; // 10% 消費税
    const discountAmount = subtotal * (formData.groupDiscount / 100);
    const finalTotal = subtotal + taxAmount - discountAmount;
    
    // 詳細内訳作成
    const breakdown = [
      { item: `${formData.roomType}ルーム × ${formData.rooms}室 × ${nights}泊`, amount: basePrice },
      ...(formData.breakfast ? [{ item: `朝食 × ${formData.adults}名 × ${nights}泊`, amount: serviceRates.breakfast }] : []),
      ...(formData.dinner ? [{ item: `夕食 × ${formData.adults}名 × ${nights}泊`, amount: serviceRates.dinner }] : []),
      ...(formData.spa ? [{ item: `スパ利用 × ${formData.adults}名`, amount: serviceRates.spa }] : []),
      ...(formData.transport ? [{ item: '送迎サービス', amount: serviceRates.transport }] : []),
      ...(formData.insurance ? [{ item: '旅行保険', amount: serviceRates.insurance }] : []),
      ...(formData.seasonPeak ? [{ item: 'ピークシーズン料金', amount: basePrice * 0.5 }] : []),
      { item: '消費税(10%)', amount: taxAmount },
      ...(discountAmount > 0 ? [{ item: `グループ割引(${formData.groupDiscount}%)`, amount: -discountAmount }] : [])
    ];
    
    // アニメーション付きで結果更新
    setTimeout(() => {
      setCalculation({
        basePrice,
        serviceTotal,
        taxAmount,
        discountAmount,
        finalTotal,
        breakdown
      });
      setIsCalculating(false);
    }, 500);
    
  }, [formData]);

  // フォームデータ変更時の自動計算
  useEffect(() => {
    calculateQuote();
  }, [calculateQuote]);

  // 入力値更新ハンドラー
  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // エラークリア
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // バリデーション
  const validateStep = (step) => {
    const errors = {};
    
    switch(step) {
      case 1:
        if (!formData.customerName.trim()) errors.customerName = 'お名前は必須です';
        if (!formData.customerEmail.trim()) errors.customerEmail = 'メールアドレスは必須です';
        if (!/\S+@\S+\.\S+/.test(formData.customerEmail)) errors.customerEmail = '有効なメールアドレスを入力してください';
        if (!formData.customerPhone.trim()) errors.customerPhone = '電話番号は必須です';
        break;
        
      case 2:
        if (!formData.destination.trim()) errors.destination = '目的地は必須です';
        if (!formData.checkinDate) errors.checkinDate = 'チェックイン日は必須です';
        if (!formData.checkoutDate) errors.checkoutDate = 'チェックアウト日は必須です';
        if (new Date(formData.checkinDate) >= new Date(formData.checkoutDate)) {
          errors.checkoutDate = 'チェックアウト日はチェックイン日より後に設定してください';
        }
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ステップ進行ハンドラー
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // フォーム送信
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setIsSubmitting(true);
    
    try {
      // API送信シミュレーション
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSubmitSuccess(true);
      
      // 成功後のアクション
      setTimeout(() => {
        // PDF生成やメール送信などの後続処理
        console.log('見積書生成完了');
      }, 1000);
      
    } catch (error) {
      console.error('見積書送信エラー:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // アニメーション設定
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  // メモ化されたフォームセクション
  const FormSection = useMemo(() => {
    switch(currentStep) {
      case 1:
        return (
          <motion.div className="form-section" variants={containerVariants}>
            <h3>👤 お客様情報</h3>
            <div className="form-grid">
              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="customerName">お名前 *</label>
                <input
                  id="customerName"
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  className={validationErrors.customerName ? 'error' : ''}
                  placeholder="山田 太郎"
                  aria-describedby={validationErrors.customerName ? 'customerName-error' : null}
                />
                {validationErrors.customerName && (
                  <span id="customerName-error" className="error-message" role="alert">
                    {validationErrors.customerName}
                  </span>
                )}
              </motion.div>

              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="customerEmail">メールアドレス *</label>
                <input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  className={validationErrors.customerEmail ? 'error' : ''}
                  placeholder="example@email.com"
                  aria-describedby={validationErrors.customerEmail ? 'customerEmail-error' : null}
                />
                {validationErrors.customerEmail && (
                  <span id="customerEmail-error" className="error-message" role="alert">
                    {validationErrors.customerEmail}
                  </span>
                )}
              </motion.div>

              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="customerPhone">電話番号 *</label>
                <input
                  id="customerPhone"
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                  className={validationErrors.customerPhone ? 'error' : ''}
                  placeholder="090-1234-5678"
                  aria-describedby={validationErrors.customerPhone ? 'customerPhone-error' : null}
                />
                {validationErrors.customerPhone && (
                  <span id="customerPhone-error" className="error-message" role="alert">
                    {validationErrors.customerPhone}
                  </span>
                )}
              </motion.div>

              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="company">会社名（任意）</label>
                <input
                  id="company"
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="株式会社サンプル"
                />
              </motion.div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div className="form-section" variants={containerVariants}>
            <h3>🏨 宿泊詳細</h3>
            <div className="form-grid">
              <motion.div className="form-group full-width" variants={itemVariants}>
                <label htmlFor="destination">目的地 *</label>
                <input
                  id="destination"
                  type="text"
                  value={formData.destination}
                  onChange={(e) => handleInputChange('destination', e.target.value)}
                  className={validationErrors.destination ? 'error' : ''}
                  placeholder="東京、大阪、京都など"
                  aria-describedby={validationErrors.destination ? 'destination-error' : null}
                />
                {validationErrors.destination && (
                  <span id="destination-error" className="error-message" role="alert">
                    {validationErrors.destination}
                  </span>
                )}
              </motion.div>

              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="checkinDate">チェックイン日 *</label>
                <input
                  id="checkinDate"
                  type="date"
                  value={formData.checkinDate}
                  onChange={(e) => handleInputChange('checkinDate', e.target.value)}
                  className={validationErrors.checkinDate ? 'error' : ''}
                  min={new Date().toISOString().split('T')[0]}
                  aria-describedby={validationErrors.checkinDate ? 'checkinDate-error' : null}
                />
                {validationErrors.checkinDate && (
                  <span id="checkinDate-error" className="error-message" role="alert">
                    {validationErrors.checkinDate}
                  </span>
                )}
              </motion.div>

              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="checkoutDate">チェックアウト日 *</label>
                <input
                  id="checkoutDate"
                  type="date"
                  value={formData.checkoutDate}
                  onChange={(e) => handleInputChange('checkoutDate', e.target.value)}
                  className={validationErrors.checkoutDate ? 'error' : ''}
                  min={formData.checkinDate}
                  aria-describedby={validationErrors.checkoutDate ? 'checkoutDate-error' : null}
                />
                {validationErrors.checkoutDate && (
                  <span id="checkoutDate-error" className="error-message" role="alert">
                    {validationErrors.checkoutDate}
                  </span>
                )}
              </motion.div>

              <motion.div className="form-group" variants={itemVariants}>
                <label htmlFor="roomType">部屋タイプ</label>
                <select
                  id="roomType"
                  value={formData.roomType}
                  onChange={(e) => handleInputChange('roomType', e.target.value)}
                >
                  <option value="economy">エコノミー</option>
                  <option value="standard">スタンダード</option>
                  <option value="deluxe">デラックス</option>
                  <option value="suite">スイート</option>
                </select>
              </motion.div>

              <motion.div className="form-group-row" variants={itemVariants}>
                <div className="form-group">
                  <label htmlFor="rooms">部屋数</label>
                  <input
                    id="rooms"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.rooms}
                    onChange={(e) => handleInputChange('rooms', parseInt(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="adults">大人</label>
                  <input
                    id="adults"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.adults}
                    onChange={(e) => handleInputChange('adults', parseInt(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="children">子供</label>
                  <input
                    id="children"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.children}
                    onChange={(e) => handleInputChange('children', parseInt(e.target.value))}
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div className="form-section" variants={containerVariants}>
            <h3>⭐ 追加サービス</h3>
            <div className="services-grid">
              {[
                { key: 'breakfast', icon: '🍳', title: '朝食付き', desc: '和洋バイキング', price: '¥2,000/名' },
                { key: 'dinner', icon: '🍽️', title: '夕食付き', desc: '会席料理コース', price: '¥5,000/名' },
                { key: 'spa', icon: '♨️', title: 'スパ利用', desc: '温泉・サウナ', price: '¥8,000/名' },
                { key: 'transport', icon: '🚗', title: '送迎サービス', desc: '駅・空港送迎', price: '¥15,000' },
                { key: 'insurance', icon: '🛡️', title: '旅行保険', desc: 'キャンセル保険', price: '5%' }
              ].map((service) => (
                <motion.div 
                  key={service.key}
                  className={`service-card ${formData[service.key] ? 'selected' : ''}`}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleInputChange(service.key, !formData[service.key])}
                >
                  <div className="service-icon">{service.icon}</div>
                  <div className="service-info">
                    <h4>{service.title}</h4>
                    <p>{service.desc}</p>
                    <span className="service-price">{service.price}</span>
                  </div>
                  <div className="service-checkbox">
                    <input
                      type="checkbox"
                      checked={formData[service.key]}
                      onChange={() => handleInputChange(service.key, !formData[service.key])}
                      aria-label={`${service.title}を選択`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div className="additional-options" variants={itemVariants}>
              <div className="form-group">
                <label htmlFor="groupDiscount">グループ割引 (%)</label>
                <input
                  id="groupDiscount"
                  type="range"
                  min="0"
                  max="20"
                  step="5"
                  value={formData.groupDiscount}
                  onChange={(e) => handleInputChange('groupDiscount', parseInt(e.target.value))}
                />
                <span className="range-value">{formData.groupDiscount}%</span>
              </div>

              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.seasonPeak}
                    onChange={(e) => handleInputChange('seasonPeak', e.target.checked)}
                  />
                  ピークシーズン料金
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.accessibilityNeeds}
                    onChange={(e) => handleInputChange('accessibilityNeeds', e.target.checked)}
                  />
                  バリアフリー対応
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.petFriendly}
                    onChange={(e) => handleInputChange('petFriendly', e.target.checked)}
                  />
                  ペット同伴
                </label>
              </div>
            </motion.div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div className="form-section confirmation" variants={containerVariants}>
            <h3>💰 見積内容確認</h3>
            
            <div className="summary-grid">
              <div className="customer-summary">
                <h4>お客様情報</h4>
                <p><strong>お名前:</strong> {formData.customerName}</p>
                <p><strong>メール:</strong> {formData.customerEmail}</p>
                <p><strong>電話:</strong> {formData.customerPhone}</p>
                {formData.company && <p><strong>会社:</strong> {formData.company}</p>}
              </div>

              <div className="booking-summary">
                <h4>宿泊詳細</h4>
                <p><strong>目的地:</strong> {formData.destination}</p>
                <p><strong>期間:</strong> {formData.checkinDate} 〜 {formData.checkoutDate}</p>
                <p><strong>部屋:</strong> {formData.roomType} × {formData.rooms}室</p>
                <p><strong>人数:</strong> 大人{formData.adults}名 / 子供{formData.children}名</p>
              </div>
            </div>

            <div className="price-breakdown">
              <h4>料金内訳</h4>
              <div className="breakdown-list">
                {calculation.breakdown.map((item, index) => (
                  <motion.div 
                    key={index}
                    className="breakdown-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <span className="item-name">{item.item}</span>
                    <span className={`item-amount ${item.amount < 0 ? 'discount' : ''}`}>
                      {item.amount < 0 ? '-' : ''}¥{Math.abs(item.amount).toLocaleString()}
                    </span>
                  </motion.div>
                ))}
              </div>
              
              <div className="total-amount">
                <motion.div
                  className="final-total"
                  animate={isCalculating ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <span>合計金額</span>
                  <span className="amount">¥{calculation.finalTotal.toLocaleString()}</span>
                </motion.div>
              </div>
            </div>

            <motion.div className="special-requests" variants={itemVariants}>
              <label htmlFor="specialRequests">特別なご要望</label>
              <textarea
                id="specialRequests"
                value={formData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                placeholder="アレルギー対応、記念日のお祝いなど、ご要望をお聞かせください"
                rows="4"
              />
            </motion.div>
          </motion.div>
        );

      default:
        return null;
    }
  }, [currentStep, formData, validationErrors, calculation, isCalculating]);

  return (
    <div className="quote-form-container">
      {/* ヘッダー */}
      <motion.header 
        className="quote-header"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1>🏆 史上最強見積システム</h1>
        <p>最高品質のホテル予約見積をリアルタイムで作成</p>
      </motion.header>

      {/* プログレスバー */}
      <motion.div 
        className="progress-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="progress-steps">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`progress-step ${currentStep >= step.id ? 'active' : ''} ${currentStep === step.id ? 'current' : ''}`}
            >
              <div className="step-icon">{step.icon}</div>
              <div className="step-info">
                <div className="step-title">{step.title}</div>
                <div className="step-description">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="progress-bar">
          <motion.div 
            className="progress-fill"
            animate={{ width: `${(currentStep / steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.div>

      {/* メインフォーム */}
      <div className="form-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={containerVariants}
            className="form-content"
          >
            {FormSection}
          </motion.div>
        </AnimatePresence>

        {/* リアルタイム料金表示 */}
        <motion.div 
          className="price-display"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3>💰 リアルタイム見積</h3>
          <div className="price-card">
            <AnimatePresence>
              {isCalculating ? (
                <motion.div 
                  className="calculating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="spinner"></div>
                  <span>計算中...</span>
                </motion.div>
              ) : (
                <motion.div
                  className="price-result"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="price-row">
                    <span>基本料金</span>
                    <span>¥{calculation.basePrice.toLocaleString()}</span>
                  </div>
                  <div className="price-row">
                    <span>サービス料金</span>
                    <span>¥{calculation.serviceTotal.toLocaleString()}</span>
                  </div>
                  <div className="price-row">
                    <span>消費税</span>
                    <span>¥{calculation.taxAmount.toLocaleString()}</span>
                  </div>
                  {calculation.discountAmount > 0 && (
                    <div className="price-row discount">
                      <span>割引</span>
                      <span>-¥{calculation.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="price-row total">
                    <span>合計</span>
                    <span>¥{calculation.finalTotal.toLocaleString()}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* ナビゲーションボタン */}
      <motion.div 
        className="form-navigation"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        {currentStep > 1 && (
          <motion.button
            className="nav-button prev"
            onClick={handlePrevStep}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ← 前へ
          </motion.button>
        )}
        
        {currentStep < steps.length ? (
          <motion.button
            className="nav-button next"
            onClick={handleNextStep}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            次へ →
          </motion.button>
        ) : (
          <motion.button
            className="nav-button submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
          >
            {isSubmitting ? (
              <>
                <div className="spinner small"></div>
                送信中...
              </>
            ) : (
              '見積書を送信'
            )}
          </motion.button>
        )}
      </motion.div>

      {/* 成功メッセージ */}
      <AnimatePresence>
        {submitSuccess && (
          <motion.div
            className="success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="success-modal"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
            >
              <div className="success-icon">✅</div>
              <h2>見積書送信完了!</h2>
              <p>見積書をメールで送信いたしました。<br />
                 内容をご確認の上、ご不明な点がございましたらお気軽にお問い合わせください。</p>
              <motion.button
                className="success-button"
                onClick={() => setSubmitSuccess(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                新しい見積を作成
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuoteForm;