// Ultra-responsive layout system for all devices
import React, { useState, useEffect } from 'react';
import './ResponsiveLayout.css';

// Breakpoint hook for responsive behavior
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState('desktop');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 576) setBreakpoint('mobile');
      else if (width < 768) setBreakpoint('tablet-small');
      else if (width < 992) setBreakpoint('tablet');
      else if (width < 1200) setBreakpoint('desktop-small');
      else setBreakpoint('desktop');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
};

// Container with responsive behavior
export const ResponsiveContainer = ({ children, className = '' }) => {
  const breakpoint = useBreakpoint();
  
  return (
    <div className={`responsive-container ${breakpoint} ${className}`}>
      {children}
    </div>
  );
};

// Grid system with automatic responsive behavior
export const ResponsiveGrid = ({ 
  children, 
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = '20px',
  className = ''
}) => {
  const breakpoint = useBreakpoint();
  const currentColumns = columns[breakpoint] || columns.desktop || 1;

  return (
    <div 
      className={`responsive-grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${currentColumns}, 1fr)`,
        gap: gap
      }}
    >
      {children}
    </div>
  );
};

// Navigation with responsive behavior
export const ResponsiveNavigation = ({ 
  items, 
  logo, 
  userMenu,
  onMenuToggle 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const breakpoint = useBreakpoint();
  const isMobile = ['mobile', 'tablet-small'].includes(breakpoint);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    onMenuToggle?.(!isMobileMenuOpen);
  };

  return (
    <nav className="responsive-navigation">
      <div className="nav-container">
        {/* Logo */}
        <div className="nav-logo">
          {logo}
        </div>

        {/* Desktop Navigation */}
        {!isMobile && (
          <div className="nav-items-desktop">
            {items.map((item, index) => (
              <a 
                key={index}
                href={item.href}
                className={`nav-item ${item.active ? 'active' : ''}`}
              >
                {item.label}
              </a>
            ))}
          </div>
        )}

        {/* User Menu / Actions */}
        <div className="nav-actions">
          {userMenu}
          
          {/* Mobile Menu Toggle */}
          {isMobile && (
            <button 
              className="mobile-menu-toggle"
              onClick={toggleMobileMenu}
              aria-label="メニューを開く"
            >
              <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobile && (
        <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-menu-items">
            {items.map((item, index) => (
              <a 
                key={index}
                href={item.href}
                className={`mobile-nav-item ${item.active ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.icon && <span className="nav-icon">{item.icon}</span>}
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

// Card component with responsive behavior
export const ResponsiveCard = ({ 
  children, 
  image,
  title,
  subtitle,
  actions,
  layout = 'vertical',
  className = '' 
}) => {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';
  const currentLayout = isMobile ? 'vertical' : layout;

  return (
    <div className={`responsive-card layout-${currentLayout} ${className}`}>
      {image && (
        <div className="card-image">
          {image}
        </div>
      )}
      
      <div className="card-content">
        {title && <h3 className="card-title">{title}</h3>}
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
        
        <div className="card-body">
          {children}
        </div>
        
        {actions && (
          <div className="card-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

// Search bar with responsive behavior
export const ResponsiveSearchBar = ({ 
  onSearch, 
  placeholder = "ホテルを検索...",
  filters,
  suggestions 
}) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const breakpoint = useBreakpoint();
  const isMobile = ['mobile', 'tablet-small'].includes(breakpoint);

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(query);
    setShowSuggestions(false);
  };

  return (
    <div className="responsive-search-bar">
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-container">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            placeholder={placeholder}
            className="search-input"
          />
          
          <button type="submit" className="search-button">
            🔍
          </button>
          
          {filters && (
            <button
              type="button"
              className={`filters-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              ⚙️
            </button>
          )}
        </div>
        
        {/* Suggestions */}
        {showSuggestions && suggestions && suggestions.length > 0 && (
          <div className="search-suggestions">
            {suggestions.slice(0, isMobile ? 3 : 5).map((suggestion, index) => (
              <button
                key={index}
                type="button"
                className="suggestion-item"
                onClick={() => {
                  setQuery(suggestion.text);
                  setShowSuggestions(false);
                  onSearch(suggestion.text);
                }}
              >
                <span className="suggestion-icon">{suggestion.icon}</span>
                <span className="suggestion-text">{suggestion.text}</span>
              </button>
            ))}
          </div>
        )}
      </form>
      
      {/* Filters Panel */}
      {showFilters && filters && (
        <div className="filters-panel">
          {filters}
        </div>
      )}
    </div>
  );
};

// Hero section with responsive behavior
export const ResponsiveHero = ({ 
  title, 
  subtitle, 
  backgroundImage,
  overlay = true,
  actions,
  height = 'auto'
}) => {
  const breakpoint = useBreakpoint();
  
  return (
    <section 
      className={`responsive-hero ${breakpoint}`}
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        minHeight: height
      }}
    >
      {overlay && <div className="hero-overlay"></div>}
      
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">{title}</h1>
          {subtitle && <p className="hero-subtitle">{subtitle}</p>}
        </div>
        
        {actions && (
          <div className="hero-actions">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
};

// Footer with responsive behavior
export const ResponsiveFooter = ({ 
  sections, 
  socialLinks, 
  copyright,
  newsletter 
}) => {
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  return (
    <footer className="responsive-footer">
      <div className="footer-container">
        {/* Footer Sections */}
        <div className="footer-sections">
          {sections.map((section, index) => (
            <div key={index} className="footer-section">
              <h4 className="section-title">{section.title}</h4>
              <ul className="section-links">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          
          {/* Newsletter */}
          {newsletter && (
            <div className="footer-section newsletter-section">
              <h4 className="section-title">ニュースレター</h4>
              <p>最新のお得情報をお届けします</p>
              <form className="newsletter-form">
                <input
                  type="email"
                  placeholder="メールアドレス"
                  className="newsletter-input"
                />
                <button type="submit" className="newsletter-button">
                  登録
                </button>
              </form>
            </div>
          )}
        </div>
        
        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-copyright">
            {copyright}
          </div>
          
          {socialLinks && (
            <div className="footer-social">
              {socialLinks.map((link, index) => (
                <a 
                  key={index}
                  href={link.href}
                  className="social-link"
                  aria-label={link.label}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};