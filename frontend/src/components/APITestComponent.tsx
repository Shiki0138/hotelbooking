import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  TextField,
  Grid,
  Paper,
  Divider,
  Chip
} from '@mui/material';
import {
  PlayArrow,
  CheckCircle,
  Error,
  Info,
  NetworkCheck
} from '@mui/icons-material';
import { apiService } from '../services/api.service';

/**
 * API連携テストコンポーネント
 * フロントエンド・バックエンド連携確認用
 */

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  response?: any;
  error?: string;
  duration?: number;
}

interface NetworkRequest {
  method: string;
  url: string;
  status: number;
  statusText: string;
  headers: any;
  data?: any;
  duration: number;
  timestamp: string;
}

const APITestComponent: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Health Check', status: 'pending' },
    { name: 'Hotel Search', status: 'pending' },
    { name: 'Hotel List', status: 'pending' },
    { name: 'Autocomplete', status: 'pending' },
    { name: 'Authentication', status: 'pending' }
  ]);
  
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [testRunning, setTestRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('東京');
  const [hotelId, setHotelId] = useState('1');

  // ネットワークリクエスト監視
  useEffect(() => {
    // Axios インターセプター設定
    const requestInterceptor = (config: any) => {
      const start = Date.now();
      config.metadata = { start };
      return config;
    };

    const responseInterceptor = (response: any) => {
      const end = Date.now();
      const duration = end - response.config.metadata.start;
      
      const networkRequest: NetworkRequest = {
        method: response.config.method?.toUpperCase() || 'GET',
        url: response.config.url,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        duration,
        timestamp: new Date().toISOString()
      };
      
      setNetworkRequests(prev => [networkRequest, ...prev.slice(0, 9)]); // 最新10件保持
      return response;
    };

    const errorInterceptor = (error: any) => {
      const end = Date.now();
      const duration = error.config?.metadata ? end - error.config.metadata.start : 0;
      
      const networkRequest: NetworkRequest = {
        method: error.config?.method?.toUpperCase() || 'GET',
        url: error.config?.url || 'Unknown',
        status: error.response?.status || 0,
        statusText: error.response?.statusText || 'Network Error',
        headers: error.response?.headers || {},
        data: error.response?.data,
        duration,
        timestamp: new Date().toISOString()
      };
      
      setNetworkRequests(prev => [networkRequest, ...prev.slice(0, 9)]);
      return Promise.reject(error);
    };

    // Note: リアルなインターセプター設定はここでは模擬
    // 実際の実装では axios インスタンスに設定する必要がある
    
    return () => {
      // クリーンアップ
    };
  }, []);

  /**
   * テスト実行
   */
  const runTest = async (testName: string): Promise<TestResult> => {
    const start = Date.now();
    
    try {
      let response;
      
      switch (testName) {
        case 'Health Check':
          response = await apiService.get('/health');
          break;
          
        case 'Hotel Search':
          response = await apiService.hotels.search({
            query: searchQuery,
            checkIn: '2025-06-25',
            checkOut: '2025-06-26',
            guests: 2
          });
          break;
          
        case 'Hotel List':
          response = await apiService.hotels.list({
            page: 1,
            limit: 10
          });
          break;
          
        case 'Autocomplete':
          response = await apiService.hotels.autocomplete(searchQuery);
          break;
          
        case 'Authentication':
          response = await apiService.auth.getProfile();
          break;
          
        default:
          throw new Error('Unknown test');
      }
      
      const duration = Date.now() - start;
      
      return {
        name: testName,
        status: 'success',
        response,
        duration
      };
      
    } catch (error: any) {
      const duration = Date.now() - start;
      
      return {
        name: testName,
        status: 'error',
        error: error.message || 'Unknown error',
        duration
      };
    }
  };

  /**
   * 個別テスト実行
   */
  const runSingleTest = async (testName: string) => {
    // テスト状態を "running" に更新
    setTests(prev => prev.map(test => 
      test.name === testName 
        ? { ...test, status: 'running' }
        : test
    ));

    // テスト実行
    const result = await runTest(testName);
    
    // 結果を更新
    setTests(prev => prev.map(test => 
      test.name === testName ? result : test
    ));
  };

  /**
   * 全テスト実行
   */
  const runAllTests = async () => {
    setTestRunning(true);
    
    // 全テストを "running" に設定
    setTests(prev => prev.map(test => ({ ...test, status: 'running' as const })));
    
    // 順次実行
    for (const test of tests) {
      const result = await runTest(test.name);
      setTests(prev => prev.map(t => 
        t.name === test.name ? result : t
      ));
      
      // 少し間隔を空ける
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setTestRunning(false);
  };

  /**
   * テスト結果アイコン
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CircularProgress size={20} />;
      case 'success':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      default:
        return <Info color="disabled" />;
    }
  };

  /**
   * ステータスカラー
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'running':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        🔧 API連携テスト
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        フロントエンド（8080）→ バックエンド（3000）の連携確認
      </Typography>

      {/* テスト設定 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            テスト設定
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="検索クエリ"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="ホテルID"
                value={hotelId}
                onChange={(e) => setHotelId(e.target.value)}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                onClick={runAllTests}
                disabled={testRunning}
                startIcon={testRunning ? <CircularProgress size={20} /> : <PlayArrow />}
                fullWidth
              >
                {testRunning ? 'テスト実行中...' : '全テスト実行'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* テスト結果 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🧪 テスト結果
              </Typography>
              
              {tests.map((test, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center">
                      {getStatusIcon(test.status)}
                      <Typography variant="body1" sx={{ ml: 1 }}>
                        {test.name}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={1}>
                      {test.duration && (
                        <Chip 
                          label={`${test.duration}ms`} 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                      
                      <Chip 
                        label={test.status} 
                        size="small" 
                        color={getStatusColor(test.status) as any}
                      />
                      
                      <Button
                        size="small"
                        onClick={() => runSingleTest(test.name)}
                        disabled={test.status === 'running'}
                      >
                        実行
                      </Button>
                    </Box>
                  </Box>
                  
                  {test.error && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {test.error}
                    </Alert>
                  )}
                  
                  {test.response && (
                    <Paper sx={{ mt: 1, p: 1, bgcolor: 'grey.50' }}>
                      <Typography variant="caption" color="text.secondary">
                        レスポンス:
                      </Typography>
                      <pre style={{ fontSize: '12px', margin: 0, overflow: 'auto' }}>
                        {JSON.stringify(test.response, null, 2).substring(0, 300)}
                        {JSON.stringify(test.response, null, 2).length > 300 && '...'}
                      </pre>
                    </Paper>
                  )}
                  
                  {index < tests.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🌐 ネットワーク監視
              </Typography>
              
              {networkRequests.length === 0 ? (
                <Typography color="text.secondary">
                  まだリクエストがありません
                </Typography>
              ) : (
                networkRequests.map((request, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="between" alignItems="center">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {request.method} {request.url}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(request.timestamp).toLocaleTimeString()}
                        </Typography>
                      </Box>
                      
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip 
                          label={`${request.status}`}
                          size="small"
                          color={request.status < 300 ? 'success' : request.status < 500 ? 'warning' : 'error'}
                        />
                        <Chip 
                          label={`${request.duration}ms`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    
                    {request.data && (
                      <Paper sx={{ mt: 1, p: 1, bgcolor: 'grey.50' }}>
                        <Typography variant="caption" color="text.secondary">
                          データ:
                        </Typography>
                        <pre style={{ fontSize: '11px', margin: 0, overflow: 'auto' }}>
                          {JSON.stringify(request.data, null, 2).substring(0, 200)}
                          {JSON.stringify(request.data, null, 2).length > 200 && '...'}
                        </pre>
                      </Paper>
                    )}
                    
                    {index < networkRequests.length - 1 && <Divider sx={{ mt: 2 }} />}
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 接続状態表示 */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center">
            <NetworkCheck color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">
              接続設定
            </Typography>
          </Box>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                フロントエンド URL:
              </Typography>
              <Typography variant="body1">
                http://localhost:8080
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                バックエンド API URL:
              </Typography>
              <Typography variant="body1">
                http://localhost:3000/api
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default APITestComponent;