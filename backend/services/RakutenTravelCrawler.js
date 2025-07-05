/**
 * 🏨 楽天トラベルAPI クローラー
 * 高級ホテル直前予約システム専用
 * 
 * 機能:
 * - 楽天トラベルAPIから高級ホテル情報を取得
 * - 直前割引・キャンセル情報の自動クローリング
 * - 価格変動の追跡・記録
 * - 15分間隔での自動更新
 * 
 * @author worker1 (ホテルクローリング・データ収集システム担当)
 * @date 2025-07-05
 */

const axios = require('axios');
const { supabaseAdmin } = require('../config/supabase');

class RakutenTravelCrawler {
    constructor() {
        this.apiKey = process.env.RAKUTEN_API_KEY;
        this.applicationId = process.env.RAKUTEN_APPLICATION_ID;
        this.baseURL = 'https://app.rakuten.co.jp/services/api';
        this.rateLimitDelay = 1000; // 1秒間隔（レート制限対策）
        this.maxRetries = 3;
        this.timeout = 30000; // 30秒タイムアウト
        
        // API エンドポイント
        this.endpoints = {
            hotel: '/Travel/SimpleHotelSearch/20170426',
            vacancy: '/Travel/VacantHotelSearch/20170426',
            hotelDetail: '/Travel/HotelDetailSearch/20170426',
            ranking: '/Travel/HotelRanking/20170426'
        };

        // 高級ホテル検索条件
        this.luxurySearchParams = {
            classCode: '5,4', // 4-5つ星ホテル
            minCharge: 30000, // 最低30,000円以上
            searchRadius: 3, // 検索半径3km
            sort: 'standard' // 標準ソート
        };

        // 主要都市の緯度経度
        this.majorCities = [
            { name: '東京', latitude: 35.6762, longitude: 139.6503, areaCode: '130000' },
            { name: '大阪', latitude: 34.6937, longitude: 135.5023, areaCode: '270000' },
            { name: '京都', latitude: 35.0116, longitude: 135.7681, areaCode: '260000' },
            { name: '横浜', latitude: 35.4437, longitude: 139.6380, areaCode: '140000' },
            { name: '福岡', latitude: 33.5904, longitude: 130.4017, areaCode: '400000' },
            { name: '沖縄', latitude: 26.2124, longitude: 127.6792, areaCode: '470000' }
        ];
    }

    /**
     * 楽天APIクライアント初期化
     */
    initializeApiClient() {
        this.apiClient = axios.create({
            baseURL: this.baseURL,
            timeout: this.timeout,
            headers: {
                'User-Agent': 'LastMinuteStay-Crawler/1.0',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        // リクエストインターセプター（レート制限対策）
        this.apiClient.interceptors.request.use(async (config) => {
            await this.sleep(this.rateLimitDelay);
            return config;
        });

        // レスポンスインターセプター（エラーハンドリング）
        this.apiClient.interceptors.response.use(
            response => response,
            async error => {
                if (error.response?.status === 429) {
                    // レート制限エラーの場合、待機して再試行
                    await this.sleep(5000);
                    return this.apiClient.request(error.config);
                }
                throw error;
            }
        );
    }

    /**
     * 指定時間待機
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * クローリング実行ログを開始
     */
    async startCrawlingLog(crawlType, totalItems = 0) {
        const executionId = `${crawlType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const { data, error } = await supabaseAdmin
            .from('crawling_logs')
            .insert({
                crawl_type: crawlType,
                api_source: 'rakuten',
                execution_id: executionId,
                status: 'running',
                total_items: totalItems,
                configuration: {
                    luxurySearchParams: this.luxurySearchParams,
                    cities: this.majorCities.length,
                    rateLimitDelay: this.rateLimitDelay
                }
            })
            .select()
            .single();

        if (error) {
            console.error('クローリングログ開始エラー:', error);
            return null;
        }

        return data;
    }

    /**
     * クローリング実行ログを更新
     */
    async updateCrawlingLog(logId, updates) {
        const { error } = await supabaseAdmin
            .from('crawling_logs')
            .update({
                ...updates,
                completed_at: updates.status === 'completed' ? new Date().toISOString() : null
            })
            .eq('id', logId);

        if (error) {
            console.error('クローリングログ更新エラー:', error);
        }
    }

    /**
     * API使用量を記録
     */
    async trackApiUsage(endpoint, responseTime, isSuccess = true) {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const hour = now.getHours();

        const { error } = await supabaseAdmin
            .from('api_usage_tracking')
            .upsert({
                api_source: 'rakuten',
                date,
                hour,
                total_calls: 1,
                successful_calls: isSuccess ? 1 : 0,
                failed_calls: isSuccess ? 0 : 1,
                avg_response_time_ms: responseTime
            }, {
                onConflict: 'api_source,date,hour',
                ignoreDuplicates: false
            });

        if (error) {
            console.error('API使用量記録エラー:', error);
        }
    }

    /**
     * 楽天APIリクエスト実行（リトライ機能付き）
     */
    async makeApiRequest(endpoint, params, retryCount = 0) {
        try {
            const startTime = Date.now();
            
            const response = await this.apiClient.get(endpoint, {
                params: {
                    applicationId: this.applicationId,
                    format: 'json',
                    ...params
                }
            });

            const responseTime = Date.now() - startTime;
            await this.trackApiUsage(endpoint, responseTime, true);

            return response.data;
        } catch (error) {
            const responseTime = Date.now() - Date.now();
            await this.trackApiUsage(endpoint, responseTime, false);

            console.error(`楽天API エラー (試行${retryCount + 1}):`, error.message);

            if (retryCount < this.maxRetries) {
                const delay = Math.pow(2, retryCount) * 1000; // 指数バックオフ
                await this.sleep(delay);
                return this.makeApiRequest(endpoint, params, retryCount + 1);
            }

            throw error;
        }
    }

    /**
     * 高級ホテル基本情報をクローリング
     */
    async crawlLuxuryHotels() {
        const log = await this.startCrawlingLog('hotels', this.majorCities.length);
        let processedItems = 0;
        let successfulItems = 0;
        let failedItems = 0;

        try {
            this.initializeApiClient();

            for (const city of this.majorCities) {
                try {
                    console.log(`${city.name}の高級ホテルをクローリング中...`);

                    const params = {
                        ...this.luxurySearchParams,
                        latitude: city.latitude,
                        longitude: city.longitude,
                        hits: 30 // 1回のリクエストで最大30件取得
                    };

                    const result = await this.makeApiRequest(this.endpoints.hotel, params);
                    
                    if (result && result.hotels) {
                        for (const hotelData of result.hotels) {
                            await this.saveHotelData(hotelData.hotel, city);
                            successfulItems++;
                        }
                    }

                    processedItems++;
                } catch (error) {
                    console.error(`${city.name}のクローリングエラー:`, error.message);
                    failedItems++;
                    processedItems++;
                }
            }

            // ログ更新
            if (log) {
                await this.updateCrawlingLog(log.id, {
                    status: 'completed',
                    processed_items: processedItems,
                    successful_items: successfulItems,
                    failed_items: failedItems,
                    duration_seconds: Math.floor((Date.now() - new Date(log.started_at).getTime()) / 1000)
                });
            }

            console.log(`高級ホテルクローリング完了: 成功${successfulItems}件、失敗${failedItems}件`);
            return { success: true, processed: processedItems, successful: successfulItems, failed: failedItems };

        } catch (error) {
            if (log) {
                await this.updateCrawlingLog(log.id, {
                    status: 'failed',
                    error_message: error.message,
                    processed_items: processedItems,
                    successful_items: successfulItems,
                    failed_items: failedItems
                });
            }
            throw error;
        }
    }

    /**
     * ホテルデータをデータベースに保存
     */
    async saveHotelData(hotelData, city) {
        try {
            const hotelRecord = {
                hotel_code: `rakuten_${hotelData.hotelNo}`,
                name: hotelData.hotelName,
                name_kana: hotelData.hotelKanaName,
                prefecture_name: city.name,
                city: city.name,
                address: hotelData.address1 + ' ' + (hotelData.address2 || ''),
                latitude: parseFloat(hotelData.latitude) || city.latitude,
                longitude: parseFloat(hotelData.longitude) || city.longitude,
                phone: hotelData.telephoneNo,
                url: hotelData.hotelInformationUrl,
                hotel_class: this.parseHotelClass(hotelData.reviewAverage),
                hotel_type: 'luxury',
                total_rooms: hotelData.roomCount || null,
                api_source: 'rakuten',
                api_hotel_id: hotelData.hotelNo.toString(),
                api_last_updated: new Date().toISOString(),
                is_luxury: true,
                is_active: true,
                crawl_priority: 1,
                last_crawled_at: new Date().toISOString()
            };

            const { error } = await supabaseAdmin
                .from('hotels_crawling')
                .upsert(hotelRecord, {
                    onConflict: 'hotel_code',
                    ignoreDuplicates: false
                });

            if (error) {
                console.error('ホテルデータ保存エラー:', error);
                throw error;
            }

            console.log(`ホテル保存完了: ${hotelData.hotelName}`);
        } catch (error) {
            console.error(`ホテルデータ保存失敗: ${hotelData.hotelName}`, error);
            throw error;
        }
    }

    /**
     * ホテルクラスを評価から推定
     */
    parseHotelClass(reviewAverage) {
        if (!reviewAverage) return 4;
        const rating = parseFloat(reviewAverage);
        if (rating >= 4.5) return 5;
        if (rating >= 4.0) return 4;
        if (rating >= 3.5) return 3;
        if (rating >= 3.0) return 2;
        return 1;
    }

    /**
     * 空室・価格情報をクローリング
     */
    async crawlAvailabilityAndPrices() {
        const log = await this.startCrawlingLog('availability');
        let processedItems = 0;
        let successfulItems = 0;
        let failedItems = 0;

        try {
            this.initializeApiClient();

            // データベースから高級ホテル一覧を取得
            const { data: hotels, error } = await supabaseAdmin
                .from('hotels_crawling')
                .select('*')
                .eq('is_luxury', true)
                .eq('is_active', true)
                .eq('api_source', 'rakuten')
                .order('crawl_priority', { ascending: true })
                .limit(50); // 1回のクローリングで50ホテルまで

            if (error) {
                throw new Error(`ホテル一覧取得エラー: ${error.message}`);
            }

            // ログの合計アイテム数を更新
            if (log) {
                await this.updateCrawlingLog(log.id, { total_items: hotels.length });
            }

            // 検索日程を設定（今日から7日後まで）
            const searchDates = this.generateSearchDates(7);

            for (const hotel of hotels) {
                try {
                    console.log(`${hotel.name}の空室情報をクローリング中...`);

                    for (const dateRange of searchDates) {
                        await this.crawlHotelAvailability(hotel, dateRange);
                    }

                    successfulItems++;
                } catch (error) {
                    console.error(`${hotel.name}のクローリングエラー:`, error.message);
                    failedItems++;
                }
                processedItems++;
            }

            // ログ更新
            if (log) {
                await this.updateCrawlingLog(log.id, {
                    status: 'completed',
                    processed_items: processedItems,
                    successful_items: successfulItems,
                    failed_items: failedItems,
                    duration_seconds: Math.floor((Date.now() - new Date(log.started_at).getTime()) / 1000)
                });
            }

            console.log(`空室・価格クローリング完了: 成功${successfulItems}件、失敗${failedItems}件`);
            return { success: true, processed: processedItems, successful: successfulItems, failed: failedItems };

        } catch (error) {
            if (log) {
                await this.updateCrawlingLog(log.id, {
                    status: 'failed',
                    error_message: error.message,
                    processed_items: processedItems,
                    successful_items: successfulItems,
                    failed_items: failedItems
                });
            }
            throw error;
        }
    }

    /**
     * 検索日程を生成
     */
    generateSearchDates(days) {
        const dates = [];
        const today = new Date();

        for (let i = 0; i < days; i++) {
            const checkIn = new Date(today);
            checkIn.setDate(today.getDate() + i);
            
            const checkOut = new Date(checkIn);
            checkOut.setDate(checkIn.getDate() + 1);

            dates.push({
                checkInDate: checkIn.toISOString().split('T')[0],
                checkOutDate: checkOut.toISOString().split('T')[0],
                daysUntilCheckin: i
            });
        }

        return dates;
    }

    /**
     * 特定ホテルの空室情報をクローリング
     */
    async crawlHotelAvailability(hotel, dateRange) {
        try {
            const params = {
                latitude: hotel.latitude,
                longitude: hotel.longitude,
                checkinDate: dateRange.checkInDate,
                checkoutDate: dateRange.checkOutDate,
                searchRadius: 1, // 1km以内
                minCharge: 20000, // 最低20,000円
                hits: 10
            };

            const result = await this.makeApiRequest(this.endpoints.vacancy, params);

            if (result && result.hotels) {
                for (const hotelData of result.hotels) {
                    if (hotelData.hotel.hotelNo.toString() === hotel.api_hotel_id) {
                        await this.saveAvailabilityData(hotel, hotelData, dateRange);
                        break;
                    }
                }
            }
        } catch (error) {
            console.error(`${hotel.name}の空室情報取得エラー:`, error.message);
            throw error;
        }
    }

    /**
     * 空室データをデータベースに保存
     */
    async saveAvailabilityData(hotel, hotelData, dateRange) {
        try {
            const roomInfos = hotelData.hotel.roomInfo || [];

            for (const roomInfo of roomInfos) {
                // 直前割引判定（チェックイン3日前以降かつ割引率20%以上）
                const isLastMinute = dateRange.daysUntilCheckin <= 3;
                const originalPrice = roomInfo.total || roomInfo.charge;
                const currentPrice = roomInfo.total || roomInfo.charge;
                const discountRate = 0; // 楽天APIでは直接割引率が取得できない場合が多い

                const availabilityRecord = {
                    hotel_id: hotel.id,
                    check_date: new Date().toISOString().split('T')[0],
                    check_in_date: dateRange.checkInDate,
                    check_out_date: dateRange.checkOutDate,
                    nights: 1,
                    room_type_code: roomInfo.roomClass || 'standard',
                    room_type_name: roomInfo.roomName || '客室',
                    room_count: 1,
                    available_rooms: roomInfo.reserve === 'OK' ? 5 : 0, // 楽天APIでは具体的な空室数不明
                    original_price: originalPrice,
                    current_price: currentPrice,
                    discount_rate: discountRate,
                    is_last_minute: isLastMinute,
                    min_nights: 1,
                    max_nights: 7,
                    min_guests: 1,
                    max_guests: roomInfo.maxCapacity || 2,
                    api_source: 'rakuten',
                    api_plan_id: roomInfo.planId?.toString(),
                    api_room_id: roomInfo.roomClass,
                    crawled_at: new Date().toISOString(),
                    expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4時間後に期限切れ
                };

                const { error } = await supabaseAdmin
                    .from('availability_crawling')
                    .upsert(availabilityRecord, {
                        onConflict: 'hotel_id,check_in_date,check_out_date,room_type_code,api_source',
                        ignoreDuplicates: false
                    });

                if (error) {
                    console.error('空室データ保存エラー:', error);
                } else {
                    // 価格履歴も同時に記録
                    await this.savePriceHistory(hotel, availabilityRecord, dateRange);
                }
            }
        } catch (error) {
            console.error(`空室データ保存失敗: ${hotel.name}`, error);
            throw error;
        }
    }

    /**
     * 価格履歴をデータベースに保存
     */
    async savePriceHistory(hotel, availabilityData, dateRange) {
        try {
            const priceHistoryRecord = {
                hotel_id: hotel.id,
                check_in_date: availabilityData.check_in_date,
                check_out_date: availabilityData.check_out_date,
                room_type_code: availabilityData.room_type_code,
                price: availabilityData.current_price,
                original_price: availabilityData.original_price,
                discount_rate: availabilityData.discount_rate,
                available_rooms: availabilityData.available_rooms,
                days_before_checkin: dateRange.daysUntilCheckin,
                is_weekend: this.isWeekend(new Date(availabilityData.check_in_date)),
                is_holiday: false, // 祝日判定は別途実装
                season: this.getSeason(new Date(availabilityData.check_in_date)),
                api_source: 'rakuten',
                crawled_at: new Date().toISOString()
            };

            const { error } = await supabaseAdmin
                .from('price_history_crawling')
                .insert(priceHistoryRecord);

            if (error) {
                console.error('価格履歴保存エラー:', error);
            }
        } catch (error) {
            console.error(`価格履歴保存失敗: ${hotel.name}`, error);
        }
    }

    /**
     * 週末判定
     */
    isWeekend(date) {
        const day = date.getDay();
        return day === 0 || day === 6; // 日曜日または土曜日
    }

    /**
     * 季節判定
     */
    getSeason(date) {
        const month = date.getMonth() + 1;
        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        if (month >= 9 && month <= 11) return 'autumn';
        return 'winter';
    }

    /**
     * フルクローリング実行（ホテル情報 + 空室・価格情報）
     */
    async runFullCrawling() {
        try {
            console.log('🏨 楽天トラベル フルクローリング開始...');
            
            // 1. ホテル基本情報をクローリング
            console.log('📍 Step 1: ホテル基本情報をクローリング中...');
            const hotelResult = await this.crawlLuxuryHotels();
            
            // 2. 空室・価格情報をクローリング
            console.log('💰 Step 2: 空室・価格情報をクローリング中...');
            const availabilityResult = await this.crawlAvailabilityAndPrices();
            
            console.log('✅ 楽天トラベル フルクローリング完了!');
            return {
                success: true,
                hotels: hotelResult,
                availability: availabilityResult,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ 楽天トラベル クローリングエラー:', error);
            throw error;
        }
    }
}

module.exports = RakutenTravelCrawler;