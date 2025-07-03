// JWT認証ミドルウェア - Boss1先行実装
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'temporary-secret-change-in-production';

export async function verifyToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export async function requireAuth(req, res, next) {
  return verifyToken(req, res, next);
}