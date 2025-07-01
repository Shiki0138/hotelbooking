import React from 'react';
import './TrustSignals.css';

interface SecurityBadgeProps {
  type: 'ssl' | 'verified' | 'protected' | 'certified';
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
}

export const SecurityBadge: React.FC<SecurityBadgeProps> = ({ 
  type, 
  size = 'medium',
  showTooltip = true 
}) => {
  const badges = {
    ssl: {
      icon: '🔒',
      text: 'SSL暗号化',
      tooltip: 'すべての通信は暗号化されています'
    },
    verified: {
      icon: '✅',
      text: '認証済み',
      tooltip: '公式認証を受けたサービスです'
    },
    protected: {
      icon: '🛡️',
      text: '保護済み',
      tooltip: '個人情報は安全に保護されています'
    },
    certified: {
      icon: '🏆',
      text: '認定取得',
      tooltip: '業界標準の認定を取得しています'
    }
  };
  
  const badge = badges[type];
  
  return (
    <div className={`security-badge security-badge-${size}`}>
      <span className="badge-icon">{badge.icon}</span>
      <span className="badge-text">{badge.text}</span>
      {showTooltip && (
        <div className="badge-tooltip">{badge.tooltip}</div>
      )}
    </div>
  );
};

interface ReviewHighlightProps {
  rating: number;
  reviewCount: number;
  highlights?: string[];
  showStars?: boolean;
}

export const ReviewHighlight: React.FC<ReviewHighlightProps> = ({
  rating,
  reviewCount,
  highlights = [],
  showStars = true
}) => {
  const getRatingText = (rating: number) => {
    if (rating >= 4.5) return '素晴らしい';
    if (rating >= 4.0) return 'とても良い';
    if (rating >= 3.5) return '良い';
    return '普通';
  };
  
  return (
    <div className="review-highlight">
      <div className="review-header">
        <div className="review-rating">
          <span className="rating-value">{rating}</span>
          {showStars && (
            <div className="rating-stars">
              {'★'.repeat(Math.floor(rating))}
              {'☆'.repeat(5 - Math.floor(rating))}
            </div>
          )}
        </div>
        <div className="review-info">
          <span className="rating-text">{getRatingText(rating)}</span>
          <span className="review-count">{reviewCount.toLocaleString()}件のレビュー</span>
        </div>
      </div>
      
      {highlights.length > 0 && (
        <div className="review-highlights">
          {highlights.map((highlight, index) => (
            <span key={index} className="highlight-item">
              ✓ {highlight}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

interface TrustBannerProps {
  items?: Array<{
    icon: string;
    text: string;
    subtext?: string;
  }>;
}

export const TrustBanner: React.FC<TrustBannerProps> = ({ 
  items = [
    { icon: '🔒', text: '安全な決済', subtext: 'SSL暗号化' },
    { icon: '⭐', text: '4.8/5.0', subtext: '10万件以上のレビュー' },
    { icon: '🏅', text: '業界No.1', subtext: '5年連続受賞' },
    { icon: '📞', text: '24時間サポート', subtext: '年中無休' }
  ]
}) => {
  return (
    <div className="trust-banner">
      {items.map((item, index) => (
        <div key={index} className="trust-item">
          <span className="trust-icon">{item.icon}</span>
          <div className="trust-content">
            <span className="trust-text">{item.text}</span>
            {item.subtext && (
              <span className="trust-subtext">{item.subtext}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

interface PaymentSecurityProps {
  providers?: string[];
}

export const PaymentSecurity: React.FC<PaymentSecurityProps> = ({
  providers = ['visa', 'mastercard', 'amex', 'jcb']
}) => {
  const providerIcons: { [key: string]: string } = {
    visa: '💳',
    mastercard: '💳',
    amex: '💳',
    jcb: '💳',
    paypal: '🅿️',
    applepay: '🍎',
    googlepay: '🇬'
  };
  
  return (
    <div className="payment-security">
      <div className="payment-header">
        <span className="security-icon">🔒</span>
        <span className="security-text">安全な決済方法</span>
      </div>
      <div className="payment-providers">
        {providers.map((provider, index) => (
          <div key={index} className="provider-item">
            <span className="provider-icon">
              {providerIcons[provider] || '💳'}
            </span>
            <span className="provider-name">{provider.toUpperCase()}</span>
          </div>
        ))}
      </div>
      <div className="payment-info">
        <p>すべての決済情報は最新の暗号化技術で保護されています</p>
      </div>
    </div>
  );
};

interface VerificationBadgesProps {
  certifications?: Array<{
    name: string;
    icon?: string;
    verified?: boolean;
  }>;
}

export const VerificationBadges: React.FC<VerificationBadgesProps> = ({
  certifications = [
    { name: 'プライバシーマーク', icon: '🔏', verified: true },
    { name: 'SSL証明書', icon: '🔐', verified: true },
    { name: 'PCI DSS準拠', icon: '💳', verified: true },
    { name: 'ISO 27001', icon: '📋', verified: true }
  ]
}) => {
  return (
    <div className="verification-badges">
      <h3 className="badges-title">認証・セキュリティ</h3>
      <div className="badges-grid">
        {certifications.map((cert, index) => (
          <div 
            key={index} 
            className={`cert-badge ${cert.verified ? 'verified' : ''}`}
          >
            <span className="cert-icon">{cert.icon || '🏅'}</span>
            <span className="cert-name">{cert.name}</span>
            {cert.verified && (
              <span className="cert-check">✓</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface GuaranteeBadgeProps {
  type: 'price' | 'quality' | 'satisfaction' | 'refund';
  title?: string;
  description?: string;
}

export const GuaranteeBadge: React.FC<GuaranteeBadgeProps> = ({
  type,
  title,
  description
}) => {
  const guarantees = {
    price: {
      icon: '💰',
      defaultTitle: '最低価格保証',
      defaultDesc: '他社より高い場合は差額を返金'
    },
    quality: {
      icon: '⭐',
      defaultTitle: '品質保証',
      defaultDesc: '厳選されたホテルのみを掲載'
    },
    satisfaction: {
      icon: '😊',
      defaultTitle: '満足度保証',
      defaultDesc: 'ご満足いただけない場合は全額返金'
    },
    refund: {
      icon: '↩️',
      defaultTitle: '返金保証',
      defaultDesc: 'キャンセル無料プランあり'
    }
  };
  
  const guarantee = guarantees[type];
  
  return (
    <div className="guarantee-badge">
      <div className="guarantee-icon">{guarantee.icon}</div>
      <div className="guarantee-content">
        <h4 className="guarantee-title">
          {title || guarantee.defaultTitle}
        </h4>
        <p className="guarantee-desc">
          {description || guarantee.defaultDesc}
        </p>
      </div>
    </div>
  );
};