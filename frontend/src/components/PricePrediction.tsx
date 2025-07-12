import * as React from 'react';

const { useState, useEffect, createElement: e } = React;

interface PricePredictionProps {
  hotel: any;
  onClose: () => void;
}

const PricePrediction = ({ hotel, onClose }: PricePredictionProps) => {
  const [loading, setLoading] = useState(true);
  const [predictionData, setPredictionData] = useState<any>(null);

  useEffect(() => {
    // 価格予測データを生成（実際のAPIが利用可能になるまでのモック）
    setTimeout(() => {
      const basePrice = hotel.price;
      const predictions = generatePredictions(basePrice);
      setPredictionData(predictions);
      setLoading(false);
    }, 1000);
  }, [hotel]);

  const generatePredictions = (basePrice: number) => {
    const predictions = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      // 週末は高め、平日は安め
      const dayOfWeek = date.getDay();
      let priceMultiplier = 1;
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        priceMultiplier = 1.3; // 週末は30%高い
      } else if (dayOfWeek === 5) {
        priceMultiplier = 1.15; // 金曜は15%高い
      }
      
      // ランダムな変動を追加
      const randomVariation = 0.8 + Math.random() * 0.4; // 0.8-1.2の範囲
      const predictedPrice = Math.floor(basePrice * priceMultiplier * randomVariation);
      
      predictions.push({
        date: date.toISOString().split('T')[0],
        price: predictedPrice,
        confidence: Math.floor(70 + Math.random() * 20), // 70-90%の信頼度
        trend: predictedPrice < basePrice ? 'down' : predictedPrice > basePrice * 1.1 ? 'up' : 'stable'
      });
    }
    
    return {
      predictions,
      lowestPrice: Math.min(...predictions.map(p => p.price)),
      lowestDate: predictions.find(p => p.price === Math.min(...predictions.map(p => p.price)))?.date,
      averagePrice: Math.floor(predictions.reduce((sum, p) => sum + p.price, 0) / predictions.length),
      recommendation: generateRecommendation(predictions, basePrice)
    };
  };

  const generateRecommendation = (predictions: any[], currentPrice: number) => {
    const nextWeekPrices = predictions.slice(0, 7).map(p => p.price);
    const avgNextWeek = nextWeekPrices.reduce((sum, p) => sum + p, 0) / nextWeekPrices.length;
    
    if (avgNextWeek < currentPrice * 0.9) {
      return {
        action: 'wait',
        text: '来週まで待つことをおすすめします',
        reason: '価格が下がる可能性が高いです'
      };
    } else if (currentPrice < avgNextWeek * 0.9) {
      return {
        action: 'book',
        text: '今すぐ予約することをおすすめします',
        reason: '現在の価格はお得です'
      };
    } else {
      return {
        action: 'monitor',
        text: '価格アラートを設定して様子を見ましょう',
        reason: '価格は安定しています'
      };
    }
  };

  const getBarHeight = (price: number, maxPrice: number, minPrice: number) => {
    const range = maxPrice - minPrice;
    const percentage = ((price - minPrice) / range) * 100;
    return Math.max(20, percentage); // 最小20%の高さを確保
  };

  if (loading) {
    return e('div', {
      style: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }
    }, e('div', {
      style: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center'
      }
    }, [
      e('div', {
        key: 'spinner',
        style: {
          width: '40px',
          height: '40px',
          border: '3px solid #e5e7eb',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          margin: '0 auto 16px',
          animation: 'spin 1s linear infinite'
        }
      }),
      e('p', {
        key: 'text',
        style: { color: '#6b7280' }
      }, 'AI価格予測を分析中...')
    ]));
  }

  const maxPrice = Math.max(...predictionData.predictions.map((p: any) => p.price));
  const minPrice = Math.min(...predictionData.predictions.map((p: any) => p.price));

  return e('div', {
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    onClick: onClose
  }, e('div', {
    style: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: window.innerWidth < 640 ? '20px' : '28px',
      maxWidth: '900px',
      width: '100%',
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
    },
    onClick: (e: any) => e.stopPropagation()
  }, [
    // ヘッダー
    e('div', {
      key: 'header',
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }
    }, [
      e('div', { key: 'title-section' }, [
        e('h2', {
          key: 'title',
          style: {
            fontSize: window.innerWidth < 640 ? '20px' : '24px',
            fontWeight: 'bold',
            margin: 0,
            color: '#1f2937'
          }
        }, '🤖 AI価格予測'),
        e('p', {
          key: 'hotel-name',
          style: {
            fontSize: '14px',
            color: '#6b7280',
            marginTop: '4px'
          }
        }, hotel.name)
      ]),
      e('button', {
        key: 'close',
        onClick: onClose,
        style: {
          background: 'none',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          padding: '4px',
          color: '#6b7280'
        }
      }, '×')
    ]),

    // おすすめアクション
    e('div', {
      key: 'recommendation',
      style: {
        background: predictionData.recommendation.action === 'book' ? '#dcfce7' :
                   predictionData.recommendation.action === 'wait' ? '#fef3c7' : '#dbeafe',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: `1px solid ${
          predictionData.recommendation.action === 'book' ? '#86efac' :
          predictionData.recommendation.action === 'wait' ? '#fde68a' : '#93c5fd'
        }`
      }
    }, [
      e('div', {
        key: 'icon',
        style: {
          fontSize: '32px',
          marginBottom: '8px'
        }
      }, predictionData.recommendation.action === 'book' ? '🎯' :
         predictionData.recommendation.action === 'wait' ? '⏰' : '📊'),
      e('h3', {
        key: 'action',
        style: {
          fontSize: '18px',
          fontWeight: 'bold',
          color: predictionData.recommendation.action === 'book' ? '#15803d' :
                 predictionData.recommendation.action === 'wait' ? '#a16207' : '#1e40af',
          marginBottom: '4px'
        }
      }, predictionData.recommendation.text),
      e('p', {
        key: 'reason',
        style: {
          fontSize: '14px',
          color: predictionData.recommendation.action === 'book' ? '#166534' :
                 predictionData.recommendation.action === 'wait' ? '#854d0e' : '#1e3a8a'
        }
      }, predictionData.recommendation.reason)
    ]),

    // 統計情報
    e('div', {
      key: 'stats',
      style: {
        display: 'grid',
        gridTemplateColumns: window.innerWidth < 640 ? '1fr' : 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }
    }, [
      e('div', {
        key: 'current',
        style: {
          background: '#f3f4f6',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }
      }, [
        e('p', {
          key: 'label',
          style: { fontSize: '12px', color: '#6b7280', marginBottom: '4px' }
        }, '現在価格'),
        e('p', {
          key: 'value',
          style: { fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }
        }, `¥${hotel.price.toLocaleString()}`)
      ]),
      e('div', {
        key: 'lowest',
        style: {
          background: '#dcfce7',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }
      }, [
        e('p', {
          key: 'label',
          style: { fontSize: '12px', color: '#15803d', marginBottom: '4px' }
        }, '予測最安値'),
        e('p', {
          key: 'value',
          style: { fontSize: '24px', fontWeight: 'bold', color: '#15803d' }
        }, `¥${predictionData.lowestPrice.toLocaleString()}`),
        e('p', {
          key: 'date',
          style: { fontSize: '12px', color: '#166534', marginTop: '4px' }
        }, new Date(predictionData.lowestDate).toLocaleDateString('ja-JP'))
      ]),
      e('div', {
        key: 'average',
        style: {
          background: '#e0e7ff',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center'
        }
      }, [
        e('p', {
          key: 'label',
          style: { fontSize: '12px', color: '#4338ca', marginBottom: '4px' }
        }, '30日間平均'),
        e('p', {
          key: 'value',
          style: { fontSize: '24px', fontWeight: 'bold', color: '#4338ca' }
        }, `¥${predictionData.averagePrice.toLocaleString()}`)
      ])
    ]),

    // 価格グラフ
    e('div', {
      key: 'chart',
      style: {
        background: '#f9fafb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }
    }, [
      e('h3', {
        key: 'title',
        style: {
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '16px',
          color: '#374151'
        }
      }, '30日間の価格予測'),
      e('div', {
        key: 'chart-container',
        style: {
          overflowX: 'auto',
          paddingBottom: '8px'
        }
      }, e('div', {
        style: {
          display: 'flex',
          alignItems: 'flex-end',
          gap: window.innerWidth < 640 ? '4px' : '8px',
          height: '200px',
          minWidth: window.innerWidth < 640 ? '800px' : 'auto'
        }
      }, predictionData.predictions.map((pred: any, index: number) => {
        const date = new Date(pred.date);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isLowest = pred.price === predictionData.lowestPrice;
        
        return e('div', {
          key: pred.date,
          style: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }
        }, [
          // 価格バー
          e('div', {
            key: 'bar',
            style: {
              width: '100%',
              height: `${getBarHeight(pred.price, maxPrice, minPrice)}%`,
              background: isLowest ? '#10b981' :
                         pred.trend === 'up' ? '#ef4444' :
                         pred.trend === 'down' ? '#3b82f6' : '#6b7280',
              borderRadius: '4px 4px 0 0',
              position: 'relative',
              transition: 'all 0.3s',
              cursor: 'pointer'
            },
            title: `¥${pred.price.toLocaleString()} (${pred.confidence}%信頼度)`
          }, isLowest && e('div', {
            style: {
              position: 'absolute',
              top: '-20px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#10b981',
              whiteSpace: 'nowrap'
            }
          }, '最安')),
          
          // 日付
          e('div', {
            key: 'date',
            style: {
              fontSize: '10px',
              color: isWeekend ? '#dc2626' : '#6b7280',
              fontWeight: isWeekend ? '600' : '400',
              transform: 'rotate(-45deg)',
              transformOrigin: 'center',
              marginTop: '8px'
            }
          }, `${date.getMonth() + 1}/${date.getDate()}`)
        ]);
      })))
    ]),

    // 凡例
    e('div', {
      key: 'legend',
      style: {
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        fontSize: '12px',
        color: '#6b7280'
      }
    }, [
      e('div', { key: 'up', style: { display: 'flex', alignItems: 'center', gap: '4px' } }, [
        e('div', {
          key: 'color',
          style: {
            width: '12px',
            height: '12px',
            backgroundColor: '#ef4444',
            borderRadius: '2px'
          }
        }),
        e('span', { key: 'label' }, '高め')
      ]),
      e('div', { key: 'stable', style: { display: 'flex', alignItems: 'center', gap: '4px' } }, [
        e('div', {
          key: 'color',
          style: {
            width: '12px',
            height: '12px',
            backgroundColor: '#6b7280',
            borderRadius: '2px'
          }
        }),
        e('span', { key: 'label' }, '標準')
      ]),
      e('div', { key: 'down', style: { display: 'flex', alignItems: 'center', gap: '4px' } }, [
        e('div', {
          key: 'color',
          style: {
            width: '12px',
            height: '12px',
            backgroundColor: '#3b82f6',
            borderRadius: '2px'
          }
        }),
        e('span', { key: 'label' }, '安め')
      ]),
      e('div', { key: 'lowest', style: { display: 'flex', alignItems: 'center', gap: '4px' } }, [
        e('div', {
          key: 'color',
          style: {
            width: '12px',
            height: '12px',
            backgroundColor: '#10b981',
            borderRadius: '2px'
          }
        }),
        e('span', { key: 'label' }, '最安値')
      ])
    ]),

    // 注意事項
    e('div', {
      key: 'disclaimer',
      style: {
        marginTop: '24px',
        padding: '12px',
        background: '#fef3c7',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#92400e'
      }
    }, '※ この予測は過去のデータとAIアルゴリズムに基づくものです。実際の価格は変動する可能性があります。')
  ]));
};

export default PricePrediction;