// Price Comparison and Multi-Currency Component
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ExchangeRateAPI from '../../services/api/exchangeRate';

export const PriceComparisonComponent = ({ 
  hotels = [], 
  onCurrencyChange,
  className = "",
  showComparison = true 
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState('JPY');
  const [exchangeRates, setExchangeRates] = useState(null);
  const [priceAnalysis, setPriceAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const supportedCurrencies = ExchangeRateAPI.getSupportedCurrencies();

  // Load exchange rates and price analysis
  useEffect(() => {
    const loadPriceData = async () => {
      if (hotels.length === 0) return;

      setLoading(true);
      setError(null);

      try {
        // Get exchange rates
        const rates = await ExchangeRateAPI.getExchangeRates(selectedCurrency);
        setExchangeRates(rates);

        // Analyze price comparison if enabled
        if (showComparison) {
          const analysis = await ExchangeRateAPI.analyzePriceComparison(hotels);
          setPriceAnalysis(analysis);
        }
      } catch (err) {
        console.error('Price data loading failed:', err);
        setError('価格情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadPriceData();
  }, [hotels, selectedCurrency, showComparison]);

  // Convert price to selected currency
  const convertPrice = async (price, fromCurrency) => {
    if (!price || !fromCurrency) return null;
    
    try {
      const conversion = await ExchangeRateAPI.convertCurrency(
        price, 
        fromCurrency, 
        selectedCurrency
      );
      return conversion;
    } catch (error) {
      console.error('Price conversion failed:', error);
      return { convertedAmount: price, rate: 1 };
    }
  };

  // Format currency display
  const formatCurrency = (amount, currency = selectedCurrency) => {
    return ExchangeRateAPI.formatCurrency(amount, currency);
  };

  // Handle currency change
  const handleCurrencyChange = (newCurrency) => {
    setSelectedCurrency(newCurrency);
    if (onCurrencyChange) {
      onCurrencyChange(newCurrency);
    }
  };

  // Calculate price statistics
  const priceStats = useMemo(() => {
    if (!hotels.length) return null;

    const prices = hotels
      .filter(hotel => hotel.price?.total)
      .map(hotel => hotel.price.total);

    if (prices.length === 0) return null;

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      count: prices.length
    };
  }, [hotels]);

  // Get price trend indicator
  const getPriceTrendIndicator = (currentPrice, avgPrice) => {
    if (!currentPrice || !avgPrice) return null;
    
    const deviation = ((currentPrice - avgPrice) / avgPrice) * 100;
    
    if (deviation <= -20) return { type: 'excellent', text: '超お得', color: '#00c853' };
    if (deviation <= -10) return { type: 'good', text: 'お得', color: '#64dd17' };
    if (deviation <= 10) return { type: 'average', text: '平均的', color: '#ff9800' };
    if (deviation <= 20) return { type: 'high', text: '高め', color: '#f44336' };
    return { type: 'premium', text: 'プレミアム', color: '#9c27b0' };
  };

  if (loading) {
    return (
      <div className={`price-comparison-loading ${className}`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)'
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{ fontSize: '1.5rem', marginRight: '10px' }}
          >
            💱
          </motion.div>
          <span>価格を計算中...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`price-comparison-container ${className}`}>
      {/* Currency Selector */}
      <motion.div
        className="currency-selector"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>💱</span>
          <h3 style={{ margin: 0, color: '#333' }}>通貨選択</h3>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
          gap: '8px' 
        }}>
          {Object.entries(supportedCurrencies).slice(0, 8).map(([code, info]) => (
            <motion.button
              key={code}
              onClick={() => handleCurrencyChange(code)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '8px 12px',
                border: 'none',
                borderRadius: '8px',
                background: selectedCurrency === code 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: selectedCurrency === code ? 'white' : '#333',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: selectedCurrency === code ? 'bold' : 'normal',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(5px)'
              }}
            >
              <div>{info.flag} {code}</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>
                {info.symbol}
              </div>
            </motion.button>
          ))}
        </div>

        {exchangeRates && (
          <div style={{ 
            marginTop: '12px', 
            fontSize: '12px', 
            color: '#666',
            textAlign: 'center' 
          }}>
            最終更新: {exchangeRates.timestamp.toLocaleString('ja-JP')}
          </div>
        )}
      </motion.div>

      {/* Price Statistics */}
      {priceStats && (
        <motion.div
          className="price-statistics"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>📊</span>
            <h3 style={{ margin: 0, color: '#333' }}>価格統計</h3>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '12px' 
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#00c853' }}>
                {formatCurrency(priceStats.min)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>最安値</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#667eea' }}>
                {formatCurrency(priceStats.avg)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>平均価格</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f44336' }}>
                {formatCurrency(priceStats.max)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>最高値</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
                {priceStats.count}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>件数</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Price Analysis */}
      <AnimatePresence>
        {showComparison && priceAnalysis && (
          <motion.div
            className="price-analysis"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>🏆</span>
              <h3 style={{ margin: 0, color: '#333' }}>ベストディール</h3>
            </div>

            {priceAnalysis.comparison.cheapest && (
              <div style={{
                background: 'linear-gradient(135deg, #00c853 0%, #64dd17 100%)',
                borderRadius: '8px',
                padding: '12px',
                color: 'white',
                marginBottom: '12px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  🥇 最安値: {priceAnalysis.comparison.cheapest.name}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  {formatCurrency(priceAnalysis.comparison.cheapest.originalPrice.amount)}
                </div>
              </div>
            )}

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '8px',
              marginTop: '12px'
            }}>
              {Object.entries(priceAnalysis.comparison.averagePrice).slice(0, 4).map(([currency, conversion]) => (
                <div 
                  key={currency}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '8px',
                    textAlign: 'center',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>
                    {supportedCurrencies[currency]?.flag} {currency}
                  </div>
                  <div style={{ color: '#666' }}>
                    平均 {formatCurrency(conversion.convertedAmount, currency)}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hotel Price List with Trends */}
      <motion.div
        className="hotel-price-list"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {hotels.map((hotel, index) => {
          if (!hotel.price?.total) return null;

          const trend = priceStats ? getPriceTrendIndicator(hotel.price.total, priceStats.avg) : null;

          return (
            <motion.div
              key={hotel.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', color: '#333' }}>
                  {hotel.name}
                </h4>
                {hotel.location?.city && (
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    📍 {hotel.location.city}
                  </div>
                )}
                {hotel.rating && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    ⭐ {hotel.rating.stars || hotel.rating}/5
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  fontSize: '20px', 
                  fontWeight: 'bold', 
                  color: '#333',
                  marginBottom: '4px' 
                }}>
                  {formatCurrency(hotel.price.total)}
                </div>
                
                {hotel.price.currency !== selectedCurrency && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    marginBottom: '4px' 
                  }}>
                    元価格: {formatCurrency(hotel.price.total, hotel.price.currency)}
                  </div>
                )}

                {trend && (
                  <div style={{
                    display: 'inline-block',
                    background: trend.color,
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}>
                    {trend.text}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            color: '#d32f2f',
            textAlign: 'center',
            marginTop: '16px'
          }}
        >
          {error}
        </motion.div>
      )}
    </div>
  );
};

export default PriceComparisonComponent;