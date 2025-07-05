/**
 * 📈 価格変動追跡システム
 * 高級ホテル直前予約システム専用価格分析エンジン
 * 
 * 機能:
 * - 1週間前・3日前・直前の価格変動追跡
 * - 価格下落アラート・通知システム
 * - 機械学習による価格予測
 * - 統計的価格分析・レポート
 * 
 * @author worker1 (ホテルクローリング・データ収集システム担当)
 * @date 2025-07-05
 */

const { supabaseAdmin } = require('../config/supabase');

class PriceTrackingService {
    constructor() {
        this.priceChangeThresholds = {
            significant: 0.15,    // 15%以上の変動で通知
            major: 0.25,          // 25%以上の変動で重要アラート
            critical: 0.40        // 40%以上の変動で緊急アラート
        };

        this.analysisWindows = {
            shortTerm: 7,   // 7日間の短期分析
            mediumTerm: 30, // 30日間の中期分析
            longTerm: 90    // 90日間の長期分析
        };

        this.predictionModels = {
            linearRegression: true,
            seasonalDecomposition: true,
            volatilityAnalysis: true
        };
    }

    /**
     * 価格変動分析の実行
     */
    async analyzePriceChanges() {
        try {
            console.log('📈 価格変動分析開始...');

            // 1. 最新の価格データを取得
            const latestPrices = await this.getLatestPrices();
            
            // 2. 価格変動を検出
            const priceChanges = await this.detectPriceChanges(latestPrices);
            
            // 3. 有意な変動を分析
            const significantChanges = await this.analyzeSignificantChanges(priceChanges);
            
            // 4. アラート対象を特定
            const alerts = await this.generatePriceAlerts(significantChanges);
            
            // 5. 結果をデータベースに保存
            await this.savePriceAnalysis(significantChanges, alerts);

            console.log(`✅ 価格変動分析完了: ${significantChanges.length}件の有意な変動を検出`);
            
            return {
                success: true,
                total_analyzed: latestPrices.length,
                significant_changes: significantChanges.length,
                alerts_generated: alerts.length,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ 価格変動分析エラー:', error);
            throw error;
        }
    }

    /**
     * 最新の価格データを取得
     */
    async getLatestPrices() {
        const { data, error } = await supabaseAdmin
            .from('price_history_crawling')
            .select(`
                *,
                hotels_crawling!inner(
                    id,
                    name,
                    hotel_code,
                    is_luxury
                )
            `)
            .eq('hotels_crawling.is_luxury', true)
            .gte('crawled_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 過去24時間
            .order('crawled_at', { ascending: false });

        if (error) {
            throw new Error(`最新価格データ取得エラー: ${error.message}`);
        }

        return data || [];
    }

    /**
     * 価格変動を検出
     */
    async detectPriceChanges(latestPrices) {
        const priceChanges = [];

        // ホテル・部屋タイプ・日程ごとにグループ化
        const priceGroups = this.groupPricesByHotelRoom(latestPrices);

        for (const [groupKey, prices] of priceGroups.entries()) {
            if (prices.length < 2) continue;

            // 時系列順にソート
            prices.sort((a, b) => new Date(a.crawled_at) - new Date(b.crawled_at));

            // 前回の価格と比較
            for (let i = 1; i < prices.length; i++) {
                const current = prices[i];
                const previous = prices[i - 1];

                const priceChange = current.price - previous.price;
                const priceChangePercentage = (priceChange / previous.price) * 100;

                // 価格変動が検出された場合
                if (Math.abs(priceChangePercentage) >= 5) { // 5%以上の変動
                    priceChanges.push({
                        hotel_id: current.hotel_id,
                        hotel_name: current.hotels_crawling.name,
                        hotel_code: current.hotels_crawling.hotel_code,
                        check_in_date: current.check_in_date,
                        check_out_date: current.check_out_date,
                        room_type_code: current.room_type_code,
                        previous_price: previous.price,
                        current_price: current.price,
                        price_change: priceChange,
                        price_change_percentage: priceChangePercentage,
                        time_difference_hours: (new Date(current.crawled_at) - new Date(previous.crawled_at)) / (1000 * 60 * 60),
                        days_before_checkin: current.days_before_checkin,
                        is_price_drop: priceChange < 0,
                        is_weekend: current.is_weekend,
                        season: current.season,
                        previous_crawled_at: previous.crawled_at,
                        current_crawled_at: current.crawled_at
                    });
                }
            }
        }

        return priceChanges;
    }

    /**
     * 価格データをホテル・部屋タイプ・日程でグループ化
     */
    groupPricesByHotelRoom(prices) {
        const groups = new Map();

        for (const price of prices) {
            const key = `${price.hotel_id}_${price.check_in_date}_${price.check_out_date}_${price.room_type_code}`;
            
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            
            groups.get(key).push(price);
        }

        return groups;
    }

    /**
     * 有意な価格変動を分析
     */
    async analyzeSignificantChanges(priceChanges) {
        const significantChanges = [];

        for (const change of priceChanges) {
            const absChangePercent = Math.abs(change.price_change_percentage);
            
            // 有意性の判定
            let significance = 'minor';
            if (absChangePercent >= this.priceChangeThresholds.critical * 100) {
                significance = 'critical';
            } else if (absChangePercent >= this.priceChangeThresholds.major * 100) {
                significance = 'major';
            } else if (absChangePercent >= this.priceChangeThresholds.significant * 100) {
                significance = 'significant';
            }

            if (significance !== 'minor') {
                // 統計的分析を追加
                const statisticalData = await this.calculateStatisticalMetrics(change);
                
                significantChanges.push({
                    ...change,
                    significance,
                    statistical_data: statisticalData,
                    trend_analysis: await this.analyzeTrend(change),
                    market_context: await this.getMarketContext(change)
                });
            }
        }

        return significantChanges;
    }

    /**
     * 統計的メトリクスを計算
     */
    async calculateStatisticalMetrics(change) {
        try {
            // 過去30日間の同ホテル・同部屋タイプの価格履歴を取得
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            
            const { data: historicalPrices } = await supabaseAdmin
                .from('price_history_crawling')
                .select('price, crawled_at')
                .eq('hotel_id', change.hotel_id)
                .eq('room_type_code', change.room_type_code)
                .gte('crawled_at', thirtyDaysAgo)
                .order('crawled_at', { ascending: true });

            if (!historicalPrices || historicalPrices.length < 5) {
                return { insufficient_data: true };
            }

            const prices = historicalPrices.map(p => p.price);
            
            return {
                mean_price: this.calculateMean(prices),
                median_price: this.calculateMedian(prices),
                standard_deviation: this.calculateStandardDeviation(prices),
                coefficient_variation: this.calculateCoefficientOfVariation(prices),
                z_score: this.calculateZScore(change.current_price, prices),
                percentile_rank: this.calculatePercentileRank(change.current_price, prices),
                volatility_score: this.calculateVolatility(prices),
                data_points: prices.length
            };
        } catch (error) {
            console.error('統計的メトリクス計算エラー:', error);
            return { error: error.message };
        }
    }

    /**
     * トレンド分析
     */
    async analyzeTrend(change) {
        try {
            // 過去14日間のトレンドを分析
            const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
            
            const { data: trendData } = await supabaseAdmin
                .from('price_history_crawling')
                .select('price, crawled_at, days_before_checkin')
                .eq('hotel_id', change.hotel_id)
                .eq('room_type_code', change.room_type_code)
                .gte('crawled_at', fourteenDaysAgo)
                .order('crawled_at', { ascending: true });

            if (!trendData || trendData.length < 3) {
                return { trend: 'insufficient_data' };
            }

            // 線形回帰でトレンドを計算
            const regression = this.calculateLinearRegression(trendData);
            
            return {
                trend: regression.slope > 0 ? 'increasing' : regression.slope < 0 ? 'decreasing' : 'stable',
                slope: regression.slope,
                correlation: regression.correlation,
                trend_strength: Math.abs(regression.correlation),
                prediction_7_days: regression.slope * 7 + change.current_price,
                data_points: trendData.length
            };
        } catch (error) {
            console.error('トレンド分析エラー:', error);
            return { trend: 'error', error: error.message };
        }
    }

    /**
     * 市場コンテキストを取得
     */
    async getMarketContext(change) {
        try {
            // 同地域・同日程の他のホテルの価格変動を調査
            const { data: marketData } = await supabaseAdmin
                .from('price_history_crawling')
                .select(`
                    price,
                    price_change_percentage,
                    hotels_crawling!inner(prefecture_name, city)
                `)
                .eq('check_in_date', change.check_in_date)
                .eq('check_out_date', change.check_out_date)
                .gte('crawled_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()) // 過去6時間
                .neq('hotel_id', change.hotel_id);

            if (!marketData || marketData.length === 0) {
                return { market_trend: 'no_data' };
            }

            const priceChanges = marketData
                .filter(d => d.price_change_percentage !== null)
                .map(d => d.price_change_percentage);

            if (priceChanges.length === 0) {
                return { market_trend: 'no_changes' };
            }

            const avgMarketChange = this.calculateMean(priceChanges);
            const marketVolatility = this.calculateStandardDeviation(priceChanges);

            return {
                market_trend: avgMarketChange > 0 ? 'increasing' : avgMarketChange < 0 ? 'decreasing' : 'stable',
                avg_market_change_percent: avgMarketChange,
                market_volatility: marketVolatility,
                relative_performance: change.price_change_percentage - avgMarketChange,
                sample_size: priceChanges.length
            };
        } catch (error) {
            console.error('市場コンテキスト取得エラー:', error);
            return { market_trend: 'error', error: error.message };
        }
    }

    /**
     * 価格アラートを生成
     */
    async generatePriceAlerts(significantChanges) {
        const alerts = [];

        for (const change of significantChanges) {
            // アラートタイプを決定
            let alertType = 'price_change';
            let alertPriority = 'normal';
            
            if (change.significance === 'critical') {
                alertType = 'critical_price_change';
                alertPriority = 'high';
            } else if (change.is_price_drop && Math.abs(change.price_change_percentage) >= 20) {
                alertType = 'significant_price_drop';
                alertPriority = 'high';
            } else if (change.days_before_checkin <= 3 && change.is_price_drop) {
                alertType = 'last_minute_deal';
                alertPriority = 'medium';
            }

            alerts.push({
                hotel_id: change.hotel_id,
                alert_type: alertType,
                priority: alertPriority,
                title: this.generateAlertTitle(change),
                message: this.generateAlertMessage(change),
                data: {
                    hotel_name: change.hotel_name,
                    check_in_date: change.check_in_date,
                    price_change: change.price_change,
                    price_change_percentage: change.price_change_percentage,
                    current_price: change.current_price,
                    significance: change.significance,
                    days_before_checkin: change.days_before_checkin
                },
                created_at: new Date().toISOString()
            });
        }

        return alerts;
    }

    /**
     * アラートタイトルを生成
     */
    generateAlertTitle(change) {
        const direction = change.is_price_drop ? '下落' : '上昇';
        const percentage = Math.abs(change.price_change_percentage).toFixed(1);
        
        if (change.significance === 'critical') {
            return `🚨 重要: ${change.hotel_name} - 価格${direction} ${percentage}%`;
        } else if (change.is_price_drop && change.days_before_checkin <= 3) {
            return `⚡ 直前割引: ${change.hotel_name} - ${percentage}%OFF`;
        } else {
            return `📈 価格変動: ${change.hotel_name} - ${direction} ${percentage}%`;
        }
    }

    /**
     * アラートメッセージを生成
     */
    generateAlertMessage(change) {
        const direction = change.is_price_drop ? '下落' : '上昇';
        const yen = change.price_change.toLocaleString();
        const percentage = Math.abs(change.price_change_percentage).toFixed(1);
        
        let message = `${change.hotel_name}の価格が${direction}しました。\\n`;
        message += `変動額: ¥${yen} (${percentage}%)\\n`;
        message += `現在価格: ¥${change.current_price.toLocaleString()}\\n`;
        message += `チェックイン: ${change.check_in_date}`;
        
        if (change.days_before_checkin <= 7) {
            message += ` (${change.days_before_checkin}日前)`;
        }

        if (change.statistical_data && change.statistical_data.z_score) {
            const zScore = Math.abs(change.statistical_data.z_score);
            if (zScore > 2) {
                message += `\\n📊 統計的に異常な価格変動です (Z-score: ${zScore.toFixed(2)})`;
            }
        }

        return message;
    }

    /**
     * 価格分析結果をデータベースに保存
     */
    async savePriceAnalysis(significantChanges, alerts) {
        try {
            // 価格変動分析結果を保存
            if (significantChanges.length > 0) {
                const { error: analysisError } = await supabaseAdmin
                    .from('price_analysis_results')
                    .insert(significantChanges.map(change => ({
                        hotel_id: change.hotel_id,
                        check_in_date: change.check_in_date,
                        check_out_date: change.check_out_date,
                        room_type_code: change.room_type_code,
                        price_change: change.price_change,
                        price_change_percentage: change.price_change_percentage,
                        significance: change.significance,
                        is_price_drop: change.is_price_drop,
                        statistical_data: change.statistical_data,
                        trend_analysis: change.trend_analysis,
                        market_context: change.market_context,
                        analyzed_at: new Date().toISOString()
                    })));

                if (analysisError) {
                    console.error('価格分析結果保存エラー:', analysisError);
                }
            }

            // アラートを保存
            if (alerts.length > 0) {
                const { error: alertError } = await supabaseAdmin
                    .from('price_alerts')
                    .insert(alerts);

                if (alertError) {
                    console.error('価格アラート保存エラー:', alertError);
                }
            }

        } catch (error) {
            console.error('価格分析結果保存エラー:', error);
        }
    }

    // ========== 統計計算ユーティリティ関数 ==========

    calculateMean(values) {
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
    }

    calculateStandardDeviation(values) {
        const mean = this.calculateMean(values);
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    calculateCoefficientOfVariation(values) {
        const mean = this.calculateMean(values);
        const std = this.calculateStandardDeviation(values);
        return mean !== 0 ? (std / mean) * 100 : 0;
    }

    calculateZScore(value, population) {
        const mean = this.calculateMean(population);
        const std = this.calculateStandardDeviation(population);
        return std !== 0 ? (value - mean) / std : 0;
    }

    calculatePercentileRank(value, values) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = sorted.findIndex(v => v >= value);
        return index === -1 ? 100 : (index / sorted.length) * 100;
    }

    calculateVolatility(values) {
        if (values.length < 2) return 0;
        
        const returns = [];
        for (let i = 1; i < values.length; i++) {
            returns.push((values[i] - values[i-1]) / values[i-1]);
        }
        
        return this.calculateStandardDeviation(returns) * 100;
    }

    calculateLinearRegression(data) {
        const n = data.length;
        const x = data.map((_, i) => i);
        const y = data.map(d => d.price);
        
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // 相関係数計算
        const meanX = sumX / n;
        const meanY = sumY / n;
        const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
        const denominatorX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
        const denominatorY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));
        const correlation = numerator / (denominatorX * denominatorY);
        
        return { slope, intercept, correlation };
    }

    /**
     * 価格予測（シンプルな線形回帰ベース）
     */
    async predictPrices(hotelId, checkInDate, days = 7) {
        try {
            // 過去30日間のデータを取得
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            
            const { data: historicalData } = await supabaseAdmin
                .from('price_history_crawling')
                .select('price, crawled_at, days_before_checkin')
                .eq('hotel_id', hotelId)
                .eq('check_in_date', checkInDate)
                .gte('crawled_at', thirtyDaysAgo)
                .order('crawled_at', { ascending: true });

            if (!historicalData || historicalData.length < 5) {
                return { error: 'insufficient_data' };
            }

            // 線形回帰による予測
            const regression = this.calculateLinearRegression(historicalData);
            const predictions = [];
            
            for (let i = 1; i <= days; i++) {
                const predictedPrice = regression.slope * (historicalData.length + i) + regression.intercept;
                predictions.push({
                    days_ahead: i,
                    predicted_price: Math.max(0, Math.round(predictedPrice)),
                    confidence: Math.abs(regression.correlation)
                });
            }

            return {
                success: true,
                predictions,
                model_info: {
                    slope: regression.slope,
                    correlation: regression.correlation,
                    data_points: historicalData.length
                }
            };

        } catch (error) {
            console.error('価格予測エラー:', error);
            return { error: error.message };
        }
    }
}

module.exports = PriceTrackingService;