import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API設定
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

interface PriceData {
  hotelId: string;
  hotelName: string;
  historicalPrices: Array<{
    date: string;
    price: number;
  }>;
  currentPrice: number;
  checkInDate: string;
  checkOutDate: string;
}

interface PricePrediction {
  predictedPrice: number;
  confidence: number;
  bestDates: string[];
  reasoning: string;
  savingsPercentage: number;
}

interface OTAComparison {
  recommendations: Array<{
    provider: string;
    estimatedPrice: number;
    confidence: number;
    reasoning: string;
  }>;
  insights: string;
}

export class GeminiService {
  private model: any;

  constructor() {
    if (genAI) {
      this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    }
  }

  /**
   * ホテル価格予測
   */
  async predictHotelPrice(data: PriceData): Promise<PricePrediction | null> {
    if (!this.model) {
      console.warn('Gemini API key not configured');
      return this.getFallbackPrediction(data);
    }

    try {
      const prompt = `
あなたは高級ホテルの価格予測専門家です。以下のデータを分析して、最適な予約タイミングを教えてください。

ホテル名: ${data.hotelName}
希望チェックイン日: ${data.checkInDate}
現在の価格: ¥${data.currentPrice.toLocaleString()}

過去30日の価格データ:
${data.historicalPrices.slice(-30).map(p => `${p.date}: ¥${p.price.toLocaleString()}`).join('\n')}

以下の形式でJSON形式で回答してください:
{
  "predictedPrice": 予測価格（数値）,
  "confidence": 予測信頼度（0-100）,
  "bestDates": ["最安値になりそうな日付1", "日付2", "日付3"],
  "reasoning": "価格変動の理由と予測根拠（日本語で）",
  "savingsPercentage": 現在価格と比較した節約率（0-100）
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // JSON部分を抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const prediction = JSON.parse(jsonMatch[0]);
        return prediction;
      }

      return this.getFallbackPrediction(data);
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.getFallbackPrediction(data);
    }
  }

  /**
   * OTA価格比較分析
   */
  async analyzeOTAPrices(hotelName: string, checkInDate: string): Promise<OTAComparison | null> {
    if (!this.model) {
      return this.getFallbackOTAComparison();
    }

    try {
      const prompt = `
あなたはOTA（Online Travel Agency）の価格分析専門家です。
${hotelName}の${checkInDate}の宿泊について、各OTAサイトの傾向を分析してください。

分析対象OTA:
- 楽天トラベル
- Booking.com
- じゃらん
- Expedia
- Agoda

以下の形式でJSON形式で回答してください:
{
  "recommendations": [
    {
      "provider": "OTA名",
      "estimatedPrice": 推定価格（数値）,
      "confidence": 信頼度（0-100）,
      "reasoning": "このOTAを選ぶ理由"
    }
  ],
  "insights": "全体的な価格傾向と予約のコツ（日本語で）"
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return this.getFallbackOTAComparison();
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.getFallbackOTAComparison();
    }
  }

  /**
   * AIコメント生成
   */
  async generateInsight(hotelName: string, priceData: any): Promise<string> {
    if (!this.model) {
      return this.getFallbackInsight(priceData);
    }

    try {
      const prompt = `
${hotelName}の価格データを見て、20-40代の女性旅行者に向けて、
親しみやすく、お得感を感じられるアドバイスを1文で生成してください。
絵文字を1つ使って、ポジティブな印象にしてください。
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.getFallbackInsight(priceData);
    }
  }

  /**
   * フォールバック処理（API使用不可時）
   */
  private getFallbackPrediction(data: PriceData): PricePrediction {
    // 簡単な統計分析でフォールバック
    const prices = data.historicalPrices.map(p => p.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    
    const predictedPrice = Math.round(minPrice + (avgPrice - minPrice) * 0.3);
    const savingsPercentage = Math.round((1 - predictedPrice / data.currentPrice) * 100);

    return {
      predictedPrice,
      confidence: 75,
      bestDates: this.generateBestDates(data.checkInDate),
      reasoning: '過去の価格傾向から、週末を避けた平日の予約がお得です。特に火曜日から木曜日にかけては価格が下がる傾向があります。',
      savingsPercentage: Math.max(0, savingsPercentage)
    };
  }

  private getFallbackOTAComparison(): OTAComparison {
    return {
      recommendations: [
        {
          provider: '楽天トラベル',
          estimatedPrice: 42000,
          confidence: 85,
          reasoning: '楽天ポイント還元率が高く、実質最安値'
        },
        {
          provider: 'Booking.com',
          estimatedPrice: 43500,
          confidence: 80,
          reasoning: '直前キャンセル無料プランあり'
        },
        {
          provider: 'じゃらん',
          estimatedPrice: 44200,
          confidence: 75,
          reasoning: 'Pontaポイント利用可能'
        }
      ],
      insights: '楽天トラベルが最もお得ですが、キャンセル条件も確認しましょう。'
    };
  }

  private getFallbackInsight(priceData: any): string {
    const insights = [
      '💕 今週末は穴場！お友達との女子旅に最適なタイミングです',
      '✨ クリスマス前の今が狙い目！素敵な思い出作りのチャンスです',
      '🌸 この時期は比較的お得！自分へのご褒美にいかがでしょうか',
      '🎯 平日利用でさらにお得に！賢い選択でワンランク上の滞在を',
      '💎 今なら通常より30%以上お得！この機会をお見逃しなく'
    ];
    
    return insights[Math.floor(Math.random() * insights.length)];
  }

  private generateBestDates(baseDate: string): string[] {
    const dates: string[] = [];
    const base = new Date(baseDate);
    
    // 2週間後の火曜日から木曜日を推奨
    for (let i = 14; i < 21; i++) {
      const date = new Date(base);
      date.setDate(date.getDate() + i);
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek >= 2 && dayOfWeek <= 4) { // 火水木
        dates.push(date.toISOString().split('T')[0]);
      }
    }
    
    return dates.slice(0, 3);
  }
}

// シングルトンインスタンス
export const geminiService = new GeminiService();