import React from 'react';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../providers/ThemeProvider';
import '../components/ThemeToggle.css';

const ThemeToggleDemo: React.FC = () => {
  const { mode } = useTheme();

  return (
    <div style={{ padding: '40px', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '40px', textAlign: 'center' }}>
        Dark Mode Toggle Demo - Current: {mode} mode
      </h1>

      {/* Different backgrounds to test visibility */}
      <div style={{ display: 'grid', gap: '40px' }}>
        {/* Light background */}
        <section style={{ padding: '40px', backgroundColor: '#ffffff', borderRadius: '12px' }}>
          <h2 style={{ color: '#000', marginBottom: '20px' }}>Light Background</h2>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <ThemeToggle size="small" />
            <ThemeToggle size="medium" />
            <ThemeToggle size="large" />
            <ThemeToggle size="medium" showLabel={true} />
            <ThemeToggle variant="switch" />
          </div>
        </section>

        {/* Dark background */}
        <section style={{ padding: '40px', backgroundColor: '#1a1a1a', borderRadius: '12px' }}>
          <h2 style={{ color: '#fff', marginBottom: '20px' }}>Dark Background</h2>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <ThemeToggle size="small" />
            <ThemeToggle size="medium" />
            <ThemeToggle size="large" />
            <ThemeToggle size="medium" showLabel={true} />
            <ThemeToggle variant="switch" />
          </div>
        </section>

        {/* Gradient background */}
        <section style={{ 
          padding: '40px', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px' 
        }}>
          <h2 style={{ color: '#fff', marginBottom: '20px' }}>Gradient Background</h2>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <ThemeToggle size="small" />
            <ThemeToggle size="medium" />
            <ThemeToggle size="large" />
            <ThemeToggle size="medium" showLabel={true} />
            <ThemeToggle variant="switch" />
          </div>
        </section>

        {/* Image background */}
        <section style={{ 
          padding: '40px', 
          backgroundImage: 'url(https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '12px',
          position: 'relative'
        }}>
          <h2 style={{ color: '#fff', marginBottom: '20px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            Image Background
          </h2>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <ThemeToggle size="small" />
            <ThemeToggle size="medium" />
            <ThemeToggle size="large" />
            <ThemeToggle size="medium" showLabel={true} />
            <ThemeToggle variant="switch" />
          </div>
        </section>

        {/* Floating variant */}
        <section style={{ padding: '40px', backgroundColor: '#f3f4f6', borderRadius: '12px' }}>
          <h2 style={{ color: '#000', marginBottom: '20px' }}>Floating Variant</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            The floating variant is fixed positioned at the top-right corner of the viewport
          </p>
        </section>
      </div>

      {/* Floating toggle */}
      <ThemeToggle variant="floating" position="fixed" />

      {/* Accessibility test */}
      <div style={{ marginTop: '40px', padding: '40px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
        <h2 style={{ marginBottom: '20px' }}>Accessibility Features</h2>
        <ul style={{ lineHeight: '2', color: '#4b5563' }}>
          <li>✅ Full keyboard navigation (Tab, Enter, Space)</li>
          <li>✅ ARIA labels and roles</li>
          <li>✅ Focus indicators</li>
          <li>✅ High contrast mode support</li>
          <li>✅ Reduced motion support</li>
          <li>✅ Screen reader announcements</li>
          <li>✅ 44x44px minimum touch target</li>
          <li>✅ Tooltip for additional context</li>
        </ul>
      </div>
    </div>
  );
};

export default ThemeToggleDemo;