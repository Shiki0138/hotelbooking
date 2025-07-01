import { ErrorCode } from '../types/errors';

interface ErrorDefinition {
  statusCode: number;
  defaultMessage: string;
  userMessage: string;
  suggestion?: string;
}

const errorDefinitions: Record<ErrorCode, ErrorDefinition> = {
  // Authentication errors
  [ErrorCode.UNAUTHORIZED]: {
    statusCode: 401,
    defaultMessage: 'Authentication required',
    userMessage: '認証が必要です。ログインしてください。',
    suggestion: 'ログインページから再度ログインしてください。'
  },
  [ErrorCode.INVALID_CREDENTIALS]: {
    statusCode: 401,
    defaultMessage: 'Invalid email or password',
    userMessage: 'メールアドレスまたはパスワードが正しくありません。',
    suggestion: '入力内容を確認して再度お試しください。'
  },
  [ErrorCode.TOKEN_EXPIRED]: {
    statusCode: 401,
    defaultMessage: 'Authentication token expired',
    userMessage: 'セッションの有効期限が切れました。',
    suggestion: '再度ログインしてください。'
  },
  
  // Validation errors
  [ErrorCode.VALIDATION_ERROR]: {
    statusCode: 400,
    defaultMessage: 'Validation error',
    userMessage: '入力内容に誤りがあります。',
    suggestion: '入力内容を確認してください。'
  },
  [ErrorCode.INVALID_INPUT]: {
    statusCode: 400,
    defaultMessage: 'Invalid input provided',
    userMessage: '入力内容が正しくありません。',
    suggestion: '正しい形式で入力してください。'
  },
  [ErrorCode.MISSING_REQUIRED_FIELD]: {
    statusCode: 400,
    defaultMessage: 'Required field missing',
    userMessage: '必須項目が入力されていません。',
    suggestion: 'すべての必須項目を入力してください。'
  },
  
  // Resource errors
  [ErrorCode.RESOURCE_NOT_FOUND]: {
    statusCode: 404,
    defaultMessage: 'Resource not found',
    userMessage: 'お探しの情報が見つかりません。',
    suggestion: 'URLを確認するか、検索から再度お探しください。'
  },
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: {
    statusCode: 409,
    defaultMessage: 'Resource already exists',
    userMessage: 'すでに登録されています。',
    suggestion: '別の内容で登録してください。'
  },
  [ErrorCode.RESOURCE_CONFLICT]: {
    statusCode: 409,
    defaultMessage: 'Resource conflict',
    userMessage: '処理が競合しました。',
    suggestion: '少し待ってから再度お試しください。'
  },
  
  // Business logic errors
  [ErrorCode.ROOM_NOT_AVAILABLE]: {
    statusCode: 400,
    defaultMessage: 'Room not available for selected dates',
    userMessage: '選択された日程では空室がありません。',
    suggestion: '日程を変更するか、他の部屋をお探しください。'
  },
  [ErrorCode.BOOKING_CANCELLED]: {
    statusCode: 400,
    defaultMessage: 'Booking has been cancelled',
    userMessage: 'この予約はキャンセルされています。',
    suggestion: '新しく予約を作成してください。'
  },
  [ErrorCode.INSUFFICIENT_ROOMS]: {
    statusCode: 400,
    defaultMessage: 'Not enough rooms available',
    userMessage: '必要な部屋数が確保できません。',
    suggestion: '部屋数を減らすか、別の日程でお試しください。'
  },
  [ErrorCode.PRICE_CHANGED]: {
    statusCode: 400,
    defaultMessage: 'Price has changed',
    userMessage: '料金が変更されました。',
    suggestion: '最新の料金を確認してから予約してください。'
  },
  
  // System errors
  [ErrorCode.INTERNAL_ERROR]: {
    statusCode: 500,
    defaultMessage: 'Internal server error',
    userMessage: 'システムエラーが発生しました。',
    suggestion: 'しばらく待ってから再度お試しください。問題が続く場合はサポートにお問い合わせください。'
  },
  [ErrorCode.DATABASE_ERROR]: {
    statusCode: 500,
    defaultMessage: 'Database error',
    userMessage: 'データベースエラーが発生しました。',
    suggestion: 'しばらく待ってから再度お試しください。'
  },
  [ErrorCode.CACHE_ERROR]: {
    statusCode: 500,
    defaultMessage: 'Cache error',
    userMessage: '一時的なエラーが発生しました。',
    suggestion: 'ページを更新してお試しください。'
  },
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: {
    statusCode: 502,
    defaultMessage: 'External service error',
    userMessage: '外部サービスとの通信エラーが発生しました。',
    suggestion: 'しばらく待ってから再度お試しください。'
  },
  
  // Rate limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    statusCode: 429,
    defaultMessage: 'Too many requests',
    userMessage: 'アクセスが集中しています。',
    suggestion: '少し時間をおいてから再度お試しください。'
  },
  
  // Network errors
  [ErrorCode.TIMEOUT_ERROR]: {
    statusCode: 504,
    defaultMessage: 'Request timeout',
    userMessage: '処理がタイムアウトしました。',
    suggestion: 'ネットワーク接続を確認して再度お試しください。'
  },
  [ErrorCode.CONNECTION_ERROR]: {
    statusCode: 503,
    defaultMessage: 'Connection error',
    userMessage: '接続エラーが発生しました。',
    suggestion: 'ネットワーク接続を確認してください。'
  },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    statusCode: 503,
    defaultMessage: 'Service temporarily unavailable',
    userMessage: 'サービスが一時的に利用できません。',
    suggestion: 'メンテナンス中の可能性があります。しばらく待ってから再度お試しください。'
  }
};

export class CustomError extends Error {
  public code: ErrorCode;
  public userMessage: string;
  public suggestion?: string;
  public details?: any;
  public statusCode: number;
  public isOperational = true;
  
  constructor(code: ErrorCode, details?: any, customMessage?: string) {
    const errorDef = errorDefinitions[code];
    const message = customMessage || errorDef.defaultMessage;
    
    super(message);
    Object.setPrototypeOf(this, CustomError.prototype);
    
    this.statusCode = errorDef.statusCode;
    
    this.code = code;
    this.userMessage = errorDef.userMessage;
    if (errorDef.suggestion) {
      this.suggestion = errorDef.suggestion;
    }
    this.details = details;
  }
}

export const createError = (code: ErrorCode, details?: any, customMessage?: string): CustomError => {
  return new CustomError(code, details, customMessage);
};

// Alias for backward compatibility
export const AppError = CustomError;