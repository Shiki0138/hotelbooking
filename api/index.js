// LastMinuteStay 統合APIエンドポイント
// Vercel Hobby planの12 Functions制限対応

export default async function handler(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // ルーティング
    if (pathname === '/api/health') {
      const health = await import('./health.js');
      return health.default(req, res);
    }
    
    if (pathname.startsWith('/api/hotels/search')) {
      const search = await import('./hotels/search.js');
      return search.default(req, res);
    }
    
    if (pathname.startsWith('/api/auth/')) {
      const authType = pathname.split('/')[3];
      if (authType === 'login') {
        const login = await import('./auth/login.js');
        return login.default(req, res);
      }
      if (authType === 'register' || authType === 'signup') {
        const register = await import('./auth/register.js');
        return register.default(req, res);
      }
    }
    
    if (pathname.startsWith('/api/search/')) {
      const searchType = pathname.split('/')[3];
      if (searchType === 'basic') {
        const basic = await import('./search/basic.js');
        return basic.default(req, res);
      }
      if (searchType === 'multi-date') {
        const multiDate = await import('./search/multi-date.js');
        return multiDate.default(req, res);
      }
      if (searchType === 'rakuten') {
        const rakuten = await import('./search/rakuten.js');
        return rakuten.default(req, res);
      }
    }
    
    if (pathname.startsWith('/api/availability/')) {
      const realtime = await import('./availability/realtime.js');
      return realtime.default(req, res);
    }
    
    if (pathname.startsWith('/api/preferences/')) {
      const manage = await import('./preferences/manage.js');
      return manage.default(req, res);
    }
    
    if (pathname.startsWith('/api/realtime/')) {
      const subscribe = await import('./realtime/subscribe.js');
      return subscribe.default(req, res);
    }
    
    if (pathname.startsWith('/api/email/')) {
      const email = await import('./email/send-notification.js');
      return email.default(req, res);
    }
    
    if (pathname.startsWith('/api/monitoring/')) {
      const monitoringType = pathname.split('/')[3];
      if (monitoringType === 'cancellation-detector') {
        const detector = await import('./monitoring/cancellation-detector.js');
        return detector.default(req, res);
      }
      if (monitoringType === 'price-tracker') {
        const tracker = await import('./monitoring/price-tracker.js');
        return tracker.default(req, res);
      }
    }

    // 404エラー
    return res.status(404).json({ 
      error: 'Not Found',
      message: `API endpoint ${pathname} not found`
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
}