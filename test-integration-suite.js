/**
 * 高級ホテル直前予約システム 統合テストスイート
 * Worker3 実装 - システム品質保証
 */

const axios = require('axios');
const chalk = require('chalk');

class IntegrationTestSuite {
  constructor() {
    this.baseURL = process.env.API_BASE_URL || 'https://hotelbooking-sigma.vercel.app/api';
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  async runAllTests() {
    console.log(chalk.blue('🧪 統合テストスイート開始'));
    console.log(chalk.gray(`ベースURL: ${this.baseURL}`));
    console.log('=' .repeat(60));

    try {
      // 基本ヘルスチェック
      await this.testHealthEndpoint();
      
      // 地域検索API群テスト
      await this.testLocationAPIs();
      
      // セグメント・パーソナライゼーション機能テスト
      await this.testSegmentAPIs();
      
      // ウォッチリスト機能テスト
      await this.testWatchlistAPIs();
      
      // 価格予測機能テスト
      await this.testPricePredictionAPIs();
      
      // エラーハンドリングテスト
      await this.testErrorHandling();
      
      // パフォーマンステスト
      await this.testPerformance();

    } catch (error) {
      console.error(chalk.red('🚨 テストスイート実行エラー:'), error.message);
    }

    this.generateReport();
  }

  async testHealthEndpoint() {
    await this.runTest('ヘルスチェック', async () => {
      const response = await axios.get(`${this.baseURL}/health`);
      if (response.status !== 200) throw new Error(`期待値: 200, 実際: ${response.status}`);
      if (!response.data.status === 'ok') throw new Error('ヘルス状態が正常ではありません');
      return { status: response.status, data: response.data };
    });
  }

  async testLocationAPIs() {
    console.log(chalk.yellow('\n📍 地域検索API群テスト'));

    // 都道府県一覧取得
    await this.runTest('都道府県一覧取得', async () => {
      const response = await axios.get(`${this.baseURL}/locations/prefectures`);
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      if (!response.data.success) throw new Error('APIレスポンスが失敗');
      if (!Array.isArray(response.data.data)) throw new Error('データが配列ではありません');
      return { count: response.data.data.length };
    });

    // 市町村一覧取得（東京都）
    await this.runTest('市町村一覧取得', async () => {
      const response = await axios.get(`${this.baseURL}/locations/prefectures/1/cities`);
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      if (!response.data.success) throw new Error('APIレスポンスが失敗');
      return { count: response.data.data?.length || 0 };
    });

    // 地域別ホテル検索
    await this.runTest('地域別ホテル検索', async () => {
      const response = await axios.get(`${this.baseURL}/locations/hotels`, {
        params: { prefectureId: 1, limit: 5 }
      });
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      if (!response.data.success) throw new Error('APIレスポンスが失敗');
      return { hotelCount: response.data.data?.length || 0 };
    });

    // オートコンプリート検索
    await this.runTest('オートコンプリート検索', async () => {
      const response = await axios.get(`${this.baseURL}/locations/suggestions`, {
        params: { q: '東京', limit: 5 }
      });
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      if (!response.data.success) throw new Error('APIレスポンスが失敗');
      return { suggestions: response.data.data?.length || 0 };
    });

    // マップ用ホテルデータ取得
    await this.runTest('マップ用ホテルデータ', async () => {
      const response = await axios.get(`${this.baseURL}/locations/map/hotels`, {
        params: { 
          bounds: '35.8,35.6,139.8,139.6', // 東京周辺
          limit: 10
        }
      });
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      if (!response.data.success) throw new Error('APIレスポンスが失敗');
      return { mapHotels: response.data.data?.length || 0 };
    });
  }

  async testSegmentAPIs() {
    console.log(chalk.yellow('\n👤 セグメント・パーソナライゼーション機能テスト'));

    // セグメント情報取得
    await this.runTest('セグメント情報取得', async () => {
      const response = await axios.get(`${this.baseURL}/segments/info`);
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      return { segments: response.data.segments?.length || 0 };
    });

    // デモモード推薦取得
    await this.runTest('デモモード推薦取得', async () => {
      const response = await axios.get(`${this.baseURL}/segments/personalized`, {
        params: { 
          demo: 'true',
          segmentType: 'couple',
          travelPurpose: 'leisure'
        }
      });
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      return { recommendations: response.data.hotels?.length || 0 };
    });
  }

  async testWatchlistAPIs() {
    console.log(chalk.yellow('\n⏰ ウォッチリスト機能テスト'));

    // 認証なしでのアクセステスト（401エラーを期待）
    await this.runTest('認証なしウォッチリストアクセス', async () => {
      try {
        await axios.get(`${this.baseURL}/watchlist`);
        throw new Error('認証なしでアクセスできてしまった');
      } catch (error) {
        if (error.response?.status === 401) {
          return { status: 'Unauthorized as expected' };
        }
        throw error;
      }
    });
  }

  async testPricePredictionAPIs() {
    console.log(chalk.yellow('\n📊 価格予測機能テスト'));

    // 価格予測データ取得テスト
    await this.runTest('価格予測データ取得', async () => {
      const response = await axios.get(`${this.baseURL}/price-predictions/demo`, {
        params: { hotelId: '1', days: 7 }
      });
      if (response.status !== 200) throw new Error(`Status: ${response.status}`);
      return { predictions: response.data.predictions?.length || 0 };
    });
  }

  async testErrorHandling() {
    console.log(chalk.yellow('\n🚨 エラーハンドリングテスト'));

    // 存在しないエンドポイント
    await this.runTest('404エラーハンドリング', async () => {
      try {
        await axios.get(`${this.baseURL}/nonexistent-endpoint`);
        throw new Error('404エラーが返されなかった');
      } catch (error) {
        if (error.response?.status === 404) {
          return { status: '404 as expected' };
        }
        throw error;
      }
    });

    // 不正なパラメータ
    await this.runTest('不正パラメータハンドリング', async () => {
      try {
        await axios.get(`${this.baseURL}/locations/prefectures/invalid/cities`);
        throw new Error('バリデーションエラーが発生しなかった');
      } catch (error) {
        if (error.response?.status >= 400 && error.response?.status < 500) {
          return { status: `${error.response.status} as expected` };
        }
        throw error;
      }
    });
  }

  async testPerformance() {
    console.log(chalk.yellow('\n⚡ パフォーマンステスト'));

    await this.runTest('レスポンス速度テスト', async () => {
      const startTime = Date.now();
      const response = await axios.get(`${this.baseURL}/health`);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (responseTime > 5000) {
        throw new Error(`レスポンスが遅すぎます: ${responseTime}ms`);
      }
      
      return { responseTime: `${responseTime}ms` };
    });

    // 複数同時リクエストテスト
    await this.runTest('同時リクエスト処理', async () => {
      const promises = Array(5).fill().map(() => 
        axios.get(`${this.baseURL}/health`)
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      const allSuccessful = responses.every(r => r.status === 200);
      if (!allSuccessful) {
        throw new Error('一部のリクエストが失敗');
      }
      
      return { 
        concurrentRequests: responses.length,
        totalTime: `${endTime - startTime}ms`
      };
    });
  }

  async runTest(testName, testFunction) {
    this.testResults.total++;
    
    try {
      console.log(chalk.gray(`  → ${testName}...`));
      const result = await testFunction();
      
      this.testResults.passed++;
      this.testResults.details.push({
        name: testName,
        status: 'PASS',
        result
      });
      
      console.log(chalk.green(`    ✅ PASS`), chalk.gray(JSON.stringify(result)));
      
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({
        name: testName,
        status: 'FAIL',
        error: error.message
      });
      
      console.log(chalk.red(`    ❌ FAIL: ${error.message}`));
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.blue('📊 統合テスト結果サマリー'));
    console.log('='.repeat(60));
    
    const passRate = Math.round((this.testResults.passed / this.testResults.total) * 100);
    
    console.log(`総テスト数: ${this.testResults.total}`);
    console.log(chalk.green(`成功: ${this.testResults.passed}`));
    console.log(chalk.red(`失敗: ${this.testResults.failed}`));
    console.log(`成功率: ${passRate}%`);
    
    if (passRate >= 90) {
      console.log(chalk.green('\n🎉 テストスイート成功！システムは本番稼働準備完了です。'));
    } else if (passRate >= 75) {
      console.log(chalk.yellow('\n⚠️  警告：一部テストが失敗しています。修正を推奨します。'));
    } else {
      console.log(chalk.red('\n🚨 重大：多数のテストが失敗しています。修正が必要です。'));
    }

    // 詳細レポート保存
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: this.testResults,
      systemStatus: passRate >= 90 ? 'READY' : passRate >= 75 ? 'WARNING' : 'CRITICAL'
    };

    require('fs').writeFileSync(
      './integration-test-report.json',
      JSON.stringify(reportData, null, 2)
    );

    console.log(chalk.gray('\n📄 詳細レポート: ./integration-test-report.json'));
  }
}

// スクリプト実行部分
if (require.main === module) {
  const testSuite = new IntegrationTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = IntegrationTestSuite;