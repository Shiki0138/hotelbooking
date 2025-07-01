import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import './Header.css';

interface HeaderProps {
  className?: string;
  showThemeToggle?: boolean;
  sticky?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  className = '', 
  showThemeToggle = true,
  sticky = true 
}) => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    if (sticky) {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [sticky]);

  const navLinks = [
    { path: '/', label: 'ホーム' },
    { path: '/search', label: '検索' },
    { path: '/practical', label: '予約' },
    { path: '/about', label: '概要' }
  ];

  return (
    <header 
      className={`header ${sticky ? 'header--sticky' : ''} ${isScrolled ? 'header--scrolled' : ''} ${className}`}
      role="banner"
    >
      <nav className="header__nav" role="navigation" aria-label="メインナビゲーション">
        <div className="header__container">
          {/* Logo */}
          <Link to="/" className="header__logo" aria-label="ホームページへ">
            <span className="header__logo-text">LastMinuteStay</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="header__desktop-nav">
            <ul className="header__nav-list">
              {navLinks.map(link => (
                <li key={link.path} className="header__nav-item">
                  <Link 
                    to={link.path} 
                    className={`header__nav-link ${location.pathname === link.path ? 'header__nav-link--active' : ''}`}
                    aria-current={location.pathname === link.path ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Theme Toggle for Desktop */}
            <div className="header__actions">
              {showThemeToggle && (
                <ThemeToggle 
                  size="medium" 
                  showTooltip={true}
                  className="header__theme-toggle"
                />
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="header__mobile-actions">
            {showThemeToggle && (
              <ThemeToggle 
                size="small" 
                showTooltip={false}
                className="header__theme-toggle--mobile"
              />
            )}
            <button
              className="header__mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-label="メニューを開く"
            >
              <span className="header__mobile-menu-icon">
                {isMobileMenuOpen ? '✕' : '☰'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div 
          className={`header__mobile-nav ${isMobileMenuOpen ? 'header__mobile-nav--open' : ''}`}
          aria-hidden={!isMobileMenuOpen}
        >
          <ul className="header__mobile-nav-list">
            {navLinks.map(link => (
              <li key={link.path} className="header__mobile-nav-item">
                <Link 
                  to={link.path} 
                  className={`header__mobile-nav-link ${location.pathname === link.path ? 'header__mobile-nav-link--active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-current={location.pathname === link.path ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default Header;